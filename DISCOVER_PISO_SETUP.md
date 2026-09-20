# Setup para descobrir PDM de Piso

Checklist completo para executar a descoberta.

---

## ✅ Pré-requisitos

- [ ] Deno 1.40+ instalado
  ```bash
  deno --version
  # Se não tiver: https://docs.deno.com/runtime/manual/getting_started/installation
  ```

- [ ] Node/npm instalado (para Supabase CLI)
  ```bash
  node --version
  npm --version
  ```

- [ ] Supabase CLI instalado
  ```bash
  npm install -g supabase
  supabase --version
  ```

---

## 🚀 Execução (3 opções)

### Opção 1: Teste rápido (recomendado — não precisa de setup)

```bash
# Sem Supabase rodando, retorna dados de fallback/teste
cd /home/user/LicitaGym
deno run --allow-net scripts/discover-piso-api.ts --termo piso --limite 10
```

**Resultado esperado:**
```
✅ 3 PDMs encontrados:

┌─────────┬──────────────────────────────────────────┬──────────┬────────────────┐
│ PDM ID  │ Nome                                     │ Grupo/Cl │ Fonte          │
├─────────┼──────────────────────────────────────────┼──────────┼────────────────┤
│ 123456  │ Piso de Borracha 50x50cm — Tipo fitness │ 45/4567  │ fallback-teste │
│ 234567  │ Piso Vinílico 1m x 1m — Academia       │ 45/4568  │ fallback-teste │
│ 345678  │ Piso de Madeira — Modular              │ 46/4678  │ fallback-teste │
└─────────┴──────────────────────────────────────────┴──────────┴────────────────┘
```

---

### Opção 2: Teste com Supabase local

```bash
# 1. Iniciar Supabase local
supabase start

# 2. Aguardar inicialização (2-3 min)
# Você verá:
#   ✓ Started Postgres
#   ✓ Started Edge Functions

# 3. Em outro terminal, executar discovery
deno run --allow-net scripts/discover-piso-api.ts --termo piso

# 4. Parar Supabase depois
supabase stop
```

---

### Opção 3: Deploy em produção (após teste)

```bash
# 1. Deploy da Edge Function
supabase functions deploy discover-piso-pdm

# 2. Chamar na produção
curl "https://seu-project.supabase.co/functions/v1/discover-piso-pdm?termo=piso" | jq .
```

---

## 📋 Próximos passos após discovery

Uma vez com os resultados do script:

### 1. Copiar o codigoPdm (ex: `123456`)

```
PDM ID: 123456
Nome: Piso de Borracha 50x50cm — Tipo fitness
Grupo/Classe: 45/4567
```

### 2. Atualizar `docs/pncp/schemas-consultas.md` seção 1.8

Trocar valores de exemplo pelos reais:

```markdown
### 1.8 Piso — `DmMaterialPDMDTO` (extensão escopo)

**Exemplo encontrado:**
| Campo API | Valor |
|-----------|-------|
| codigoPdm | 123456 |          ← seu codigoPdm
| nomePdm | "Piso de Borracha 50x50cm" |    ← seu nomePdm
| codigoGrupo | 45 |           ← seu codigoGrupo
| codigoClasse | 4567 |        ← seu codigoClasse
```

### 3. Executar migração para marcar PDM

```bash
# Descomente e preencha em supabase/migrations/202609192030_piso_curadoria.sql
UPDATE public.catalogo_itens
SET categoria_licitagym = 'piso',
    taxonomias = jsonb_set(taxonomias, '{material}', '"piso"'::jsonb)
WHERE codigo_pdm = '123456';
```

### 4. Testar query CAT-06

```sql
-- Deve retornar itens de piso após marcação
SELECT COUNT(*) FROM pca_itens pi
JOIN catalogo_itens ci ON pi.codigo_pdm = ci.codigo_pdm
WHERE ci.categoria_licitagym = 'piso';
```

---

## 🔍 Troubleshooting

### Erro: `Deno command not found`
```bash
# Instalar Deno
curl -fsSL https://deno.land/install.sh | sh

# Adicionar ao PATH
export PATH="$HOME/.deno/bin:$PATH"
```

### Erro: `network error` ao chamar API
Esperado — proxy pode bloquear chamadas externas. O script retorna dados de fallback automaticamente.

### Erro: `import failed` em `http.ts`
```bash
# Verificar que o arquivo existe
ls -la supabase/functions/_shared/http.ts

# Se não: executar update
git pull origin claude/nice-bell-c8nswq
```

### Supabase não inicia
```bash
# Limpar containers antigos
supabase stop --remove-volumes

# Reiniciar
supabase start
```

---

## 📊 Resultado esperado

Ao final, você terá:

✅ `codigoPdm` de piso (ex: `123456`)  
✅ `codigoGrupo` (ex: `45`)  
✅ `codigoClasse` (ex: `4567`)  
✅ `nomePdm` completo  
✅ Pronto para incorporar em schemas-consultas.md seção 1.8  

---

**Próximo:** Execute `Opção 1` acima e compartilhe o resultado.
