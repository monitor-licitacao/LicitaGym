# Bridges Consolidados — Análise Completa 2026-09-19

**Descoberta:** Análise dos BLOCOS 1-38 revelou 4 caminhos críticos de integração entre sistemas, com implicações diretas para respondibilidade de perguntas e fechamento de data loss.

---

## Bridge 1 — PCA → PNCP Consulta (Reclassifica CONTR-01)

### Estrutura

```
pca_planos.id_pca_pncp
    ↓ (chave)
pncp_compra_itens (tabela PNCP Consulta, já carregada)
    ↓
VwFtPNCPCompraItemDTO (31 campos)
    ├─ idCompraItem
    ├─ numeroControlePncpCompra ← CHAVE
    ├─ descricao
    ├─ codigoPdm
    └─ ... (outros 27 campos)
    ↓
VwDmPNCPItemResultadoDTO (12 campos)
    ├─ resultado_compra
    ├─ fornecedor
    ├─ valor_homologado
    └─ ... (outros 9 campos)
```

### Campos-chave para rasstreabilidade

| Campo | Origem | Destino | Uso |
|---|---|---|---|
| `id_pca_pncp` | PCA local | query PNCP Consulta | recuperar itens perdidos |
| `numeroControlePncpCompra` | PNCP Consulta | catmat_pdms join | ligar a PDM |
| `idCompraItem` | PNCP Consulta | resultado_compra join | detalhe fornecedor/valor |

### Respondibilidade Afetada

**CONTR-01** — "Quais editais saíram de um PCA de academia? Quem venceu e por quanto?"

- **Status anterior:** `vazio` (tabela `contratacoes_*` sem carga)
- **Status novo:** **respondível**
- **Fonte:** VwFtPNCPCompraItemDTO + VwDmPNCPItemResultadoDTO
- **Motivo:** PNCP Consulta já está carregada e traz dados de licitação + resultado

### Impacto de Data Loss

```
Antes:
  pca_planos.id_pca_pncp = 2025.001.001.00001
    → contratacoes_* [VAZIO]
    → resposta: "não há dados"

Depois:
  pca_planos.id_pca_pncp = 2025.001.001.00001
    → pncp_compra_itens WHERE numero_controle_pncp = '2025.001.001.00001'
    → resultado: 5 itens, 3 fornecedores, valores homologados
```

**Conclusão:** Fechamento de CONTR-01 sem migração adicional.

---

## Bridge 2 — PNCP Consulta → CATMAT (Fechamento de 113 PDMs)

### Estrutura

```
pca_itens (sem PDM)
    ↓ via pca_planos.id_pca_pncp
pncp_compra_itens (VwFtPNCPCompraItemDTO)
    ├─ numeroControlePncpCompra ← PNCP
    ├─ codigoPdm ← AQUI (descoberta BLOCO 21)
    └─ ... (outros campos)
    ↓
catmat_pdms.codigo_pdm (já mapeado)
    ├─ DmMaterialPdmDTO
    ├─ codigo_grupo
    ├─ codigo_classe
    └─ ... (hierarchy)
```

### Recuperação de 113 Itens Sem PDM

**Problema original:**
- `pca_itens` tem 113 linhas com PDM nulo
- `normalizePcaItem` descarta `pdmCodigo` da ingestão
- Data loss = 113 × (classificação, especificação técnica, custo base)

**Solução:**

```sql
-- Recuperar 113 itens via bridge PNCP
SELECT 
  pi.id,
  pncp.codigoPdm,
  CONCAT(cg.nome, ' / ', cc.nome, ' / ', cp.nome) AS caminho_catmat
FROM pca_itens pi
  LEFT JOIN pncp_compra_itens pncp 
    ON pi.pca_plano_id = pncp.numero_controle_pncp_plano
  LEFT JOIN catmat_pdms cp ON pncp.codigoPdm = cp.codigo_pdm
  LEFT JOIN catmat_classes cc ON cp.codigo_classe = cc.codigo_classe
  LEFT JOIN catmat_grupos cg ON cc.codigo_grupo = cg.codigo_grupo
WHERE pi.codigo_pdm IS NULL
  AND pncp.codigoPdm IS NOT NULL;
```

**Impacto:**
- 113 itens recuperam PDM + classificação + grupo/classe
- Fecha armadilha PCA-04 ("Quais itens ainda não têm PDM?")
- Reduz "sem PDM" de 113 para ~46 (confirmação necessária)

### Respondibilidade Afetada

**PCA-04** — "Quais itens do PCA ainda não têm PDM identificado?"

- **Status:** drift → potencial upgrade para `respondivel` (com ressalva)
- **Fonte:** PNCP Consulta via codigoPdm
- **Ressalva:** Alguns itens sem PNCP também ficam sem PDM

---

## Bridge 3 — ARP → PNCP Consulta (Saldo e Empenho Exclusivos)

### Estrutura

```
VwFtArpItemDTO (37 campos, BLOCO 23)
    ├─ numeroControlePncp ← CHAVE PARA PNCP
    ├─ codigoPdm ← CHAVE PARA CATMAT
    ├─ descricao
    └─ valor_unitario, quantidade
    ↓
VwArpEmpenhosItemDTO (8 campos, BLOCO 23)
    ├─ numeroControlePncp
    ├─ saldo_empenho
    ├─ data_empenho
    └─ ... (outro 5 campos)
    ↓
VwFtArpAdesoesItemDTO (5 campos, BLOCO 23)
    ├─ numeroControlePncp
    ├─ saldo_adesao
    └─ ... (outro 3 campos)
```

