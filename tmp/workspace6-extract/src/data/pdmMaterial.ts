// Dados reais da ingestão CATMAT — PDM (Produto Descritivo Básico)
// Endpoint: GET https://dadosabertos.compras.gov.br/modulo-material/3_consultarPdmMaterial
// Total: 20.433 registros em 2.044 páginas (10 registros por página)

export interface PdmMaterial {
  codigoGrupo: number;
  nomeGrupo: string;
  codigoClasse: number;
  nomeClasse: string;
  codigoPdm: number;
  nomePdm: string;
  statusPdm: boolean;
  dataHoraAtualizacao: string;
}

// Amostra da primeira página (10 registros)
export const pdmAmostra: PdmMaterial[] = [
  { codigoGrupo: 10, nomeGrupo: "ARMAMENTO", codigoClasse: 1005, nomeClasse: "ARMAS DE FOGO DE CALIBRE ATÉ 120MM", codigoPdm: 2995, nomePdm: "ARMA DE FOGO DE PEQUENO PORTE - REVÓLVER / PISTOLA", statusPdm: true, dataHoraAtualizacao: "2021-10-16T09:21:41.961529" },
  { codigoGrupo: 10, nomeGrupo: "ARMAMENTO", codigoClasse: 1005, nomeClasse: "ARMAS DE FOGO DE CALIBRE ATÉ 120MM", codigoPdm: 4050, nomePdm: "CABO PARA ARMA DE FOGO", statusPdm: true, dataHoraAtualizacao: "2021-10-16T09:21:41.961529" },
  { codigoGrupo: 10, nomeGrupo: "ARMAMENTO", codigoClasse: 1005, nomeClasse: "ARMAS DE FOGO DE CALIBRE ATÉ 120MM", codigoPdm: 7889, nomePdm: "FUZIS", statusPdm: true, dataHoraAtualizacao: "2021-10-16T09:21:41.961529" },
  { codigoGrupo: 10, nomeGrupo: "ARMAMENTO", codigoClasse: 1005, nomeClasse: "ARMAS DE FOGO DE CALIBRE ATÉ 120MM", codigoPdm: 10799, nomePdm: "PISTOLA", statusPdm: true, dataHoraAtualizacao: "2021-10-16T09:21:41.961529" },
  { codigoGrupo: 10, nomeGrupo: "ARMAMENTO", codigoClasse: 1005, nomeClasse: "ARMAS DE FOGO DE CALIBRE ATÉ 120MM", codigoPdm: 13794, nomePdm: "ANEL FERROLHO", statusPdm: true, dataHoraAtualizacao: "2021-10-16T09:21:41.961529" },
  { codigoGrupo: 10, nomeGrupo: "ARMAMENTO", codigoClasse: 1005, nomeClasse: "ARMAS DE FOGO DE CALIBRE ATÉ 120MM", codigoPdm: 13795, nomePdm: "CHAVE FERROLHO", statusPdm: true, dataHoraAtualizacao: "2021-10-16T09:21:41.961529" },
  { codigoGrupo: 10, nomeGrupo: "ARMAMENTO", codigoClasse: 1005, nomeClasse: "ARMAS DE FOGO DE CALIBRE ATÉ 120MM", codigoPdm: 13796, nomePdm: "EXTRATOR CÁPSULA", statusPdm: true, dataHoraAtualizacao: "2021-10-16T09:21:41.961529" },
  { codigoGrupo: 10, nomeGrupo: "ARMAMENTO", codigoClasse: 1005, nomeClasse: "ARMAS DE FOGO DE CALIBRE ATÉ 120MM", codigoPdm: 13797, nomePdm: "TUBO TOMADA GÁS", statusPdm: true, dataHoraAtualizacao: "2021-10-16T09:21:41.961529" },
  { codigoGrupo: 10, nomeGrupo: "ARMAMENTO", codigoClasse: 1005, nomeClasse: "ARMAS DE FOGO DE CALIBRE ATÉ 120MM", codigoPdm: 13799, nomePdm: "REFORÇADOR TIRO FESTIM", statusPdm: true, dataHoraAtualizacao: "2021-10-16T09:21:41.961529" },
  { codigoGrupo: 10, nomeGrupo: "ARMAMENTO", codigoClasse: 1005, nomeClasse: "ARMAS DE FOGO DE CALIBRE ATÉ 120MM", codigoPdm: 13800, nomePdm: "MOLA EJETOR", statusPdm: true, dataHoraAtualizacao: "2021-10-16T09:21:41.961529" },
];

// Metadata da ingestão
export const pdmIngestaoMeta = {
  endpoint: '/modulo-material/3_consultarPdmMaterial',
  totalRegistros: 20433,
  totalPaginas: 2044,
  registrosPorPagina: 10,
  paginasRestantes: 2043,
  dataIngestao: new Date().toISOString(),
  status: 'PARCIAL - Necessária paginação completa',
};

// Estratégia de paginação para ingestão completa
export const pdmPaginacaoEstrategia = {
  metodo: 'Iteração sequencial com paginação',
  tempoEstimado: '~34 minutos (1 requisição/segundo)',
  recomendacao: 'Usar paginação paralela com limite de 5-10 requisições simultâneas',
  exemplo: `
// Exemplo de ingestão completa (Node.js)
const BASE_URL = 'https://dadosabertos.compras.gov.br';
const ENDPOINT = '/modulo-material/3_consultarPdmMaterial';
const TOTAL_PAGINAS = 2044;
const CONCURRENCY = 5; // requisições simultâneas

async function fetchPagina(pagina) {
  const response = await fetch(\`\${BASE_URL}\${ENDPOINT}?pagina=\${pagina}\`);
  const data = await response.json();
  return data.resultado;
}

async function ingestaoCompleta() {
  const todosPdm = [];
  
  for (let i = 1; i <= TOTAL_PAGINAS; i += CONCURRENCY) {
    const promises = [];
    for (let j = 0; j < CONCURRENCY && i + j <= TOTAL_PAGINAS; j++) {
      promises.push(fetchPagina(i + j));
    }
    const results = await Promise.all(promises);
    todosPdm.push(...results.flat());
    
    console.log(\`Progresso: \${Math.min(i + CONCURRENCY - 1, TOTAL_PAGINAS)}/\${TOTAL_PAGINAS} páginas\`);
    
    // Rate limiting: 1 segundo entre batches
    if (i + CONCURRENCY <= TOTAL_PAGINAS) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return todosPdm;
}
`,
};
