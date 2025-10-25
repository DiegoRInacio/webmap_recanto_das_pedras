require([
  "esri/Map",
  "esri/views/MapView",
  "esri/layers/GeoJSONLayer",
  "esri/renderers/UniqueValueRenderer"
], function (Map, MapView, GeoJSONLayer, UniqueValueRenderer) {

  // ---- MAPA BASE ----
  const map = new Map({
    basemap: "hybrid"
  });

  // ---- VIEW ----
  const view = new MapView({
    container: "viewDiv",
    map: map,
    center: [-43.012915, -22.312919],
    zoom: 14
  });

  // ---- TROCA DE BASEMAP ----
  const select = document.getElementById("basemapSelect");
  select.addEventListener("change", () => {
    map.basemap = select.value;
  });

  // ---- POPUPS ESPECÍFICOS POR CAMADA ----
  const popups = {
    "Limite do Imóvel": {
      title: "Limite do Imóvel",
      content: [
        {
          type: "fields",
          fieldInfos: [
            { fieldName: "Nome", label: "Nome do Imóvel" },
            { fieldName: "CAR", label: "Número do CAR" }
          ]
        }
      ]
    },
    "RPPN": {
      title: "Reserva Particular do Patrimônio Natural",
      content: [
        {
          type: "fields",
          fieldInfos: [
            { fieldName: "nome", label: "Nome da RPPN" },
            { fieldName: "jurisdicao", label: "Jurisdição" },
            { fieldName: "categoria", label: "Categoria" },
            { fieldName: "area ha", label: "Área (ha)" }
          ]
        }
      ]
    },
    "Hidrografia": {
      title: "Hidrografia",
      content: [
        {
          type: "fields",
          fieldInfos: [
            { fieldName: "NOME", label: "Nome do Curso d’Água" },
            { fieldName: "SHAPE_Leng", label: "Extensão (° decimais)" }
          ]
        }
      ]
    },
    "Unidades de Conservação": {
      title: "Unidade de Conservação",
      content: [
        {
          type: "fields",
          fieldInfos: [
            { fieldName: "nome", label: "Nome" },
            { fieldName: "jurisdicao", label: "Jurisdição" },
            { fieldName: "categoria", label: "Categoria" },
            { fieldName: "municipio", label: "Município" },
            { fieldName: "tipo", label: "Tipo" },
            { fieldName: "area ha", label: "Área (ha)" }
          ]
        }
      ]
    }
  };

  // ---- CAMADAS ----
  const camadas = [
    {
      nome: "Limite do Imóvel",
      url: "camadas/imovel.geojson",
      cor: "#ff6600",
      tipo: "polygon",
      fill: [255, 102, 0, 0.1],
      width: 3
    },
    {
      nome: "RPPN",
      url: "camadas/rppn.geojson",
      cor: "#00ff80",
      tipo: "polygon",
      fill: [0, 255, 128, 0.15],
      width: 2
    },
    {
      nome: "Hidrografia",
      url: "camadas/hidrografia_imovel.geojson",
      cor: "#00bfff",
      tipo: "line",
      width: 2
    },
    {
      nome: "PNMM de Teresópolis",
      url: "camadas/ucs_municipio.geojson",
      cor: "#006400", // verde escuro
      tipo: "polygon",
      fill: [0, 100, 0, 0.15], // verde escuro transparente
      width: 2
    },
    {
      nome: "Limite Municipal",
      url: "camadas/municipio.geojson",
      cor: "#ffffff",
      tipo: "polygon",
      fill: [255, 255, 255, 0],
      width: 1.5
    }
  ];

  // Dicionário de camadas para legenda
  const layersDict = {};

  // Adiciona as camadas GeoJSON
  camadas.forEach(cfg => {
    const simbologia = cfg.tipo === "polygon"
      ? {
          type: "simple",
          symbol: {
            type: "simple-fill",
            color: cfg.fill || [0, 0, 0, 0],
            outline: {
              color: cfg.cor,
              width: cfg.width
            }
          }
        }
      : {
          type: "simple",
          symbol: {
            type: "simple-line",
            color: cfg.cor,
            width: cfg.width
          }
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

  // ---- CAMADA DE TRILHAS (corrigida) ----
const cores = [
  "#ff8000", "#00ffff", "#00ff00", "#ff00ff", "#ff0000",
  "#ffff00", "#008080", "#0000ff", "#800080", "#8b4513",
  "#2e8b57", "#1e90ff", "#ff1493", "#ff4500", "#00ced1"
];

const trilhasRenderer = {
  type: "unique-value",
  field: "Nome",
  defaultSymbol: {
    type: "simple-line",
    color: "gray",
    width: 2.5
  },
  uniqueValueInfos: []
};

const trilhasLayer = new GeoJSONLayer({
  url: "camadas/trilhas_imovel.geojson",
  title: "Trilhas",
  popupTemplate: {
    title: "{Nome}",
    content: [
      {
        type: "fields",
        fieldInfos: [
          { fieldName: "Nome", label: "Nome da Trilha" },
          { fieldName: "extensao", label: "Extensão (m)" }
        ]
      }
    ]
  }
});

// 🔧 Leitura completa, garantindo que todas as features apareçam
trilhasLayer.when(() => {
  trilhasLayer.queryFeatures().then((res) => {
    const nomes = [];
    const mapaCores = {};

    res.features.forEach((f, i) => {
      let nome = f.attributes.Nome;
      if (!nome || nome.trim() === "") nome = "Sem Nome";

      // evita duplicar nomes, mas garante cor única
      if (!mapaCores[nome]) {
        mapaCores[nome] = cores[nomes.length % cores.length];
        nomes.push(nome);
      }
    });

    // monta renderer completo com todos os nomes (inclusive "Sem Nome")
    trilhasRenderer.uniqueValueInfos = Object.entries(mapaCores).map(([nome, cor]) => ({
      value: nome,
      symbol: {
        type: "simple-line",
        color: cor,
        width: 2.8
      },
      label: nome
    }));

    // aplica renderer atualizado
    trilhasLayer.renderer = trilhasRenderer;
  });
});

map.add(trilhasLayer);
layersDict["Trilhas"] = trilhasLayer;

  // ---- PAINEL DE LEGENDA ----
  const painel = document.createElement("div");
  painel.id = "painelCamadas";
  painel.innerHTML = "<h2 style='margin-top:0;color:#0079c1'>Simbologia</h2>";
  painel.style.cssText = `
    position: absolute;
    top: 70px;
    right: 10px;
    background: rgba(255,255,255,0.95);
    padding: 14px 16px;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0,0,0,0.3);
    font-family: Arial, sans-serif;
    min-width: 230px;
    font-size: 14px;
  `;

  Object.entries(layersDict).forEach(([nome, layer]) => {
    const camadaInfo = camadas.find(c => c.nome === nome) || { cor: "gray" };
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
    simbolo.style.backgroundColor = camadaInfo.fill
      ? `rgba(${camadaInfo.fill.join(",")})`
      : camadaInfo.cor;

    const nomeTexto = document.createElement("span");
    nomeTexto.textContent = nome;
    nomeTexto.style.whiteSpace = "nowrap";

    label.appendChild(checkbox);
    label.appendChild(simbolo);
    label.appendChild(nomeTexto);
    painel.appendChild(label);
  });

  view.ui.add(painel, "top-right");
});
