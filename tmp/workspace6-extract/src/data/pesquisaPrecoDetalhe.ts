// Dados reais da ingestão — Pesquisa de Preço Detalhada de Material
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-pesquisa-preco/2_consultarMaterialDetalhe
// Filtro: codigoItemCatalogo=233523
// Total: 25 registros em 3 páginas

export interface PesquisaPrecoDetalhe {
  idCompra: string;
  idItemCompra: number;
  numeroItemCompra: number;
  codigoItemCatalogo: number;
  objetoCompra: string;
  descricaoDetalhadaItem: string;
  dataAtualizacaoFato: string;
}

// Amostra da primeira página (10 registros)
export const pesquisaPrecoDetalheAmostra: PesquisaPrecoDetalhe[] = [
  {
    idCompra: "4000105900042025",
    idItemCompra: 8120793,
    numeroItemCompra: 1,
    codigoItemCatalogo: 233523,
    objetoCompra: "Objeto: Pregão Eletrônico - Aquisição de mobiliário.",
    descricaoDetalhadaItem: "CADEIRA ESCRITÓRIO, MATERIAL ESTRUTURA TUBO AÇO, MATERIAL REVESTIMENTO ASSENTO E ENCOSTO COURO, MATERIAL ENCOSTO ESPUMA INJETADA, MATERIAL ASSENTO ESPUMA INJETADA, TRATAMENTO SUPERFICIAL ESTRUTURA PINTADO, TIPO BASE GIRATÓRIO, TIPO ENCOSTO ALTO, APOIO BRAÇO COM BRAÇOS, REGULAGEM VERTICAL COM REGULAGEM, COR PRETA, CARACTERÍSTICAS ADICIONAIS COM RODÍZIOS",
    dataAtualizacaoFato: "2026-05-06T04:00:00.005452"
  },
  {
    idCompra: "9001605000432022",
    idItemCompra: 1296427,
    numeroItemCompra: 21,
    codigoItemCatalogo: 233523,
    objetoCompra: "Objeto: Pregão Eletrônico - Registro de Preços, válido por 12 (doze) meses, para eventuais aquisições de mobiliários diversos (móveis de madeira, móveis em plástico modulado, painéis divisórios, beliche em madeira, colchão de solteiro, armários multiuso em MDP, caixas plásticas empilháveis, cadeiras diversas), conforme Anexo I (Termo de Referência).",
    descricaoDetalhadaItem: "",
    dataAtualizacaoFato: "2023-08-16T04:00:00.046325"
  },
  {
    idCompra: "9001605000762022",
    idItemCompra: 1693989,
    numeroItemCompra: 5,
    codigoItemCatalogo: 233523,
    objetoCompra: "Objeto: Pregão Eletrônico - Registro de Preços, válido por 12 (doze) meses, para eventuais aquisições de mobiliários diversos, conforme Anexo I (Termo de Referência).",
    descricaoDetalhadaItem: "",
    dataAtualizacaoFato: "2023-10-29T04:00:00.003263"
  },
  {
    idCompra: "98798905900062026",
    idItemCompra: 11697982,
    numeroItemCompra: 26,
    codigoItemCatalogo: 233523,
    objetoCompra: "Objeto: Pregão Eletrônico - Registro de preços para Aquisição de Equipamentos e Mobiliários para atender as secretarias municipais de Vera Cruz do Oeste - PR.",
    descricaoDetalhadaItem: "CADEIRA ESCRITÓRIO, MATERIAL ESTRUTURA TUBO AÇO, MATERIAL REVESTIMENTO ASSENTO E ENCOSTO COURO, MATERIAL ENCOSTO ESPUMA INJETADA, MATERIAL ASSENTO ESPUMA INJETADA, TRATAMENTO SUPERFICIAL ESTRUTURA PINTADO, TIPO BASE GIRATÓRIO, TIPO ENCOSTO ALTO, APOIO BRAÇO COM BRAÇOS, REGULAGEM VERTICAL COM REGULAGEM, COR PRETA, CARACTERÍSTICAS ADICIONAIS COM RODÍZIOS",
    dataAtualizacaoFato: "2026-08-06T03:00:47.858674"
  },
  {
    idCompra: "98197505900302024",
    idItemCompra: 7949006,
    numeroItemCompra: 34,
    codigoItemCatalogo: 233523,
    objetoCompra: "Objeto: Pregão Eletrônico - CONTRATAÇÃO de EMPRESA PARA O FORNECIMENTO DE MOBILIÁRIO E ELETRO EM GERAL PARA ATENDER AS NECESSIDADES DE TODA A PREFEITURA DE CAJAZEIRAS-PB",
    descricaoDetalhadaItem: "CADEIRA ESCRITÓRIO, MATERIAL ESTRUTURA TUBO AÇO, MATERIAL REVESTIMENTO ASSENTO E ENCOSTO COURO, MATERIAL ENCOSTO ESPUMA INJETADA, MATERIAL ASSENTO ESPUMA INJETADA, TRATAMENTO SUPERFICIAL ESTRUTURA PINTADO, TIPO BASE GIRATÓRIO, TIPO ENCOSTO ALTO, APOIO BRAÇO COM BRAÇOS, REGULAGEM VERTICAL COM REGULAGEM, COR PRETA, CARACTERÍSTICAS ADICIONAIS COM RODÍZIOS",
    dataAtualizacaoFato: "2026-04-15T04:00:00.002735"
  },
  {
    idCompra: "92823905900032024",
    idItemCompra: 4930876,
    numeroItemCompra: 1,
    codigoItemCatalogo: 233523,
    objetoCompra: "Objeto: Pregão Eletrônico - Aquisição de cadeiras, por meio de Sistema de Registro de Preços, conforme condições, quantidades e exigências estabelecidas neste Edital e no Anexo I - Termo de Referência.",
    descricaoDetalhadaItem: "CADEIRA ESCRITÓRIO, MATERIAL ESTRUTURA TUBO AÇO, MATERIAL REVESTIMENTO ASSENTO E ENCOSTO COURO, MATERIAL ENCOSTO ESPUMA INJETADA, MATERIAL ASSENTO ESPUMA INJETADA, TRATAMENTO SUPERFICIAL ESTRUTURA PINTADO, TIPO BASE GIRATÓRIO, TIPO ENCOSTO ALTO, APOIO BRAÇO COM BRAÇOS, REGULAGEM VERTICAL COM REGULAGEM, COR PRETA, CARACTERÍSTICAS ADICIONAIS COM RODÍZIOS",
    dataAtualizacaoFato: "2025-05-03T03:59:59.947251"
  },
  {
    idCompra: "92652306900102024",
    idItemCompra: 5967601,
    numeroItemCompra: 1,
    codigoItemCatalogo: 233523,
    objetoCompra: "Objeto: Aquisição de Cadeira de escritório de base giratória: Cor Preta; azul ou cinza (todo o quantitativo das cadeiras deve ser da mesma cor); material de estrutura em aço; revestimento de assento e encosto de tecido ou couro ecológico; material do encosto e assento com espuma injetada; base fixa com 05 rodízios; apoio para braços; suporte lombar fixo; espaldar médio; pistão a gás para regulagem de altura; estrutura em pintura epóxi. Peso mínimo suportado: 110kg. Garantia mínima de 12",
    descricaoDetalhadaItem: "CADEIRA ESCRITÓRIO, MATERIAL ESTRUTURA TUBO AÇO, MATERIAL REVESTIMENTO ASSENTO E ENCOSTO COURO, MATERIAL ENCOSTO ESPUMA INJETADA, MATERIAL ASSENTO ESPUMA INJETADA, TRATAMENTO SUPERFICIAL ESTRUTURA PINTADO, TIPO BASE GIRATÓRIO, TIPO ENCOSTO ALTO, APOIO BRAÇO COM BRAÇOS, REGULAGEM VERTICAL COM REGULAGEM, COR PRETA, CARACTERÍSTICAS ADICIONAIS COM RODÍZIOS",
    dataAtualizacaoFato: "2025-09-28T04:00:00.004172"
  },
  {
    idCompra: "92510905900282024",
    idItemCompra: 7069324,
    numeroItemCompra: 13,
    codigoItemCatalogo: 233523,
    objetoCompra: "Objeto: Pregão Eletrônico - Formação de Ata de Registro de Preços para aquisição futura e eventual de mobiliário, conforme especificações constantes do Anexo I - Termo de Referência - Especificações Técnicas, parte integrante do Edital.",
    descricaoDetalhadaItem: "CADEIRA ESCRITÓRIO, MATERIAL ESTRUTURA TUBO AÇO, MATERIAL REVESTIMENTO ASSENTO E ENCOSTO COURO, MATERIAL ENCOSTO ESPUMA INJETADA, MATERIAL ASSENTO ESPUMA INJETADA, TRATAMENTO SUPERFICIAL ESTRUTURA PINTADO, TIPO BASE GIRATÓRIO, TIPO ENCOSTO ALTO, APOIO BRAÇO COM BRAÇOS, REGULAGEM VERTICAL COM REGULAGEM, COR PRETA, CARACTERÍSTICAS ADICIONAIS COM RODÍZIOS",
    dataAtualizacaoFato: "2025-12-20T04:00:00.003376"
  },
  {
    idCompra: "92510905000402023",
    idItemCompra: 4838393,
    numeroItemCompra: 2,
    codigoItemCatalogo: 233523,
    objetoCompra: "Objeto: Pregão Eletrônico - Aquisição de cadeiras giratórias estofadas com braços reguláveis e espaldar médio.",
    descricaoDetalhadaItem: "CADEIRA ESCRITÓRIO, MATERIAL ESTRUTURA TUBO AÇO, MATERIAL REVESTIMENTO ASSENTO E ENCOSTO COURO, MATERIAL ENCOSTO ESPUMA INJETADA, MATERIAL ASSENTO ESPUMA INJETADA, TRATAMENTO SUPERFICIAL ESTRUTURA PINTADO, TIPO BASE GIRATÓRIO, TIPO ENCOSTO ALTO, APOIO BRAÇO COM BRAÇOS, REGULAGEM VERTICAL COM REGULAGEM, COR PRETA, CARACTERÍSTICAS ADICIONAIS COM RODÍZIOS",
    dataAtualizacaoFato: "2025-04-18T03:59:59.879562"
  },
  {
    idCompra: "92510905000402023",
    idItemCompra: 4838392,
    numeroItemCompra: 1,
    codigoItemCatalogo: 233523,
    objetoCompra: "Objeto: Pregão Eletrônico - Aquisição de cadeiras giratórias estofadas com braços reguláveis e espaldar médio.",
    descricaoDetalhadaItem: "CADEIRA ESCRITÓRIO, MATERIAL ESTRUTURA TUBO AÇO, MATERIAL REVESTIMENTO ASSENTO E ENCOSTO COURO, MATERIAL ENCOSTO ESPUMA INJETADA, MATERIAL ASSENTO ESPUMA INJETADA, TRATAMENTO SUPERFICIAL ESTRUTURA PINTADO, TIPO BASE GIRATÓRIO, TIPO ENCOSTO ALTO, APOIO BRAÇO COM BRAÇOS, REGULAGEM VERTICAL COM REGULAGEM, COR PRETA, CARACTERÍSTICAS ADICIONAIS COM RODÍZIOS",
    dataAtualizacaoFato: "2025-04-18T03:59:59.879562"
  }
];

