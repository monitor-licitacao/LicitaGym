-- Encontrar PDM de PISO em 78/7830
-- Executa contra a API Compras.gov.br via CURL

SELECT
  codigo_pdm,
  nome_pdm,
  codigo_grupo,
  codigo_classe,
  status
FROM public.catmat_pdms
WHERE
  codigo_grupo = 78
  AND codigo_classe = 7830
  AND nome_pdm ILIKE '%piso%'
ORDER BY nome_pdm;

-- Se vazio (PDM ainda não sincronizado), buscar via API:
-- curl -s "https://dadosabertos.compras.gov.br/modulo-material/3_consultarPdmMaterial?codigoGrupo=78&codigoClasse=7830&statusPdm=true&pagina=1&tamanhoPagina=500" \
--   | jq '.resultado[] | select(.nomePdm | contains("Piso"))'
