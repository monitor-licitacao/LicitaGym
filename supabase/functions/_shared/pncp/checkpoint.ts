export type Checkpoint = {
  pagina: number;
  paginasRestantes: number;
  totalRegistros: number;
  done: boolean;
};

export function nextPage(checkpoint: Checkpoint): number | null {
  if (checkpoint.done || checkpoint.paginasRestantes <= 0) return null;
  return checkpoint.pagina + 1;
}

export function isComplete(checkpoint: Checkpoint): boolean {
  return checkpoint.paginasRestantes <= 0;
}
