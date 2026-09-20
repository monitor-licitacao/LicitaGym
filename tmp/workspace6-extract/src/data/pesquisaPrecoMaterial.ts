// Dados reais da ingestão — Pesquisa de Preço de Material
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/1_consultarMaterial
// Filtro: tipo=codigoPdm&codigo=1005 (CORRIMÃO)
// Total: 128 registros em 13 páginas

export interface PesquisaPrecoMaterial {
  idCompra: number;
  dataCompra: string;
  forma: string;
  modalidade: number;
  dataHoraAtualizacaoCompra: string;
  idItemCompra: number;
  numeroItemCompra: number;
  niFornecedor: string;
  codigoItemCatalogo: number;
  quantidade: number;
  precoUnitario: number;
  descricaoItem: string;
  siglaUnidadeFornecimento: string | null;
  nomeUnidadeFornecimento: string | null;
  capacidadeUnidadeFornecimento: number;
  siglaUnidadeMedida: string | null;
  nomeUnidadeMedida: string | null;
  criterioJulgamento: string;
  percentualMaiorDesconto: number;
  nomeFornecedor: string;
  marca: string;
  dataResultado: string;
  dataHoraAtualizacaoItem: string;
  codigoUasg: string;
  nomeUasg: string;
  codigoOrgao: number;
  nomeOrgao: string;
  estado: string;
  codigoMunicipio: number;
  municipio: string;
  poder: string;
  esfera: string;
  dataHoraAtualizacaoUasg: string;
  codigoClasse: number;
  nomeClasse: string;
  idCompraItem: string;
  objetoCompra: string;
  descricaoDetalhadaItem: string;
  dataAtualizacaoFato: string;
  codigoPdm: string;
  nomePdm: string;
}

