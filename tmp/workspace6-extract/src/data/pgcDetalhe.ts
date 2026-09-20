// Dados de teste do endpoint PGC (Plano de Gerenciamento de Contratações)
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-pgc/1_consultarPgcDetalhe

export interface PgcDetalhe {
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
  codigoSecaoServico: number;
  nomeSecaoServico: string;
  codigoDivisaoServico: number;
  nomeDivisaoServico: string;
  codigoGrupoServico: number;
  nomeGrupoServico: string;
  codigoClasseServico: number;
  nomeClasseServico: string;
  codigoSubclasseServico: number;
  nomeSubclasseServico: string;
  
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
  descricaoProjetoCompra: string;
  anoPcaProjetoCompra: number;
  dataInicioProcessoCompra: string;
  dataFimProcessoCompra: string;
  duracaoProcessoCompra: number;
  
  // Dados do PNCP
  numeroItemPncp: number;
  statusContratacaoExecucao: number;
  dataHoraPublicacaoPncp: string;
  
  // Timestamps de Atualização
  dataHoraAtualizacaoArtefato: string;
  dataHoraAtualizacaoProjetoCompra: string;
  dataHoraAtualizacaoDfd: string;
  dataHoraAtualizacaoItem: string;
}

type TestStatus = 'success' | 'empty' | 'error' | 'not_found';

export const pgcDetalheTestResults: Array<{
  endpoint: string;
  testDate: string;
  parameters: Record<string, string>;
  statusCode: number;
  status: TestStatus;
  message: string;
  totalRegistros: number;
  totalPaginas: number;
  paginasRestantes: number;
}> = [
  {
    endpoint: '/modulo-pgc/1_consultarPgcDetalhe',
    testDate: new Date().toISOString(),
    parameters: {
      pagina: '1',
      tamanhoPagina: '100',
      orgao: 'Câmara Municipal de Linhares · ES',
      anoPcaProjetoCompra: '2026'
    },
    statusCode: 200,
    status: 'empty',
    message: 'Nenhum registro encontrado',
    totalRegistros: 0,
    totalPaginas: 0,
    paginasRestantes: 0
  },
  {
    endpoint: '/modulo-pgc/1_consultarPgcDetalhe',
    testDate: new Date().toISOString(),
    parameters: {
      pagina: '1',
      tamanhoPagina: '10',
      orgao: 'Ministério da Educação',
      anoPcaProjetoCompra: '2024'
    },
    statusCode: 200,
    status: 'empty',
    message: 'Nenhum registro encontrado',
    totalRegistros: 0,
    totalPaginas: 0,
    paginasRestantes: 0
  },
  {
    endpoint: '/modulo-pgc/1_consultarPgcDetalhe',
    testDate: new Date().toISOString(),
    parameters: {
      pagina: '1',
      tamanhoPagina: '10',
      orgao: 'Ministério da Saúde',
      anoPcaProjetoCompra: '2025'
    },
    statusCode: 200,
    status: 'empty',
    message: 'Nenhum registro encontrado',
    totalRegistros: 0,
    totalPaginas: 0,
    paginasRestantes: 0
  }
];

export const pgcDetalheAnalysis = {
  totalTests: pgcDetalheTestResults.length,
  successCount: pgcDetalheTestResults.filter(r => r.status === 'success').length,
  emptyCount: pgcDetalheTestResults.filter(r => r.status === 'empty').length,
  errorCount: pgcDetalheTestResults.filter(r => r.status === 'error').length,
  notFoundCount: pgcDetalheTestResults.filter(r => r.status === 'not_found').length,
  successRate: 0,
  conclusion: 'O endpoint PGC Detalhe está retornando resultados vazios para todos os testes realizados. Isso pode indicar que: (1) não há dados disponíveis para os órgãos/anos testados, (2) o endpoint requer parâmetros específicos não documentados, ou (3) há um problema na disponibilidade dos dados.',
  recommendation: 'Recomenda-se verificar a documentação oficial do endpoint PGC ou entrar em contato com o suporte do Compras.gov.br para obter informações sobre órgãos e anos com dados disponíveis.'
};
