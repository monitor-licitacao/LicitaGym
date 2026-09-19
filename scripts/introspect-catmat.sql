-- Dump do DDL real das tabelas CATMAT (elas existem no banco, mas em nenhuma migration).
-- Rode no SQL Editor do Supabase e cole a saída — é o que falta para fechar
-- supabase/sql/catmat_item_completo.sql sem adivinhar nome de coluna.

-- 1. Colunas
select table_name, ordinal_position as pos, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and (table_name like 'catmat%' or table_name = 'pca_item_pdm')
order by table_name, ordinal_position;

-- 2. Chaves e constraints
select tc.table_name, tc.constraint_type, tc.constraint_name,
       string_agg(kcu.column_name, ', ' order by kcu.ordinal_position) as colunas
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
where tc.table_schema = 'public'
  and (tc.table_name like 'catmat%' or tc.table_name = 'pca_item_pdm')
group by 1, 2, 3
order by 1, 2;

-- 3. Índices
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and (tablename like 'catmat%' or tablename = 'pca_item_pdm')
order by tablename, indexname;

-- 4. Volume por tabela
select 'catmat_grupos' t, count(*) from catmat_grupos
union all select 'catmat_classes', count(*) from catmat_classes
union all select 'catmat_pdms', count(*) from catmat_pdms
union all select 'catmat_pdm_unidades', count(*) from catmat_pdm_unidades
union all select 'catmat_pdm_naturezas_despesa', count(*) from catmat_pdm_naturezas_despesa
union all select 'catmat_item_caracteristicas', count(*) from catmat_item_caracteristicas
union all select 'catalogo_itens', count(*) from catalogo_itens
union all select 'pca_item_pdm', count(*) from pca_item_pdm;

-- 5. A chave que falta: quantos itens distintos existem, e quantos deles
--    conseguem chegar a um PDM hoje (só via catalogo_itens)
select
  (select count(distinct codigo_item) from catmat_item_caracteristicas) as itens_com_caracteristica,
  (select count(*) from catalogo_itens where codigo_pdm is not null)    as itens_catalogo_com_pdm,
  (select count(distinct c.codigo_item)
     from catmat_item_caracteristicas c
     join catalogo_itens ci on ci.codigo_catmat = c.codigo_item::text)  as itens_que_alcancam_pdm;

-- 6. Risco de junção silenciosa: int vs text com padding
select codigo_catmat, length(codigo_catmat) as tamanho
from catalogo_itens
where codigo_catmat is not null
limit 10;
