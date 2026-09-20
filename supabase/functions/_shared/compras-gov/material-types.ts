export type ComprasGovPage<T> = {
  resultado: T[];
  totalRegistros: number;
  totalPaginas: number;
  paginasRestantes: number;
};

export type GrupoMaterial = {
  codigoGrupo: number;
  nomeGrupo?: string;
  statusGrupo?: boolean;
  dataHoraAtualizacao?: string;
};

export type ClasseMaterial = {
  codigoGrupo: number;
  codigoClasse: number;
  nomeGrupo?: string;
  nomeClasse?: string;
  statusClasse?: boolean;
  dataHoraAtualizacao?: string;
};

export type PdmMaterial = {
  codigoGrupo: number;
  codigoClasse: number;
  codigoPdm: number;
  nomePdm?: string;
  nomeGrupo?: string;
  nomeClasse?: string;
  statusPdm?: boolean;
  dataHoraAtualizacao?: string;
};

export type ItemMaterial = {
  codigoItem: number;
  codigoGrupo: number;
  codigoClasse: number;
  codigoPdm: number;
  descricaoItem?: string;
  nomePdm?: string;
  nomeGrupo?: string;
  nomeClasse?: string;
  statusItem?: boolean;
  itemSustentavel?: boolean;
  codigo_ncm?: string | null;
  descricao_ncm?: string | null;
  dataHoraAtualizacao?: string;
};

export type NaturezaDespesaMaterial = {
  codigoPdm: number;
  codigoNaturezaDespesa?: string;
  descricaoNaturezaDespesa?: string;
  statusNaturezaDespesa?: boolean;
  dataHoraAtualizacao?: string;
};

export type UnidadeFornecimentoMaterial = {
  codigoPdm: number;
  siglaUnidadeFornecimento?: string;
  nomeUnidadeFornecimento?: string;
  descricaoUnidadeFornecimento?: string;
  numeroSequencialUnidadeFornecimento?: number;
  /** Unidade de medida base (≠ unidade de fornecimento). */
  siglaUnidadeMedida?: string | null;
  /** Quantidade da unidade de medida por unidade de fornecimento. */
  capacidadeUnidadeFornecimento?: number | null;
  statusUnidadeFornecimentoPdm?: boolean;
  dataHoraAtualizacao?: string;
};

export type CaracteristicaMaterial = {
  codigoItem: number;
  codigoCaracteristica?: string;
  nomeCaracteristica?: string;
  codigoValorCaracteristica?: string;
  nomeValorCaracteristica?: string;
  numeroCaracteristica?: number;
  siglaUnidadeMedida?: string | null;
  statusCaracteristica?: boolean;
  statusValorCaracteristica?: boolean;
  dataHoraAtualizacao?: string;
};
