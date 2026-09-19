-- PCA item ↔ PDM CATMAT: classe explícita + correspondências candidatas/confirmadas

ALTER TABLE public.pca_itens
  ADD COLUMN IF NOT EXISTS codigo_classe_catmat integer;

COMMENT ON COLUMN public.pca_itens.codigo_classe_catmat IS
  'Código da classe CATMAT (ex.: 7830). Derivado de classe_material_servico quando numérico. '
  'Não confundir com codigo_pdm em catmat_pdms.';

-- Backfill: classe_material_servico numérico → codigo_classe_catmat
UPDATE public.pca_itens
SET codigo_classe_catmat = NULLIF(trim(classe_material_servico), '')::integer
WHERE codigo_classe_catmat IS NULL
  AND classe_material_servico IS NOT NULL
  AND trim(classe_material_servico) ~ '^\d+$';

CREATE INDEX IF NOT EXISTS pca_itens_classe_catmat_idx
  ON public.pca_itens (codigo_classe_catmat)
  WHERE codigo_classe_catmat IS NOT NULL;

CREATE TABLE public.pca_item_pdm (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pca_item_id uuid NOT NULL REFERENCES public.pca_itens(id) ON DELETE CASCADE,
  codigo_pdm int NOT NULL REFERENCES public.catmat_pdms(codigo_pdm) ON DELETE CASCADE,
  tipo_correspondencia text NOT NULL DEFAULT 'incerta'
    CHECK (tipo_correspondencia IN ('exata', 'provavel', 'incerta')),
  score numeric,
  evidencia text,
  confirmado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pca_item_id, codigo_pdm)
);

CREATE INDEX pca_item_pdm_item_idx ON public.pca_item_pdm (pca_item_id);
CREATE INDEX pca_item_pdm_pdm_idx ON public.pca_item_pdm (codigo_pdm);
CREATE INDEX pca_item_pdm_confirmado_idx
  ON public.pca_item_pdm (pca_item_id)
  WHERE confirmado = true;

COMMENT ON TABLE public.pca_item_pdm IS
  'Correspondência PCA item → PDM CATMAT. Vários candidatos por item; confirmado=true marca o PDM escolhido.';

ALTER TABLE public.pca_item_pdm ENABLE ROW LEVEL SECURITY;

CREATE POLICY pca_item_pdm_select ON public.pca_item_pdm
  FOR SELECT TO authenticated USING (true);
