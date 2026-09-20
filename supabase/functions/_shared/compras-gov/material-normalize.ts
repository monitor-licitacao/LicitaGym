import type {
  CaracteristicaMaterial,
  ClasseMaterial,
  GrupoMaterial,
  ItemMaterial,
  NaturezaDespesaMaterial,
  PdmMaterial,
  UnidadeFornecimentoMaterial,
} from "./material-types.ts";
import { parseDescricaoItemTaxonomias } from "./descricao-parser.ts";

export function normalizeGrupoMaterial(raw: GrupoMaterial) {
  return {
    codigo_grupo: raw.codigoGrupo,
    nome: String(raw.nomeGrupo ?? raw.codigoGrupo),
    status: raw.statusGrupo !== false,
    data_atualizacao_origem: raw.dataHoraAtualizacao ?? null,
  };
}

export function normalizeClasseMaterial(raw: ClasseMaterial) {
  return {
    codigo_grupo: raw.codigoGrupo,
    codigo_classe: raw.codigoClasse,
    nome: String(raw.nomeClasse ?? raw.codigoClasse),
    status: raw.statusClasse !== false,
    data_atualizacao_origem: raw.dataHoraAtualizacao ?? null,
  };
}

export function normalizePdmMaterial(raw: PdmMaterial) {
  return {
    codigo_pdm: raw.codigoPdm,
    codigo_grupo: raw.codigoGrupo,
    codigo_classe: raw.codigoClasse,
    nome_pdm: String(raw.nomePdm ?? raw.codigoPdm),
    status: raw.statusPdm !== false,
    data_atualizacao_origem: raw.dataHoraAtualizacao ?? null,
  };
}

export function normalizeCatalogoItemFromMaterial(
  raw: ItemMaterial,
  defaults: { grupo: string; classe: string },
) {
  const descricao = String(raw.descricaoItem ?? raw.codigoItem).trim();
  return {
    codigo_catmat: String(raw.codigoItem),
    codigo_pdm: String(raw.codigoPdm),
    grupo_catmat: String(raw.codigoGrupo ?? defaults.grupo),
    classe_catmat: String(raw.codigoClasse ?? defaults.classe),
    descricao,
    tipo: "material" as const,
    unidade_medida: null as string | null,
    ativo: raw.statusItem !== false,
    fonte_curadoria: "compras.gov.br",
    taxonomias: parseDescricaoItemTaxonomias(descricao),
  };
}

export function normalizeNaturezaDespesa(raw: NaturezaDespesaMaterial) {
  const codigo = String(raw.codigoNaturezaDespesa ?? "").trim();
  if (!codigo) return null;
  return {
    codigo_pdm: raw.codigoPdm,
    codigo_natureza_despesa: codigo,
    descricao: raw.descricaoNaturezaDespesa ? String(raw.descricaoNaturezaDespesa) : null,
    status: raw.statusNaturezaDespesa !== false,
  };
}

export function normalizeUnidadeFornecimento(raw: UnidadeFornecimentoMaterial) {
  const sigla = String(raw.siglaUnidadeFornecimento ?? "").trim();
  if (!sigla) return null;

  const siglaMedida = raw.siglaUnidadeMedida == null
    ? null
    : String(raw.siglaUnidadeMedida).trim() || null;

  const capacidadeRaw = raw.capacidadeUnidadeFornecimento;
  const capacidade = capacidadeRaw == null ? null : Number(capacidadeRaw);
  const capacidadeOk = capacidade != null && Number.isFinite(capacidade)
    ? capacidade
    : null;

  return {
    codigo_pdm: raw.codigoPdm,
    sigla_unidade_fornecimento: sigla,
    nome_unidade_fornecimento: raw.nomeUnidadeFornecimento
      ? String(raw.nomeUnidadeFornecimento)
      : null,
    descricao_unidade_fornecimento: raw.descricaoUnidadeFornecimento
      ? String(raw.descricaoUnidadeFornecimento)
      : null,
    numero_sequencial: Number(raw.numeroSequencialUnidadeFornecimento ?? 1),
    // GET 6: base measure unit + capacity — not the same as
    // catmat_item_caracteristicas.sigla_unidade_medida (attribute unit).
    sigla_unidade_medida: siglaMedida,
    capacidade_unidade_fornecimento: capacidadeOk,
    status: raw.statusUnidadeFornecimentoPdm !== false,
  };
}

export function normalizeCaracteristica(raw: CaracteristicaMaterial) {
  const codigoCaracteristica = String(raw.codigoCaracteristica ?? "").trim();
  const codigoValor = String(raw.codigoValorCaracteristica ?? "").trim();
  if (!codigoCaracteristica || !codigoValor) return null;
  return {
    codigo_item: raw.codigoItem,
    codigo_caracteristica: codigoCaracteristica,
    nome_caracteristica: String(raw.nomeCaracteristica ?? codigoCaracteristica),
    codigo_valor_caracteristica: codigoValor,
    nome_valor_caracteristica: raw.nomeValorCaracteristica
      ? String(raw.nomeValorCaracteristica)
      : null,
    numero_caracteristica: raw.numeroCaracteristica ?? null,
    sigla_unidade_medida: raw.siglaUnidadeMedida ?? null,
    status: raw.statusCaracteristica !== false && raw.statusValorCaracteristica !== false,
  };
}
