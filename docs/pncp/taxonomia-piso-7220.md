# Taxonomia de piso — CATMAT 7220

> Esta é uma regra técnica complementar para descoberta de piso na classe
> CATMAT 7220. A taxonomia canônica completa do produto está em
> [`taxonomia-licitagym.md`](taxonomia-licitagym.md).

> **Divergência conhecida:** `cluster_7220_v1` grava `piso` em
> `categoria_licitagym`. Pela taxonomia canônica, `piso` é subcategoria de
> `acessorios`. A correção requer migration própria e não faz parte deste
> documento.

## Objetivo

Registrar a regra determinística usada pelo LicitaGym para separar, dentro da
classe CATMAT `7220`, itens de piso com potencial de uso em academia (`trigo`) de
revestimentos fora desse escopo (`joio`).

A implementação versionada está na migration
[`202609200612_cluster_piso_7220.sql`](../../supabase/migrations/202609200612_cluster_piso_7220.sql)
e identifica a execução como `cluster_7220_v1`.

Este documento descreve a regra e o resultado já registrado no projeto. A
classificação não foi reexecutada para criar este Markdown.

## Fontes e chaves

A taxonomia usa somente dados já ingeridos do catálogo oficial:

- `catalogo_itens.classe_catmat = '7220'` limita o universo analisado;
- `catalogo_itens.codigo_pdm` identifica o PDM oficial;
- `catalogo_itens.codigo_catmat` é associado a
  `catmat_item_caracteristicas.codigo_item`;
- características cujo nome começa por `MATERIAL` fornecem os valores usados na
  classificação de material.

`codigo_catmat` e `codigo_pdm` permanecem campos distintos. A regra não cria,
substitui nem infere identificadores oficiais.

## Resultado registrado

O snapshot documentado em
[`cruzamentos.md`](cruzamentos.md) contém:

| resultado | itens ativos | efeito no catálogo |
|---|---:|---|
| `trigo` | 225 | `categoria_licitagym = 'piso'` e `candidato_fitness = true` |
| `joio` | 705 | recebe a marca de exclusão em `taxonomias.cluster` |
| **total da classe 7220** | **930** | não integra automaticamente o gate PCA da classe 7830 |

Os números acima são o resultado registrado da execução anterior, não uma
contagem atualizada nesta documentação. Para confirmar o estado corrente do
banco, execute as consultas de auditoria ao final deste arquivo.

## Regra determinística

### Agrupamento por PDM

| grupo interno | códigos PDM |
|---|---|
| candidato a `trigo` | `757`, `10779`, `14647`, `12550`, `10782`, `18481` |
| `joio` | `758`, `745`, `789`, `16135`, `18253` |
| outros | qualquer PDM 7220 não listado acima |

Os códigos são preservados conforme a fonte. Este documento não atribui nomes
aos PDMs porque a migration usa apenas os identificadores.

### Classificação do material

Os valores das características `MATERIAL*` são normalizados para maiúsculas e
agrupados por item. Em seguida, a migration aplica estas famílias:

| subtipo interno | padrões reconhecidos |
|---|---|
| `borracha` | `BORRACHA`, `EPDM`, `SBR`, `EVA` |
| `sintetico` | `POLIPROPILENO`, `POLIETILENO`, `PVC`, `VINIL` |
| `tecido` | `NAILON`, `POLIESTER`, `ALGOD...`, `JUTA`, `SISAL`, `COCO`, `ACRILICO`, `TUFTING` |
| `pedra` | `PORCELANATO`, `GRANITO`, `ARDOSIA`, `CERAMICA`, `MARMORE`, `CONCRETO`, `CIMENTO` |
| `indefinido` | nenhum dos padrões anteriores |

As expressões da migration também aceitam as variações acentuadas previstas no
SQL.

### Decisão trigo versus joio

Um item é classificado como `trigo` somente quando:

