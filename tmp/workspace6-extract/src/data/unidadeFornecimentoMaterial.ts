// Dados reais da ingestão CATMAT — Unidade de Fornecimento
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-material/6_consultarMaterialUnidadeFornecimento
// Total: 38.096 registros em 3.810 páginas

export interface UnidadeFornecimento {
  codigoPdm: number;
  siglaUnidadeFornecimento: string;
  nomeUnidadeFornecimento: string;
  descricaoUnidadeFornecimento: string;
  siglaUnidadeMedida: string | null;
  capacidadeUnidadeFornecimento: number;
  numeroSequencialUnidadeFornecimento: number;
  statusUnidadeFornecimentoPdm: boolean;
  statusUnidadeFornecimento: boolean;
  dataHoraAtualizacao: string;
}

// Amostra da primeira página (10 registros)
export const unidadeFornecimentoAmostra: UnidadeFornecimento[] = [
  {
    codigoPdm: 80,
    siglaUnidadeFornecimento: "RO",
    nomeUnidadeFornecimento: "ROLO",
    descricaoUnidadeFornecimento: "UMA CONFIGURAÇÃO CILÍNDRIA DE MATERIAL FLEXÍVEL QUE FOI ENROLADO SOBRE SI MESMO, TAL COMO, TECIDOS, FITA,PAPEL ABRASIVO,PAPEL HIGIÊNICO, PAPEL FOTOSENSÍVEL E FILME.  PODE  UTILIZARUM NÚCLEO COM OU SEM REBORDOS.",
    siglaUnidadeMedida: "M",
    capacidadeUnidadeFornecimento: 300.0,
    numeroSequencialUnidadeFornecimento: 5,
    statusUnidadeFornecimentoPdm: true,
    statusUnidadeFornecimento: true,
    dataHoraAtualizacao: "2021-10-16T09:30:54.651407"
  },
  {
    codigoPdm: 81,
    siglaUnidadeFornecimento: "UN",
    nomeUnidadeFornecimento: "UNIDADE",
    descricaoUnidadeFornecimento: "UMA QUANTIDADE NORMALIZADA OU NUMERICA DE UM ITEM DE  ABASTECIMENTO. NÃO UTILIZAR SE FOR APLICÁVEL DE UM TERMO MAIS ESPECÍFICO, TAL COMO, JOGO, CONJUNTO, COLEÇÃO, GRUPO, FOLHA,  TIRA, COMPRIMENTO ETC.",
    siglaUnidadeMedida: null,
    capacidadeUnidadeFornecimento: 0,
    numeroSequencialUnidadeFornecimento: 1,
    statusUnidadeFornecimentoPdm: true,
    statusUnidadeFornecimento: true,
    dataHoraAtualizacao: "2021-10-16T09:30:54.651407"
  },
  {
    codigoPdm: 82,
    siglaUnidadeFornecimento: "FL",
    nomeUnidadeFornecimento: "FOLHA",
    descricaoUnidadeFornecimento: "PEçA DE MATERIAL PLANO, DE FORMA RETANGULAR E DE ESPESSURAUNIFORME, QUE é MUITO FINA COMPARADA COM O SEU COMPRIMENTO ELARGURA, TAL COMO METAL, PLáSTICO, PAPEL ETC. A UTILIZAçãODESTE TERMO NãO ESTá LIMITADA A QUALQUER GRUPO DE ARTIGOS OUCLASSES NATO DE ABASTECIMENTO. CONTUDO DEVERá SER SEMPRE  A-PLICADO QUANDO O TERMO \"FOLHA\" FOR UTILIZADO NO NOME DE ARTIGO PARA DAR A IDéIA DA SUA FORMA, COMO POR EXEMPLO, FOLHA DEALUMíNIO, EXCETO OS DA CLASSE 7210.",
    siglaUnidadeMedida: null,
    capacidadeUnidadeFornecimento: 0,
    numeroSequencialUnidadeFornecimento: 1,
    statusUnidadeFornecimentoPdm: true,
    statusUnidadeFornecimento: true,
    dataHoraAtualizacao: "2021-10-16T09:30:54.651407"
  },
  {
    codigoPdm: 83,
    siglaUnidadeFornecimento: "UN",
    nomeUnidadeFornecimento: "UNIDADE",
    descricaoUnidadeFornecimento: "UMA QUANTIDADE NORMALIZADA OU NUMERICA DE UM ITEM DE  ABASTECIMENTO. NÃO UTILIZAR SE FOR APLICÁVEL DE UM TERMO MAIS ESPECÍFICO, TAL COMO, JOGO, CONJUNTO, COLEÇÃO, GRUPO, FOLHA,  TIRA, COMPRIMENTO ETC.",
    siglaUnidadeMedida: null,
    capacidadeUnidadeFornecimento: 0,
    numeroSequencialUnidadeFornecimento: 1,
    statusUnidadeFornecimentoPdm: true,
    statusUnidadeFornecimento: true,
    dataHoraAtualizacao: "2021-10-16T09:30:54.651407"
  },
  {
    codigoPdm: 84,
    siglaUnidadeFornecimento: "UN",
    nomeUnidadeFornecimento: "UNIDADE",
    descricaoUnidadeFornecimento: "UMA QUANTIDADE NORMALIZADA OU NUMERICA DE UM ITEM DE  ABASTECIMENTO. NÃO UTILIZAR SE FOR APLICÁVEL DE UM TERMO MAIS ESPECÍFICO, TAL COMO, JOGO, CONJUNTO, COLEÇÃO, GRUPO, FOLHA,  TIRA, COMPRIMENTO ETC.",
    siglaUnidadeMedida: null,
    capacidadeUnidadeFornecimento: 0,
    numeroSequencialUnidadeFornecimento: 1,
    statusUnidadeFornecimentoPdm: true,
    statusUnidadeFornecimento: true,
    dataHoraAtualizacao: "2021-10-16T09:30:54.651407"
  },
  {
    codigoPdm: 86,
    siglaUnidadeFornecimento: "UN",
    nomeUnidadeFornecimento: "UNIDADE",
    descricaoUnidadeFornecimento: "UMA QUANTIDADE NORMALIZADA OU NUMERICA DE UM ITEM DE  ABASTECIMENTO. NÃO UTILIZAR SE FOR APLICÁVEL DE UM TERMO MAIS ESPECÍFICO, TAL COMO, JOGO, CONJUNTO, COLEÇÃO, GRUPO, FOLHA,  TIRA, COMPRIMENTO ETC.",
    siglaUnidadeMedida: null,
    capacidadeUnidadeFornecimento: 0,
    numeroSequencialUnidadeFornecimento: 1,
    statusUnidadeFornecimentoPdm: true,
    statusUnidadeFornecimento: true,
    dataHoraAtualizacao: "2021-10-16T09:30:54.651407"
  },
  {
    codigoPdm: 88,
    siglaUnidadeFornecimento: "UN",
    nomeUnidadeFornecimento: "UNIDADE",
    descricaoUnidadeFornecimento: "UMA QUANTIDADE NORMALIZADA OU NUMERICA DE UM ITEM DE  ABASTECIMENTO. NÃO UTILIZAR SE FOR APLICÁVEL DE UM TERMO MAIS ESPECÍFICO, TAL COMO, JOGO, CONJUNTO, COLEÇÃO, GRUPO, FOLHA,  TIRA, COMPRIMENTO ETC.",
    siglaUnidadeMedida: null,
    capacidadeUnidadeFornecimento: 0,
    numeroSequencialUnidadeFornecimento: 1,
    statusUnidadeFornecimentoPdm: true,
    statusUnidadeFornecimento: true,
    dataHoraAtualizacao: "2021-10-16T09:30:54.651407"
  },
  {
    codigoPdm: 93,
    siglaUnidadeFornecimento: "UN",
    nomeUnidadeFornecimento: "UNIDADE",
    descricaoUnidadeFornecimento: "UMA QUANTIDADE NORMALIZADA OU NUMERICA DE UM ITEM DE  ABASTECIMENTO. NÃO UTILIZAR SE FOR APLICÁVEL DE UM TERMO MAIS ESPECÍFICO, TAL COMO, JOGO, CONJUNTO, COLEÇÃO, GRUPO, FOLHA,  TIRA, COMPRIMENTO ETC.",
    siglaUnidadeMedida: null,
    capacidadeUnidadeFornecimento: 0,
    numeroSequencialUnidadeFornecimento: 1,
    statusUnidadeFornecimentoPdm: true,
    statusUnidadeFornecimento: true,
    dataHoraAtualizacao: "2021-10-16T09:30:54.651407"
  },
  {
    codigoPdm: 90,
    siglaUnidadeFornecimento: "CX",
    nomeUnidadeFornecimento: "CAIXA",
    descricaoUnidadeFornecimento: "RECIPIENTE RIGIDO E TRIDIMENSIONAL DE VARIOS TAMANHOS E MA-TERIAIS. INCLUI CAIXOTE, CARTãO E GRADEADO DA JAULA.",
    siglaUnidadeMedida: "FL",
    capacidadeUnidadeFornecimento: 750.0,
    numeroSequencialUnidadeFornecimento: 1,
    statusUnidadeFornecimentoPdm: true,
    statusUnidadeFornecimento: true,
    dataHoraAtualizacao: "2021-10-16T09:30:54.651407"
  },
  {
    codigoPdm: 90,
    siglaUnidadeFornecimento: "CX",
    nomeUnidadeFornecimento: "CAIXA",
    descricaoUnidadeFornecimento: "RECIPIENTE RIGIDO E TRIDIMENSIONAL DE VARIOS TAMANHOS E MA-TERIAIS. INCLUI CAIXOTE, CARTãO E GRADEADO DA JAULA.",
    siglaUnidadeMedida: "FL",
    capacidadeUnidadeFornecimento: 1000.0,
    numeroSequencialUnidadeFornecimento: 2,
    statusUnidadeFornecimentoPdm: true,
    statusUnidadeFornecimento: true,
    dataHoraAtualizacao: "2021-10-16T09:30:54.651407"
  }
];

