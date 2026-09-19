# Descobrir PDM de PISO em CATMAT

**Situação:** PDM de piso NÃO está em 78/7830. Precisa procurar em toda CATMAT.

---

## Passo 1 — Executar descoberta

### Opção A: API Compras.gov.br (requer acesso de rede)

```bash
bash scripts/discover-piso-pdm.sh
```

**Saída esperada:**
```
🔍 Procurando PDMs com 'piso' no nome...

123456 | Piso de Borracha 50x50cm | Grupo: 45 / Classe: 4567 | Status: true
234567 | Piso Vinílico 1m x 1m | Grupo: 45 / Classe: 4567 | Status: true
345678 | Piso de Madeira | Grupo: 46 / Classe: 4678 | Status: true

✅ Busca concluída. Copie o codigoPdm encontrado acima.
```

### Opção B: Interface pública (manual)

Acesse:
- **Todas as Licitações** (Brasil): https://www.todaslicitacoes.com.br/licitacoes/equipamentos-esportivos-e-lazer/
- **CATMAT oficial**: https://www.compras.gov.br/

Procure por: `piso` com filtros:
- Equipamentos esportivos / Academia
- Borracha ou Vinílico (50x50cm ou 1x1m)

**Copie:**
- `codigoPdm`: identificador numérico
- `nomePdm`: descrição (ex: "Piso de Borracha 50x50cm")
- `codigoGrupo`: grupo CATMAT
- `codigoClasse`: classe CATMAT
- Status: deve ser `true`

---

## Passo 2 — Selecionar PDM mais relevante para Academia

| Opção | Grupo | Classe | Relevância |
|---|---|---|---|
| Piso de Borracha 50x50cm | 45 | 4567 | ⭐⭐⭐ Alta (equipamento fitness) |
| Piso Vinílico 1m x 1m | 45 | 4567 | ⭐⭐ Média |
| Piso de Madeira | 46 | 4678 | ⭐ Baixa (não é típico fitness) |

**Escolher:** PDM de borracha (mais usado em academias)

---

## Passo 3 — Incorporar em schemas-consultas.md

Adicionar seção 1.8 em `docs/pncp/schemas-consultas.md`:

```markdown
### 1.8 Piso — `DmMaterialPDMDTO` (extensão escopo)

**GET** `/modulo-material/3_consultarPdmMaterial`

| Campo API | Tipo | Postgres |
|-----------|------|----------|
| `codigoPdm` | int64 | 123456 |
| `nomePdm` | string | "Piso de Borracha 50x50cm" |
| `codigoGrupo` | int64 | 45 |
| `codigoClasse` | int64 | 4567 |

**Nota:** Fora do escopo padrão 78/7830, mas relacionado a materiais fitness.
**Categoria LicitaGym:** `categoria_licitagym = "piso"` (curadoria manual)
```

---

## Passo 4 — Criar migração para categorizar piso

```sql
-- Curadoria: marcar PDM de piso como material fitness
UPDATE public.catalogo_itens
SET categoria_licitagym = 'piso'
WHERE codigo_pdm = '123456';  -- substitua pelo codigoPdm encontrado
```

---

## Passo 5 — Atualizar estrutura de dados

**Arquivo:** `docs/pncp/catalogo-perguntas.md`

Adicionar entrada para piso:

```markdown
| CAT-06 | Quantos itens de piso estão planejados? | pca_itens ⋈ catalogo_itens [categoria_licitagym='piso'] | gate 78/7830 (extensão) | respondivel |
```

---

## Resultado Final

**Escopo LicitaGym expandido:**

| Material | Grupo | Classe | Status |
|---|---|---|---|
| Equipamentos fitness | 78 | 7830 | ✓ Principal |
| **Piso de borracha** | **45** | **4567** | ✓ Extensão |

**Query unificada:**

```sql
SELECT * FROM catalogo_itens
WHERE 
  categoria_licitagym IN ('musculacao', 'cardio', 'acessorios', 'piso')
  AND ativo = true;
```

---

**Próximo:** Rodar `discover-piso-pdm.sh` e fornecer codigoPdm encontrado.
