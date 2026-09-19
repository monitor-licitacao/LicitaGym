export const PNCP_PORTAL_BASE = "https://pncp.gov.br/app";

export function normalizeCnpj(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function portalUrl(...segments: (string | number)[]): string {
  return `${PNCP_PORTAL_BASE}/${segments.map(String).join("/")}`;
}

/** Search API devolve `/pca/{cnpj}/{ano}` — prefixo `/app` é obrigatório no portal. */
export function resolvePncpSearchItemUrl(itemUrl: string): string | null {
  const raw = String(itemUrl ?? "").trim();
  if (!raw) return null;
  const path = raw.startsWith("/app/") ? raw : raw.startsWith("/") ? `/app${raw}` : `/app/${raw}`;
  return `https://pncp.gov.br${path}`;
}

/** Compra/edital/contrato estendido: `{CNPJ14}-{tipo}-{seqPad}/{ano}`. */
const CONTROLE_EXTENDED_RE = /^(\d{14})-(\d+)-(\d+)\/(\d{4})$/;

/** Compra/edital legado: `{CNPJ14}-{seqPad}/{ano}`. */
const CONTROLE_SIMPLE_RE = /^(\d{14})-(\d+)\/(\d{4})$/;

/** Ata: `{CNPJ14}-{tipo}-{seqCompraPad}/{anoCompra}-{seqAtaPad}`. */
const CONTROLE_ATA_RE = /^(\d{14})-(\d+)-(\d+)\/(\d{4})-(\d+)$/;

/** PCA plano (Consulta): `{CNPJ14}-{segmento}-{seqPad}/{ano}`. */
const ID_PCA_PNCP_RE = /^(\d{14})-(\d+)-(\d+)\/(\d{4})$/;

export type ParsedControleCompra = {
  cnpj: string;
  tipoSegmento: number;
  sequencial: number;
  ano: number;
};

export type ParsedControleAta = ParsedControleCompra & {
  sequencialAta: number;
};

export type ParsedIdPcaPncp = {
  idPcaPncp: string;
  cnpj: string;
  segmento: number;
  sequencial: number;
  ano: number;
};

export function parseControleCompra(raw: string): ParsedControleCompra | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  const extended = value.match(CONTROLE_EXTENDED_RE);
  if (extended) {
    return {
      cnpj: extended[1],
      tipoSegmento: Number(extended[2]),
      sequencial: Number(extended[3]),
      ano: Number(extended[4]),
    };
  }

  const simple = value.match(CONTROLE_SIMPLE_RE);
  if (simple) {
    return {
      cnpj: simple[1],
      tipoSegmento: 1,
      sequencial: Number(simple[2]),
      ano: Number(simple[3]),
    };
  }

  return null;
}

export function parseControleAta(raw: string): ParsedControleAta | null {
  const value = String(raw ?? "").trim();
  const match = value.match(CONTROLE_ATA_RE);
  if (!match) return null;
  return {
    cnpj: match[1],
    tipoSegmento: Number(match[2]),
    sequencial: Number(match[3]),
    ano: Number(match[4]),
    sequencialAta: Number(match[5]),
  };
}

export function parseIdPcaPncp(idPcaPncp: string): ParsedIdPcaPncp | null {
  const raw = String(idPcaPncp ?? "").trim();
  const match = raw.match(ID_PCA_PNCP_RE);
  if (!match) return null;
  return {
    idPcaPncp: raw,
    cnpj: match[1],
    segmento: Number(match[2]),
    sequencial: Number(match[3]),
    ano: Number(match[4]),
  };
}

export function buildNumeroControlePncp(
  orgaoCnpj: string,
  ano: number,
  sequencial: number,
  tipoSegmento = 1,
): string {
  const cnpj = normalizeCnpj(orgaoCnpj);
  return `${cnpj}-${tipoSegmento}-${String(sequencial).padStart(6, "0")}/${ano}`;
}

/** PCA agregado por órgão (Search `item_url`: `/pca/{cnpj}/{ano}`). */
export function buildPcaOrgaoPortalUrl(cnpj: string, ano: number): string | null {
  const normalized = normalizeCnpj(cnpj);
  if (!normalized || !ano) return null;
  return portalUrl("pca", normalized, ano);
}

