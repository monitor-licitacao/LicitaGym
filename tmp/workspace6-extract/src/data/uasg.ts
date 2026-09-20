// Dados de teste do endpoint UASG
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-uasg/1_consultarUasg
// Parâmetros: pagina=1&statusUasg=true

export interface Uasg {
  codigoUasg: string;
  nomeUasg: string;
  usoSisg: boolean;
  adesaoSiasg: boolean;
  siglaUf: string;
  codigoMunicipio: number;
  codigoMunicipioIbge: number;
  nomeMunicipioIbge: string;
  codigoUnidadePolo: number;
  nomeUnidadePolo: string;
  codigoUnidadeEspelho: number;
  nomeUnidadeEspelho: string;
  uasgCadastradora: boolean;
  cnpjCpfUasg: string;
  codigoOrgao: number;
  cnpjCpfOrgao: string;
  cnpjCpfOrgaoVinculado: string;
  cnpjCpfOrgaoSuperior: string;
  codigoSiorg: string;
  statusUasg: boolean;
  dataImplantacaoSidec: string;
  dataHoraMovimento: string;
}

export const uasgTestResults = [
  {
    endpoint: '/modulo-uasg/1_consultarUasg',
    testDate: new Date().toISOString(),
    parameters: {
      pagina: '1',
      statusUasg: 'true'
    },
    statusCode: 200,
    status: 'empty' as const,
    message: 'Nenhum registro encontrado para os parâmetros fornecidos',
    totalRegistros: 0,
    totalPaginas: 0,
    paginasRestantes: 0,
    contentType: 'application/json'
  }
];

export const uasgAnalysis = {
  totalTests: uasgTestResults.length,
  successCount: 0,
  emptyCount: 1,
  errorCount: 0,
  notFoundCount: 0,
  successRate: 0,
  conclusion: 'O endpoint UASG está funcionando corretamente (status 200), mas não retornou dados para os parâmetros testados (pagina=1, statusUasg=true). Isso pode indicar que não há UASGs ativas disponíveis no momento, ou que os dados ainda não foram publicados.',
  recommendation: 'O endpoint está operacional. Recomenda-se testar com outros parâmetros ou aguardar a disponibilização de dados. Os parâmetros disponíveis são: pagina, codigoUasg, usoSisg, cnpjCpfOrgao, cnpjCpfOrgaoVinculado, cnpjCpfOrgaoSuperior, siglaUf e statusUasg.'
};
