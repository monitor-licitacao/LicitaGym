# Teste do assistente — cruzamento `pca_planos` × `pca_alteracoes`

> Status: **diagnóstico**, escrito em 2026-09-19. As Fases 1–3 são propostas, nada implementado.
> Os quatro defeitos da Parte 2 vêm de leitura de código (arquivo:linha), não de query — a
> Fase 2 existe para confirmá-los contra o dado real.

## Contexto

Primeiro teste do assistente que vai viver dentro do projeto. Pergunta feita:

> "Analise 10 pca_planos e suas pca_alterações e me diga quantas alterações foram feitas e
> porque? Teste se os registros estão corretos."

O assistente produziu um `.sql` e um relatório em markdown, e declarou sucesso.

**Ele não respondeu à pergunta.** Não há um número no relatório. Nenhuma linha foi lida do banco.
Perguntaram "quantas alterações e por quê" e a entrega foi um documento de metodologia
descrevendo o que a consulta *retornaria* — com seções de "Como Executar" e "Próximos Passos",
mas zero dados. O teste "se os registros estão corretos" não foi feito de forma alguma.

Investigar isso expôs quatro defeitos no **pipeline de gravação**, mais graves que os defeitos da
consulta, e que tornam a pergunta original hoje **impossível de responder**.

## Parte 1 — O que o teste revelou sobre o assistente

1. **Respondeu pergunta de dados com documento de processo.** Pergunta que pede número exige
   consulta executada, não SQL entregue como artefato.
2. **O `.sql` não roda.** CTE em Postgres tem escopo de **um** statement. Depois do primeiro `;`,
   os CTEs deixam de existir — as consultas seguintes referenciam-nos e falham com
   `ERROR: relation "planos_analisados" does not exist`. É prova de que nunca foi executado.
3. **O "porquê" é tautológico.** Um `CASE tipo_operacao WHEN 'insert' THEN 'Inclusão de novo item'`
   reescreve o nome da operação e chama isso de motivo.
4. **A amostra é arbitrária.** `ORDER BY created_at DESC LIMIT 10` — mas `created_at` é o instante
   em que *o nosso sync* inseriu a linha. A base foi carregada numa execução só, então os 28
   planos têm `created_at` praticamente idêntico: "os 10 mais recentes" é sorteio.
5. **Documentou como vivos dois caminhos mortos** — `inativacao` e `reativacao` nunca são gravados.

## Parte 2 — Os quatro defeitos do pipeline

**A. Alterações de PLANO saem com `pca_plano_id = NULL`.**
`sync-pncp-pca/index.ts:141` passa `historyTable` sem `historyFields`; em `upsert.ts:41`,
`...options.historyFields` espalha `undefined`. O upsert do item (`index.ts:173-174`) passa
`historyFields: { pca_plano_id }`.

Consequência: **o join `pca_planos ⋈ pca_alteracoes ON pca_plano_id` devolve só alterações de
item.** As de plano ficam órfãs e invisíveis.

**B. `dados_anteriores` e `dados_novos` ficam vazios no `update`.**
`upsert.ts:63-67` grava apenas `payload_hash_anterior` e `payload_hash_novo`. No insert
(`upsert.ts:39-43`) ao menos `dados_novos` é gravado. Exatamente no caso em que "por que mudou?"
importa, há dois hashes que dizem *que* mudou e nunca *o que*. **O "porquê" é estruturalmente
inacessível.**

**C. `pca_item_id` nunca é preenchido.** A coluna existe (`202609180004_pca.sql:57`); nada a
escreve.

**D. `inativacao`/`reativacao` nunca são gravadas.** `inactivateNotSeen` faz `update ativo=false`
em massa, sem insert de histórico. Dois dos quatro valores do CHECK são inalcançáveis.

## O gate 78 / 7830

**`pca_planos` não tem coluna de classe.** A classe vive em `pca_itens.classe_material_servico`
(`202609180004_pca.sql:35`). O gate no nível do plano só existe via item:

```sql
WHERE EXISTS (
  SELECT 1 FROM public.pca_itens i
  WHERE i.pca_plano_id = p.id AND i.classe_material_servico = '7830'
)
```

