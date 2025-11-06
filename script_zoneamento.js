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
    "Zoneamento do Imóvel": {
      title: "Zoneamento do Imóvel",
      content: [{ type: "fields", fieldInfos: [
        { fieldName: "Zoneamento", label: "Zona" },
        { fieldName: "ha", label: "Área (ha)" }
      ]}]
    },
    "Zoneamento da RPPN": {
      title: "Zoneamento da RPPN",
      content: [{ type: "fields", fieldInfos: [
        { fieldName: "Zona", label: "Zona" },
        { fieldName: "Sigla_Zona", label: "Sigla da Zona" },
        { fieldName: "Area_ha", label: "Área (ha)" }
      ]}]
    },
    "Áreas da RPPN": {
      title: "Áreas da RPPN",
      content: [{ type: "fields", fieldInfos: [
        { fieldName: "Nome_Area", label: "Nome da Área" },
        { fieldName: "Sigla_Area", label: "Sigla" },
        { fieldName: "Area_ha", label: "Área (ha)" }
      ]}]
    },
    "Trilhas": {
      title: "{Nome}",
      content: [{ type: "fields", fieldInfos: [
        { fieldName: "Nome", label: "Nome da Trilha" },
        { fieldName: "extensao", label: "Extensão (m)" },
        { fieldName: "id", label: "ID" }
      ]}]
    }
  };

  // ---- CAMADAS ----
  const camadas = [
    { nome: "Zoneamento do Imóvel", url: "camadas/zoneamento_imovel.geojson" },
    { nome: "Zoneamento da RPPN", url: "camadas/zoneamento_rppn.geojson" },
    { nome: "Áreas da RPPN", url: "camadas/areas_rppn.geojson" },
    { nome: "Trilhas", url: "camadas/trilhas_imovel.geojson" }
  ];

  const layersDict = {};

  // ---- PALETAS DE CORES ----
  const paletteImovel = ["#90caf9","#64b5f6","#42a5f5","#1e88e5","#1565c0"];
  const paletteRppn   = ["#81c784","#66bb6a","#4caf50","#43a047","#2e7d32"];
  const paletteAreas  = ["#ce93d8","#ba68c8","#ab47bc","#9c27b0","#8e24aa"];
  const paletteTrilhas = [
  "#fff176", // amarelo claro
  "#ffb74d", // laranja médio
  "#fb8c00", // laranja forte
  "#f4511e", // laranja-avermelhado
  "#e64a19", // vermelho queimado
  "#d84315", // vermelho escuro
  "#bf360c", // marrom-avermelhado escuro
  "#ff9800", // laranja vivo
  "#ffcc80", // bege-laranja suave
  "#ff6f00"  // laranja intenso
];

  // ---- FUNÇÃO DE CONVERSÃO HEX → RGBA ----
  function hexToRgba(hex, alpha = 1.0) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b, alpha];
  }

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

  header.addEventListener("click", () => {
    const aberto = conteudo.style.display === "block";
    conteudo.style.display = aberto ? "none" : "block";
    header.textContent = aberto ? "Legenda ▼" : "Legenda ▲";
  });

  painel.appendChild(header);
  painel.appendChild(conteudo);
  view.ui.add(painel, "top-right");

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

      if (layer.renderer?.uniqueValueInfos?.length) {
        const sub = document.createElement("div");
        sub.style.margin = "6px 0 6px 28px";
        sub.style.maxHeight = "150px";
        sub.style.overflowY = "auto";

        layer.renderer.uniqueValueInfos.forEach(info => {
          const row = document.createElement("div");
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.marginBottom = "4px";

          const sw = document.createElement("span");
          sw.style.display = "inline-block";
          sw.style.width = "22px";
          sw.style.height = "10px";
          sw.style.marginRight = "8px";
          sw.style.border = "1px solid #666";
          sw.style.borderRadius = "2px";
          sw.style.backgroundColor = info.symbol.color;

          const txt = document.createElement("span");
          txt.textContent = info.label;

          row.appendChild(sw);
          row.appendChild(txt);
          sub.appendChild(row);
        });
        conteudo.appendChild(sub);
      }
    });
  }

  // ---- CRIA CADA CAMADA ----
  camadas.forEach(cfg => {
    let renderer;
    const nome = cfg.nome;

    // Zoneamento do Imóvel
    if (nome === "Zoneamento do Imóvel") {
      renderer = new UniqueValueRenderer({ field: "Zoneamento" });
      const layer = new GeoJSONLayer({
        url: cfg.url,
        title: nome,
        popupTemplate: popups[nome],
        renderer
      });

      layer.when(async () => {
        const { features } = await layer.queryFeatures({ returnGeometry: false, outFields: ["Zoneamento"] });
        const uniq = [...new Set(features.map(f => f.attributes.Zoneamento))];

        renderer.uniqueValueInfos = uniq.map(v => {
          let fillColor;

          // Define cor com base no nome da zona
          switch (v.toLowerCase()) {
            case "zona roxa":
              fillColor = [156, 39, 176, 0.45]; // Roxa
              break;
            case "zona laranja":
              fillColor = [251, 140, 0, 0.45]; // Laranja
              break;
            case "zona verde":
              fillColor = [0, 128, 128, 0.45]; // Verde-azulado forte (#008080)
              break;
            default:
              fillColor = [96, 125, 139, 0.4]; // fallback (cinza-azulado)
          }

          return {
            value: v,
            label: v,
            symbol: {
              type: "simple-fill",
              color: fillColor,
              outline: { color: [0, 0, 0, 0.6], width: 1.2 }
            }
          };
        });

        layer.renderer = renderer;
        rebuildLegendContent();
      });

      map.add(layer);
      layersDict[nome] = layer;
      return;
    }


    // Zoneamento da RPPN
    if (nome === "Zoneamento da RPPN") {
      renderer = new UniqueValueRenderer({ field: "Zona" });
      const layer = new GeoJSONLayer({
        url: cfg.url,
        title: nome,
        popupTemplate: popups[nome],
        renderer
      });

      layer.when(async () => {
        const { features } = await layer.queryFeatures({
          returnGeometry: false,
          outFields: ["Zona"]
        });
        const uniq = [...new Set(features.map(f => f.attributes.Zona))];

        renderer.uniqueValueInfos = uniq.map(v => {
          let fillColor;

          // Define cores mais contrastantes e naturais por nome de zona
          switch (v.toLowerCase()) {
            case "zona de preservação":
              // Verde musgo claro e opaco — levemente amarelado
              fillColor = [107, 142, 35, 0.25]; // #6B8E23
              break;
            case "zona de conservação":
              // Verde oliva escuro e bem apagado
              fillColor = [47, 79, 47, 0.35]; // #2F4F2F
              break;
            default:
              // fallback verde acinzentado neutro
              fillColor = [120, 150, 120, 0.25]; // #789678
          }

          return {
            value: v,
            label: v,
            symbol: {
              type: "simple-fill",
              color: fillColor,
              outline: { color: [0, 0, 0, 0.6], width: 1.2 }
            }
          };
        });

        layer.renderer = renderer;
        rebuildLegendContent();
      });

      map.add(layer);
      layersDict[nome] = layer;
      return;
    }

    // Áreas da RPPN
    if (nome === "Áreas da RPPN") {
      renderer = new UniqueValueRenderer({ field: "Nome_Area" });
      const layer = new GeoJSONLayer({ url: cfg.url, title: nome, popupTemplate: popups[nome], renderer });

      layer.when(async () => {
        const { features } = await layer.queryFeatures({ returnGeometry: false, outFields: ["Nome_Area"] });
        const uniq = [...new Set(features.map(f => f.attributes.Nome_Area))];
        renderer.uniqueValueInfos = uniq.map((v, i) => ({
          value: v,
          label: v,
          symbol: {
            type: "simple-fill",
            color: hexToRgba(paletteAreas[i % paletteAreas.length], 0.4),
            outline: { color: "#4a148c", width: 1.2 }
          }
        }));
        layer.renderer = renderer;
        rebuildLegendContent();
      });
      map.add(layer);
      layersDict[nome] = layer;
      return;
    }

    // Trilhas
    if (nome === "Trilhas") {
      renderer = new UniqueValueRenderer({ field: "Nome" });
      const layer = new GeoJSONLayer({ url: cfg.url, title: nome, popupTemplate: popups[nome], renderer });

      layer.when(async () => {
        const { features } = await layer.queryFeatures({ returnGeometry: false, outFields: ["Nome"] });
        const uniq = [...new Set(features.map(f => f.attributes.Nome))];
        renderer.uniqueValueInfos = uniq.map((v, i) => ({
          value: v,
          label: v,
          symbol: {
            type: "simple-line",
            color: hexToRgba(paletteTrilhas[i % paletteTrilhas.length], 0.9),
            width: 1.8
          }
        }));
        layer.renderer = renderer;
        rebuildLegendContent();
      });
      map.add(layer);
      layersDict[nome] = layer;
    }
  });
});
