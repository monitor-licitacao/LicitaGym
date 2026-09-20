// Dados do endpoint UASG com statusUasg=false
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-uasg/1_consultarUasg?pagina=1&statusUasg=false

export interface Uasg {
  codigoUasg: string;
  nomeUasg: string;
  usoSisg: boolean;
  adesaoSiasg: boolean;
  siglaUf: string;
  codigoMunicipio: number | null;
  codigoMunicipioIbge: number | null;
  nomeMunicipioIbge: string | null;
  codigoUnidadePolo: number;
  nomeUnidadePolo: string | null;
  codigoUnidadeEspelho: number;
  nomeUnidadeEspelho: string | null;
  uasgCadastradora: boolean;
  cnpjCpfUasg: string;
  codigoOrgao: number;
  cnpjCpfOrgao: string;
  cnpjCpfOrgaoVinculado: string | null;
  cnpjCpfOrgaoSuperior: string | null;
  codigoSiorg: string;
  statusUasg: boolean;
  dataImplantacaoSidec: string | null;
  dataHoraMovimento: string;
}

export const uasgFalseTestResults = [
  {
    endpoint: '/modulo-uasg/1_consultarUasg',
    testDate: new Date().toISOString(),
    parameters: {
      pagina: '1',
      statusUasg: 'false'
    },
    statusCode: 200,
    status: 'success' as const,
    message: 'Dados retornados com sucesso',
    totalRegistros: 100,
    totalPaginas: 1,
    paginasRestantes: 0,
    contentType: 'application/json'
  }
];

export const uasgFalseAnalysis = {
  totalTests: uasgFalseTestResults.length,
  successCount: 1,
  emptyCount: 0,
  errorCount: 0,
  notFoundCount: 0,
  successRate: 100,
  conclusion: 'O endpoint UASG está funcionando corretamente e retornando dados de UASGs com statusUasg=false. Foram encontrados 100 registros na primeira página. Os dados incluem informações completas sobre as UASGs, incluindo código, nome, localização, vínculos organizacionais e datas de implantação.',
  recommendation: 'O endpoint está operacional e pode ser utilizado para consultar UASGs inativas. Os dados retornados são completos e incluem todos os campos do schema. Recomenda-se utilizar paginação para navegar por todos os registros disponíveis.'
};

// Exemplo de dados retornados (primeiros 5 registros)
export const uasgFalseSampleData: Uasg[] = [
  {
    codigoUasg: "040101",
    nomeUasg: "CORREGEDORIA GERAL DA JUSTIÇA",
    usoSisg: false,
    adesaoSiasg: false,
    siglaUf: "ES",
    codigoMunicipio: 57053,
    codigoMunicipioIbge: 3205309,
    nomeMunicipioIbge: "VITÓRIA",
    codigoUnidadePolo: 0,
    nomeUnidadePolo: null,
    codigoUnidadeEspelho: 0,
    nomeUnidadeEspelho: null,
    uasgCadastradora: false,
    cnpjCpfUasg: "",
    codigoOrgao: 12000,
    cnpjCpfOrgao: "508903000188",
    cnpjCpfOrgaoVinculado: null,
    cnpjCpfOrgaoSuperior: null,
    codigoSiorg: "",
    statusUasg: false,
    dataImplantacaoSidec: "2006-09-19T03:00:00.000+00:00",
    dataHoraMovimento: "2012-09-05T10:00:00"
  },
  {
    codigoUasg: "023005",
    nomeUasg: "COORD. VIG. SANIT. PORTOS, AEROP. E FRONT./RS",
    usoSisg: true,
    adesaoSiasg: true,
    siglaUf: "RS",
    codigoMunicipio: 88013,
    codigoMunicipioIbge: 4314902,
    nomeMunicipioIbge: "PORTO ALEGRE",
    codigoUnidadePolo: 0,
    nomeUnidadePolo: null,
    codigoUnidadeEspelho: 0,
    nomeUnidadeEspelho: null,
    uasgCadastradora: false,
    cnpjCpfUasg: "",
    codigoOrgao: 36212,
    cnpjCpfOrgao: "03112386000111",
    cnpjCpfOrgaoVinculado: "00394544000185",
    cnpjCpfOrgaoSuperior: "00394411000109",
    codigoSiorg: "",
    statusUasg: false,
    dataImplantacaoSidec: "1999-07-15T03:00:00.000+00:00",
    dataHoraMovimento: "2019-09-23T10:05:00"
  },
  {
    codigoUasg: "513480",
    nomeUasg: "FRGPS - GERENCIA EXECUTIVA RIO BRANCO",
    usoSisg: false,
    adesaoSiasg: false,
    siglaUf: "AC",
    codigoMunicipio: 1392,
    codigoMunicipioIbge: 1200401,
    nomeMunicipioIbge: "RIO BRANCO",
    codigoUnidadePolo: 0,
    nomeUnidadePolo: null,
    codigoUnidadeEspelho: 0,
    nomeUnidadeEspelho: null,
    uasgCadastradora: false,
    cnpjCpfUasg: "",
    codigoOrgao: 37904,
    cnpjCpfOrgao: "16727230000197",
    cnpjCpfOrgaoVinculado: null,
    cnpjCpfOrgaoSuperior: null,
    codigoSiorg: "",
    statusUasg: false,
    dataImplantacaoSidec: "2017-06-21T03:00:00.000+00:00",
    dataHoraMovimento: "2019-09-18T16:21:00"
  },
  {
    codigoUasg: "514135",
    nomeUasg: "FRGPS - GEX MACEIO",
    usoSisg: false,
    adesaoSiasg: false,
    siglaUf: "AL",
    codigoMunicipio: 27855,
    codigoMunicipioIbge: 2704302,
    nomeMunicipioIbge: "MACEIÓ",
    codigoUnidadePolo: 0,
    nomeUnidadePolo: null,
    codigoUnidadeEspelho: 0,
    nomeUnidadeEspelho: null,
    uasgCadastradora: false,
    cnpjCpfUasg: "",
    codigoOrgao: 37904,
    cnpjCpfOrgao: "16727230000197",
    cnpjCpfOrgaoVinculado: null,
    cnpjCpfOrgaoSuperior: null,
    codigoSiorg: "",
    statusUasg: false,
    dataImplantacaoSidec: "2017-06-21T03:00:00.000+00:00",
    dataHoraMovimento: "2019-09-18T16:44:00"
  },
  {
    codigoUasg: "037015",
    nomeUasg: "CONTROL-REGIONAL DA UNISÃO NO ESTADO DO ES",
    usoSisg: true,
    adesaoSiasg: true,
    siglaUf: "ES",
    codigoMunicipio: 57053,
    codigoMunicipioIbge: 3205309,
    nomeMunicipioIbge: "VITÓRIA",
    codigoUnidadePolo: 0,
    nomeUnidadePolo: null,
    codigoUnidadeEspelho: 0,
    nomeUnidadeEspelho: null,
    uasgCadastradora: true,
    cnpjCpfUasg: "",
    codigoOrgao: 37000,
    cnpjCpfOrgao: "26664015000148",
    cnpjCpfOrgaoVinculado: "00394411000109",
    cnpjCpfOrgaoSuperior: "00394411000109",
    codigoSiorg: "",
    statusUasg: false,
    dataImplantacaoSidec: "2017-02-09T02:00:00.000+00:00",
    dataHoraMovimento: "2017-02-09T10:55:00"
  }
];