// Amostra da primeira página (10 registros)
export const pesquisaPrecoAmostra: PesquisaPrecoMaterial[] = [
  {
    idCompra: 12001606001522026,
    dataCompra: "2026-06-25",
    forma: "SISPP",
    modalidade: 6,
    dataHoraAtualizacaoCompra: "2026-07-29T02:22:55.237205",
    idItemCompra: 12283657,
    numeroItemCompra: 18,
    niFornecedor: "38537869000142",
    codigoItemCatalogo: 436478,
    quantidade: 16.0,
    precoUnitario: 28.53,
    descricaoItem: "CORRIMÃO, MATERIAL: AÇO INOXIDÁVEL, DIÂMETRO: 30 MM",
    siglaUnidadeFornecimento: "UN",
    nomeUnidadeFornecimento: "UNIDADE",
    capacidadeUnidadeFornecimento: 0,
    siglaUnidadeMedida: null,
    nomeUnidadeMedida: null,
    criterioJulgamento: "1",
    percentualMaiorDesconto: 0,
    nomeFornecedor: "SBR ENGENHARIA E CONSTRUCOES LTDA",
    marca: "SBR",
    dataResultado: "2026-07-28",
    dataHoraAtualizacaoItem: "2026-07-29T03:22:31.316472",
    codigoUasg: "120016",
    nomeUasg: "GRUPAMENTO DE APOIO DE SÃO JOSÉ DOS CAMPOS",
    codigoOrgao: 52111,
    nomeOrgao: "COMANDO DA AERONÁUTICA",
    estado: "SP",
    codigoMunicipio: 3549904,
    municipio: "SÃO JOSÉ DOS CAMPOS",
    poder: "E",
    esfera: "F",
    dataHoraAtualizacaoUasg: "2026-07-06T13:47:00",
    codigoClasse: 5445,
    nomeClasse: "ESTRUTURAS DE TORRES PRÉ-FABRICADAS",
    idCompraItem: "1200160600152202600018",
    objetoCompra: "Aquisição de itens para Simuladores de Voo",
    descricaoDetalhadaItem: "Corrimão material: aço inoxidável, diâmetro: 30",
    dataAtualizacaoFato: "2026-07-29T03:22:31.316472",
    codigoPdm: "1005",
    nomePdm: "CORRIMÃO"
  },
  {
    idCompra: 99020205900212026,
    dataCompra: "2026-06-08",
    forma: "SISPP",
    modalidade: 5,
    dataHoraAtualizacaoCompra: "2026-08-07T01:10:05.200495",
    idItemCompra: 12362512,
    numeroItemCompra: 135,
    niFornecedor: "48925960000199",
    codigoItemCatalogo: 442645,
    quantidade: 10.0,
    precoUnitario: 249.49,
    descricaoItem: "CORRIMÃO, MATERIAL: AÇO INOXIDÁVEL AISI 304, ACABAMENTO SUPERFICIAL: ESCOVADO, DIÂMETRO: 1 1/2 POL, ALTURA: 92 CM",
    siglaUnidadeFornecimento: "UN",
    nomeUnidadeFornecimento: "UNIDADE",
    capacidadeUnidadeFornecimento: 0,
    siglaUnidadeMedida: null,
    nomeUnidadeMedida: null,
    criterioJulgamento: "V",
    percentualMaiorDesconto: 0,
    nomeFornecedor: "FERMETAL INDUSTRIA E COMERCIO DE ARAMES LTDA",
    marca: "arcelor",
    dataResultado: "2026-06-08",
    dataHoraAtualizacaoItem: "2026-08-07T03:02:28.618884",
    codigoUasg: "990202",
    nomeUasg: "ESP-FUNDAÇÃO C.A.S.A. - SEDE ADMINISTRAÇÃO",
    codigoOrgao: 86641,
    nomeOrgao: "ESP-FUNDAÇÃO CASA - SP",
    estado: "SP",
    codigoMunicipio: 3550308,
    municipio: "SÃO PAULO",
    poder: "E",
    esfera: "E",
    dataHoraAtualizacaoUasg: "2025-04-03T14:47:00",
    codigoClasse: 5445,
    nomeClasse: "ESTRUTURAS DE TORRES PRÉ-FABRICADAS",
    idCompraItem: "9902020590021202600135",
    objetoCompra: "Aquisição de materiais de manutenção",
    descricaoDetalhadaItem: "CORRIMÃO, MATERIAL AÇO INOXIDÁVEL AISI 304, ACABAMENTO SUPERFICIAL ESCOVADO, DIÂMETRO 1 1/2 POL, ALTURA 92 CM",
    dataAtualizacaoFato: "2026-08-07T03:02:28.618884",
    codigoPdm: "1005",
    nomePdm: "CORRIMÃO"
  },
  {
    idCompra: 92505606001642026,
    dataCompra: "2026-05-13",
    forma: "SISPP",
    modalidade: 6,
    dataHoraAtualizacaoCompra: "2026-05-27T02:20:55.918288",
    idItemCompra: 11737656,
    numeroItemCompra: 1,
    niFornecedor: "34669250000130",
    codigoItemCatalogo: 436478,
    quantidade: 6.0,
    precoUnitario: 4176.67,
    descricaoItem: "CORRIMÃO, MATERIAL: AÇO INOXIDÁVEL, DIÂMETRO: 30 MM",
    siglaUnidadeFornecimento: "UN",
    nomeUnidadeFornecimento: "UNIDADE",
    capacidadeUnidadeFornecimento: 0,
    siglaUnidadeMedida: null,
    nomeUnidadeMedida: null,
    criterioJulgamento: "1",
    percentualMaiorDesconto: 0,
    nomeFornecedor: "MAX BRASIL LTDA",
    marca: "NACIONAL",
    dataResultado: "2026-05-26",
    dataHoraAtualizacaoItem: "2026-05-27T03:58:18.606946",
    codigoUasg: "925056",
    nomeUasg: "PMSP - SECRETARIA DO GOVERNO MUNICIPAL",
    codigoOrgao: 95446,
    nomeOrgao: "PMSP - SECRETARIA DO GOVERNO MUNICIPAL",
    estado: "SP",
    codigoMunicipio: 3550308,
    municipio: "SÃO PAULO",
    poder: "E",
    esfera: "M",
    dataHoraAtualizacaoUasg: "2023-05-17T12:58:00",
    codigoClasse: 5445,
    nomeClasse: "ESTRUTURAS DE TORRES PRÉ-FABRICADAS",
    idCompraItem: "9250560600164202600001",
    objetoCompra: "PAVIMENTO TÉRREO – CORRIMÃO: 1 Unidade, 3º PAVIMENTO – CORRIMÃO: 5 Unidades",
    descricaoDetalhadaItem: "Corrimão diâmetro: 30, material: aço inoxidável",
    dataAtualizacaoFato: "2026-05-27T03:58:18.606946",
    codigoPdm: "1005",
    nomePdm: "CORRIMÃO"
  },
  {
    idCompra: 7001705900082026,
    dataCompra: "2026-05-24",
    forma: "SISPP",
    modalidade: 5,
    dataHoraAtualizacaoCompra: "2026-05-25T01:10:00.168935",
    idItemCompra: 11706979,
    numeroItemCompra: 29,
    niFornecedor: "08402800000140",
    codigoItemCatalogo: 423582,
    quantidade: 150.0,
    precoUnitario: 80.0,
    descricaoItem: "CORRIMÃO, MATERIAL: AÇO INOXIDÁVEL, COMPRIMENTO: 80 CM",
    siglaUnidadeFornecimento: "UN",
    nomeUnidadeFornecimento: "UNIDADE",
    capacidadeUnidadeFornecimento: 0,
    siglaUnidadeMedida: null,
    nomeUnidadeMedida: null,
    criterioJulgamento: "V",
    percentualMaiorDesconto: 0,
    nomeFornecedor: "KIFERRO FERRAGENS EPP LTDA",
    marca: "Funisa",
    dataResultado: "2026-05-24",
    dataHoraAtualizacaoItem: "2026-05-25T03:00:02.250136",
    codigoUasg: "070017",
    nomeUasg: "TRIBUNAL REGIONAL ELEITORAL DO RIO DE JANEIRO",
    codigoOrgao: 91504,
    nomeOrgao: "TRIBUNAL REGIONAL ELEITORAL DO RIO DE JANEIRO",
    estado: "RJ",
    codigoMunicipio: 3304557,
    municipio: "RIO DE JANEIRO",
    poder: "E",
    esfera: "E",
    dataHoraAtualizacaoUasg: "2026-06-02T14:06:00",
    codigoClasse: 5445,
    nomeClasse: "ESTRUTURAS DE TORRES PRÉ-FABRICADAS",
    idCompraItem: "0700170590008202600029",
    objetoCompra: "Aquisição de materiais de serralheria e ferramental",
    descricaoDetalhadaItem: "CORRIMÃO, MATERIAL AÇO INOXIDÁVEL, COMPRIMENTO 80 CM",
    dataAtualizacaoFato: "2026-05-25T03:00:02.250136",
    codigoPdm: "1005",
    nomePdm: "CORRIMÃO"
  },
  {
    idCompra: 7001705900082026,
    dataCompra: "2026-05-24",
    forma: "SISPP",
    modalidade: 5,
    dataHoraAtualizacaoCompra: "2026-05-25T01:10:00.168935",
    idItemCompra: 11706980,
    numeroItemCompra: 30,
    niFornecedor: "08402800000140",
    codigoItemCatalogo: 423583,
    quantidade: 250.0,
    precoUnitario: 70.0,
    descricaoItem: "CORRIMÃO, MATERIAL: AÇO INOXIDÁVEL, COMPRIMENTO: 70 CM",
    siglaUnidadeFornecimento: "UN",
    nomeUnidadeFornecimento: "UNIDADE",
    capacidadeUnidadeFornecimento: 0,
    siglaUnidadeMedida: null,
    nomeUnidadeMedida: null,
    criterioJulgamento: "V",
    percentualMaiorDesconto: 0,
    nomeFornecedor: "KIFERRO FERRAGENS EPP LTDA",
    marca: "Funisa",
    dataResultado: "2026-05-24",
    dataHoraAtualizacaoItem: "2026-05-25T03:00:02.279791",
    codigoUasg: "070017",
    nomeUasg: "TRIBUNAL REGIONAL ELEITORAL DO RIO DE JANEIRO",
    codigoOrgao: 91504,
    nomeOrgao: "TRIBUNAL REGIONAL ELEITORAL DO RIO DE JANEIRO",
    estado: "RJ",
    codigoMunicipio: 3304557,
    municipio: "RIO DE JANEIRO",
    poder: "E",
    esfera: "E",
    dataHoraAtualizacaoUasg: "2026-06-02T14:06:00",
    codigoClasse: 5445,
    nomeClasse: "ESTRUTURAS DE TORRES PRÉ-FABRICADAS",
    idCompraItem: "0700170590008202600030",
    objetoCompra: "Aquisição de materiais de serralheria e ferramental",
    descricaoDetalhadaItem: "CORRIMÃO, MATERIAL AÇO INOXIDÁVEL, COMPRIMENTO 70 CM",
    dataAtualizacaoFato: "2026-05-25T03:00:02.279791",
    codigoPdm: "1005",
    nomePdm: "CORRIMÃO"
  },
  {
    idCompra: 7001705900082026,
    dataCompra: "2026-05-24",
    forma: "SISPP",
    modalidade: 5,
    dataHoraAtualizacaoCompra: "2026-05-25T01:10:00.168935",
    idItemCompra: 11706984,
    numeroItemCompra: 34,
    niFornecedor: "08402800000140",
    codigoItemCatalogo: 436478,
    quantidade: 69.0,
    precoUnitario: 10.0,
    descricaoItem: "CORRIMÃO, MATERIAL: AÇO INOXIDÁVEL, DIÂMETRO: 30 MM",
    siglaUnidadeFornecimento: "UN",
    nomeUnidadeFornecimento: "UNIDADE",
    capacidadeUnidadeFornecimento: 0,
    siglaUnidadeMedida: null,
    nomeUnidadeMedida: null,
    criterioJulgamento: "V",
    percentualMaiorDesconto: 0,
    nomeFornecedor: "KIFERRO FERRAGENS EPP LTDA",
    marca: "Funisa",
    dataResultado: "2026-05-24",
    dataHoraAtualizacaoItem: "2026-05-25T03:00:02.435621",
    codigoUasg: "070017",
    nomeUasg: "TRIBUNAL REGIONAL ELEITORAL DO RIO DE JANEIRO",
    codigoOrgao: 91504,
    nomeOrgao: "TRIBUNAL REGIONAL ELEITORAL DO RIO DE JANEIRO",
    estado: "RJ",
    codigoMunicipio: 3304557,
    municipio: "RIO DE JANEIRO",
    poder: "E",
    esfera: "E",
    dataHoraAtualizacaoUasg: "2026-06-02T14:06:00",
    codigoClasse: 5445,
    nomeClasse: "ESTRUTURAS DE TORRES PRÉ-FABRICADAS",
    idCompraItem: "0700170590008202600034",
    objetoCompra: "Aquisição de materiais de serralheria e ferramental",
    descricaoDetalhadaItem: "CORRIMÃO, MATERIAL AÇO INOXIDÁVEL, DIÂMETRO 30 MM",
    dataAtualizacaoFato: "2026-05-25T03:00:02.435621",
    codigoPdm: "1005",
    nomePdm: "CORRIMÃO"
  },
  {
    idCompra: 7001705900082026,
    dataCompra: "2026-05-24",
    forma: "SISPP",
    modalidade: 5,
    dataHoraAtualizacaoCompra: "2026-05-25T01:10:00.168935",
    idItemCompra: 11706985,
    numeroItemCompra: 35,
    niFornecedor: "08402800000140",
    codigoItemCatalogo: 399046,
    quantidade: 150.0,
    precoUnitario: 8.0,
    descricaoItem: "CORRIMÃO, MATERIAL: AÇO INOXIDÁVEL, CARACTERÍSTICAS ADICIONAIS: ESCOVADO, CHAPA 18, COMPRIMENTO: 1,30 M, DIÂMETRO: 1 1/2 POL",
    siglaUnidadeFornecimento: "UN",
    nomeUnidadeFornecimento: "UNIDADE",
    capacidadeUnidadeFornecimento: 0,
    siglaUnidadeMedida: null,
    nomeUnidadeMedida: null,
    criterioJulgamento: "V",
    percentualMaiorDesconto: 0,
    nomeFornecedor: "KIFERRO FERRAGENS EPP LTDA",
    marca: "Funisa",
    dataResultado: "2026-05-24",
    dataHoraAtualizacaoItem: "2026-05-25T03:00:02.467718",
    codigoUasg: "070017",
    nomeUasg: "TRIBUNAL REGIONAL ELEITORAL DO RIO DE JANEIRO",
    codigoOrgao: 91504,
    nomeOrgao: "TRIBUNAL REGIONAL ELEITORAL DO RIO DE JANEIRO",
    estado: "RJ",
    codigoMunicipio: 3304557,
    municipio: "RIO DE JANEIRO",
    poder: "E",
    esfera: "E",
    dataHoraAtualizacaoUasg: "2026-06-02T14:06:00",
    codigoClasse: 5445,
    nomeClasse: "ESTRUTURAS DE TORRES PRÉ-FABRICADAS",
    idCompraItem: "0700170590008202600035",
    objetoCompra: "Aquisição de materiais de serralheria e ferramental",
    descricaoDetalhadaItem: "CORRIMÃO, MATERIAL AÇO INOXIDÁVEL, CARACTERÍSTICAS ADICIONAIS ESCOVADO, CHAPA 18, COMPRIMENTO 1,30 M, DIÂMETRO 1 1/2 POL",
    dataAtualizacaoFato: "2026-05-25T03:00:02.467718",
    codigoPdm: "1005",
    nomePdm: "CORRIMÃO"
  },
  {
    idCompra: 98997905900182026,
    dataCompra: "2026-05-13",
    forma: "SISRP",
    modalidade: 5,
    dataHoraAtualizacaoCompra: "2026-05-14T01:10:09.286679",
    idItemCompra: 11609489,
    numeroItemCompra: 8,
    niFornecedor: "05875218000103",
    codigoItemCatalogo: 436478,
    quantidade: 150.0,
    precoUnitario: 400.0,
    descricaoItem: "CORRIMÃO, MATERIAL: AÇO INOXIDÁVEL, DIÂMETRO: 30 MM",
    siglaUnidadeFornecimento: "M",
    nomeUnidadeFornecimento: "METRO",
    capacidadeUnidadeFornecimento: 0,
    siglaUnidadeMedida: null,
    nomeUnidadeMedida: null,
    criterioJulgamento: "V",
    percentualMaiorDesconto: 0,
    nomeFornecedor: "ELISANE MARCINIAK ANTONIAZZI",
    marca: "1.1/2 POLEGADA",
    dataResultado: "2026-05-13",
    dataHoraAtualizacaoItem: "2026-05-14T03:05:41.265304",
    codigoUasg: "989979",
    nomeUasg: "PREFEITURA MUNICIPAL DE BOM SUCESSO DO SUL-PR",
    codigoOrgao: 97933,
    nomeOrgao: "PREFEITURA DE BOM SUCESSO DO SUL - PR",
    estado: "PR",
    codigoMunicipio: 4103222,
    municipio: "BOM SUCESSO DO SUL",
    poder: "E",
    esfera: "M",
    dataHoraAtualizacaoUasg: "2023-06-16T15:04:00",
    codigoClasse: 5445,
    nomeClasse: "ESTRUTURAS DE TORRES PRÉ-FABRICADAS",
    idCompraItem: "9899790590018202600008",
    objetoCompra: "Aquisição de portas de diversas tipologias, janelas e corrimãos, destinados à manutenção, adequação e atendimento das necessidades das unidades administrativas",
    descricaoDetalhadaItem: "CORRIMÃO, MATERIAL AÇO INOXIDÁVEL, DIÂMETRO 30 MM",
    dataAtualizacaoFato: "2026-05-14T03:05:41.265304",
    codigoPdm: "1005",
    nomePdm: "CORRIMÃO"
  },
  {
    idCompra: 98647505900142026,
    dataCompra: "2026-05-07",
    forma: "SISRP",
    modalidade: 5,
    dataHoraAtualizacaoCompra: "2026-05-08T01:10:11.345144",
    idItemCompra: 11545023,
    numeroItemCompra: 91,
    niFornecedor: "53198470000178",
    codigoItemCatalogo: 442645,
    quantidade: 200.0,
    precoUnitario: 460.0,
    descricaoItem: "CORRIMÃO, MATERIAL: AÇO INOXIDÁVEL AISI 304, ACABAMENTO SUPERFICIAL: ESCOVADO, DIÂMETRO: 1 1/2 POL, ALTURA: 92 CM",
    siglaUnidadeFornecimento: "M",
    nomeUnidadeFornecimento: "METRO",
    capacidadeUnidadeFornecimento: 0,
    siglaUnidadeMedida: null,
    nomeUnidadeMedida: null,
    criterioJulgamento: "V",
    percentualMaiorDesconto: 0,
    nomeFornecedor: "JJ EQUIPAMENTOS DE SEGURANCA CONTRA INCENDIO LTDA",
    marca: "FABRICAÇÃO PROPRIA",
    dataResultado: "2026-05-07",
    dataHoraAtualizacaoItem: "2026-05-08T03:02:02.708334",
    codigoUasg: "986475",
    nomeUasg: "PREFEITURA MUNICIPAL DE GUARUJÁ - SP",
    codigoOrgao: 95792,
    nomeOrgao: "PREFEITURA MUNICIPAL DE GUARUJÁ - SP",
    estado: "SP",
    codigoMunicipio: 3518701,
    municipio: "GUARUJÁ",
    poder: "E",
    esfera: "M",
    dataHoraAtualizacaoUasg: "2024-03-30T15:14:00",
    codigoClasse: 5445,
    nomeClasse: "ESTRUTURAS DE TORRES PRÉ-FABRICADAS",
    idCompraItem: "9864750590014202600091",
    objetoCompra: "Fornecimento de equipamentos de segurança contra incêndio, tais como, extintores, recarga de extintores, teste hidrostático de cilindros de extintores e mangueiras de incêndio, placas de sinalização",
    descricaoDetalhadaItem: "CORRIMÃO, MATERIAL AÇO INOXIDÁVEL AISI 304, ACABAMENTO SUPERFICIAL ESCOVADO, DIÂMETRO 1 1/2 POL, ALTURA 92 CM",
    dataAtualizacaoFato: "2026-05-08T03:02:02.708334",
    codigoPdm: "1005",
    nomePdm: "CORRIMÃO"
  },
  {
    idCompra: 15301506001652026,
    dataCompra: "2026-04-21",
    forma: "SISPP",
    modalidade: 6,
    dataHoraAtualizacaoCompra: "2026-04-23T02:19:57.499206",
    idItemCompra: 11422749,
    numeroItemCompra: 1,
    niFornecedor: "14822722000136",
    codigoItemCatalogo: 442645,
    quantidade: 20.0,
    precoUnitario: 180.0,
    descricaoItem: "CORRIMÃO, MATERIAL: AÇO INOXIDÁVEL AISI 304, ACABAMENTO SUPERFICIAL: ESCOVADO, DIÂMETRO: 1 1/2 POL, ALTURA: 92 CM",
    siglaUnidadeFornecimento: "M",
    nomeUnidadeFornecimento: "METRO",
    capacidadeUnidadeFornecimento: 0,
    siglaUnidadeMedida: null,
    nomeUnidadeMedida: null,
    criterioJulgamento: "0",
    percentualMaiorDesconto: 0,
    nomeFornecedor: "EG INOX LTDA",
    marca: "Sem marca",
    dataResultado: "2026-04-22",
    dataHoraAtualizacaoItem: "2026-04-23T03:28:36.169383",
    codigoUasg: "153015",
    nomeUasg: "CENTRO FEDERAL DE EDUCACAO TECNOLOGICA - MG",
    codigoOrgao: 26257,
    nomeOrgao: "CENTRO FEDERAL DE EDUCACAO TECNOLOGICA DE MG",
    estado: "MG",
    codigoMunicipio: 3106200,
    municipio: "BELO HORIZONTE",
    poder: "E",
    esfera: "F",
    dataHoraAtualizacaoUasg: "2025-07-07T15:19:00",
    codigoClasse: 5445,
    nomeClasse: "ESTRUTURAS DE TORRES PRÉ-FABRICADAS",
    idCompraItem: "1530150600165202600001",
    objetoCompra: "Aquisição e instalação de corrimão para escada de acesso ao arquivo geral - Campus Nova Suíça",
    descricaoDetalhadaItem: "Corrimão material: aço inoxidável aisi 304, acabamento superficial: escovado, diâmetro: 1 1/2, altura: 92",
    dataAtualizacaoFato: "2026-04-23T03:28:36.169383",
    codigoPdm: "1005",
    nomePdm: "CORRIMÃO"
  }
];