/** PCA plano/unidade (Consulta `idPcaPncp`). */
export function buildPcaPlanoPortalUrl(input: {
  idPcaPncp?: string;
  cnpj?: string;
  segmento?: number;
  sequencial?: number;
  ano?: number;
}): string | null {
  const parsed = input.idPcaPncp ? parseIdPcaPncp(input.idPcaPncp) : null;
  const cnpj = normalizeCnpj(parsed?.cnpj ?? input.cnpj);
  const ano = parsed?.ano ?? input.ano;
  const segmento = parsed?.segmento ?? input.segmento ?? 0;
  const sequencial = parsed?.sequencial ?? input.sequencial;
  if (!cnpj || !ano || sequencial == null) return null;
  const slug = `${cnpj}-${segmento}-${String(sequencial).padStart(6, "0")}`;
  return portalUrl("pca", slug, ano);
}

/** Edital/compra: `/app/editais/{cnpj}/{anoCompra}/{sequencialCompra}`. */
export function buildEditalPortalUrl(
  cnpj: string,
  anoCompra: number,
  sequencialCompra: number,
): string | null {
  const normalized = normalizeCnpj(cnpj);
  if (!normalized || !anoCompra || !sequencialCompra) return null;
  return portalUrl("editais", normalized, anoCompra, sequencialCompra);
}

/** Ata: `/app/atas/{cnpj}/{anoCompra}/{sequencialCompra}/{sequencialAta}`. */
export function buildAtaPortalUrl(
  cnpj: string,
  anoCompra: number,
  sequencialCompra: number,
  sequencialAta: number,
): string | null {
  const normalized = normalizeCnpj(cnpj);
  if (!normalized || !anoCompra || !sequencialCompra || !sequencialAta) return null;
  return portalUrl("atas", normalized, anoCompra, sequencialCompra, sequencialAta);
}

/** Contrato: `/app/contratos/{cnpj}/{anoContrato}/{sequencialContrato}`. */
export function buildContratoPortalUrl(
  cnpj: string,
  anoContrato: number,
  sequencialContrato: number,
): string | null {
  const normalized = normalizeCnpj(cnpj);
  if (!normalized || !anoContrato || !sequencialContrato) return null;
  return portalUrl("contratos", normalized, anoContrato, sequencialContrato);
}

function readOrgaoCnpj(item: Record<string, unknown>): string {
  const orgao = item.orgaoEntidade;
  if (orgao && typeof orgao === "object" && "cnpj" in orgao) {
    return normalizeCnpj((orgao as Record<string, unknown>).cnpj);
  }
  return normalizeCnpj(item.orgaoEntidadeCnpj ?? item.cnpjOrgao ?? item.orgao_cnpj);
}

function resolveCompraControle(item: Record<string, unknown>): ParsedControleCompra | null {
  const candidates = [
    item.numeroControlePNCP,
    item.numeroControlePncp,
    item.numeroControlePNCPCompra,
    item.numeroControlePncpCompra,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const parsed = parseControleCompra(candidate);
      if (parsed) return parsed;
    }
  }
  return null;
}

