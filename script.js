require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GeoJSONLayer"
], function (Map, MapView, GeoJSONLayer) {

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
        { fieldName: "NOME", label: "Nome do Curso d’Água" },
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

  // ---- CAMADAS PRINCIPAIS ----
  const camadas = [
    { nome: "Limite do Imóvel", url: "camadas/imovel.geojson", cor: "#ff6600", tipo: "polygon", fill: [255,102,0,0.1], width: 3 },
    { nome: "RPPN", url: "camadas/rppn.geojson", cor: "#00ff80", tipo: "polygon", fill: [0,255,128,0.15], width: 2 },
    { nome: "Hidrografia", url: "camadas/hidrografia_imovel.geojson", cor: "#00bfff", tipo: "line", width: 2 },
    { nome: "Unidades de Conservação", url: "camadas/ucs_municipio.geojson", cor: "#006400", tipo: "polygon", fill: [0,100,0,0.15], width: 2 }
  ];

  const layersDict = {};

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
      : {
          type: "simple",
          symbol: { type: "simple-line", color: cfg.cor, width: cfg.width }
        };

    const layer = new GeoJSONLayer({
      url: cfg.url,
      title: cfg.nome,
      popupTemplate: popups[cfg.nome],
      renderer: simbologia
    });

    map.add(layer);
    layersDict[cfg.nome] = layer;
  });

  // ---- PAINEL RETRÁTIL (LEGENDA) ----
  const painel = document.createElement("div");
  painel.id = "painelLegenda";
  painel.style.cssText = `
    position: absolute;
    top: 70px;
    right: 10px;
    background: rgba(255,255,255,0.95);
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0,0,0,0.3);
    font-family: Arial, sans-serif;
    min-width: 260px;
    font-size: 14px;
    overflow: hidden;
  `;

  const header = document.createElement("div");
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
  conteudo.style.cssText = `
    padding: 10px 14px;
    display: none;
  `;

  Object.entries(layersDict).forEach(([nome, layer]) => {
    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.marginBottom = "6px";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = true;
    checkbox.style.marginRight = "8px";
    checkbox.addEventListener("change", e => {
      layer.visible = e.target.checked;
    });

    const simbolo = document.createElement("span");
    simbolo.style.display = "inline-block";
    simbolo.style.width = "20px";
    simbolo.style.height = "12px";
    simbolo.style.marginRight = "8px";
    simbolo.style.border = "1px solid #666";
    simbolo.style.backgroundColor = layer.renderer.symbol.color;

    const nomeTexto = document.createElement("span");
    nomeTexto.textContent = nome;
    nomeTexto.style.whiteSpace = "nowrap";

    label.appendChild(checkbox);
    label.appendChild(simbolo);
    label.appendChild(nomeTexto);
    conteudo.appendChild(label);

    // Se for Unidades de Conservação → adiciona nomes das UCs
    if (nome === "Unidades de Conservação") {
      layer.when(() => {
        layer.queryFeatures().then(res => {
          const listaUC = document.createElement("div");
          listaUC.style.margin = "5px 0 5px 28px";
          listaUC.style.maxHeight = "150px";
          listaUC.style.overflowY = "auto";
          listaUC.style.borderLeft = "2px solid #ccc";
          listaUC.style.paddingLeft = "8px";

          res.features.forEach(f => {
            const uc = f.attributes;
            const item = document.createElement("div");
            item.style.marginBottom = "4px";
            item.textContent = uc.nome || "(Sem nome)";
            listaUC.appendChild(item);
          });

          conteudo.appendChild(listaUC);
        });
      });
    }
  });

  header.addEventListener("click", () => {
    const aberto = conteudo.style.display === "block";
    conteudo.style.display = aberto ? "none" : "block";
    header.textContent = aberto ? "Legenda ▼" : "Legenda ▲";
  });

  painel.appendChild(header);
  painel.appendChild(conteudo);
  view.ui.add(painel, "top-right");
});
