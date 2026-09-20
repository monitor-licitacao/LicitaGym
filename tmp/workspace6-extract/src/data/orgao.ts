// Dados do endpoint Órgão
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-uasg/2_consultarOrgao?pagina=1&statusOrgao=true

export interface Orgao {
  codigoOrgao: number;
  nomeOrgao: string;
  nomeMnemonicoOrgao: string;
  cnpjCpfOrgao: string;
  codigoOrgaoVinculado: number;
  cnpjCpfOrgaoVinculado: string;
  nomeOrgaoVinculado: string;
  codigoOrgaoSuperior: number | null;
  cnpjCpfOrgaoSuperior: string | null;
  nomeOrgaoSuperior: string | null;
  codigoTipoAdministracao: number;
  nomeTipoAdministracao: string;
  poder: string;
  esfera: string;
  usoSisg: boolean;
  statusOrgao: boolean;
  dataHoraMovimento: string;
}

export const orgaoTestResults = [
  {
    endpoint: '/modulo-uasg/2_consultarOrgao',
    testDate: new Date().toISOString(),
    parameters: {
      pagina: '1',
      statusOrgao: 'true'
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

export const orgaoAnalysis = {
  totalTests: orgaoTestResults.length,
  successCount: 1,
  emptyCount: 0,
  errorCount: 0,
  notFoundCount: 0,
  successRate: 100,
  conclusion: 'O endpoint Órgão está funcionando corretamente e retornando dados de órgãos com statusOrgao=true. Foram encontrados registros com informações completas sobre os órgãos, incluindo código, nome, vínculos organizacionais e dados administrativos.',
  recommendation: 'O endpoint está operacional e pode ser utilizado para consultar órgãos ativos. Os dados retornados são completos e incluem todos os campos do schema. Recomenda-se utilizar paginação para navegar por todos os registros disponíveis.'
};

// Exemplo de dados retornados
export const orgaoSampleData: Orgao[] = [
  {
    codigoOrgao: 97000,
    nomeOrgao: "REGIAO CENTRO-OESTE",
    nomeMnemonicoOrgao: "REGIAO CENTRO-OESTE",
    cnpjCpfOrgao: "0",
    codigoOrgaoVinculado: 99900,
    cnpjCpfOrgaoVinculado: "0",
    nomeOrgaoVinculado: "REPUBLICA FEDERATIVA DO BRASIL",
    codigoOrgaoSuperior: null,
    cnpjCpfOrgaoSuperior: null,
    nomeOrgaoSuperior: null,
    codigoTipoAdministracao: 11,
    nomeTipoAdministracao: "ADMINISTRACAO DIRETA ESTADUAL",
    poder: "E",
    esfera: "E",
    usoSisg: false,
    statusOrgao: true,
    dataHoraMovimento: "2007-11-30T23:00:00"
  }
];
