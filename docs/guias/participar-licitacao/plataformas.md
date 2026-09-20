# Plataformas de disputa

Cada certame roda **num** portal. Publicação no [PNCP](https://pncp.gov.br) (Lei 14.133) não dispensa o cadastro na plataforma onde os lances acontecem.

## Onde a disputa ocorre

| Portal | Papel típico | Custo de entrada |
|--------|----------------|------------------|
| [Compras.gov.br](https://www.gov.br/compras) (ex-SICAF) | União e milhares de municípios | Cadastro **gratuito**; análise documental 2–10 dias |
| BLL, BNC, Licitanet, Portal de Compras Públicas | Muitos estados/municípios | Anuidade ou taxa por disputa |
| Sistemas estaduais próprios | Órgão daquele ente | Variável |

Cadastre-se **antes** de achar o edital. Sem login válido, o prazo de proposta acaba no portal, não no PNCP.

## PNCP vs portal de lances

| Camada | Função |
|--------|--------|
| PNCP | Fonte oficial de publicação (editais, PCA, contratos, atas) |
| Portal da disputa | Envio de proposta, lances, habilitação, recurso |
| LicitaGym | Cópia local + recorte 7830; **não** envia lance |

Arquitetura de sync: [architecture.md](../../pncp/architecture.md).

## Achado da oportunidade (passo 4 da jornada)

Volume nacional: milhares de contratações por dia útil. Critério útil:

- Objeto / CATMAT / sinônimo (“esteira”, “estação muscular”, “material esportivo”).
- UF e município de entrega.
- Modalidade (pregão eletrônico, dispensa).
- Prazo de proposta e valor estimado.

O LicitaGym privilegia **classe 7830** e PCA do exercício — demanda prevista antes do edital sair.
