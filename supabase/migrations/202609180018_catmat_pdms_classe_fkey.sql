-- FK catmat_pdms → catmat_classes (lacuna #6)
-- Pré-requisito: UNIQUE (codigo_grupo, codigo_classe) em catmat_classes (202609180015)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.catmat_pdms'::regclass
      AND conname = 'catmat_pdms_grupo_classe_fkey'
  ) THEN
    ALTER TABLE public.catmat_pdms
      ADD CONSTRAINT catmat_pdms_grupo_classe_fkey
      FOREIGN KEY (codigo_grupo, codigo_classe)
      REFERENCES public.catmat_classes (codigo_grupo, codigo_classe);
  END IF;
END $$;
