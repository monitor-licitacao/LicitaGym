export function normalizeCnpj(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function buildNumeroControlePncp(
  orgaoCnpj: string,
  ano: number,
  sequencial: number,
): string {
  const cnpj = normalizeCnpj(orgaoCnpj);
  return `${cnpj}-${String(sequencial).padStart(6, "0")}/${ano}`;
}

export function normalizeEdital(item: Record<string, unknown>) {
  const orgaoCnpj = normalizeCnpj(item.orgaoEntidadeCnpj ?? item.cnpjOrgao ?? item.orgao_cnpj);
  const ano = Number(item.anoCompra ?? item.ano ?? 0);
  const sequencial = Number(item.sequencialCompra ?? item.sequencial ?? 0);
  return {
    numero_controle_pncp: String(
      item.numeroControlePNCP ?? item.numeroControlePncp ?? buildNumeroControlePncp(orgaoCnpj, ano, sequencial),
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
    url_origem: orgaoCnpj && ano && sequencial
      ? `https://pncp.gov.br/app/editais/${orgaoCnpj}/${ano}/${sequencial}`
      : null,
  };
}

export function normalizeAta(item: Record<string, unknown>) {
  const orgaoCnpj = normalizeCnpj(item.orgaoEntidadeCnpj ?? item.cnpjOrgao);
  const ano = Number(item.anoAta ?? item.ano ?? 0);
  const sequencialAta = Number(item.sequencialAta ?? item.sequencial ?? 0);
  return {
    numero_controle_pncp: String(
      item.numeroControlePNCP ?? item.numeroControlePncp ??
        buildNumeroControlePncp(orgaoCnpj, ano, sequencialAta),
    ),
    orgao_cnpj: orgaoCnpj,
    ano,
    sequencial_ata: sequencialAta,
    objeto: item.objetoAta ? String(item.objetoAta) : item.objeto ? String(item.objeto) : null,
    valor_total: item.valorTotal != null ? Number(item.valorTotal) : null,
    data_assinatura: item.dataAssinatura ?? null,
    data_publicacao: item.dataPublicacaoPncp ?? item.dataPublicacao ?? null,
    status: item.situacaoAta ? String(item.situacaoAta) : null,
    url_origem: orgaoCnpj && ano && sequencialAta
      ? `https://pncp.gov.br/app/atas/${orgaoCnpj}/${ano}/${sequencialAta}`
      : null,
  };
}

export function normalizeContrato(item: Record<string, unknown>) {
  const orgaoCnpj = normalizeCnpj(item.orgaoEntidadeCnpj ?? item.cnpjOrgao);
  const ano = Number(item.anoContrato ?? item.ano ?? 0);
  const sequencial = Number(item.sequencialContrato ?? item.sequencial ?? 0);
  return {
    numero_controle_pncp: String(
      item.numeroControlePNCP ?? item.numeroControlePncp ??
        buildNumeroControlePncp(orgaoCnpj, ano, sequencial),
    ),
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
    url_origem: orgaoCnpj && ano && sequencial
      ? `https://pncp.gov.br/app/contratos/${orgaoCnpj}/${ano}/${sequencial}`
      : null,
  };
}