1. pertence a um PDM do grupo candidato a `trigo`; e
2. o material é `borracha`, `sintetico` ou `indefinido`.

Um item é classificado como `joio` quando:

- pertence a um PDM do grupo `joio`;
- pertence a um PDM candidato a `trigo`, mas o material é `pedra` ou `tecido`;
  ou
- pertence a qualquer outro PDM da classe 7220.

Essa precedência impede que apenas o PDM transforme automaticamente pedra,
cerâmica, carpete ou outro revestimento sem aderência ao escopo em item fitness.

## Campos gravados

Para `trigo`, a migration grava, de forma esquemática:

```json
{
  "categoria_licitagym": "piso",
  "candidato_fitness": true,
  "fonte_curadoria": "cluster_7220_v1",
  "taxonomias": {
    "cluster": "trigo",
    "subtipo": "<valor calculado>",
    "material_catmat": "<valores agregados das características MATERIAL*>",
    "classe_origem": "7220"
  }
}
```

O valor de `subtipo` é calculado de forma determinística: prioriza o material
`borracha` ou `sintetico`; usa `modular` para os PDMs `14647` e `18481`,
`borracha` para o PDM `12550`, `resina` para o PDM `10782` e `piso` nos demais
casos aceitos.

Para `joio`, a migration acrescenta, de forma esquemática:

```json
{
  "taxonomias": {
    "cluster": "joio",
    "subtipo_material": "<valor calculado>",
    "classe_origem": "7220"
  }
}
```

A atualização de `joio` não sobrescreve itens já classificados como
`categoria_licitagym = 'piso'`. Também preserva `fonte_curadoria` quando a origem
é `manual` ou `import-catmat-curadoria`.

## Limites conhecidos

- A lista de PDMs e os padrões de material são fechados na versão
  `cluster_7220_v1`; PDM ou material novo exige revisão explícita.
- `indefinido` pode entrar como `trigo` quando o PDM está na lista candidata.
  Esses casos devem ser priorizados em revisão manual.
- A classificação é curadoria local do LicitaGym. Ela não altera a taxonomia
  oficial CATMAT.
- A classe 7220 não deve ser adicionada implicitamente ao gate PCA 7830.
- Os totais variam quando novos itens oficiais são ingeridos; por isso o
  resultado registrado deve ser tratado como snapshot.

## Auditoria

Distribuição atual por cluster:

```sql
SELECT
  taxonomias->>'cluster' AS cluster,
  count(*) AS itens
FROM public.catalogo_itens
WHERE ativo
  AND classe_catmat = '7220'
GROUP BY 1
ORDER BY 1;
```

Itens classificados como trigo:

```sql
SELECT
  codigo_catmat,
  codigo_pdm,
  descricao,
  taxonomias->>'subtipo' AS subtipo,
  taxonomias->>'material_catmat' AS material_catmat,
  fonte_curadoria
FROM public.catalogo_itens
WHERE ativo
  AND classe_catmat = '7220'
  AND taxonomias->>'cluster' = 'trigo'
ORDER BY codigo_pdm, codigo_catmat;
```

Casos candidatos a revisão manual:

```sql
SELECT
  codigo_catmat,
  codigo_pdm,
  descricao,
  taxonomias
FROM public.catalogo_itens
WHERE ativo
  AND classe_catmat = '7220'
  AND taxonomias->>'cluster' = 'trigo'
  AND coalesce(taxonomias->>'material_catmat', '') = ''
ORDER BY codigo_pdm, codigo_catmat;
```

## Evolução da taxonomia

Uma nova versão deve:

1. preservar `codigo_catmat` e `codigo_pdm` da fonte oficial;
2. versionar a regra em migration nova, sem editar silenciosamente a execução
   anterior;
3. registrar contagens antes e depois por cluster, PDM e subtipo;
4. revisar manualmente as mudanças de `trigo` para `joio` e vice-versa;
5. atualizar este documento e o catálogo de perguntas do assistente.
