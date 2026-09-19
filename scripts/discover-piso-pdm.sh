#!/bin/bash
# Descobrir PDM de PISO em CATMAT (qualquer grupo/classe)
# Busca via API Compras.gov.br

echo "🔍 Procurando PDMs com 'piso' no nome..."
echo ""

# Buscar na API (primeira página, até 500 resultados)
curl -s "https://dadosabertos.compras.gov.br/modulo-material/3_consultarPdmMaterial?statusPdm=true&pagina=1&tamanhoPagina=500" \
  | jq -r '.resultado[] |
    select(.nomePdm | ascii_downcase | contains("piso")) |
    "\(.codigoPdm) | \(.nomePdm) | Grupo: \(.codigoGrupo) / Classe: \(.codigoClasse) | Status: \(.statusPdm)"' \
  | while IFS= read -r line; do
      if [ -n "$line" ]; then
        echo "$line"
      fi
    done

echo ""
echo "✅ Busca concluída. Copie o codigoPdm encontrado acima."
echo ""
echo "Próxima ação: adicionar à documentação em schemas-consultas.md"
