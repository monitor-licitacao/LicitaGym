---
applyTo: "**/*catmat*,**/*catmat*/**,**/*pdm*,**/*catalogo*,**/*taxonom*,**/*curadoria*"
---
# CATMAT e taxonomia

Referências: `docs/compras-gov/schemas-consultas.md`, `docs/UPSERT_CONSOLIDADO.md`, `supabase/migrations/SCHEMA_STANDARDS.md`.

## Hierarquia e endpoints
Grupo → Classe → PDM → Item. E1 Grupo, E2 Classe, E3 PDM, E4 Item, E5 Naturezas (por `codigoPdm`), E6 Unidades (por `codigoPdm`), E7 Características (por `codigoItem`). Fluxo do E7: Grupo/Classe → PDM → Item → `codigoItem` → E7.

## Escopo
Core 78/7830; extensão curada 72/7220. Não misturar automaticamente core e extensão.

## [BLOQUEANTE] ao revisar
- `codigoItem` usado como `codigoPdm` (ou vice-versa). Vários itens compartilham um PDM; características diferenciam itens do mesmo PDM.
- Identidade do E7 dependente de `codigoValorCaracteristica` preenchido (pode ser NULL) ou NULL convertido em `0`/`''`/`'N/A'`.
- Taxonomia derivada do LicitaGym (Musculação/Cárdio/Acessórios) sobrescrevendo dado oficial.

## [IMPORTANTE]
- Classificação não determinística ou não idempotente; ausência de campo para edição manual e de provenance/confiança no dado derivado.
- Unidade associada ao PDM tratada como unidade efetivamente contratada; conversão de unidade sem regra explícita.
- `icatmat_pdm_completa` tratada como fonte canônica (é read model/compatibilidade); campos `*_first` substituindo relações completas.
- Vínculo catálogo ↔ PCA/IRP/contratação/preço sem registrar a natureza do match e a evidência.