// Metadata da ingestão
export const unidadeFornecimentoIngestaoMeta = {
  endpoint: '/modulo-material/6_consultarMaterialUnidadeFornecimento',
  totalRegistros: 38096,
  totalPaginas: 3810,
  registrosPorPagina: 10,
  paginasRestantes: 3809,
  dataIngestao: new Date().toISOString(),
  status: 'PARCIAL - Necessária paginação completa',
};

// Estratégia de paginação para ingestão completa
export const unidadeFornecimentoPaginacaoEstrategia = {
  metodo: 'Iteração sequencial com paginação',
  tempoEstimado: '~1 hora (1 requisição/segundo)',
  recomendacao: 'Usar paginação paralela com limite de 5-10 requisições simultâneas',
  exemplo: `
// Exemplo de ingestão completa (Node.js)
const BASE_URL = 'https://dadosabertos.compras.gov.br';
const ENDPOINT = '/modulo-material/6_consultarMaterialUnidadeFornecimento';
const TOTAL_PAGINAS = 3810;
const CONCURRENCY = 5; // requisições simultâneas

async function fetchPagina(pagina) {
  const response = await fetch(\`\${BASE_URL}\${ENDPOINT}?pagina=\${pagina}&tamanhoPagina=10\`);
  const data = await response.json();
  return data.resultado;
}

async function ingestaoCompleta() {
  const todasUnidades = [];
  
  for (let i = 1; i <= TOTAL_PAGINAS; i += CONCURRENCY) {
    const promises = [];
    for (let j = 0; j < CONCURRENCY && i + j <= TOTAL_PAGINAS; j++) {
      promises.push(fetchPagina(i + j));
    }
    const results = await Promise.all(promises);
    todasUnidades.push(...results.flat());
    
    console.log(\`Progresso: \${Math.min(i + CONCURRENCY - 1, TOTAL_PAGINAS)}/\${TOTAL_PAGINAS} páginas\`);
    
    // Rate limiting: 1 segundo entre batches
    if (i + CONCURRENCY <= TOTAL_PAGINAS) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return todasUnidades;
}
`,
};