export function normalizePcaPlano(plan: Record<string, unknown>, fallbackAno: number) {
  const idPcaPncp = String(plan.idPcaPncp ?? plan.id_pca_pncp ?? "").trim();
  const parsed = parseIdPcaPncp(idPcaPncp);
  const orgaoCnpj = normalizeCnpj(plan.orgaoEntidadeCnpj ?? plan.cnpj ?? parsed?.cnpj);
  const anoExercicio = Number(plan.anoPca ?? plan.ano ?? parsed?.ano ?? fallbackAno);
  const nomeUnidade = plan.nomeUnidade ? String(plan.nomeUnidade) : null;
  const razaoSocial = plan.orgaoEntidadeRazaoSocial
    ? String(plan.orgaoEntidadeRazaoSocial)
    : null;

  return {
    id_pca_pncp: idPcaPncp,
    ano_exercicio: anoExercicio,
    orgao_cnpj: orgaoCnpj,
    unidade_codigo: plan.codigoUnidade != null ? String(plan.codigoUnidade) : null,
    numero_plano: parsed?.sequencial ?? null,
    titulo: nomeUnidade ?? razaoSocial ?? idPcaPncp,
    descricao: razaoSocial && nomeUnidade ? razaoSocial : null,
    status: plan.status ? String(plan.status) : null,
    data_publicacao: plan.dataPublicacaoPNCP ?? plan.dataPublicacao ?? null,
    data_atualizacao_origem: plan.dataAtualizacaoGlobalPCA ?? plan.dataAtualizacao ?? null,
    url_origem: buildPcaPlanoPortalUrl({
      idPcaPncp,
      cnpj: orgaoCnpj,
      segmento: parsed?.segmento,
      sequencial: parsed?.sequencial,
      ano: anoExercicio,
    }),
  };
}

export function normalizePcaItem(
  item: Record<string, unknown>,
  _plan: Record<string, unknown>,
) {
  const numeroItem = Number(item.numeroItem ?? item.numero_item ?? 0);
  return {
    numero_item: numeroItem,
    descricao: item.descricaoItem ? String(item.descricaoItem) : null,
    categoria: item.categoriaItemPcaNome ? String(item.categoriaItemPcaNome) : null,
    classe_material_servico: item.classificacaoSuperiorCodigo != null
      ? String(item.classificacaoSuperiorCodigo)
      : null,
    quantidade: item.quantidadeEstimada != null ? Number(item.quantidadeEstimada) : null,
    unidade_medida: item.unidadeFornecimento ? String(item.unidadeFornecimento) : null,
    valor_unitario_estimado: item.valorUnitario != null ? Number(item.valorUnitario) : null,
    valor_total_estimado: item.valorTotal != null ? Number(item.valorTotal) : null,
    data_prevista_contratacao: item.dataDesejada ?? null,
    status: item.status ? String(item.status) : null,
    codigo_pdm: item.codigoPdm ? String(item.codigoPdm) : null,
    codigo_item: item.codigoItem ? String(item.codigoItem) : null,
    numero_controle_pncp: item.numeroControlePncp ? String(item.numeroControlePncp) : null,
    numero_item_pncp: item.numeroItemPncp ? String(item.numeroItemPncp) : null,
    classificacao_catalogo_id: item.classificacaoCatalogo != null
      ? String(item.classificacaoCatalogo)
      : null,
  };
}

export function normalizeEdital(item: Record<string, unknown>) {
  const parsedControle = resolveCompraControle(item);
  const orgaoCnpj = readOrgaoCnpj(item) || parsedControle?.cnpj || "";
  const ano = Number(item.anoCompra ?? item.ano ?? parsedControle?.ano ?? 0);
  const sequencial = Number(
    item.sequencialCompra ?? item.sequencial ?? parsedControle?.sequencial ?? 0,
  );

  return {
    numero_controle_pncp: String(
      item.numeroControlePNCP ??
        item.numeroControlePncp ??
        item.numeroControlePNCPCompra ??
        item.numeroControlePncpCompra ??
        (parsedControle
          ? buildNumeroControlePncp(
            orgaoCnpj,
            ano,
            sequencial,
            parsedControle.tipoSegmento,
          )
          : buildNumeroControlePncp(orgaoCnpj, ano, sequencial)),
    ),
    orgao_cnpj: orgaoCnpj,
    ano,
    sequencial,
    numero_processo: item.processo ? String(item.processo) : null,
    modalidade_codigo: item.codigoModalidadeContratacao != null
      ? Number(item.codigoModalidadeContratacao)
      : null,
    objeto: item.objetoCompra ? String(item.objetoCompra) : item.objeto ? String(item.objeto) : null,
    descricao: item.informacaoComplementar ? String(item.informacaoComplementar) : null,
    valor_estimado: item.valorTotalEstimado != null ? Number(item.valorTotalEstimado) : null,
    data_publicacao: item.dataPublicacaoPncp ?? item.dataPublicacao ?? null,
    status: item.situacaoCompraNome ? String(item.situacaoCompraNome) : null,
    url_origem: buildEditalPortalUrl(orgaoCnpj, ano, sequencial),
  };
}