// Metadata da ingestão
export const pesquisaPrecoIngestaoMeta = {
  endpoint: '/modulo-pesquisa-preco/1_consultarMaterial',
  totalRegistros: 128,
  totalPaginas: 13,
  registrosPorPagina: 10,
  paginasRestantes: 12,
  filtroAplicado: 'tipo=codigoPdm&codigo=1005',
  dataIngestao: new Date().toISOString(),
  status: 'PARCIAL - Necessária paginação completa',
};

// Estatísticas da amostra
export const pesquisaPrecoStats = {
  precoMinimo: Math.min(...pesquisaPrecoAmostra.map(p => p.precoUnitario)),
  precoMaximo: Math.max(...pesquisaPrecoAmostra.map(p => p.precoUnitario)),
  precoMedio: pesquisaPrecoAmostra.reduce((acc, p) => acc + p.precoUnitario, 0) / pesquisaPrecoAmostra.length,
  fornecedoresUnicos: new Set(pesquisaPrecoAmostra.map(p => p.nomeFornecedor)).size,
  uasgsUnicas: new Set(pesquisaPrecoAmostra.map(p => p.codigoUasg)).size,
  estadosUnicos: new Set(pesquisaPrecoAmostra.map(p => p.estado)).size,
  marcasUnicas: new Set(pesquisaPrecoAmostra.map(p => p.marca)).size,
};

