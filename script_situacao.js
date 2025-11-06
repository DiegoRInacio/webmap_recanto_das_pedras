require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GeoJSONLayer",
  "esri/Graphic"
], function (Map, MapView, GeoJSONLayer, Graphic) {

  // ---- MAPA BASE ----
  const map = new Map({ basemap: "hybrid" });

  const view = new MapView({
    container: "viewDiv",
    map,
    center: [-43.012915, -22.312919],
    zoom: 14
  });

  // ---- MENU DE BASEMAP EXISTENTE ----
  const basemapSelect = document.getElementById("basemapSelect");
  basemapSelect.addEventListener("change", () => (map.basemap = basemapSelect.value));

  // ---- BOTÃO DE ROTA (ajustado abaixo do zoom) ----
  const routeButton = document.createElement("button");
  routeButton.textContent = "🚗 Traçar rota";
  routeButton.style.cssText = `
    position: absolute;
    top: 160px;          /* ajustado para ficar abaixo do zoom */
    left: 15px;
    z-index: 9999;
    background: #0079c1;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: bold;
    font-size: 14px;
    white-space: nowrap;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    transition: all 0.3s ease;
  `;
  document.body.appendChild(routeButton);

  // ---- AJUSTE RESPONSIVO ----
  window.addEventListener("resize", () => {
    routeButton.style.top = window.innerWidth < 768 ? "190px" : "160px";
  });

  // ---- POPUPS ----
  const popups = {
    "Limite do Imóvel": {
      title: "Limite do Imóvel",
      content: [{ type: "fields", fieldInfos: [
        { fieldName: "Nome", label: "Nome do Imóvel" },
        { fieldName: "CAR", label: "Número do CAR" }
      ]}]
    },
    "RPPN": {
      title: "Reserva Particular do Patrimônio Natural",
      content: [{ type: "fields", fieldInfos: [
        { fieldName: "nome", label: "Nome da RPPN" },
        { fieldName: "jurisdicao", label: "Jurisdição" },
        { fieldName: "categoria", label: "Categoria" },
        { fieldName: "area ha", label: "Área (ha)" }
      ]}]
    },
    "Hidrografia": {
      title: "Hidrografia",
      content: [{ type: "fields", fieldInfos: [
        { fieldName: "NOME", label: "Nome do Curso d'Água" },
        { fieldName: "SHAPE_Leng", label: "Extensão (° decimais)" }
      ]}]
    },
    "Unidades de Conservação": {
      title: "Unidade de Conservação",
      content: [{ type: "fields", fieldInfos: [
        { fieldName: "nome", label: "Nome" },
        { fieldName: "jurisdicao", label: "Jurisdição" },
        { fieldName: "categoria", label: "Categoria" },
        { fieldName: "municipio", label: "Município" },
        { fieldName: "tipo", label: "Tipo" },
        { fieldName: "area ha", label: "Área (ha)" }
      ]}]
    }
  };

  // ---- CAMADAS ----
  const camadas = [
    { nome: "Limite do Imóvel", url: "camadas/imovel.geojson", cor: "#ff6600", tipo: "polygon", fill: [255,102,0,0.1], width: 3 },
    { nome: "RPPN", url: "camadas/rppn.geojson", cor: "#00ff80", tipo: "polygon", fill: [0,255,128,0.15], width: 2 },
    { nome: "Hidrografia", url: "camadas/hidrografia_imovel.geojson", cor: "#00bfff", tipo: "line", width: 2 },
    { nome: "Unidades de Conservação", url: "camadas/ucs_municipio.geojson", cor: "#006400", tipo: "polygon", fill: [0,100,0,0.15], width: 2 }
  ];

  const layersDict = {};

  const simpleLineRenderer = (color, width=2) => ({
    type: "simple",
    symbol: { type: "simple-line", color, width }
  });

  // ---- LEGENDA ----
  const painel = document.createElement("div");
  painel.id = "painelLegenda";
  painel.style.cssText = `
    background: rgba(255,255,255,0.95);
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0,0,0,0.3);
    font-family: Arial, sans-serif;
    font-size: 14px;
    pointer-events: auto;
  `;

  const header = document.createElement("div");
  header.textContent = "Legenda ▲";
  header.style.cssText = `
    background: #0079c1;
    color: white;
    padding: 10px;
    cursor: pointer;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
    font-weight: bold;
    text-align: center;
  `;

  const conteudo = document.createElement("div");
  conteudo.style.cssText = `padding: 10px 14px; display: block;`;

  // Alterna abertura e fechamento da legenda
  header.addEventListener("click", () => {
    const aberto = conteudo.style.display === "block";
    conteudo.style.display = aberto ? "none" : "block";
    header.textContent = aberto ? "Legenda ▼" : "Legenda ▲";
  });

  painel.appendChild(header);
  painel.appendChild(conteudo);
  view.ui.add(painel, "top-right");

  // --- COMPORTAMENTO RESPONSIVO ---
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (isMobile) {
    // Versão mobile: legenda fixa no rodapé
    painel.style.position = "fixed";
    painel.style.left = "0";
    painel.style.right = "0";
    painel.style.bottom = "0";
    painel.style.top = "auto";
    painel.style.margin = "0";
    painel.style.width = "100vw";
    painel.style.maxHeight = "50vh";
    painel.style.overflowY = "auto";
    painel.style.borderRadius = "12px 12px 0 0";
    painel.style.zIndex = "9999";
    painel.style.display = "block";
    painel.style.opacity = "1";

    // Pequeno delay pra não interferir com o carregamento do mapa
    setTimeout(() => {
      painel.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 400);
  } else {
    // Versão desktop: canto superior direito
    painel.style.position = "absolute";
    painel.style.top = "70px";
    painel.style.right = "10px";
    painel.style.width = "260px";
    painel.style.maxHeight = "calc(100vh - 100px)";
    painel.style.overflowY = "auto";
  }

  // ---- FUNÇÃO DE RECONSTRUÇÃO DE LEGENDA ----
  function rebuildLegendContent() {
    conteudo.innerHTML = "";

    Object.entries(layersDict).forEach(([nome, layer]) => {
      const label = document.createElement("label");
      label.style.display = "flex";
      label.style.alignItems = "center";
      label.style.marginBottom = "6px";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = layer.visible ?? true;
      checkbox.style.marginRight = "8px";
      checkbox.addEventListener("change", e => (layer.visible = e.target.checked));

      const simbolo = document.createElement("span");
      simbolo.style.display = "inline-block";
      simbolo.style.width = "22px";
      simbolo.style.height = "12px";
      simbolo.style.marginRight = "8px";
      simbolo.style.border = "1px solid #666";
      simbolo.style.borderRadius = "2px";
      simbolo.style.backgroundColor = layer.renderer?.symbol?.color || "#ccc";

      const nomeTexto = document.createElement("span");
      nomeTexto.textContent = nome;
      nomeTexto.style.whiteSpace = "nowrap";

      label.appendChild(checkbox);
      label.appendChild(simbolo);
      label.appendChild(nomeTexto);
      conteudo.appendChild(label);
    });
  }

  // ---- CRIAÇÃO DAS CAMADAS ----
  camadas.forEach(cfg => {
    const simbologia = cfg.tipo === "polygon"
      ? {
          type: "simple",
          symbol: {
            type: "simple-fill",
            color: cfg.fill || [0, 0, 0, 0],
            outline: { color: cfg.cor, width: cfg.width }
          }
        }
      : simpleLineRenderer(cfg.cor, cfg.width);

    const layer = new GeoJSONLayer({
      url: cfg.url,
      title: cfg.nome,
      popupTemplate: popups[cfg.nome],
      renderer: simbologia
    });

    map.add(layer);
    layersDict[cfg.nome] = layer;
  });

  rebuildLegendContent();

  // ---- ROTA VIA OSRM ----
  let rotaAtiva = false;
  let pontos = [];

  routeButton.addEventListener("click", () => {
    rotaAtiva = !rotaAtiva;
    routeButton.style.background = rotaAtiva ? "#00b894" : "#0079c1";
    routeButton.textContent = rotaAtiva ? "🗺️ Clique dois pontos" : "🚗 Traçar rota";
    if (!rotaAtiva) {
      pontos = [];
      view.graphics.removeAll();
    }
  });

  async function calcularRotaOSRM(origem, destino) {
    const url = `https://router.project-osrm.org/route/v1/driving/${origem.longitude},${origem.latitude};${destino.longitude},${destino.latitude}?overview=full&geometries=geojson`;
    const resp = await fetch(url);
    const data = await resp.json();
    const coords = data.routes[0].geometry.coordinates;

    const rota = new Graphic({
      geometry: {
        type: "polyline",
        paths: coords,
        spatialReference: { wkid: 4326 }
      },
      symbol: { type: "simple-line", color: [0, 128, 255, 0.9], width: 4 }
    });

    view.graphics.add(rota);
  }

  view.on("click", (event) => {
    if (!rotaAtiva) return;

    const ponto = new Graphic({
      geometry: event.mapPoint,
      symbol: { type: "simple-marker", color: "red", size: 8 }
    });
    view.graphics.add(ponto);
    pontos.push(event.mapPoint);

    if (pontos.length === 2) {
      calcularRotaOSRM(pontos[0], pontos[1]);
      rotaAtiva = false;
      routeButton.style.background = "#0079c1";
      routeButton.textContent = "🚗 Traçar rota";
      pontos = [];
    }
  });
});