export function normalizeAta(item: Record<string, unknown>) {
  const numeroControleAta = String(
    item.numeroControlePNCPAta ??
      item.numeroControlePncpAta ??
      item.numeroControlePNCP ??
      item.numeroControlePncp ??
      "",
  ).trim();
  const parsedAta = parseControleAta(numeroControleAta);
  const parsedCompra = parseControleCompra(
    String(item.numeroControlePNCPCompra ?? item.numeroControlePncpCompra ?? ""),
  );

  const orgaoCnpj = readOrgaoCnpj(item) || parsedAta?.cnpj || parsedCompra?.cnpj || "";
  const anoCompra = Number(
    parsedAta?.ano ?? parsedCompra?.ano ?? item.anoCompra ?? item.anoAta ?? item.ano ?? 0,
  );
  const sequencialCompra = Number(
    parsedAta?.sequencial ??
      parsedCompra?.sequencial ??
      item.sequencialCompra ??
      item.sequencial ??
      0,
  );
  const sequencialAta = Number(parsedAta?.sequencialAta ?? item.sequencialAta ?? 0);

  return {
    numero_controle_pncp: numeroControleAta ||
      (parsedAta
        ? `${parsedAta.cnpj}-${parsedAta.tipoSegmento}-${String(parsedAta.sequencial).padStart(6, "0")}/${parsedAta.ano}-${String(parsedAta.sequencialAta).padStart(6, "0")}`
        : buildNumeroControlePncp(orgaoCnpj, anoCompra, sequencialAta)),
    orgao_cnpj: orgaoCnpj,
    ano: anoCompra,
    sequencial_ata: sequencialAta,
    objeto: item.objetoAta
      ? String(item.objetoAta)
      : item.objetoContratacao
      ? String(item.objetoContratacao)
      : item.objeto
      ? String(item.objeto)
      : null,
    valor_total: item.valorTotal != null ? Number(item.valorTotal) : null,
    data_assinatura: item.dataAssinatura ?? null,
    data_publicacao: item.dataPublicacaoPncp ?? item.dataPublicacao ?? null,
    status: item.situacaoAta ? String(item.situacaoAta) : null,
    url_origem: buildAtaPortalUrl(orgaoCnpj, anoCompra, sequencialCompra, sequencialAta),
  };
}

export function normalizeContrato(item: Record<string, unknown>) {
  const numeroControle = String(
    item.numeroControlePNCP ?? item.numeroControlePncp ?? "",
  ).trim();
  const parsedControle = parseControleCompra(numeroControle);
  const orgaoCnpj = readOrgaoCnpj(item) || parsedControle?.cnpj || "";
  const ano = Number(item.anoContrato ?? item.ano ?? parsedControle?.ano ?? 0);
  const sequencial = Number(
    item.sequencialContrato ?? item.sequencial ?? parsedControle?.sequencial ?? 0,
  );

  return {
    numero_controle_pncp: numeroControle ||
      (parsedControle
        ? buildNumeroControlePncp(
          orgaoCnpj,
          ano,
          sequencial,
          parsedControle.tipoSegmento,
        )
        : buildNumeroControlePncp(orgaoCnpj, ano, sequencial, 2)),
    orgao_cnpj: orgaoCnpj,
    ano,
    sequencial,
    processo_origem: item.processo ? String(item.processo) : null,
    objeto: item.objetoContrato ? String(item.objetoContrato) : item.objeto ? String(item.objeto) : null,
    valor_inicial: item.valorInicial != null ? Number(item.valorInicial) : null,
    valor_atual: item.valorGlobal != null ? Number(item.valorGlobal) : null,
    data_assinatura: item.dataAssinatura ?? null,
    data_publicacao: item.dataPublicacaoPncp ?? item.dataPublicacao ?? null,
    status: item.situacaoContrato ? String(item.situacaoContrato) : null,
    url_origem: buildContratoPortalUrl(orgaoCnpj, ano, sequencial),
  };
}
