# Regulamento de plataforma - referências para o MVP do LicitaGym

Análise dos documentos publicados na [área de Legislação e Regulamentos](https://licitamaisbrasil.com.br/legislacao-e-regulamentos), consultada em **20/09/2026**:

- [Regulamento da Plataforma Licita Mais Brasil - versão 01/2026](https://media.licitamaisbrasil.com.br/regulamentos-e-privacidade/Regulamento%20Licita%20Mais%20Brasil%20-%20012026.pdf);
- [Termo de Adesão - Licitante Pessoa Jurídica - versão 01/2026](https://media.licitamaisbrasil.com.br/regulamentos-e-privacidade/Termo%20de%20Ades%C3%A3o%20-%20Licitante%20PJ%20-%20012026.pdf);
- [Termo de Adesão - Licitante Pessoa Física - versão 01/2026](https://media.licitamaisbrasil.com.br/regulamentos-e-privacidade/Termo%20de%20Ades%C3%A3o%20-%20Licitante%20PF%20-%20012026.pdf).

## Objetivo e limite da comparação

A Licita Mais Brasil opera uma plataforma transacional para realização de licitações e leilões. O LicitaGym, no MVP atual, é um SaaS de **monitoramento e análise de oportunidades**, com dados oficiais sincronizados para uma base canônica.

Por isso, este documento não reproduz o regulamento de terceiros. Ele registra princípios e requisitos que podem ser adaptados ao escopo real do LicitaGym.

## Resumo do regulamento lido

O regulamento, datado de 14/01/2026 e composto por sete páginas, trata de:

1. natureza da plataforma e intermediação tecnológica;
2. perfis de cidadão, fornecedor e comprador público;
3. credenciais, recuperação de acesso e segurança lógica;
4. credenciamento e validação documental;
5. responsabilidades de fornecedores, compradores e plataforma;
6. modelos de cobrança e créditos de participação;
7. condução dos processos licitatórios;
8. vigência, rescisão e pendências da conta;
9. proteção e confidencialidade de dados;
10. propriedade intelectual;
11. compliance e anticorrupção;
12. alteração do regulamento, suspensão de usuários e foro.

## Modelos de Termos de Adesão analisados

Os dois modelos possuem quatro páginas e repetem a mesma estrutura de responsabilidades, tratamento de dados e comunicações. A diferença principal está nos dados cadastrais iniciais.

### Pessoa jurídica

O modelo solicita razão social, nome fantasia, CNPJ, endereço, CNAE principal e secundários, inscrição estadual, contatos, enquadramento ME/EPP e dados do representante legal, incluindo CPF e celular.

Para o LicitaGym, o cadastro inicial de organização deve ser menor:

- razão social ou nome empresarial;
- CNPJ, somente se necessário para vínculo empresarial, faturamento ou personalização;
- nome e e-mail do usuário da conta;
- papel do usuário dentro da organização;
- preferências de monitoramento, como categorias, CATMAT, regiões e órgãos.

Não há necessidade, no MVP de monitoramento, de coletar contrato social, RG, CPF de sócios, CNAE completo, inscrição estadual ou prova de representação para permitir pesquisa e criação de alertas.

### Pessoa física

O modelo solicita nome, CPF, endereço, CEP, RG, órgão emissor, telefone, celular e e-mail.

O perfil de fornecedor pessoa física deve permanecer **fora do MVP**, salvo se uma necessidade comercial real for validada. Se for incluído futuramente, os campos devem ser definidos por finalidade, e não copiados integralmente do modelo analisado.

### Conteúdo comum dos dois modelos

| Tema identificado | Aproveitamento no LicitaGym |
|---|---|
| Aceite conjunto do termo e do regulamento | Adotar aceite eletrônico versionado, com links para todos os documentos aceitos. |
| Responsabilidade pelas ações da conta | Adotar para ações realizadas no LicitaGym, sem transferir ao usuário responsabilidades que pertençam legalmente ao controlador. |
| Veracidade das informações fornecidas | Adotar para dados de conta, preferências e classificações manuais. Dados oficiais importados devem manter a origem, sem atribuir sua veracidade ao cliente. |
| Acompanhamento de prazos e avisos | Informar que alertas são auxiliares e que o usuário deve conferir o edital e a plataforma oficial. |
| Finalidade do tratamento | Documentar por categoria de dado e funcionalidade. Não usar uma autorização genérica para finalidades futuras. |
| Direitos do titular | Oferecer canal para acesso, correção, eliminação quando cabível, oposição e demais solicitações aplicáveis. |
| Retenção após encerramento | Definir prazos e exceções por obrigação legal, exercício de direitos e segurança; eliminar ou anonimizar quando a retenção deixar de ser necessária. |
| Comunicação de incidente | Manter plano de resposta e aplicar o prazo legal/regulatório vigente, sem fixar no produto um prazo copiado de terceiro. |
| E-mails de interesse | Separar notificações essenciais do serviço de comunicações promocionais opcionais, com registro do consentimento e cancelamento simples. |

## O que espelhar no MVP

| Prioridade | Princípio aproveitável | Aplicação no LicitaGym | Evidência/aceite mínimo |
|---|---|---|---|
| P0 | Natureza e limite do serviço | Informar que o LicitaGym monitora e analisa dados, não representa órgão ou fornecedor e não garante contratação, habilitação ou vitória. | Aviso visível nos termos, no onboarding e nas análises críticas. |
| P0 | Prevalência da fonte oficial | Edital, anexos e publicação oficial prevalecem sobre resumo, classificação e alerta gerados pelo produto. | Cada oportunidade exibe fonte oficial e data da última sincronização. |
| P0 | Proveniência e auditabilidade | Manter payload bruto, identificadores oficiais, hashes, versão e histórico da ingestão. | Resultado pode ser rastreado até o registro/documento de origem. |
| P0 | Controle de acesso | Separar usuário autenticado e operação administrativa de sincronização; escrita técnica apenas com privilégio de serviço. | RLS ativa, `anon` sem acesso indevido e segredos fora de logs. |
| P0 | Proteção de dados | Coletar apenas dados necessários e evitar ingestão de CPF, credenciais ou documentos pessoais do PNCP. | Finalidade e retenção documentadas; logs sem PII ou tokens. |
| P0 | Termos versionados | Registrar a versão aceita dos Termos de Uso e da Política de Privacidade. | `terms_version`, `accepted_at` e acesso ao texto histórico. |
| P0 | Aceite vinculado | Relacionar o aceite ao usuário, à organização e a todas as versões documentais aplicáveis. | Registro imutável com `user_id`, `organization_id`, versões, data/hora e resultado. |
| P0 | Minimização cadastral | Solicitar apenas os campos necessários ao monitoramento e à relação comercial do LicitaGym. | Dicionário de dados com finalidade e retenção de cada campo. |
| P0 | Referência temporal | Exibir datas com fuso e preservar o timestamp original da fonte. | Interface deixa claro o horário de Brasília quando aplicável e não converte prazos silenciosamente. |
| P1 | Recuperação de acesso | Usar o fluxo seguro do provedor de autenticação, com mensagens neutras que não revelem a existência da conta. | Recuperação testada e eventos relevantes auditados. |
| P1 | Responsabilidade sobre alertas | Alertas ajudam a priorizar a leitura, mas o usuário deve conferir edital e anexos antes de agir. | Alertas incluem motivo, confiança, campos usados e fonte. |
| P1 | Disponibilidade e manutenção | Comunicar indisponibilidade da fonte oficial, falha de sincronização e manutenção do produto. | Estados de erro explícitos; dado antigo marcado como desatualizado. |
| P1 | Canal oficial de suporte | Definir um canal único para problemas de conta, correção de dados e incidentes. | Link de suporte e protocolo ou registro interno da solicitação. |
| P1 | Encerramento e retenção | Definir como encerrar conta, resolver pendências e reter ou excluir dados conforme finalidade legal. | Política documentada antes da abertura comercial do MVP. |
| P1 | Preferências de comunicação | Distinguir alerta solicitado, mensagem operacional e marketing. | Opt-in separado para marketing, histórico de consentimento e descadastro funcional. |
| P1 | Direitos do titular | Criar fluxo verificável para solicitações de privacidade. | Canal publicado, protocolo, prazo interno e decisão fundamentada. |
| P1 | Compliance | Proibir fraude, abuso, tentativa de manipular dados e uso ilícito da plataforma. | Cláusula nos termos e trilha de auditoria para ações administrativas. |
| P2 | Transparência comercial | Se houver assinatura, mostrar preço, renovação, cancelamento e o que cada plano oferece. | Checkout e área da conta sem taxas implícitas. |

## O que já existe no repositório

| Tema | Cobertura atual verificada | Próximo ajuste recomendado |
|---|---|---|
| Fonte oficial e sync | Edge Functions consultam PNCP/Compras.gov; a arquitetura impede chamadas ao PNCP acionadas diretamente pelo usuário. | Exibir no produto `source_url`, `collected_at` e estado de sincronização. |
| Payload e idempotência | `private.source_record`, `pncp_sync_run`, hashes e locks estão previstos em [architecture.md](./pncp/architecture.md). | Padronizar auditoria de transformações e classificações manuais. |
| Legislação versionada | Tabelas de documentos, versões, relações e alertas, com hash e Storage privado. | Validar status jurídico; não marcar automaticamente como vigente apenas porque o download funcionou. |
| Autorização | Supabase Auth, RLS e escrita com `service_role`; usuários do PNCP estão fora do MVP. | Criar matriz simples de papéis do LicitaGym e testes de autorização. |
| Proteção de PII | [security-mvp.md](./pncp/security-mvp.md) proíbe ingestão de usuários PNCP e dados sem finalidade. | Formalizar retenção, exclusão de conta e resposta a incidente. |

## Requisitos propostos para os documentos do próprio LicitaGym

### Termos de Uso

- descrição do serviço e de seus limites;
- prevalência das fontes oficiais;
- ausência de garantia de disponibilidade contínua das fontes externas;
- responsabilidades do usuário por decisões, propostas e cumprimento do edital;
- propriedade intelectual do software sem reivindicar propriedade sobre dados públicos;
- uso aceitável, medidas contra abuso e procedimento de suspensão;
- regras de assinatura, renovação e cancelamento, se houver cobrança;
- versão, data de vigência e histórico de alterações;
- canal de contato e foro, após validação jurídica.

### Política de Privacidade

- controlador, operador e contatos relevantes;
- categorias de dados e finalidades;
- bases legais, compartilhamentos e fornecedores de infraestrutura;
- retenção e exclusão;
- direitos do titular;
- segurança e resposta a incidentes;
- cookies e telemetria, se utilizados;
- tratamento separado para dados públicos provenientes do PNCP e dados de conta do cliente.

### Termo de Adesão do fornecedor

Para o MVP, o Termo de Adesão deve ser uma confirmação curta e eletrônica vinculada aos Termos de Uso e à Política de Privacidade, sem repetir integralmente os dois documentos.

Conteúdo mínimo:

- identificação da organização e do usuário que aceita;
- declaração de ciência das versões vigentes;
- responsabilidade pela segurança da própria conta e pela exatidão dos dados inseridos pelo usuário;
- aviso de que alertas não substituem a conferência do edital e da plataforma oficial;
- plano contratado, preço, renovação e cancelamento, quando houver cobrança;
- preferências promocionais em controle separado e opcional;
- data/hora do aceite e identificador auditável.

Não exigir assinatura física para o uso normal do SaaS. Eventual exigência de assinatura eletrônica qualificada ou prova de representação deve depender do risco e da finalidade do ato, com validação jurídica própria.

### Registro de auditoria

Eventos mínimos recomendados:

- autenticação, recuperação e encerramento de conta;
- aceite de termos e política;
- criação, alteração e remoção de filtros ou alertas;
- classificação manual de oportunidade ou item;
- execução e resultado de sincronizações;
- mudança de regra determinística ou versão do classificador;
- acesso administrativo e exportação de dados.

Para cada evento, registrar apenas o necessário: tipo, ator interno, data/hora, recurso, resultado e correlação. Não registrar senha, token, documento pessoal completo ou payload sensível.

## O que não espelhar no MVP

| Item do regulamento analisado | Decisão para o LicitaGym |
|---|---|
| Crédito pago para participar de uma licitação | Não copiar. O LicitaGym não hospeda a disputa e sua monetização deve ser assinatura pelo serviço de inteligência, se adotada. |
| Recebimento de propostas e lances | Fora do MVP. Exigiria sigilo, não repúdio, cronometragem, disponibilidade e auditoria de nível transacional. |
| Sigilo de propostas até a abertura | Fora do MVP enquanto o produto não armazenar propostas. Proteger dados privados do cliente continua obrigatório. |
| Credenciamento documental completo de fornecedor | Não copiar agora. Evitar armazenar RG, CPF, comprovante de residência e documentos societários sem necessidade. |
| Cadastro PF completo | Não copiar sem caso de uso validado. Nome, CPF, RG e endereço não são necessários para o núcleo atual de monitoramento B2B. |
| Dados completos de representante e sócios | Não copiar para um simples usuário da organização. Prova de representação só deve existir se for necessária para um ato jurídico específico. |
| Consentimento genérico para todo tratamento | Não copiar. Mapear a base legal adequada para cada finalidade e reservar consentimento para situações realmente opcionais. |
| Declaração contratual de que a plataforma não é controladora | Não copiar. O papel na LGPD decorre das decisões e operações efetivamente realizadas, não apenas do nome atribuído no termo. |
| Prazo fixo de incidente copiado do fornecedor | Não copiar. O plano deve acompanhar a legislação e a regulamentação vigentes e avaliar risco ou dano relevante. |
| Referência genérica à Lei 8.666/1993 | Não reutilizar como fundamento padrão. Cada fluxo deve apontar o regime legal efetivamente aplicável ao processo. |
| Perfil de pregoeiro, equipe de apoio e comprador público | Fora do MVP atual, que é orientado ao fornecedor de equipamentos fitness. |
| Julgamento, homologação, anulação e sanção | Não implementar como ação do LicitaGym. Apenas exibir atos oficiais, com fonte e vigência. |
| Bloqueio por sanção inserida por operador privado | Não copiar. Qualquer alerta de sanção deve vir de cadastro oficial e não substituir avaliação jurídica. |
| Alteração unilateral com vigência imediata | Evitar como padrão. Preferir aviso prévio, versionamento e novo aceite quando a alteração afetar direitos ou finalidade de dados. |
| Regra fixa de 30 dias para rescisão | Não copiar sem decisão comercial e validação jurídica próprias. |

## Backlog recomendado

### Antes de disponibilizar o MVP a clientes

- [ ] Publicar Termos de Uso e Política de Privacidade próprios, versionados.
- [ ] Publicar Termo de Adesão eletrônico para organizações fornecedoras, vinculado às versões dos documentos aceitos.
- [ ] Criar dicionário de dados cadastrais com finalidade, base legal, retenção e acesso.
- [ ] Manter o perfil PF fora do MVP até existir caso de uso aprovado.
- [ ] Separar consentimento promocional de alertas e comunicações essenciais do serviço.
- [ ] Exibir fonte, data de coleta e aviso de prevalência do edital em cada oportunidade.
- [ ] Definir papéis mínimos: `authenticated_user` e `admin/service`.
- [ ] Criar trilha de auditoria para classificação manual e ações administrativas.
- [ ] Definir retenção, exclusão de conta e canal de suporte.
- [ ] Definir fluxo de direitos do titular e resposta a incidentes.
- [ ] Criar estado visível de fonte indisponível ou dado desatualizado.

### Depois da validação comercial

- [ ] Definir planos, renovação e cancelamento com transparência.
- [ ] Permitir exportação dos dados do cliente e do histórico de alertas.
- [ ] Criar painel de incidentes e manutenções relevantes.
- [ ] Avaliar perfil público sem login somente se houver benefício real e revisão das políticas de acesso.

### Somente se o produto se tornar transacional

- [ ] Credenciamento e representação de fornecedor.
- [ ] Assinatura eletrônica e não repúdio.
- [ ] Cofre de propostas com abertura temporal controlada.
- [ ] Sessão pública, lances, recursos e trilha imutável.
- [ ] Alta disponibilidade, recuperação de desastre e auditoria externa compatíveis com a criticidade.

## Decisão de produto

O pacote de referência do MVP inclui o regulamento e os modelos de adesão PF/PJ. O LicitaGym deve espelhar a **disciplina operacional** desses documentos - limites claros, aceite rastreável, segurança, responsabilidades e proteção de dados - mas não o modelo de negócio, a coleta cadastral excessiva nem as funcionalidades próprias de uma plataforma que realiza o certame.