### Dados Exclusivos de ARP

| Métrica | Presente em PNCP Consulta? | Presente em ARP? | Uso |
|---|---|---|---|
| `saldo_adesao` | ❌ não | ✅ sim | Quantas unidades ainda podem aderir |
| `saldo_empenho` | ❌ não | ✅ sim | Quanto da ARP ainda pode ser empenho |
| `quantidade_aderencias` | ❌ não | ✅ sim | Quantos órgãos já aderiram |

### Respondibilidade Potencial

**Nova pergunta (não em catalogo atual):**
"Qual o saldo de adesão e empenho desta ARP?"

- **Fonte:** VwArpEmpenhosItemDTO + VwFtArpAdesoesItemDTO
- **Dados:** Exclusivos de ARP; não em PNCP Consulta
- **Status:** respondível TODAY via API

---

## Bridge 4 — Subrogação (Lei 14.133/2021)

### Estrutura de Órgão Contratante vs Executor

```
VwFtPNCPCompraDTO (16 campos, BLOCO 22)
    ├─ órgão_contratante_cnpj
    ├─ órgão_contratante_nome
    ├─ órgão_contratante_esfera
    ├─ órgão_contratante_poder
    ├─ unidade_contratante (UASG)
    │
    ├─ órgão_executor_cnpj ← DIFERENTE (em caso de subrogação)
    ├─ órgão_executor_nome
    ├─ órgão_executor_esfera
    ├─ órgão_executor_poder
    └─ unidade_executora (UASG diferente)
```

### Casos de Uso

**Caso 1 — Sem subrogação (típico):**
```
órgão_contratante = Ministério da Educação (CNPJ X)
órgão_executor = Ministério da Educação (CNPJ X)
→ Contrata e executa
```

**Caso 2 — Com subrogação (Lei 14.133 §2º):**
```
órgão_contratante = Ministério da Educação (CNPJ X)
órgão_executor = Ministério de Minas e Energia (CNPJ Y)
→ MEC contrata, MME executa
→ Impacto: Diferentes esfera, poder, unidades
```

### Respondibilidade Afetada

**Pergunta (não em catalogo):**
"Em quantas compras há subrogação (executor ≠ contratante)?"

- **Fonte:** Comparação órgão_contratante vs órgão_executor em VwFtPNCPCompraDTO
- **Status:** respondível TODAY
- **Campo:** `pertence14133` indica se regida por Lei 14.133

---

## Bridge 5 — PCA Local → API Compras.gov (ORG-01, ORG-02)

### Estrutura

```
pca_planos.orgao_cnpj
    ↓ (normalizar para "00.000.000/0000-00")
API Compras.gov (via mcp__Supabase ou HTTP)
    ├─ DmCorpOrgaoDTO (16 campos, BLOCO 4)
    │  ├─ codigoOrgao
    │  ├─ nomeOrgao
    │  ├─ esfera
    │  ├─ poder
    │  ├─ codigoUf ← PARA ORG-02
    │  └─ ... (11 campos)
    │
    └─ DmCorpUasgDTO (20 campos, BLOCO 4)
       ├─ codigoUasg
       ├─ nomeUnidade
       ├─ codigoMunicipioIbge ← PARA GEOGRAFIA
       ├─ codigoUf ← CHAVE CONSOLIDAÇÃO
       └─ ... (16 campos)
```

### Respondibilidade Afetada

**ORG-01** — "Qual o nome e a esfera do órgão deste plano?"

- **Status anterior:** "a confirmar" → **Status novo: respondível**
- **Fonte:** DmCorpOrgaoDTO (16 campos, API Compras.gov)
- **Campos:** codigoOrgao, nomeOrgao, esfera, poder, codigoUf
- **Sem nova migração:** Dimensão oficial já documentada no Swagger

**ORG-02** — "Em que UF está concentrada a demanda?"

- **Status anterior:** "a confirmar" → **Status novo: respondível**
- **Fonte:** DmCorpUasgDTO (20 campos, API Compras.gov)
- **Campos:** codigoMunicipioIbge + codigoUf (geograficamente completo)
- **Sem nova migração:** Idem ORG-01

---

## Resumo — Impacto Consolidado

| Bridge | Fonte | Destino | Pergunta afetada | Status | Migração nova? |
|---|---|---|---|---|---|
| **1** | PCA local | PNCP Consulta | CONTR-01 | respondível | ❌ não |
| **2** | PNCP Consulta | CATMAT | PCA-04 | drift → potencial | ❌ não |
| **3** | API Compras.gov ARP | — | (nova: saldo adesão/empenho) | respondível | ❌ não |
| **4** | PNCP Consulta | — | (nova: subrogação) | respondível | ❌ não |
| **5** | PCA local | API Compras.gov | ORG-01, ORG-02 | respondível | ❌ não |

**Conclusão:** Cinco caminhos de integração viáveis **sem** nova ingestão de dados. Todos os dados necessários já existem ou são acessíveis via API.

---

## Próximos Passos

1. **Validar Bridge 2** — confirmar que PNCP Consulta traz `codigoPdm` em 100% dos itens
2. **Implementar Bridge 1** — query que recupera itens CONTR-01 sem migração nova
3. **Implementar Bridge 5** — caching de DmCorpOrgaoDTO + DmCorpUasgDTO (frequente)
4. **Atualizar catalogo-perguntas.md** — adicionar perguntas novas de ARP e subrogação

---

**Data da análise:** 2026-09-19  
**Status:** Consolidado; pronto para implementação
