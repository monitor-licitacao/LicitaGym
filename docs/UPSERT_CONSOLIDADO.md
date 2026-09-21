# Upsert Consolidado E1-E7

Carrega JSONs coletados pelos collectors (endpoints 1-7) → insere em tabelas `icatmat_*` com FKs respeitadas.

## Workflow

1. **Coletar dados** via collectors (E1-E7)
   ```bash
   python scripts/collector_grupo_material.py
   python scripts/collector_classe_material.py
   # ... etc (E3-E7)
   ```
   Resultado: `collector_*_resultado.json` em `scripts/`

2. **Fazer upsert consolidado**
   ```bash
   pip install supabase
   python scripts/upsert_icatmat_consolidado.py
   ```

3. **Validar**
   ```bash
   supabase db query --local "SELECT COUNT(*) FROM icatmat_grupo_material;"
   ```

## Schema E1-E7

Ordem de ingestão (respeita FKs):

| E | Tabela | Recordes | FK Pai | Natural Key |
|---|--------|----------|--------|-------------|
| 1 | `icatmat_grupo_material` | 2 | — | (grupo) |
| 2 | `icatmat_classe_material` | 2 | E1 | (grupo, classe) |
| 3 | `icatmat_pdm_material` | N | E2 | (grupo, classe, pdm) |
| 4 | `icatmat_item_material` | N | E3 | (grupo, classe, pdm, item) |
| 5 | `icatmat_natureza_despesa` | 1:N E4 | E4 | (grupo, classe, pdm, item, natureza) |
| 6 | `icatmat_unidade_fornecimento` | 1:N E4 | E4 | (grupo, classe, pdm, item, unidade) |
| 7 | `icatmat_caracteristica_material` | 1:N E4 | E4 | (grupo, classe, pdm, item, caracteristica) |

## Deduplicação

Cada registro tem `payload_hash` (MD5 do JSON). Upsert via natural key + hash evita duplicatas.

Se mesmo registro é coletado 2x → mesmo hash → atualiza (não duplica).

## Configuração

**Local (dev):**
```python
SUPABASE_URL = "http://127.0.0.1:54321"
SUPABASE_KEY = "eyJ..."  # anon key local
```

**Staging/Prod:**
Editar `upsert_icatmat_consolidado.py` com credenciais do projeto remoto.

## Troubleshooting

- **"supabase-py não instalado"** → `pip install supabase`
- **FK constraint violation** → E5-E7 referencia items que não existem em E4 (verificar collectors E4)
- **Sem arquivos JSON** → collectors não foram rodados ou resultados salvos em outro lugar

---

**Próximo:** Criar edge function para automatizar upsert em schedule (pg_cron trigger).
