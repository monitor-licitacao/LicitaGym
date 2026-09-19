# Plano — catálogo de perguntas do assistente

> Status: **método aprovado**, execução parcial. As Fases 1 e 2 produziram
> [catalogo-perguntas.md](./catalogo-perguntas.md) (v0, status presumido); a Fase 0 depende do
> MCP Supabase autenticado e está em [`scripts/inventario-dados.sql`](../../scripts/inventario-dados.sql).

## Contexto

Vamos criar um assistente dentro do projeto. O primeiro teste dele — cruzar `pca_planos` com
`pca_alteracoes` — falhou de um jeito específico: ele **respondeu com confiança uma pergunta que
os dados não conseguem responder**. Entregou metodologia, zero números, e descreveu como vivos
dois tipos de operação que o código nunca grava.

Um catálogo de perguntas escrito como lista de desejos repete exatamente esse erro em escala: dá
ao assistente 50 perguntas bonitas sem dizer quais têm dado por trás. O valor do catálogo não
está nas perguntas — está em **saber, para cada uma, se ela é respondível hoje, com o quê, e o
que trava quando não é**.

Resultado pretendido: um catálogo que serve a três coisas ao mesmo tempo — superfície do produto,
contrato de dados, e conjunto de testes do assistente.

## O que o catálogo é

Não é uma lista. É uma tabela em que cada linha é um contrato:

| campo | para que serve |
|---|---|
| `id` | `PCA-01`, `PRECO-03` — referência estável em eval e em código |
| `pergunta` | como o usuário realmente perguntaria, não como o schema pensa |
| `domínio` | PCA, CATMAT, preço, órgão, contratação, IRP, legislação, proveniência |
| `tabelas e chaves` | o caminho exato do join, de [cruzamentos.md](./cruzamentos.md) |
| `gate` | como o recorte 78/7830 entra nesta pergunta (ver abaixo) |
| `status` | os quatro estados de respondibilidade |
| `consulta canônica` | SQL que responde, para as respondíveis |
| `armadilha` | o jeito errado de responder que parece certo |

A coluna `armadilha` é a que carrega o aprendizado do teste. Exemplo real: *"por que este item
mudou?"* tem a armadilha de responder com o `tipo_operacao`, que é tautologia.

## Os quatro estados de respondibilidade

Não é "responde / não responde". O levantamento das tabelas mostra quatro situações distintas, e
confundi-las é o que produz resposta inventada:

| estado | significado | exemplo |
|---|---|---|
| `respondivel` | tabela em migration **e** com dado | `pca_planos`, `pca_itens` |
| `vazio` | tabela existe, sem linha | `contratacoes_*`, `irp_*`, `catalogo_especificacoes`, `catmat_pdm_naturezas_despesa` |
| `drift` | existe no banco, **em nenhuma migration** | `catmat_grupos/classes/pdms/pdm_unidades/item_caracteristicas`, `pca_item_pdm` |
| `nao-aplicado` | SQL escrito em `supabase/sql/`, nunca rodado | `catmat_itens`, `precos_praticados_itens` |

`drift` é o estado traiçoeiro: a pergunta **responde em produção e quebra em ambiente novo**. O
assistente precisa saber a diferença, senão promete o que só existe numa máquina.

## Como montar — as fases

### Fase 0 — Inventário real (sem isso, todo status é chute)

Uma query só, contando linhas de cada uma das 35 tabelas de `public` e `private`, mais as 7 em
drift. Query pronta em [`scripts/inventario-dados.sql`](../../scripts/inventario-dados.sql); grava o
resultado datado em `docs/pncp/inventario-dados.md`.

É o passo que o assistente pulou. Sem ele não dá para dizer se uma pergunta é `respondivel` ou
`vazio` — e essa é a informação mais importante de cada linha do catálogo.

**Depende do MCP Supabase autenticado**, hoje bloqueado.

### Fase 1 — Derivar as perguntas por dois caminhos, e comparar

Nenhum dos dois sozinho serve:

- **De fora para dentro (usuário):** o que um fornecedor de equipamento de academia precisa
  saber. "Quem vai comprar esteira em 2026?", "quanto pagaram por halter no último ano?", "qual
  órgão publica PCA e não contrata?", "estou caro ou barato?". Essas vêm do produto, não do
  schema.
- **De dentro para fora (schema):** percorrer [cruzamentos.md](./cruzamentos.md) e transformar cada
  junção mapeada em pergunta. O documento já tem as FKs reais, as junções polimórficas e as
  candidatas — cada uma responde a alguma pergunta.

**A comparação é o entregável.** Perguntas que só aparecem do lado do usuário = lacuna de dado
(roadmap de ingestão). Perguntas que só aparecem do lado do schema = dado que ninguém pediu.

### Fase 2 — Classificar e escrever a armadilha

Cada pergunta recebe um dos quatro estados, com a evidência (tabela + contagem da Fase 0). Para
as bloqueadas, o motivo é específico: *qual* tabela está vazia, *qual* defeito trava.

As bloqueadas por defeito já conhecido entram nomeadas — `pca_alteracoes` não permite responder
"por quê" porque `dados_anteriores`/`dados_novos` ficam nulos no update (`upsert.ts:63-67`).

### Fase 3 — Consulta canônica para as respondíveis