// Estratégia de paginação para ingestão completa
export const pesquisaPrecoPaginacaoEstrategia = {
  metodo: 'Iteração sequencial com paginação',
  tempoEstimado: '~2 minutos (1 requisição/segundo)',
  recomendacao: 'Usar paginação paralela com limite de 5 requisições simultâneas',
  exemplo: `
// Exemplo de ingestão completa (Node.js)
const BASE_URL = 'https://dadosabertos.compras.gov.br';
const ENDPOINT = '/modulo-pesquisa-preco/1_consultarMaterial';
const TOTAL_PAGINAS = 13;
const CONCURRENCY = 5;
const CODIGO_PDM = '1005'; // CORRIMÃO

async function fetchPagina(pagina) {
  const response = await fetch(
    \`\${BASE_URL}\${ENDPOINT}?pagina=\${pagina}&tamanhoPagina=10&tipo=codigoPdm&codigo=\${CODIGO_PDM}&dataResultado=false\`
  );
  const data = await response.json();
  return data.resultado;
}

async function ingestaoCompleta() {
  const todosPrecos = [];
  
  for (let i = 1; i <= TOTAL_PAGINAS; i += CONCURRENCY) {
    const promises = [];
    for (let j = 0; j < CONCURRENCY && i + j <= TOTAL_PAGINAS; j++) {
      promises.push(fetchPagina(i + j));
    }
    const results = await Promise.all(promises);
    todosPrecos.push(...results.flat());
    
    console.log(\`Progresso: \${Math.min(i + CONCURRENCY - 1, TOTAL_PAGINAS)}/\${TOTAL_PAGINAS} páginas\`);
    
    if (i + CONCURRENCY <= TOTAL_PAGINAS) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return todosPrecos;
}
`,
};
