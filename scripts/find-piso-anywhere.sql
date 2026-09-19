-- Procurar PDM de PISO em TODA CATMAT (não apenas 78/7830)
SELECT
  codigo_pdm,
  nome_pdm,
  codigo_grupo,
  codigo_classe,
  status
FROM public.catmat_pdms
WHERE nome_pdm ILIKE '%piso%'
ORDER BY codigo_grupo, codigo_classe, nome_pdm;

-- Se vazio, buscar via API (todos os grupos):
-- curl -s "https://dadosabertos.compras.gov.br/modulo-material/3_consultarPdmMaterial?statusPdm=true&pagina=1&tamanhoPagina=500" \
--   | jq '.resultado[] | select(.nomePdm | contains("Piso")) | {codigoPdm, nomePdm, codigoGrupo, codigoClasse}'
