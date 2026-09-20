# Instalação do Agente Jurídico LicitaGym

## Pré-requisitos

- Python 3.10 ou superior
- pip (gerenciador de pacotes Python)
- Git
- Conta no Supabase (opcional, para armazenamento)

## Passo 1: Clonar/Configurar Diretório

```bash
cd /workspace/docs/agente-juridico-ml
```

## Passo 2: Criar Ambiente Virtual

```bash
# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual
# Windows:
venv\Scripts\activate

# Linux/Mac:
source venv/bin/activate
```

## Passo 3: Instalar Dependências

```bash
# Instalar todos os requisitos
pip install -r requirements.txt
```

### Instalação Opcional

**Apenas TensorFlow (mais leve):**
```bash
pip install tensorflow>=2.15.0
pip install transformers>=4.38.0
pip install sentence-transformers>=2.3.0
pip install supabase>=2.4.0
pip install loguru>=0.7.0
pip install python-dotenv>=1.0.0
```

**Com suporte a GPU (NVIDIA CUDA):**
```bash
pip install tensorflow[and-cuda]>=2.15.0
```

## Passo 4: Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Copiar modelo
cp .env.example .env

# Editar com suas credenciais
```

### Conteúdo do .env

```env
# Supabase (opcional)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-service-role

# Chaves de API (opcional)
OPENAI_API_KEY=sk-...

# Configurações do Modelo
MODELO_NOME=neuralmind/bert-base-portuguese-cased
THRESHOLD_SIMILARIDADE=0.7

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/agente.log
```

## Passo 5: Configurar Supabase (Opcional)

1. Acesse https://supabase.com e crie um projeto
2. Vá para o SQL Editor
3. Execute o script `supabase_schema.sql`
4. Copie as credenciais para o `.env`

### Habilitar pgvector no Supabase

No dashboard do Supabase:
1. Vá para "Database" → "Extensions"
2. Busque por "vector"
3. Clique em "Enable"

## Passo 6: Testar Instalação

```bash
# Testar imports básicos
python -c "import tensorflow; print(f'TensorFlow: {tensorflow.__version__}')"
python -c "from transformers import AutoTokenizer; print('Transformers OK')"
python -c "from supabase import create_client; print('Supabase OK')"

# Rodar exemplo simples
python agente.py
```

## Passo 7: Primeiros Passos

### Ingerir Legislação

```python
from agente import AgenteJuridico

agente = AgenteJuridico()
agente.carregar_modelo()

# Ingerir URL da Lei 14.133/2021
agente.ingerir_documento("https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm")

# Ingerir arquivo local
agente.ingerir_documento("./leis/lei_14133.pdf")
```

### Fazer Consultas

```python
# Consulta simples
resposta = agente.consultar("Quais os requisitos para dispensa de licitação?")

print(f"Tipo: {resposta['classificacao']['tipo']}")
print(f"Documentos: {resposta['total_documentos']}")

for fund in resposta['fundamentacao']:
    print(f"• {fund}")
```

### Analisar Documentos

```python
analise = agente.analisar_documento("./edital.pdf")

print(f"Título: {analise['metadados']['titulo']}")
print(f"Artigos: {analise['estatisticas']['total_artigos']}")
print(f"Entidades: {analise['entidades']}")
```

## Troubleshooting

### Erro: "No module named 'tensorflow'"

```bash
pip install --upgrade pip
pip install tensorflow
```

### Erro: "CUDA out of memory"

Use modo CPU ou reduza batch size:
```python
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"  # Forçar CPU
```

### Erro: "Supabase not configured"

Verifique se as variáveis de ambiente estão corretas no `.env`

### Modelo demora para carregar

Na primeira execução, os modelos são baixados. Isso é normal. Modelos subsequentes usarão cache.

## Estrutura de Arquivos

```
agente-juridico-ml/
├── README.md              # Este arquivo
├── requirements.txt       # Dependências Python
├── ingestor.py           # Módulo de ingestão
├── modelo_ml.py          # Modelo de ML
├── agente.py             # Interface principal
├── supabase_schema.sql   # Schema do banco
├── .env.example          # Modelo de configuração
└── exemplos/
    ├── consulta.py       # Exemplo de consulta
    └── ingestao.py       # Exemplo de ingestão
```

## Próximos Passos

1. **Ingerir legislação**: Comece com a Lei 14.133/2021
2. **Testar consultas**: Faça perguntas sobre licitações
3. **Integrar com LicitaGym**: Conecte ao módulo de licitações
4. **Customizar modelo**: Fine-tune para seu domínio específico

## Recursos Adicionais

- [Documentação TensorFlow](https://www.tensorflow.org/)
- [Hugging Face Transformers](https://huggingface.co/docs/transformers/)
- [Supabase Docs](https://supabase.com/docs)
- [Lei 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm)
