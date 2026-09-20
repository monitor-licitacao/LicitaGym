# POC — análise de dados públicos com OneCompiler

## Objetivo

Validar um uso restrito e auditável do OneCompiler no LicitaGym: executar uma regra determinística que confronta a descrição oficial de um item com a referência CATMAT disponível no Supabase.

O POC não usa o OneCompiler como fonte de dados, não envia credenciais do Supabase e não aceita código arbitrário do usuário.

## Implementação

| Peça | Caminho |
|------|---------|
| Edge Function | `supabase/functions/analyze-public-material/index.ts` |
| Validação de entrada / fontes | `supabase/functions/_shared/public-analysis/input.ts` |
| Regra fixa `material-spec-consistency@0.1.0` | `supabase/functions/_shared/public-analysis/material-rule.ts` |
| Cliente OneCompiler | `supabase/functions/_shared/public-analysis/onecompiler-client.ts` |
| Testes unitários | `supabase/functions/_shared/public-analysis/*.test.ts` |

## Fluxo

1. O cliente autenticado envia um registro obtido de uma fonte pública oficial.
2. A Edge Function `analyze-public-material` exige JWT (`verify_jwt` + `auth.getUser`), valida a origem e limita o payload (≤ 50 KB).
3. Quando `codigo_item` estiver presente, a função consulta `catalogo_itens` e `catmat_item_caracteristicas` com `SUPABASE_SERVICE_ROLE_KEY` (somente backend).
4. A função envia ao OneCompiler somente a regra `material-spec-consistency@0.1.0` e os dados públicos normalizados via `stdin`.
5. A saída JSON é validada antes de ser devolvida.
6. A resposta inclui hash da entrada, hash e versão da regra e métricas de execução.

Se o CATMAT não estiver carregado, `consistency` será `not_verifiable`. A classificação textual ainda pode identificar `piso_quadra`, mas não será apresentada como confirmação de compatibilidade CATMAT.

## Contrato de entrada

```json
{
  "analysis_type": "catmat_spec_consistency",
  "source": {
    "name": "pncp",
    "record_id": "10091536000113/2025/190:item-1",
    "url": "https://pncp.gov.br/app/editais/10091536000113/2025/190"
  },
  "item": {
    "codigo_item": "150846",
    "description": "Piso modular para quadra em polipropileno, 100 x 100 cm, 40 mm, não borracha",
    "attributes": {
      "uso": "quadra poliesportiva"
    }
  }
}
```

Fontes aceitas no POC:

- `pncp` em domínios `pncp.gov.br`;
- `compras-gov` em domínios oficiais de `gov.br` e `compras.gov.br`;
- `compras-rj` em domínios oficiais de `rj.gov.br`.

## Resposta relevante

```json
{
  "input_hash": "sha256...",
  "rule": {
    "id": "material-spec-consistency",
    "version": "0.1.0",
    "source_hash": "sha256..."
  },
  "reference": {
    "catalog_found": false,
    "characteristics_found": 0
  },
  "result": {
    "classification": {
      "category": "piso_quadra",
      "observed_materials": ["polipropileno"]
    },
    "consistency": "not_verifiable",
    "reference_found": false,
    "conflicts": [],
    "evidence": []
  },
  "execution": {
    "provider": "onecompiler",
    "language": "nodejs"
  }
}
```

## Configuração

Crie a chave no console do OneCompiler e configure-a somente nos secrets da Edge Function:

```powershell
npx supabase secrets set ONECOMPILER_API_KEY="SUA_CHAVE"
```

Para desenvolvimento local, adicione a chave ao arquivo ignorado `supabase/.env.functions.local`. Nunca use prefixo público nem exponha a chave no frontend. Veja `supabase/.env.example`.

A função publica com `verify_jwt = true` em `supabase/config.toml`. Deploy **sem** `--no-verify-jwt`:

```powershell
npx supabase functions deploy analyze-public-material
```

Local (gateway sem JWT, mas o handler ainda exige Bearer válido):

```powershell
npx supabase functions serve analyze-public-material --env-file supabase/.env.functions.local
```

Testes da regra e do cliente (sem rede OneCompiler):

```powershell
deno test --allow-none supabase/functions/_shared/public-analysis/
```

## Limites deste POC

- Não persiste execuções; os hashes tornam a resposta verificável, mas o histórico auditável ficará para o próximo incremento.
- Não usa `contratacoes_itens`, pois a tabela remota estava vazia na verificação de 20 de setembro de 2026.
- Não consulta o PNCP durante a análise; a ingestão oficial continua sendo responsabilidade dos conectores existentes.
- Não executa código fornecido pelo usuário.
- Falha de rede, quota, timeout, `stderr`, exceção ou saída fora do schema faz a chamada falhar; não há resultado alternativo inventado.

## Próximo incremento recomendado

Persistir `input_hash`, `rule_id`, `rule_version`, `rule_source_hash`, resultado e métricas em tabela privada, com retenção definida e consulta somente pelo backend. Depois, ligar a entrada diretamente ao item oficial ingerido, quando `contratacoes_itens` estiver populada.
