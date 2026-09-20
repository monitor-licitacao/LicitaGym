// Dados de teste do endpoint PGC Detalhe Catálogo
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-pgc/2_consultarPgcDetalheCatalogo
// Parâmetros: pagina=1&tamanhoPagina=100&anoPcaProjetoCompra=2027&tipo=Material&codigo=1005

export interface PgcDetalheCatalogo {
  // Dados da UASG
  codigoUasg: string;
  nomeUasg: string;
  orgao: string;
  
  // Dados do Artefato
  numeroArtefato: number;
  anoArtefato: number;
  codigoEstadoArtefato: number;
  codigoCategoriaArtefato: number;
  descricaoArtefato: string;
  codigoTipoArtefato: number;
  
  // Dados do DFD (Documento de Formalização de Demanda)
  ordemDfd: number;
  descricaoObjetoDfd: string;
  nivelPrioridadeDfd: number;
  dataPrevistaFormalizacaoDemanda: string;
  codigoAreaDfd: string;
  
  // Dados do Item
  tipoItem: string;
  itemSustentavel: boolean;
  
  // Dados do CATMAT (Material)
  codigoGrupoMaterial: number;
  nomeGrupoMaterial: string;
  codigoClasseMaterial: number;
  nomeClasseMaterial: string;
  codigoPdmMaterial: number;
  nomePdmMaterial: string;
  
  // Dados do CATSER (Serviço)
  codigoSecaoServico: number | null;
  nomeSecaoServico: string | null;
  codigoDivisaoServico: number | null;
  nomeDivisaoServico: string | null;
  codigoGrupoServico: number | null;
  nomeGrupoServico: string | null;
  codigoClasseServico: number | null;
  nomeClasseServico: string | null;
  codigoSubclasseServico: number | null;
  nomeSubclasseServico: string | null;
  
  // Dados do Item do Catálogo
  codigoItemCatalogo: string;
  descricaoItemCatalogo: string;
  siglaUnidadeFornecimento: string;
  nomeUnidadeFornecimento: string;
  quantidadeItem: number;
  valorUnitarioItem: number;
  valorTotalItem: number;
  
  // Dados do Projeto de Compra (PCA)
  tituloProjetoCompra: string;
  descricaoProjetoCompra: string | null;
  anoPcaProjetoCompra: number;
  dataInicioProcessoCompra: string;
  dataFimProcessoCompra: string;
  duracaoProcessoCompra: number;
  
  // Dados do PNCP
  numeroItemPncp: number;
  statusContratacaoExecucao: number | null;
  dataHoraPublicacaoPncp: string;
  
  // Timestamps de Atualização
  dataHoraAtualizacaoArtefato: string;
  dataHoraAtualizacaoProjetoCompra: string;
  dataHoraAtualizacaoDfd: string;
  dataHoraAtualizacaoItem: string;
}

export const pgcDetalheCatalogoData: PgcDetalheCatalogo[] = [
  {
    codigoUasg: "380274",
    nomeUasg: "ESP-CTO.DET.PROVIS.I - PACAEMBU",
    orgao: "96291141000180",
    numeroArtefato: 43,
    anoArtefato: 2027,
    codigoEstadoArtefato: 9,
    codigoCategoriaArtefato: 1,
    descricaoArtefato: "43/2027",
    codigoTipoArtefato: 5,
    ordemDfd: 14,
    descricaoObjetoDfd: "Materiais e utensílios para uso diário no setor, material e serviços de manutenção e conservação do setor e equipamentos e serviços de uso dos\nservidores.\n",
    nivelPrioridadeDfd: 1,
    dataPrevistaFormalizacaoDemanda: "2027-07-30T00:00:00",
    codigoAreaDfd: "58607",
    tipoItem: "M",
    itemSustentavel: false,
    codigoGrupoMaterial: 10,
    nomeGrupoMaterial: "ARMAMENTO",
    codigoClasseMaterial: 1005,
    nomeClasseMaterial: "ARMAS DE FOGO DE CALIBRE ATÉ 120MM",
    codigoPdmMaterial: 1712,
    nomePdmMaterial: "PEÇAS / ACESSÓRIOS ARMAMENTO",
    codigoSecaoServico: null,
    nomeSecaoServico: null,
    codigoDivisaoServico: null,
    nomeDivisaoServico: null,
    codigoGrupoServico: null,
    nomeGrupoServico: null,
    codigoClasseServico: null,
    nomeClasseServico: null,
    codigoSubclasseServico: null,
    nomeSubclasseServico: null,
    codigoItemCatalogo: "486849",
    descricaoItemCatalogo: "PEÇAS / ACESSÓRIOS ARMAMENTO, MATERIAL: POLIPROPILENO/ALUMÍNIO , APLICAÇÃO: ESPINGARDA CALIBRE 12 PUMP CBC , TIPO 2: CORONHA TATICAL PRETA 586.2 MI 1 ",
    siglaUnidadeFornecimento: "UN",
    nomeUnidadeFornecimento: "Unidade",
    quantidadeItem: 2,
    valorUnitarioItem: 800,
    valorTotalItem: 1600,
    tituloProjetoCompra: "Materiais Diversos e de Segurança e Materiais para Atividades Táticas",
    descricaoProjetoCompra: null,
    anoPcaProjetoCompra: 2027,
    dataInicioProcessoCompra: "2027-06-01T00:00:00",
    dataFimProcessoCompra: "2027-07-30T00:00:00",
    duracaoProcessoCompra: 59,
    numeroItemPncp: 167,
    statusContratacaoExecucao: null,
    dataHoraPublicacaoPncp: "2026-04-27T13:40:36.590684",
    dataHoraAtualizacaoArtefato: "2026-04-27T13:56:13.672",
    dataHoraAtualizacaoProjetoCompra: "2026-04-27T13:53:13",
    dataHoraAtualizacaoDfd: "2026-04-27T14:38:17",
    dataHoraAtualizacaoItem: "2026-04-27T13:53:13.377488"
  }
];

export const pgcDetalheCatalogoTestResults = [
  {
    endpoint: '/modulo-pgc/2_consultarPgcDetalheCatalogo',
    testDate: new Date().toISOString(),
    parameters: {
      pagina: '1',
      tamanhoPagina: '100',
      anoPcaProjetoCompra: '2027',
      tipo: 'Material',
      codigo: '1005'
    },
    statusCode: 200,
    status: 'success' as const,
    message: 'Dados retornados com sucesso',
    totalRegistros: 1,
    totalPaginas: 1,
    paginasRestantes: 0,
    contentType: 'application/json'
  }
];

export const pgcDetalheCatalogoAnalysis = {
  totalTests: pgcDetalheCatalogoTestResults.length,
  successCount: pgcDetalheCatalogoTestResults.filter(r => r.status === 'success').length,
  emptyCount: 0,
  errorCount: 0,
  notFoundCount: 0,
  successRate: 100,
  conclusion: 'O endpoint PGC Detalhe Catálogo está funcionando corretamente e retornando dados reais do Plano de Gerenciamento de Contratações. O teste com os parâmetros anoPcaProjetoCompra=2027, tipo=Material e codigo=1005 retornou 1 registro de material (Peças/Acessórios de Armamento) vinculado ao Projeto de Compra "Materiais Diversos e de Segurança e Materiais para Atividades Táticas".',
  recommendation: 'O endpoint está operacional e pode ser utilizado para consultar itens do catálogo vinculados a Projetos de Compra Anual (PCA). Os parâmetros tipo (Material/Serviço) e codigo (código do grupo/classe) permitem filtrar os resultados de forma eficiente.'
};
