require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GeoJSONLayer",
  "esri/renderers/UniqueValueRenderer"
], function (Map, MapView, GeoJSONLayer, UniqueValueRenderer) {

  // ---- MAPA BASE ----
  const map = new Map({ basemap: "hybrid" });

  const view = new MapView({
    container: "viewDiv",
    map,
    center: [-43.012915, -22.312919],
    zoom: 14
  });

  // ---- TROCA DE BASEMAP ----
  const select = document.getElementById("basemapSelect");
  select.addEventListener("change", () => (map.basemap = select.value));

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
    },
    "Trilhas": {
      title: "{Nome}",
      content: [{ type: "fields", fieldInfos: [
        { fieldName: "Nome", label: "Nome da Trilha" },
        { fieldName: "extensao", label: "Extensão (m ou unidade do arquivo)" },
        { fieldName: "id", label: "ID" }
      ]}]
    }
  };

  // ---- CAMADAS PRINCIPAIS ----
  const camadas = [
    { nome: "Limite do Imóvel", url: "camadas/imovel.geojson", cor: "#ff6600", tipo: "polygon", fill: [255,102,0,0.1], width: 3 },
    { nome: "RPPN", url: "camadas/rppn.geojson", cor: "#00ff80", tipo: "polygon", fill: [0,255,128,0.15], width: 2 },
    { nome: "Hidrografia", url: "camadas/hidrografia_imovel.geojson", cor: "#00bfff", tipo: "line", width: 2 },
    { nome: "Unidades de Conservação", url: "camadas/ucs_municipio.geojson", cor: "#006400", tipo: "polygon", fill: [0,100,0,0.15], width: 2 },
    { nome: "Trilhas", url: "camadas/trilhas_imovel.geojson", tipo: "line" }
  ];

  const layersDict = {};

  // Paleta de cores fixa para as trilhas
  const palette = [
    "#00ffd0","#00bfff","#40ff00","#ff9900",
    "#ff00aa","#aa00ff","#ffd400","#00ff66",
    "#ff0066","#00aaff","#66ffcc","#33cc33"
  ];

  // Renderer simples de linha
  const simpleLineRenderer = (color, width=2) => ({
    type: "simple",
    symbol: { type: "simple-line", color, width }
  });

  // ---- PAINEL LEGENDA ----
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

  // ---- Corrige o posicionamento absoluto imposto pelo ArcGIS ----
  if (window.matchMedia("(max-width: 768px)").matches) {
    // Remove o painel da hierarquia da view e joga direto no body
    document.body.appendChild(painel);

    // Reposiciona manualmente
    painel.style.position = "fixed";
    painel.style.left = "0";
    painel.style.right = "0";
    painel.style.bottom = "0";
    painel.style.top = "auto";
    painel.style.margin = "0";
    painel.style.width = "100vw";
    painel.style.maxHeight = "50vh"; // metade da tela vertical
    painel.style.overflowY = "auto";
    painel.style.borderRadius = "12px 12px 0 0";
    painel.style.zIndex = "9999";

    // Garante que o painel esteja sempre visível
    setTimeout(() => {
      painel.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 500);
  }

  const header = document.createElement("div");
  header.className = "header";
  header.textContent = "Legenda ▼";
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
  conteudo.className = "conteudo";
  conteudo.style.cssText = `
    padding: 10px 14px;
    display: none;
  `;

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  conteudo.style.display = isMobile ? "none" : "block";
  header.textContent = isMobile ? "Legenda ▼" : "Legenda ▲";

  // ---- FUNÇÃO PARA MONTAR A LEGENDA ----
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
      checkbox.addEventListener("change", e => {
        layer.visible = e.target.checked;
      });

      const simbolo = document.createElement("span");
      simbolo.style.display = "inline-block";
      simbolo.style.width = "22px";
      simbolo.style.height = "12px";
      simbolo.style.marginRight = "8px";
      simbolo.style.border = "1px solid #666";
      simbolo.style.borderRadius = "2px";
      const r = layer.renderer;
      simbolo.style.backgroundColor = r?.symbol?.color || "#ccc";

      const nomeTexto = document.createElement("span");
      nomeTexto.textContent = nome;
      label.appendChild(checkbox);
      label.appendChild(simbolo);
      label.appendChild(nomeTexto);
      conteudo.appendChild(label);
    });
  }

  rebuildLegendContent();

  header.addEventListener("click", () => {
    const aberto = conteudo.style.display === "block";
    conteudo.style.display = aberto ? "none" : "block";
    header.textContent = aberto ? "Legenda ▼" : "Legenda ▲";
  });

  painel.appendChild(header);
  painel.appendChild(conteudo);
  view.ui.add(painel, "top-right");

  // ---- CAMADAS ----
  camadas.forEach(cfg => {
    let renderer;

    if (cfg.nome === "Trilhas") {
      renderer = new UniqueValueRenderer({
        field: "Nome",
        defaultSymbol: { type: "simple-line", color: "#00e0ff", width: 2 },
        defaultLabel: "Outras trilhas",
        uniqueValueInfos: []
      });

      const trilhasLayer = new GeoJSONLayer({
        url: cfg.url,
        title: cfg.nome,
        popupTemplate: popups[cfg.nome],
        renderer
      });

      trilhasLayer.when(async () => {
        const q = trilhasLayer.createQuery();
        q.returnGeometry = false;
        q.outFields = ["Nome"];
        const { features } = await trilhasLayer.queryFeatures(q);
        const uniq = [...new Set(features.map(f => f.attributes.Nome))];
        renderer.uniqueValueInfos = uniq.map((v, i) => ({
          value: v,
          label: v,
          symbol: { type: "simple-line", color: palette[i % palette.length], width: 2.5 }
        }));
        trilhasLayer.renderer = renderer;
        rebuildLegendContent();
      });

      map.add(trilhasLayer);
      layersDict[cfg.nome] = trilhasLayer;
      return;
    }

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
});