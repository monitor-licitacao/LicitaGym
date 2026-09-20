# Catálogo Eletrônico de Padronização (CEP)

Inventário oficial vs escopo LicitaGym (classe CATMAT **7830** / fitness).

> **Verificado:** 2026-09-20 via Plone REST (`++api++`) e páginas gov.br.  
> **Não confundir** CEP com CATMAT/CATSER, nem com `GET /v1/catalogos` da API de Integração PNCP.

## O que é

Ferramenta Seges/MGI no PNCP para **padronizar fase preparatória** (parecer técnico, TR, edital, contrato, ARP) de itens com códigos CATMAT/CATSER.

| Norma | Papel |
|-------|--------|
| Lei nº 14.133/2021 art. 6º, LI e art. 19, II | Previsão legal do catálogo |
| Portaria Seges/ME nº 938/2022 | Institui CEP na Administração federal |

Hub: [Catálogo Eletrônico de Padronização](https://www.gov.br/pncp/pt-br/catalogo-eletronico-de-padronizacao)  
Itens: [itens-padronizados](https://www.gov.br/pncp/pt-br/catalogo-eletronico-de-padronizacao/itens-padronizados)

**Obrigatoriedade (art. 2º da Portaria 938):** órgãos federais Sisg + entes que executem recursos da União por transferências voluntárias. Demais entes: facultativo; não uso exige justificativa escrita no processo.

## CEP ≠ CATMAT ≠ `sync-pncp-catalogo`

| Conceito | O que é | No LicitaGym |
|----------|---------|--------------|
| **CATMAT** | Códigos/PDM/características Compras.gov | `sync-compras-catmat`, `catalogo_itens`, `catmat_*` |
| **CEP** | Processo + minutas oficiais amarradas a CATMAT | **não ingerido** |
| **PNCP `/v1/catalogos`** | Catálogos de domínio da API Integração | `sync-pncp-catalogo` (outro objeto) |

No dia da verificação, `https://pncp.gov.br/api/pncp/v1/catalogos?statusAtivo=true` respondeu **503**. Fonte confiável do inventário CEP = site Plone, não essa API.

## Como consultar (fonte de verdade)

```text
GET https://www.gov.br/pncp/++api++/pt-br/catalogo-eletronico-de-padronizacao/itens-padronizados
Accept: application/json
```

Campo útil: `items_total` / `items[]` (`@id`, `title`, `@type`).  
Documentos reais = `@type: Document`. Ignorar `@type: Link` autorreferente.

## Inventário — itens publicados

`items_total` da pasta = **3** (1 Link + **2 Document**). Nenhum fitness / 7830.

| Documento | URL | CATMAT | Classe CATMAT (parecer) |
|-----------|-----|--------|-------------------------|
| Água mineral natural, sem gás | [agua-mineral-natural-sem-gas](https://www.gov.br/pncp/pt-br/catalogo-eletronico-de-padronizacao/itens-padronizados/agua-mineral-natural-sem-gas) | 445484, 445485 | 8960 (bebidas) |
| Café e açúcar | [cafe-e-acucar](https://www.gov.br/pncp/pt-br/catalogo-eletronico-de-padronizacao/itens-padronizados/cafe-e-acucar) | 606522, 606523, 606524, 603269, 463990 | alimentos |

Cada pasta inclui parecer SEI + modelos (contratação direta e/ou pregão). Café/açúcar inclui minuta de ARP.

Probe de slugs fitness (`academia`, `esteira`, `halteres`, `musculacao`, `equipamentos-esportivos`, `artigos-esportivos`, …) → **404**.

## Pipeline — órgãos parceiros (ainda sem página CEP)

Fonte: [órgãos parceiros](https://www.gov.br/pncp/pt-br/catalogo-eletronico-de-padronizacao/orgaos-parceiros) (página modificada 27/03/2026).  
Pastas sob `itens-padronizados/` para esses nomes → **404** na mesma data.

| Órgão | Itens anunciados |
|-------|------------------|
| Ministério da Justiça e Segurança Pública | Pistolas 9×19 mm; coletes de proteção balística |
| Ministério de Minas e Energia | Lâmpada fluorescente e LED; ar-condicionado split; refrigeradores e congeladores |
| Ministério da Saúde | Cloreto de sódio 0,9% |
| SGD / MGI | Notebook; desktop; monitor |

**Nenhum** item esportivo, academia ou classe 7830.

## Minutas genéricas do processo

Pasta [minutas](https://www.gov.br/pncp/pt-br/catalogo-eletronico-de-padronizacao/minutas): modelos de portaria de comissão e parecer técnico (não são itens CATMAT).

## Implicação LicitaGym

1. Escopo fitness **não** depende do CEP hoje — continuar CATMAT 7830 + PCA + ponte.
2. CEP fitness seria evento de produto (TR/edital oficiais + CATMAT estável) se Seges/órgão parceiro publicar pasta sob `itens-padronizados/`.
3. Monitoramento leve: reconsultar `++api++/.../itens-padronizados` e a página de órgãos parceiros; alertar se `items_total` Document subir ou se slug 7830/academia aparecer.
4. Não criar migration/sync CEP até existir item fitness publicado **ou** pedido explícito de ingestão dos dois itens atuais (água/café) — fora do recorte academia.

## Referências

- [architecture.md](./architecture.md) — sync PNCP / CATMAT
- [cruzamentos.md](./cruzamentos.md) — junções PCA × CATMAT × catálogo LicitaGym
- [schemas-consultas.md](../compras-gov/schemas-consultas.md) — DTOs Compras.gov / CATMAT
- FAQ CEP (incl. distinção CATMAT): [perguntas frequentes](https://www.gov.br/pncp/pt-br/catalogo-eletronico-de-padronizacao/perguntas-frequentes)