`supabase/sql/catalogo_perguntas.sql`, um bloco numerado por `id`, cada um com o gate explícito e
o resultado esperado em comentário. É o que transforma o catálogo de documento em coisa
executável.

### Fase 4 — Virar eval do assistente

Aqui o catálogo paga por si. Duas baterias:

1. **Respondíveis** — perguntar ao assistente, comparar o número dele com o da consulta canônica.
   Divergiu, falhou.
2. **Bloqueadas** — perguntar ao assistente e verificar se ele **diz que não dá**, nomeando o que
   falta. Inventar resposta aqui é a falha mais grave, e é exatamente a que o primeiro teste
   pegou.

A segunda bateria importa mais que a primeira.

## O gate 78 / 7830 no catálogo

Toda pergunta declara como o recorte entra, porque não é uniforme:

- **`pca_planos` não tem coluna de classe.** A classe vive em
  `pca_itens.classe_material_servico` (`202609180004_pca.sql:35`), então no nível do plano o gate
  é `EXISTS (select 1 from pca_itens i where i.pca_plano_id = p.id and i.classe_material_servico = '7830')`.
- **Em preço praticado**, o gate é `codigo_item_catalogo` via CATMAT — eixo diferente.
- **Em órgão/unidade**, não há gate: a dimensão é neutra, filtra-se pelo fato.

E o recorte é parametrizável (`PNCP_PCA_CLASSIFICACOES` em `_shared/pncp/licitagym-catmat.ts`),
então gate implícito — "a base só tem 7830" — é premissa que quebra em silêncio no dia em que
alguém mexer na variável.

## Amostra do que o catálogo vai conter

Escrita agora para dar forma; os status precisam da Fase 0 para virarem fato:

| id | pergunta | status previsto | trava |
|---|---|---|---|
| PCA-01 | Quais órgãos planejaram material de academia em 2026 e quanto? | `respondivel` | — |
| PCA-04 | Quais itens do PCA ainda não têm PDM identificado? | `drift` | `pca_item_pdm` fora de migration |
| PCA-07 | Por que este item do PCA mudou? | `bloqueado-por-defeito` | `dados_*` nulos no update |
| CAT-02 | Quais unidades de fornecimento valem para este PDM? | `drift` | `catmat_pdm_unidades` |
| CAT-05 | Qual a natureza de despesa deste item? | `vazio` | tabela sem linha |
| PRECO-01 | Quanto se pagou por este item no último ano? | `nao-aplicado` | SQL não rodado |
| PRECO-03 | O valor estimado no PCA está acima do praticado? | `nao-aplicado` | idem |
| CONTR-01 | Quais editais saíram de um PCA de academia? | `vazio` | `contratacoes_*` sem carga |
| ORG-02 | Em que UF está concentrada a demanda? | **a confirmar** | estado de `orgaos`/`unidades` nunca verificado |

ORG-02 está honesto de propósito: eu nunca chequei se `orgaos`, `unidades` e `entidades` têm
linha. É o tipo de buraco que a Fase 0 fecha.

## Verificação

1. **Fase 0** — o inventário cobre as 35 tabelas das migrations **e** as 7 em drift; nenhuma
   tabela do catálogo fica sem contagem.
2. **Cobertura** — toda junção de `cruzamentos.md` aparece em ao menos uma pergunta; toda
   pergunta aponta para junção que existe lá. Divergência dos dois lados é lacuna real.
3. **Consultas canônicas** — o `.sql` roda inteiro sem erro. Cada bloco é um statement fechado,
   com seu próprio `WITH` — o erro de escopo de CTE que derrubou o arquivo do primeiro teste é o
   caso de regressão.
4. **Gate** — cada consulta roda com e sem o filtro; hoje os números devem bater, e a diferença
   futura denuncia vazamento de escopo.
5. **Eval** — o assistente acerta as respondíveis dentro da tolerância e **recusa** as bloqueadas
   nomeando o que falta. Recusar corretamente conta como acerto.

## Riscos

- **Fase 0 depende do MCP Supabase autenticado**, hoje pedindo OAuth. Sem ela o catálogo sai com
  status presumido — utilizável para discussão, inútil como eval.
- **Catálogo envelhece em silêncio.** Quando `contratacoes_*` for carregada, várias linhas mudam
  de `vazio` para `respondivel` e ninguém é avisado. Mitigação: o inventário da Fase 0 vira
  consulta versionada, e a divergência entre ele e os status do catálogo é o alarme.
- **Tentação de inchar.** 50 perguntas classificadas mal valem menos que 15 com consulta canônica
  rodando. Começar pelos domínios `respondivel` e `drift`; os vazios entram como uma linha por
  domínio, não uma por pergunta.

## Pendências de antes (não perder)

- `docs/pncp/plano-probe-pca-incremental.md` — probe segmentado e carga incremental (PR #3).
- [teste-assistente-pca-alteracoes.md](./teste-assistente-pca-alteracoes.md) — 4 defeitos de
  gravação em `pca_alteracoes`, diagnóstico persistido.
- Autenticação do POST de `api-pncp-pca` (`--no-verify-jwt` + fallback que aceita qualquer
  `Bearer`) — PR próprio.
- Drift de `catmat_*` e `pca_item_pdm`; 113 itens sem PDM; `probe-compras-api.ps1` sem rodar.
