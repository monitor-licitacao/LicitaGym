# Agente Jurídico LicitaGym - ML para Legislação

[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.15-orange)](https://www.tensorflow.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue)](https://python.org/)
[![Licença](https://img.shields.io/badge/Licença-MIT-green)](LICENSE)

## Visão Geral

Sistema completo de **Machine Learning** para processamento, ingestão e análise de legislação (leis, decretos, portarias, regulamentos) focado em **licitações públicas de equipamentos fitness**.

## 🚀 Funcionalidades

- ✅ **Ingestão Automática**: Coleta de leis, decretos e portarias de sites oficiais
- ✅ **Parsing Inteligente**: Suporte a PDF, DOCX, HTML com extração de metadados
- ✅ **Busca Semântica**: Embeddings com BERT para encontrar legislação relevante
- ✅ **Classificação NLP**: Identificação automática do tipo de consulta jurídica
- ✅ **Respostas Fundamentadas**: Geração de respostas com citações de dispositivos legais
- ✅ **API REST**: Integração via FastAPI com outros sistemas
- ✅ **Armazenamento Vetorial**: Supabase + pgvector para busca eficiente

## 📦 Instalação Rápida

```bash
cd docs/agente-juridico-ml

# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou: venv\Scripts\activate  # Windows

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do Supabase (opcional)
```

Veja o guia completo em [INSTALACAO.md](INSTALACAO.md).

## 💻 Uso Básico

### Consulta Jurídica

```python
from agente import AgenteJuridico

agente = AgenteJuridico()
agente.carregar_modelo()

resposta = agente.consultar("Quais os requisitos para dispensa de licitação?")

print(f"Tipo: {resposta['classificacao']['tipo']}")
for fund in resposta['fundamentacao']:
    print(f"• {fund}")
```

### Ingestão de Legislação

```python
# Ingerir URL da Lei 14.133/2021
agente.ingerir_documento(
    "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm"
)

# Ingerir arquivo local
agente.ingerir_documento("./leis/decreto_federal.pdf")
```

### Análise de Documentos

```python
analise = agente.analisar_documento("./edital_licitacao.pdf")

print(f"Título: {analise['metadados']['titulo']}")
print(f"Artigos: {analise['estatisticas']['total_artigos']}")
print(f"Entidades: {analise['entidades']}")
```

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENTE JURÍDICO ML                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Ingestão   │→ │ Processamento│→ │   Modelo     │      │
│  │  Documentos  │  │    NLP       │  │  TensorFlow  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         ↓                  ↓                  ↓             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Leis/Decretos│  │ Embeddings   │  │ Classificação│      │
│  │ Portarias    │  │ Similaridade │  │  Respostas   │      │
│  │ Regulamentos │  │  Busca       │  │  Consultas   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Estrutura do Projeto

```
agente-juridico-ml/
├── README.md              # Este arquivo
├── INSTALACAO.md          # Guia detalhado de instalação
├── requirements.txt       # Dependências Python
├── ingestor.py           # Módulo de ingestão e parsing
├── modelo_ml.py          # Modelos de ML e embeddings
├── agente.py             # Interface principal do agente
├── supabase_schema.sql   # Schema do banco de dados
├── .env.example          # Modelo de configuração
└── exemplos/
    ├── consulta.py       # Exemplo de consulta interativa
    ├── ingestao.py       # Exemplo de ingestão de documentos
    └── minuta-impugnacao-especificacao-restritiva.md  # Modelo copy-paste (revisão humana)
```

## Modelo de impugnação (especificação restritiva)

Caso âncora fitness (SAC / CATMAT 349951): ver [`exemplos/minuta-impugnacao-especificacao-restritiva.md`](./exemplos/minuta-impugnacao-especificacao-restritiva.md).

- Fundamentação só com artigos Planalto (14.133 Arts. 164, 9º I a, 41 I d; Dec. 10.024 Art. 24; 8.666 se regime antigo).
- **Não** é parecer jurídico; exige revisão humana antes de protocolar.
```

## 🎯 Legislação Alvo

### Federal
- Lei 14.133/2021 (Nova Lei de Licitações)
- Decretos regulamentadores
- Portarias do Ministério da Economia
- Instruções Normativas da SEGES

### Específica Fitness
- Normas técnicas ABNT para equipamentos
- Regulamentações do CONFEF
- Exigências de segurança e qualidade

## 🔧 Tecnologias

| Tecnologia | Versão | Finalidade |
|------------|--------|-----------|
| TensorFlow | 2.15+ | Modelos de deep learning |
| Transformers | 4.38+ | BERT jurídico |
| LangChain | 0.1+ | Orquestração de agente |
| Supabase | 2.4+ | Banco de dados + vetores |
| FastAPI | 0.110+ | API REST |
| SentenceTransformers | 2.3+ | Embeddings |

## 📖 Exemplos Prontos

Execute os exemplos incluídos:

```bash
# Consulta interativa
python exemplos/consulta.py

# Ingestão de legislação
python exemplos/ingestao.py
```

## 🚀 API REST

Para rodar a API:

```bash
uvicorn agente:app --reload --host 0.0.0.0 --port 8000
```

Endpoints disponíveis:
- `POST /consultar` - Realizar consulta jurídica
- `POST /analisar-documento` - Analisar documento
- `POST /comparar` - Comparar dois textos
- `GET /legislacao` - Listar legislação ingerida

## 📊 Casos de Uso

1. **Fornecedor**: "Quais documentos preciso para participar de pregão?"
2. **Gestor Público**: "Qual o limite para dispensa de licitação?"
3. **Advogado**: "Fundamente recurso contra inabilitação"
4. **Analista**: "Compare requisitos de equipamentos fitness"

## 🔍 Funcionalidades Avançadas

### Busca Semântica
Encontra legislação relacionada mesmo com termos diferentes:
- "dispensa de licitação" → encontra artigos sobre inexigibilidade
- "equipamento de academia" → encontra normas técnicas ABNT

### Extração de Entidades
Identifica automaticamente:
- Números de lei e decreto
- Datas de publicação
- Órgãos emissores
- Artigos e parágrafos

### Classificação de Consultas
Categoriza perguntas em:
- Licitação
- Equipamento
- Contrato
- Penalidade
- Recurso
- Compra direta

## ⚙️ Configuração do Supabase

1. Crie projeto em https://supabase.com
2. Habilite extensão `vector` em Database → Extensions
3. Execute o script `supabase_schema.sql` no SQL Editor
4. Copie credenciais para `.env`

## 🛠️ Troubleshooting

| Problema | Solução |
|----------|---------|
| Erro ao carregar modelo | Verifique conexão internet (download na 1ª vez) |
| CUDA out of memory | Use `CUDA_VISIBLE_DEVICES=-1` para CPU |
| Supabase não conecta | Confira URL e chave no `.env` |
| Import error tensorflow | `pip install --upgrade pip && pip install tensorflow` |

## 📚 Recursos Adicionais

- [Documentação TensorFlow](https://www.tensorflow.org/)
- [Hugging Face Transformers](https://huggingface.co/docs/transformers/)
- [Supabase Docs](https://supabase.com/docs)
- [Lei 14.133/2021](https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm)

## 🤝 Contribuição

1. Fork o projeto
2. Crie branch para feature (`git checkout -b feature/nova-feature`)
3. Commit mudanças (`git commit -m 'Adiciona nova feature'`)
4. Push para branch (`git push origin feature/nova-feature`)
5. Abra Pull Request

## 📄 Licença

Este projeto está sob licença MIT. Veja [LICENSE](LICENSE) para detalhes.

---

**LicitaGym** - IA para licitações de equipamentos fitness 🏋️‍♂️⚖️
