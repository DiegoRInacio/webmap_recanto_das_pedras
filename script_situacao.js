require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GeoJSONLayer",
  "esri/Graphic",
  "esri/layers/WebTileLayer",
  "esri/Basemap"
], function (Map, MapView, GeoJSONLayer, Graphic, WebTileLayer, Basemap) {

  function createGoogleBasemap(tipo) {
    let urlTemplate = "https://mt1.google.com/vt/lyrs=s&x={col}&y={row}&z={level}";

    switch (tipo) {
      case "google-hybrid":
        urlTemplate = "https://mt1.google.com/vt/lyrs=y&x={col}&y={row}&z={level}";
        break;
      case "google-streets":
        urlTemplate = "https://mt1.google.com/vt/lyrs=m&x={col}&y={row}&z={level}";
        break;
      case "google-satelite":
      default:
        urlTemplate = "https://mt1.google.com/vt/lyrs=s&x={col}&y={row}&z={level}";
        break;
    }

    const googleLayer = new WebTileLayer({
      urlTemplate,
      copyright: "© Google Maps"
    });

    return new Basemap({
      baseLayers: [googleLayer],
      title: "Google Maps",
      id: `google-basemap-${tipo}`
    });
  }

  function applyBasemap(map, valor) {
    if (valor === "satellite" || valor === "hybrid" || valor === "topo-vector") {
      map.basemap = valor;
      return;
    }

    if (valor.startsWith("google-")) {
      map.basemap = createGoogleBasemap(valor);
    }
  }

  const map = new Map({ basemap: createGoogleBasemap("google-satelite") });

  const view = new MapView({
    container: "viewDiv",
    map,
    center: [-43.012915, -22.312919],
    zoom: 14,
    popup: {
      dockEnabled: window.matchMedia("(max-width: 768px)").matches,
      dockOptions: {
        buttonEnabled: true,
        breakpoint: false,
        position: "bottom-center"
      }
    }
  });

  const basemapSelect = document.getElementById("basemapSelect");
  basemapSelect.value = "google-satelite";
  applyBasemap(map, "google-satelite");
  view.when(function () {
    applyBasemap(map, "google-satelite");
  });

  basemapSelect.addEventListener("change", function () {
    applyBasemap(map, basemapSelect.value);
  });

  const routeButton = document.createElement("button");
  routeButton.textContent = "Tracar rota";
  routeButton.style.cssText = `
    position: absolute;
    top: 160px;
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

  function syncResponsiveUi() {
    const isMobile = window.innerWidth < 768;
    routeButton.style.top = isMobile ? "190px" : "160px";
    routeButton.style.left = isMobile ? "12px" : "15px";
    routeButton.style.maxWidth = isMobile ? "calc(100vw - 24px)" : "none";
    view.popup.dockEnabled = isMobile;
  }

  syncResponsiveUi();
  window.addEventListener("resize", syncResponsiveUi);

  const popups = {
    "Limite do Imovel": {
      title: "Limite do Imovel",
      content: [{ type: "fields", fieldInfos: [
        { fieldName: "Nome", label: "Nome do Imovel" },
        { fieldName: "CAR", label: "Numero do CAR" }
      ]}]
    },
    "RPPN": {
      title: "Reserva Particular do Patrimonio Natural",
      content: [{ type: "fields", fieldInfos: [
        { fieldName: "nome", label: "Nome da RPPN" },
        { fieldName: "jurisdicao", label: "Jurisdicao" },
        { fieldName: "categoria", label: "Categoria" },
        { fieldName: "area ha", label: "Area (ha)" }
      ]}]
    },
    "Hidrografia": {
      title: "Hidrografia",
      content: [{ type: "fields", fieldInfos: [
        { fieldName: "NOME", label: "Nome do Curso d'Agua" },
        { fieldName: "SHAPE_Leng", label: "Extensao (graus decimais)" }
      ]}]
    },
    "Unidades de Conservacao": {
      title: "Unidade de Conservacao",
      content: [{ type: "fields", fieldInfos: [
        { fieldName: "nome", label: "Nome" },
        { fieldName: "jurisdicao", label: "Jurisdicao" },
        { fieldName: "categoria", label: "Categoria" },
        { fieldName: "municipio", label: "Municipio" },
        { fieldName: "tipo", label: "Tipo" },
        { fieldName: "area ha", label: "Area (ha)" }
      ]}]
    }
  };

  const camadas = [
    { nome: "Limite do Imovel", url: "camadas/imovel.geojson", cor: "#ff6600", tipo: "polygon", fill: [255, 102, 0, 0.1], width: 3 },
    { nome: "RPPN", url: "camadas/rppn.geojson", cor: "#00ff80", tipo: "polygon", fill: [0, 255, 128, 0.15], width: 2 },
    { nome: "Hidrografia", url: "camadas/hidrografia_imovel.geojson", cor: "#00bfff", tipo: "line", width: 2 },
    { nome: "Unidades de Conservacao", url: "camadas/ucs_municipio.geojson", cor: "#006400", tipo: "polygon", fill: [0, 100, 0, 0.15], width: 2 }
  ];

  const layersDict = {};

  const simpleLineRenderer = function (color, width) {
    return {
      type: "simple",
      symbol: { type: "simple-line", color, width: width || 2 }
    };
  };

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
  conteudo.style.cssText = "padding: 10px 14px; display: block;";

  header.addEventListener("click", function () {
    const aberto = conteudo.style.display === "block";
    conteudo.style.display = aberto ? "none" : "block";
    header.textContent = aberto ? "Legenda ▼" : "Legenda ▲";
  });

  painel.appendChild(header);
  painel.appendChild(conteudo);
  view.ui.add(painel, "top-right");

  if (window.matchMedia("(max-width: 768px)").matches) {
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
  } else {
    painel.style.position = "absolute";
    painel.style.top = "70px";
    painel.style.right = "10px";
    painel.style.width = "260px";
    painel.style.maxHeight = "calc(100vh - 100px)";
    painel.style.overflowY = "auto";
  }

  function rebuildLegendContent() {
    conteudo.innerHTML = "";

    Object.entries(layersDict).forEach(function (entry) {
      const nome = entry[0];
      const layer = entry[1];
      const symbol = layer.legendaSimbolo;
      if (!symbol) return;

      const label = document.createElement("div");
      label.style.display = "flex";
      label.style.alignItems = "center";
      label.style.marginBottom = "8px";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = layer.visible ?? true;
      checkbox.style.marginRight = "8px";
      checkbox.addEventListener("change", function (e) {
        layer.visible = e.target.checked;
      });
      label.appendChild(checkbox);

      const simbolo = document.createElement("div");
      simbolo.style.width = "28px";
      simbolo.style.height = "18px";
      simbolo.style.marginRight = "8px";
      simbolo.style.borderRadius = "3px";

      if (symbol.type === "simple-fill") {
        const fill = symbol.color;
        const out = symbol.outline;
        simbolo.style.backgroundColor = `rgba(${fill[0]}, ${fill[1]}, ${fill[2]}, ${fill[3]})`;
        simbolo.style.border = `${out.width}px solid ${out.color}`;
      }

      if (symbol.type === "simple-line") {
        simbolo.style.background = symbol.color;
        simbolo.style.height = `${Math.max(3, symbol.width * 2)}px`;
        simbolo.style.border = "none";
      }

      label.appendChild(simbolo);

      const nomeTexto = document.createElement("span");
      nomeTexto.textContent = nome;
      nomeTexto.style.whiteSpace = "nowrap";

      label.appendChild(nomeTexto);
      conteudo.appendChild(label);
    });
  }

  camadas.forEach(function (cfg) {
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

    layer.legendaSimbolo = simbologia.symbol;

    map.add(layer);
    layersDict[cfg.nome] = layer;
  });

  rebuildLegendContent();

  let rotaAtiva = false;
  let pontos = [];

  routeButton.addEventListener("click", function () {
    rotaAtiva = !rotaAtiva;
    routeButton.style.background = rotaAtiva ? "#00b894" : "#0079c1";
    routeButton.textContent = rotaAtiva ? "Clique em dois pontos" : "Tracar rota";
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

  view.on("click", function (event) {
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
      routeButton.textContent = "Tracar rota";
      pontos = [];
    }
  });
});
