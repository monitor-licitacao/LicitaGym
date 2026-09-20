# Legislação de referência - LicitaGym

Documento de referência do MVP para monitoramento e análise de oportunidades de contratações públicas. Consulta realizada em **20/09/2026**.

## Como usar este documento

- Priorizar sempre o texto vigente na fonte oficial.
- Não tratar este material como parecer jurídico.
- Não transformar valores, prazos ou regras sujeitos a atualização em constantes permanentes do sistema.
- Preservar no banco a URL oficial, a data da coleta, o hash e a versão do documento.
- Quando houver divergência, prevalecem o edital, seus anexos e a legislação aplicável ao órgão e ao processo.

## Fontes oficiais de acompanhamento

- [Legislação do PNCP](https://www.gov.br/pncp/pt-br/pncp/legislacao)
- [Legislação do Compras.gov.br](https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao)
- [Legislação por tema - Compras.gov.br](https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/legislacao-por-tema)
- [Decretos vigentes - Compras.gov.br](https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/decretos-vigentes)
- [Referência privada consultada - Licita Mais Brasil](https://licitamaisbrasil.com.br/legislacao-e-regulamentos)

> A página da Licita Mais Brasil identifica a Lei 14.133 como "Lei 14.133/2024". O ano correto, confirmado nas fontes oficiais, é **2021**.

## 1. Núcleo das contratações públicas

### Lei nº 14.133/2021 - Licitações e Contratos Administrativos

- [Texto oficial consolidado](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm)
- **Prioridade:** P0.
- **Uso no MVP:** base para modalidades, fases, critérios de julgamento, contratação direta, PCA, editais, atas, contratos, divulgação no PNCP e rastreabilidade dos atos.
- **Regra de produto:** o LicitaGym deve informar a fonte e o momento da coleta, sem concluir automaticamente que uma empresa está habilitada ou que um item atende ao edital.

### Lei Complementar nº 123/2006 - Microempresas e empresas de pequeno porte

- [Texto oficial consolidado](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm)
- **Prioridade:** P0.
- **Uso no MVP:** identificação de tratamento favorecido, exclusividade, cotas, preferência e regras de desempate quando estiverem expressas nos dados oficiais ou no edital.
- **Regra de produto:** não inferir enquadramento ME/EPP apenas pelo nome, porte aparente ou valor da contratação.

### Lei nº 13.303/2016 - Empresas públicas e sociedades de economia mista

- [Texto oficial consolidado](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/lei/l13303.htm)
- **Prioridade:** P1.
- **Uso no MVP:** marcar processos de estatais como sujeitos a regime próprio e impedir que regras da Lei 14.133/2021 sejam aplicadas automaticamente.

### Lei nº 12.232/2010 - Serviços de publicidade

- [Texto oficial consolidado](https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12232.htm)
- **Prioridade:** P2.
- **Uso no MVP:** referência para classificação jurídica futura. Não tem relação direta com o catálogo fitness e não justifica funcionalidade específica nesta fase.

## 2. Transparência, dados e operação do SaaS

### Lei nº 12.527/2011 - Lei de Acesso à Informação

- [Texto oficial consolidado](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm)
- **Prioridade:** P0.
- **Uso no MVP:** fundamenta transparência, acesso a editais e resultados, formatos abertos, acesso automatizado, autenticidade, integridade e atualização da informação pública.
- **Regra de produto:** exibir a origem oficial e permitir distinguir dado bruto, normalização e classificação do LicitaGym.

### Lei nº 13.709/2018 - Lei Geral de Proteção de Dados Pessoais

- [Texto oficial consolidado](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- **Prioridade:** P0.
- **Uso no MVP:** finalidade, minimização, segurança, retenção e atendimento dos direitos dos titulares.
- **Regra de produto:** não ingerir CPF, credenciais ou dados de usuários do PNCP sem finalidade documentada. A decisão atual está em [security-mvp.md](./pncp/security-mvp.md).

### Lei nº 12.965/2014 - Marco Civil da Internet

- [Texto oficial consolidado](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm)
- **Prioridade:** P1.
- **Uso no MVP:** privacidade, segurança, registros de acesso e deveres associados à operação de uma aplicação de internet.

### Lei nº 12.846/2013 - Lei Anticorrupção

- [Texto oficial consolidado](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12846.htm)
- **Prioridade:** P1.
- **Uso no MVP:** termos de uso, política de uso aceitável e tratamento de sinais oficiais de impedimento ou sanção.
- **Regra de produto:** nunca rotular uma empresa como sancionada sem fonte oficial, identificador e vigência verificáveis.

## 3. Regulamentos prioritários para o domínio do MVP

### Decreto nº 10.947/2022 - Plano de Contratações Anual

- [Texto oficial](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/d10947.htm)
- **Prioridade:** P0.
- **Uso no MVP:** interpretação e monitoramento do PCA, planejamento de demanda e ligação entre itens planejados e contratações publicadas.

### Decreto nº 11.462/2023 - Sistema de Registro de Preços

- [Texto oficial](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/decreto/d11462.htm)
- **Prioridade:** P0.
- **Uso no MVP:** IRP, atas de registro de preços, órgãos gerenciadores e participantes, vigência e vínculos com contratações.

### Decreto nº 10.764/2021 - Comitê Gestor da Rede Nacional de Contratações Públicas

- [Texto oficial](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/decreto/d10764.htm)
- **Prioridade:** P1.
- **Uso no MVP:** contexto de governança do PNCP e de suas integrações.

### Decreto nº 8.538/2015 - Tratamento favorecido a pequenos fornecedores

- [Texto oficial](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/decreto/d8538.htm)
- **Prioridade:** P1.
- **Uso no MVP:** complementar a leitura da LC 123/2006 nas contratações da administração pública federal.

### Decreto nº 11.890/2024 - Margem de preferência

- [Texto oficial](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/decreto/d11890.htm)
- **Prioridade:** P1.
- **Uso no MVP:** sinalizar margem de preferência somente quando prevista no processo e sustentada por dados oficiais.

### Decreto nº 12.807/2025 - Valores vigentes em 2026

- [Texto oficial](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12807.htm)
- [Página oficial de valores da Lei 14.133/2021](https://www.gov.br/compras/pt-br/nllc/legislacao-14-133-por-tema/outros/valores-estabelecidos-na-lei-no)
- **Prioridade:** P0 para qualquer cálculo ou filtro dependente de limite legal.
- **Uso no MVP:** referência vigente em 2026 para valores atualizados da Lei 14.133/2021.
- **Regra de produto:** armazenar vigência e fonte; nunca deixar limites anuais hardcoded sem versão.

### Decreto nº 10.024/2019 - Pregão eletrônico

- [Texto oficial](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/decreto/d10024.htm)
- **Prioridade:** P1, com validação do regime aplicável ao processo.
- **Uso no MVP:** apoio histórico e operacional à leitura de pregões eletrônicos. Não presumir sua aplicação universal a todos os entes ou certames.

### Decreto nº 11.878/2024 - Credenciamento

- [Texto oficial](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/decreto/d11878.htm)
- **Prioridade:** P2.
- **Uso no MVP:** classificação e explicação futura de procedimentos auxiliares; não é requisito do núcleo de monitoramento de equipamentos fitness.

## 4. Instruções normativas prioritárias

### Planejamento e especificação da contratação

- [IN SEGES nº 58/2022 - Estudos Técnicos Preliminares](https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-no-58-de-8-de-agosto-de-2022) - P1; útil para extrair necessidade, requisitos e justificativas do ETP.
- [IN SEGES/ME nº 81/2022 - Termo de Referência](https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-81-de-25-de-novembro-de-2022) - P0; útil para separar a descrição real do objeto da descrição genérica do CATMAT.
- [IN SEGES/ME nº 65/2021 - Pesquisa de preços](https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-65-de-7-de-julho-de-2021) - P0; referência para proveniência, datas e comparabilidade dos preços estimados.

### Disputa e contratação direta

- [IN SEGES/ME nº 67/2021 - Dispensa eletrônica, atualizada](https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-67-de-8-de-julho-de-2021) - P1; útil para classificar oportunidades de dispensa com disputa.
- [IN SEGES/ME nº 73/2022 - Menor preço ou maior desconto, atualizada](https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-73-de-30-de-setembro-de-2022) - P0; útil para interpretar modo de disputa, lances, julgamento e desempate.
- [IN SEGES/ME nº 77/2022 - Ordem cronológica de pagamentos](https://www.gov.br/compras/pt-br/acesso-a-informacao/legislacao/instrucoes-normativas/instrucao-normativa-seges-me-no-77-de-4-de-novembro-de-2022) - P2; relevante apenas quando o produto passar a acompanhar execução e pagamentos.

## 5. Requisitos derivados para o LicitaGym

1. **Proveniência obrigatória:** todo dado crítico deve manter fonte, identificador oficial e instante de coleta.
2. **Semântica preservada:** `codigoItem`, `codigoPdm`, descrição CATMAT e especificação do edital são campos distintos.
3. **Prevalência do documento:** termo de referência e edital devem prevalecer sobre uma classificação automatizada incompatível com o objeto real.
4. **Vigência explícita:** normas, limites monetários e versões devem ter início e fim de vigência quando conhecidos.
5. **Sem aconselhamento automático:** análises e alertas devem ser apresentados como apoio, nunca como decisão jurídica ou garantia de habilitação.
6. **Dados pessoais mínimos:** ingestão e logs não devem acumular CPF, credenciais ou documentos pessoais sem finalidade aprovada.
7. **Estados verificáveis:** usar `vigente`, `alterada`, `revogada`, `pendente_validacao` ou equivalente; não completar lacunas por inferência do modelo.

## 6. Manutenção

- Revisar este documento quando houver nova versão da Lei 14.133/2021, dos regulamentos prioritários ou dos limites anuais.
- A arquitetura existente de versionamento está descrita em [architecture.md](./pncp/architecture.md) e implementada na migration `202609180003_legislacao.sql`.
- Seed P0/P1 + cruzamento seções API Compras.gov: migration `202609201200_compras_api_secao_legislacao.sql` (`compras_api_secoes`, `compras_api_secao_legislacao`).
- O sincronizador detecta alterações, mas o status jurídico final de uma norma deve continuar sujeito a validação, especialmente em casos de revogação parcial ou conflito entre entes.

