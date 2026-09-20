# Contexto - Kubharness Admin
- Crie uma tela de configuração para setarmos providers da Antrophic, Gemini, OpenAI
- Conector poderá ser criado via API ou Autenticação (onde usuário tiver plano ativo). Opencode que pede URL e API KEY
- Separar cada provider por slug 
- O modelo da LLM a ser chamado deve ter gate por slug
- Busque os modelos mais tradicionais em formato cloud ou local como ollama

# Cards
- Os cards devem conter infromaçoes do agente que está sendo usado
- A Spec que ele está trabalhando ou nome da tarefa de rotina de trabalho
- Os cards devem ser colapsáveis mostrando o detalhe da execução
- os cards podem ser movidos via automação ou manualmente use pacote
- Analise qual framework o projeto está usando se for React intale o dnd-kit (@dnd-kit/core): É atualmente a recomendação mais moderna. É leve, modular e altamente acessível. Como não traz nenhum estilo embutido, é a combinação perfeita para estilizar os cards e as colunas com Tailwind.
- Ao final da execução de cada Spec e tarefa o usuário admin deve ser avisado via e-mail (use resend para configuração de e-mail) ou alerta via asset de "sino"
- Deixar montado automação para envio de alertas via whatsapp, usando Evolution API e WPPConnect 
- Montar também automação via Realtime após movimentação dos cards.