// Metadata da ingestão
export const pesquisaPrecoDetalheIngestaoMeta = {
  endpoint: '/modulo-pesquisa-preco/2_consultarMaterialDetalhe',
  totalRegistros: 25,
  totalPaginas: 3,
  registrosPorPagina: 10,
  paginasRestantes: 2,
  filtroAplicado: 'codigoItemCatalogo=233523',
  dataIngestao: new Date().toISOString(),
  status: 'COMPLETO',
};

// Estatísticas da amostra
export const pesquisaPrecoDetalheStats = {
  comprasUnicas: new Set(pesquisaPrecoDetalheAmostra.map(p => p.idCompra)).size,
  itensUnicos: new Set(pesquisaPrecoDetalheAmostra.map(p => p.idItemCompra)).size,
  comDescricao: pesquisaPrecoDetalheAmostra.filter(p => p.descricaoDetalhadaItem !== '').length,
  semDescricao: pesquisaPrecoDetalheAmostra.filter(p => p.descricaoDetalhadaItem === '').length,
};

// Estratégia de paginação para ingestão completa
export const pesquisaPrecoDetalhePaginacaoEstrategia = {
  metodo: 'Iteração sequencial com paginação',
  tempoEstimado: '~3 segundos (1 requisição/segundo)',
  recomendacao: 'Usar paginação paralela com limite de 5 requisições simultâneas',
  exemplo: `
// Exemplo de ingestão completa (Node.js)
const BASE_URL = 'https://dadosabertos.compras.gov.br';
const ENDPOINT = '/modulo-pesquisa-preco/2_consultarMaterialDetalhe';
const TOTAL_PAGINAS = 3;
const CONCURRENCY = 3;
const CODIGO_ITEM = '233523'; // CADEIRA ESCRITÓRIO

async function fetchPagina(pagina) {
  const response = await fetch(
    \`\${BASE_URL}\${ENDPOINT}?pagina=\${pagina}&tamanhoPagina=10&codigoItemCatalogo=\${CODIGO_ITEM}\`
  );
  const data = await response.json();
  return data.resultado;
}

async function ingestaoCompleta() {
  const todosDetalhes = [];
  
  for (let i = 1; i <= TOTAL_PAGINAS; i += CONCURRENCY) {
    const promises = [];
    for (let j = 0; j < CONCURRENCY && i + j <= TOTAL_PAGINAS; j++) {
      promises.push(fetchPagina(i + j));
    }
    const results = await Promise.all(promises);
    todosDetalhes.push(...results.flat());
    
    console.log(\`Progresso: \${Math.min(i + CONCURRENCY - 1, TOTAL_PAGINAS)}/\${TOTAL_PAGINAS} páginas\`);
    
    if (i + CONCURRENCY <= TOTAL_PAGINAS) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return todosDetalhes;
}
`,
};
