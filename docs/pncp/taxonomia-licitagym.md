# Taxonomia do LicitaGym

## Escopo

Esta é a taxonomia canônica de produto do LicitaGym para classificação de
materiais fitness. Ela é uma curadoria local e não substitui a hierarquia
oficial CATMAT nem seus identificadores.

Artefato de origem:
[LicitaGym CATMAT](https://licitagym-catmat.fiscalvectracargo.chatgpt.site/).
A página exige autenticação do ChatGPT; por isso, a tabela abaixo fica
versionada no repositório para auditoria e evolução controlada.

## Tabela de taxonomia do LicitaGym

| Nível 1 — Categoria | Nível 2 — Subcategoria | Chave do sistema |
| ------------------- | ---------------------- | ---------------- |
| Musculação          | —                      | `musculacao`     |
| Cárdio              | —                      | `cardio`         |
| Acessórios          | Halter                 | `halter`         |
| Acessórios          | Dumbbells              | `dumbbells`      |
| Acessórios          | Puxadores              | `puxadores`      |
| Acessórios          | Anilhas                | `anilhas`        |
| Acessórios          | Cordas                 | `cordas`         |
| Acessórios          | Piso                   | `piso`           |
| Acessórios          | Colchonete             | `colchonete`     |
| Acessórios          | Outros                 | `outros`         |

### Representação esperada

- Nível 1 é persistido em `catalogo_itens.categoria_licitagym` com um dos
  valores `musculacao`, `cardio` ou `acessorios`.
- Nível 2 é persistido em
  `catalogo_itens.taxonomias.subcategoria_licitagym`.
- Musculação e cárdio não têm subcategoria canônica nesta versão.
- `codigoItem`/`codigo_catmat` e `codigoPdm`/`codigo_pdm` continuam sendo
  identificadores oficiais diferentes e não intercambiáveis.

## Regras de classificação

| Regra                   | Definição                                                                   |
| ----------------------- | --------------------------------------------------------------------------- |
| Classificação principal | Realizada inicialmente no nível do PDM                                      |
| Idempotência            | O mesmo PDM deve produzir sempre a mesma classificação                      |
| Herança                 | Os itens vinculados herdam a classificação definida para o PDM              |
| Exceção por item        | Um item CATMAT pode receber classificação manual diferente                  |
| Edição de candidatos    | O usuário pode incluir ou retirar manualmente um PDM do recorte fitness     |
| Identificadores         | `codigoItem` e `codigoPdm` são diferentes e devem ser preservados           |
| Validação               | Classificação por PDM não equivale à validação individual de todos os itens |
| Rastreabilidade         | Manter descrição original, códigos oficiais, fonte e ressalvas              |

### Precedência

```text
exceção manual por item
        ↓
classificação herdada do PDM
        ↓
estado de revisão quando não houver evidência suficiente
```

A exceção deve ficar registrada no item e não pode alterar silenciosamente a
classificação-base do PDM para os demais itens vinculados.

## Estados de curadoria

| Estado                        | Significado                                        |
| ----------------------------- | -------------------------------------------------- |
| `candidato_por_pdm`           | PDM candidato ao segmento fitness                  |
| `fora_escopo_inicial_por_pdm` | PDM fora do recorte inicial                        |
| `revisar_descricao_item`      | Necessária análise individual da descrição do item |

Os estados expressam a situação da curadoria. Eles não substituem a categoria
nem a subcategoria e não devem ser inferidos apenas pela ausência de um campo.

## Fontes versionadas relacionadas

- [`licitagym-curadoria-catmat.json`](../../supabase/seeds/licitagym-curadoria-catmat.json)
  — export de curadoria atualmente importado pelo backend;
- [`curadoria-import.ts`](../../supabase/functions/_shared/compras-gov/curadoria-import.ts)
  — normalização do payload e separação entre categoria e subcategoria;
- [`202609192030_piso_curadoria.sql`](../../supabase/migrations/202609192030_piso_curadoria.sql)
  — migration que ampliou temporariamente `categoria_licitagym` para aceitar
  `piso` como categoria;
- [`taxonomia-piso-7220.md`](taxonomia-piso-7220.md) — regra técnica
  complementar para descobrir itens de piso na classe CATMAT 7220.

## Estado atual da implementação

O importador normaliza `categoria_licitagym` para `musculacao`, `cardio` ou
`acessorios` e grava a subcategoria separadamente em
`taxonomias.subcategoria_licitagym`. O schema, porém, foi ampliado por uma
migration posterior para também aceitar `piso`, conforme a divergência abaixo.

Há divergências verificadas que devem ser tratadas em mudança própria, sem
reescrever silenciosamente a curadoria existente:

1. O seed atual contém 106 itens do PDM `2640`, distribuídos em 14 grupos de
   apresentação: 42 itens em musculação, 13 em cárdio e 51 em acessórios.
2. O seed usa subcategorias adicionais (`bancos`, `bateria_peso`, `estacao`,
   `peso_livre`, `esteiras`, `eliptico` e `simulador_escada`) que não pertencem
   ao Nível 2 canônico acima.
3. A taxonomia de piso 7220 atualmente grava `piso` como
   `categoria_licitagym`; pela taxonomia canônica, o alvo correto é categoria
   `acessorios` com subcategoria `piso`.
4. Não foi localizada implementação persistente dos três estados de curadoria
   no schema ou no importador atual.

Este documento define o contrato canônico. Corrigir os dados e migrations para
eliminar essas divergências exige migration e validação separadas.

## Critérios para evolução

Uma alteração futura deve:

1. versionar a mudança da taxonomia;
2. declarar chaves adicionadas, renomeadas ou removidas;
3. migrar dados existentes sem perder códigos ou descrições oficiais;
4. registrar a origem e a justificativa de exceções manuais;
5. medir quantos PDMs e itens mudam de classificação;
6. manter o processo determinístico e idempotente.
