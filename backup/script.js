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

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  if (isMobile) {
    painel.style.position = "fixed";
    painel.style.left = "0";
    painel.style.right = "0";
    painel.style.bottom = "0";
    painel.style.maxHeight = "50vh";
    painel.style.overflowY = "auto";
    painel.style.borderRadius = "12px 12px 0 0";
    painel.style.margin = "0 8px";
    painel.style.zIndex = "9999";
  } else {
    painel.style.position = "absolute";
    painel.style.top = "70px";
    painel.style.right = "10px";
    painel.style.minWidth = "260px";
    painel.style.maxHeight = "calc(100vh - 100px)";
    painel.style.overflowY = "auto";
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

  conteudo.style.display = isMobile ? "none" : "block";
  header.textContent = isMobile ? "Legenda ▼" : "Legenda ▲";

  // ---- FUNÇÃO: Reconstruir conteúdo da legenda ----
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
      if (r?.type === "unique-value") {
        const c = r.defaultSymbol?.color || "#00e0ff";
        simbolo.style.backgroundColor = c;
      } else {
        simbolo.style.backgroundColor = r?.symbol?.color || "#ccc";
      }

      const nomeTexto = document.createElement("span");
      nomeTexto.textContent = nome;
      nomeTexto.style.whiteSpace = "nowrap";

      label.appendChild(checkbox);
      label.appendChild(simbolo);
      label.appendChild(nomeTexto);
      conteudo.appendChild(label);

      // ---- Subitens das trilhas com cor individual ----
      if (nome === "Trilhas" && layer.renderer?.uniqueValueInfos?.length) {
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

  rebuildLegendContent();

  header.addEventListener("click", () => {
    const aberto = conteudo.style.display === "block";
    conteudo.style.display = aberto ? "none" : "block";
    header.textContent = aberto ? "Legenda ▼" : "Legenda ▲";
  });

  painel.appendChild(header);
  painel.appendChild(conteudo);
  view.ui.add(painel, "top-right");

  // ---- Corrige posição e visibilidade no modo mobile ----
  if (isMobile) {
    if (!document.body.contains(painel)) {
      document.body.appendChild(painel);
    }

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

    setTimeout(() => {
      painel.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 400);
  }

  // ---- Reconstrói legenda após todas as camadas carregarem ----
  view.whenLayerView(map.layers).then(() => {
    setTimeout(() => {
      rebuildLegendContent();
      painel.style.display = "block";
    }, 800);
  });

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

        setTimeout(() => {
          rebuildLegendContent();
        }, 300);
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