"A base só tem 7830" é premissa, não garantia: `defaultPcaClassificacoes` lê
`PNCP_PCA_CLASSIFICACOES` do ambiente. Gate implícito quebra em silêncio.

E ele interage com o defeito A: alteração de plano tem `pca_plano_id` nulo, logo não tem item,
logo não tem classe — **as órfãs não são classificáveis pelo gate**. Mais uma razão para
contá-las à parte.

## Fase 1 — Consulta que roda e responde

Substituir o `.sql` atual:

- **Um statement por consulta**, cada um com seu próprio `WITH`.
- **Amostra determinística** — os 10 com mais alterações, ou `ORDER BY id_pca_pncp`.
- **Contar as órfãs** (`pca_plano_id IS NULL`) numa linha própria, para o defeito A aparecer.
- **Sem `CASE` inventando motivo** — enquanto B não for corrigido, `motivo_disponivel = false`.
- **Gate explícito** via o `EXISTS` acima, com a classe parametrizada no topo.

## Fase 2 — Testes de integridade

| # | Teste | Esperado hoje |
|---|---|---|
| 1 | `count(*)` em `pca_alteracoes` | > 0 |
| 2 | `count(*) FILTER (WHERE pca_plano_id IS NULL)` | **> 0** (defeito A) |
| 3 | `count(*) FILTER (WHERE pca_item_id IS NOT NULL)` | **0** (defeito C) |
| 4 | updates com `dados_novos IS NULL` | = total de updates (defeito B) |
| 5 | `GROUP BY tipo_operacao` | só `insert` e `update` (defeito D) |
| 6 | `pca_plano_id` sem plano correspondente | 0 (há FK) |
| 7 | `sync_run_id` casando com `private.pncp_sync_run` | todos (sem FK cross-schema) |
| 8 | alterações por `sync_run_id` | 1ª carga = tudo `insert` |
| 9 | `distinct classe_material_servico` em `pca_itens` | só `7830` |
| 10 | planos sem nenhum item 7830 | 0 |
| 11 | itens com classe nula | 0 |

O teste 8 é o mais informativo: se a base foi carregada uma vez só, a resposta honesta a
"quantas alterações e por quê" é *"nenhuma alteração real ainda — o que existe é o registro da
primeira ingestão"*.

## Fase 3 — Corrigir o pipeline

Só depois da Fase 2 confirmar. Em `_shared/pncp/upsert.ts` e `sync-pncp-pca/index.ts`:

1. **A** — passar `historyFields: { pca_plano_id }` também no upsert do plano.
2. **B** — gravar `dados_anteriores`/`dados_novos` no update; exige ler a linha inteira antes, não
   só `id, payload_hash` (`upsert.ts:52`). É o que torna o "porquê" respondível.
3. **C** — preencher `pca_item_id` nas alterações de item.
4. **D** — ou `inactivateNotSeen` grava histórico, ou os dois valores saem do CHECK.

Cuidado: `upsertByHash` é compartilhado (PCA, contratações, catálogo, IRP). Mudança em (2) afeta
todo chamador que passa `historyTable`.

## Verificação

1. Rodar o `.sql` antigo e capturar o erro de CTE — serve de regressão para o novo.
2. O novo `.sql` roda inteiro e os totais batem com `count(*)`.
3. As 11 queries da Fase 2 rodam e **o resultado real vai no relatório**. Relatório sem número
   não conta como entrega.
4. Gate: rodar com e sem o `EXISTS`; hoje devem bater, e a divergência futura denuncia vazamento.
5. Após a Fase 3, rodar o sync duas vezes: a segunda grava `update` com os dois jsonb, e um diff
   nomeia o campo alterado.

## Lição para o prompt do assistente

1. Pergunta que pede número só é respondida com consulta **executada**.
2. Antes de responder "por quê", verificar se o dado que explica existe. Aqui não existe, e a
   resposta correta era dizer isso.
3. "Teste se os registros estão corretos" manda procurar defeito, não descrever estrutura. O
   primeiro lugar a olhar é quem escreve a tabela.
4. **O recorte 78/7830 entra em toda consulta, explícito** — e, como `pca_planos` não tem coluna
   de classe, só aparece se alguém lembrar dele de propósito.
