/**
 * Gate provisório de objeto de edital para o catálogo LicitaGym (2 pares):
 * - 78/7830 fitness (ginástica e recreação)
 * - 72/7220 piso (revestimentos)
 *
 * A listagem PNCP /contratacoes/publicacao NÃO traz classe CATMAT.
 * Até existir sync de itens da compra com codigoItem/classe, este filtro
 * determinístico no texto do objeto evita ingestão fora do recorte.
 */

export type CatalogoEditalDominio = "fitness_7830" | "piso_7220";

const FITNESS_RE =
  /\b(?:musculac\w*|academia\w*|fitness|ginastic\w*|recreac\w*|esteira\w*|eliptic\w*|bicicleta\s+ergometric\w*|bike\s+ergometric\w*|halter\w*|dumbbell\w*|anilhas?\b|colchonet\w*|puxador\w*|aparelho\w*\s+de\s+muscul\w*|equipamento\w*\s+(?:de\s+)?(?:ginastic\w*|muscul\w*|fitness)|cross[\s-]?fit|spinning|leg\s*press|smith\s*machine|remada\b|supino\b|extensora\b|flexora\b)\b/i;

const PISO_RE =
  /\b(?:piso(?:s)?\s+(?:de\s+)?(?:borracha|epdm|eva|vinil\w*|modular|intertravad\w*|esportiv\w*|academia|ginastic\w*)|revestimento\w*\s+(?:de\s+)?(?:piso|borracha|epdm)|placa\w*\s+modular\w*|epdm|tatame\w*|piso\s+emborrachad\w*)\b/i;

/** Ruído típico de obra civil que NÃO deve passar só por conter "piso". */
const OBRA_CIVIL_RE =
  /\b(?:pavimenta\w*|asfalt\w*|reapeamento|recapeamento|drenagem|conten[cç][aã]o\s+de\s+encosta|constru[cç][aã]o\s+civil|edifica[cç][aã]o|alvenaria|concreto\s+armado)\b/i;

export function normalizeObjetoTexto(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function matchCatalogoEditalObjeto(
  objeto: unknown,
): { ok: boolean; dominios: CatalogoEditalDominio[] } {
  const text = normalizeObjetoTexto(objeto);
  if (!text) return { ok: false, dominios: [] };

  const dominios: CatalogoEditalDominio[] = [];
  if (FITNESS_RE.test(text)) dominios.push("fitness_7830");

  // Piso: exige padrão de revestimento; bloqueia obra civil genérica
  if (PISO_RE.test(text) && !OBRA_CIVIL_RE.test(text)) {
    dominios.push("piso_7220");
  }

  return { ok: dominios.length > 0, dominios };
}

export function isObjetoNoCatalogoLicitaGym(objeto: unknown): boolean {
  return matchCatalogoEditalObjeto(objeto).ok;
}
