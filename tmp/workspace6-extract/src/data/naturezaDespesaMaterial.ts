// Dados reais da ingestão CATMAT — Material Natureza de Despesa
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-material/5_consultarMaterialNaturezaDespesa
// Total: 22 registros em 1 página

export interface MaterialNaturezaDespesa {
  codigoPdm: number;
  codigoNaturezaDespesa: string;
  nomeNaturezaDespesa: string | null;
  statusNaturezaDespesa: string | null;
}

// Dados completos (22 registros)
export const naturezaDespesaData: MaterialNaturezaDespesa[] = [
  { codigoPdm: 16887, codigoNaturezaDespesa: "44925228", nomeNaturezaDespesa: null, statusNaturezaDespesa: null },
  { codigoPdm: 5924, codigoNaturezaDespesa: "30903030", nomeNaturezaDespesa: null, statusNaturezaDespesa: null },
  { codigoPdm: 1673, codigoNaturezaDespesa: "34903025", nomeNaturezaDespesa: null, statusNaturezaDespesa: null },
  { codigoPdm: 16392, codigoNaturezaDespesa: "30903016", nomeNaturezaDespesa: null, statusNaturezaDespesa: null },
  { codigoPdm: 19783, codigoNaturezaDespesa: "14554846", nomeNaturezaDespesa: null, statusNaturezaDespesa: null },
  { codigoPdm: 8088, codigoNaturezaDespesa: "33093007", nomeNaturezaDespesa: null, statusNaturezaDespesa: null },
  { codigoPdm: 19698, codigoNaturezaDespesa: "30903007", nomeNaturezaDespesa: null, statusNaturezaDespesa: null },
  { codigoPdm: 19698, codigoNaturezaDespesa: "30903203", nomeNaturezaDespesa: null, statusNaturezaDespesa: null },
  { codigoPdm: 19776, codigoNaturezaDespesa: "30903007", nomeNaturezaDespesa: null, statusNaturezaDespesa: null },
  { codigoPdm: 19776, codigoNaturezaDespesa: "30903203", nomeNaturezaDespesa: null, statusNaturezaDespesa: null },
  { codigoPdm: 7963, codigoNaturezaDespesa: "33093203", nomeNaturezaDespesa: null, statusNaturezaDespesa: null },
  { codigoPdm: 19769, codigoNaturezaDespesa: "99903007", nomeNaturezaDespesa: null, statusNaturezaDespesa: null },
  { codigoPdm: 19740, codigoNaturezaDespesa: "30903001", nomeNaturezaDespesa: null, statusNaturezaDespesa: null },
  { codigoPdm: 16431, codigoNaturezaDespesa: "33903047", nomeNaturezaDespesa: "MATERIAL DE CONSUMO - AQUISICAO DE SOFTWARE - PRODUTO.", statusNaturezaDespesa: "1" },
  { codigoPdm: 1453, codigoNaturezaDespesa: "33903110", nomeNaturezaDespesa: "PREMIACOES CULT., ART., CIENT., DESP. E OUTR. - -7", statusNaturezaDespesa: "0" },
  { codigoPdm: 1673, codigoNaturezaDespesa: "44909202", nomeNaturezaDespesa: "DESPESAS DE EXERCICIOS ANTERIORES - EQUIPAMENTOS E MATERIAL PERMANENTE", statusNaturezaDespesa: "1" },
  { codigoPdm: 19783, codigoNaturezaDespesa: "44909202", nomeNaturezaDespesa: "DESPESAS DE EXERCICIOS ANTERIORES - EQUIPAMENTOS E MATERIAL PERMANENTE", statusNaturezaDespesa: "1" },
  { codigoPdm: 14509, codigoNaturezaDespesa: "44909202", nomeNaturezaDespesa: "DESPESAS DE EXERCICIOS ANTERIORES - EQUIPAMENTOS E MATERIAL PERMANENTE", statusNaturezaDespesa: "1" },
  { codigoPdm: 14516, codigoNaturezaDespesa: "44909202", nomeNaturezaDespesa: "DESPESAS DE EXERCICIOS ANTERIORES - EQUIPAMENTOS E MATERIAL PERMANENTE", statusNaturezaDespesa: "1" },
  { codigoPdm: 14514, codigoNaturezaDespesa: "44909202", nomeNaturezaDespesa: "DESPESAS DE EXERCICIOS ANTERIORES - EQUIPAMENTOS E MATERIAL PERMANENTE", statusNaturezaDespesa: "1" },
  { codigoPdm: 646, codigoNaturezaDespesa: "44909292", nomeNaturezaDespesa: "DESPESAS DE EXERCICIOS ANTERIORES - MATERIAL DE CONSUMO", statusNaturezaDespesa: "0" },
  { codigoPdm: 16431, codigoNaturezaDespesa: "33903994", nomeNaturezaDespesa: "OUTROS SERVICOS DE TERCEIROS - PESSOA JURIDICA - AQUISICAO DE SOFTWARES", statusNaturezaDespesa: "1" }
];

// Metadata da ingestão
export const naturezaDespesaIngestaoMeta = {
  endpoint: '/modulo-material/5_consultarMaterialNaturezaDespesa',
  totalRegistros: 22,
  totalPaginas: 1,
  registrosPorPagina: 50,
  paginasRestantes: 0,
  dataIngestao: new Date().toISOString(),
  status: 'COMPLETO',
};

// Estatísticas
export const naturezaDespesaStats = {
  totalRegistros: naturezaDespesaData.length,
  pdmsUnicos: new Set(naturezaDespesaData.map(r => r.codigoPdm)).size,
  naturezasUnicas: new Set(naturezaDespesaData.map(r => r.codigoNaturezaDespesa)).size,
  comNome: naturezaDespesaData.filter(r => r.nomeNaturezaDespesa !== null).length,
  semNome: naturezaDespesaData.filter(r => r.nomeNaturezaDespesa === null).length,
  ativos: naturezaDespesaData.filter(r => r.statusNaturezaDespesa === "1").length,
  inativos: naturezaDespesaData.filter(r => r.statusNaturezaDespesa === "0").length,
  semStatus: naturezaDespesaData.filter(r => r.statusNaturezaDespesa === null).length,
};
