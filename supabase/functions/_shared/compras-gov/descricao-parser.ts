/** Extrai pares chave/valor de descricaoItem CATMAT (ex.: "TIPO: X, MATERIAL: Y"). */
export function parseDescricaoItemTaxonomias(descricao: string | null | undefined): Record<string, string> {
  if (!descricao?.trim()) return {};

  const taxonomias: Record<string, string> = {};
  const parts = descricao.split(/,\s*(?=[A-ZÀ-Ú][A-ZÀ-Ú0-9 /_-]{0,40}:)/u);

  for (const part of parts) {
    const match = part.match(/^([^:,]+):\s*(.+)$/u);
    if (!match) continue;
    const chave = match[1].trim().toUpperCase();
    const valor = match[2].trim();
    if (chave && valor) taxonomias[chave] = valor;
  }

  return taxonomias;
}
