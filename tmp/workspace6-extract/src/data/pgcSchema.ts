// Schema completo do endpoint PGC (Plano de Gerenciamento de Contratações)
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-pgc/1_consultarPgcDetalhe

export interface PgcDetalheSchema {
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

export interface PgcDetalheResponse {
  resultado: PgcDetalheSchema[];
  totalRegistros: number;
  totalPaginas: number;
  paginasRestantes: number;
}

// Documentação dos campos
export const pgcFieldDocumentation = {
  uasg: {
    codigoUasg: "Código da UASG (Unidade Administrativa de Serviços Gerais)",
    nomeUasg: "Nome da UASG",
    orgao: "Órgão vinculado à UASG"
  },
  artefato: {
    numeroArtefato: "Número do artefato (contrato, ata, etc.)",
    anoArtefato: "Ano do artefato",
    codigoEstadoArtefato: "Código do estado do artefato",
    codigoCategoriaArtefato: "Código da categoria do artefato",
    descricaoArtefato: "Descrição do artefato",
    codigoTipoArtefato: "Código do tipo de artefato"
  },
  dfd: {
    ordemDfd: "Ordem do Documento de Formalização de Demanda",
    descricaoObjetoDfd: "Descrição do objeto do DFD",
    nivelPrioridadeDfd: "Nível de prioridade do DFD",
    dataPrevistaFormalizacaoDemanda: "Data prevista para formalização da demanda",
    codigoAreaDfd: "Código da área do DFD"
  },
  item: {
    tipoItem: "Tipo do item (material ou serviço)",
    itemSustentavel: "Indica se o item é sustentável"
  },
  catmat: {
    codigoGrupoMaterial: "Código do grupo de material no CATMAT",
    nomeGrupoMaterial: "Nome do grupo de material",
    codigoClasseMaterial: "Código da classe de material no CATMAT",
    nomeClasseMaterial: "Nome da classe de material",
    codigoPdmMaterial: "Código do PDM (Produto Descritivo Básico)",
    nomePdmMaterial: "Nome do PDM"
  },
  catserv: {
    codigoSecaoServico: "Código da seção de serviço no CATSER",
    nomeSecaoServico: "Nome da seção de serviço",
    codigoDivisaoServico: "Código da divisão de serviço",
    nomeDivisaoServico: "Nome da divisão de serviço",
    codigoGrupoServico: "Código do grupo de serviço",
    nomeGrupoServico: "Nome do grupo de serviço",
    codigoClasseServico: "Código da classe de serviço",
    nomeClasseServico: "Nome da classe de serviço",
    codigoSubclasseServico: "Código da subclasse de serviço",
    nomeSubclasseServico: "Nome da subclasse de serviço"
  },
  catalogo: {
    codigoItemCatalogo: "Código do item no catálogo",
    descricaoItemCatalogo: "Descrição do item do catálogo",
    siglaUnidadeFornecimento: "Sigla da unidade de fornecimento",
    nomeUnidadeFornecimento: "Nome da unidade de fornecimento",
    quantidadeItem: "Quantidade do item",
    valorUnitarioItem: "Valor unitário do item",
    valorTotalItem: "Valor total do item"
  },
  pca: {
    tituloProjetoCompra: "Título do Projeto de Compra Anual",
    descricaoProjetoCompra: "Descrição do Projeto de Compra Anual",
    anoPcaProjetoCompra: "Ano do Projeto de Compra Anual",
    dataInicioProcessoCompra: "Data de início do processo de compra",
    dataFimProcessoCompra: "Data de fim do processo de compra",
    duracaoProcessoCompra: "Duração do processo de compra em dias"
  },
  pncp: {
    numeroItemPncp: "Número do item no PNCP (Portal Nacional de Contratações Públicas)",
    statusContratacaoExecucao: "Status da contratação/execução",
    dataHoraPublicacaoPncp: "Data e hora da publicação no PNCP"
  },
  timestamps: {
    dataHoraAtualizacaoArtefato: "Data e hora da última atualização do artefato",
    dataHoraAtualizacaoProjetoCompra: "Data e hora da última atualização do projeto de compra",
    dataHoraAtualizacaoDfd: "Data e hora da última atualização do DFD",
    dataHoraAtualizacaoItem: "Data e hora da última atualização do item"
  }
};

// Exemplo de uso
export const pgcEndpointExample = {
  endpoint: '/modulo-pgc/1_consultarPgcDetalhe',
  method: 'GET',
  parameters: {
    pagina: 'Página atual (padrão: 1)',
    tamanhoPagina: 'Tamanho da página (padrão: 10)',
    orgao: 'Filtrar por nome do órgão',
    anoPcaProjetoCompra: 'Filtrar por ano do Projeto de Compra Anual'
  },
  example: `curl -X 'GET' \\
  'https://dadosabertos.compras.gov.br/modulo-pgc/1_consultarPgcDetalhe?pagina=1&tamanhoPagina=10&orgao=Ministério da Educação&anoPcaProjetoCompra=2024' \\
  -H 'accept: */*'`
};
