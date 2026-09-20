"""
Agente Jurídico LicitaGym - Interface Principal

Integra todos os módulos para fornecer:
- Consultas em linguagem natural
- Respostas fundamentadas em legislação
- Busca semântica
- Análise de documentos
"""

import os
from typing import List, Dict, Optional
from datetime import datetime

from loguru import logger
from dotenv import load_dotenv

from ingestor import IngestorLegislacao, TipoNormativo
from modelo_ml import ModeloJuridicoML, BancoVetorialLegislacao


class AgenteJuridico:
    """
    Agente Jurídico para consultas sobre legislação de licitações
    
    Uso:
        agente = AgenteJuridico()
        resposta = agente.consultar("Quais os requisitos para dispensa de licitação?")
    """
    
    def __init__(self):
        """Inicializar agente jurídico"""
        load_dotenv()
        
        # Configurar Supabase
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if not supabase_url or not supabase_key:
            logger.warning("Supabase não configurado. Funcionalidades limitadas.")
            self.supabase = None
            self.ingestor = None
        else:
            self.supabase = None  # Será inicializado no ingestor
            self.ingestor = IngestorLegislacao(supabase_url, supabase_key)
        
        # Inicializar modelo ML
        self.modelo_ml = ModeloJuridicoML()
        self.banco_vetorial = None
        
        logger.info("Agente Jurídico inicializado")
    
    def carregar_modelo(self):
        """Carregar modelos de ML (pode demorar)"""
        logger.info("Carregando modelos de ML...")
        self.modelo_ml.carregar_modelo()
        
        # Inicializar banco vetorial
        self.banco_vetorial = BancoVetorialLegislacao(
            self.modelo_ml, 
            self.supabase
        )
        
        logger.success("Modelos carregados com sucesso")
    
    def ingerir_documento(self, caminho: str) -> Optional[Dict]:
        """
        Ingerir um documento de legislação
        
        Args:
            caminho: Caminho do arquivo ou URL
            
        Returns:
            Resultado da ingestão
        """
        if not self.ingestor:
            logger.error("Ingestor não disponível")
            return None
        
        if caminho.startswith('http'):
            resultado = self.ingestor.ingerir_url(caminho)
        else:
            resultado = self.ingestor.ingerir_documento(caminho)
        
        # Indexar no banco vetorial
        if resultado and self.banco_vetorial:
            self.banco_vetorial.indexar_documento(
                doc_id=str(resultado['id']),
                texto=resultado.get('texto', ''),
                metadados=resultado
            )
        
        return resultado
    
    def consultar(self, pergunta: str, usar_embeddings: bool = True) -> Dict:
        """
        Realizar consulta jurídica
        
        Args:
            pergunta: Pergunta em linguagem natural
            usar_embeddings: Se deve usar busca semântica
            
        Returns:
            Resposta fundamentada
        """
        logger.info(f"Consulta recebida: {pergunta}")
        
        # Buscar legislação relevante
        documentos_relacionados = []
        
        if usar_embeddings and self.banco_vetorial:
            # Busca semântica
            documentos_relacionados = self.banco_vetorial.buscar_por_similaridade(
                consulta=pergunta,
                limite=10,
                threshold=0.6
            )
        elif self.ingestor:
            # Busca textual simples
            resultados = self.ingestor.buscar_legislacao(pergunta, limite=10)
            documentos_relacionados = resultados
        
        # Gerar resposta fundamentada
        resposta = self.modelo_ml.gerar_resposta_fundamentada(
            consulta=pergunta,
            documentos_relacionados=documentos_relacionados
        )
        
        # Adicionar metadados da resposta
        resposta['timestamp'] = datetime.now().isoformat()
        resposta['total_documentos'] = len(documentos_relacionados)
        
        logger.success("Consulta processada com sucesso")
        
        return resposta
    
    def analisar_documento(self, caminho: str) -> Dict:
        """
        Analisar um documento jurídico
        
        Args:
            caminho: Caminho do arquivo
            
        Returns:
            Análise completa do documento
        """
        if not self.ingestor:
            return {'erro': 'Ingestor não disponível'}
        
        # Fazer parsing
        from pathlib import Path
        from ingestor import ParserDocumento
        
        extensao = Path(caminho).suffix.lower()
        
        if extensao == '.pdf':
            texto = ParserDocumento.parse_pdf(caminho)
        elif extensao == '.docx':
            texto = ParserDocumento.parse_docx(caminho)
        elif extensao in ['.html', '.htm']:
            with open(caminho, 'r', encoding='utf-8') as f:
                texto = ParserDocumento.parse_html(f.read())
        else:
            return {'erro': f'Extensão não suportada: {extensao}'}
        
        # Extrair metadados
        from ingestor import ExtratorMetadados
        metadados = ExtratorMetadados.extrair(texto, caminho)
        
        if not metadados:
            return {'erro': 'Falha ao extrair metadados'}
        
        # Analisar com ML
        entidades = self.modelo_ml.extrair_entidades(texto)
        classificacao = self.modelo_ml.classificar_tipo_consulta(metadados.ementa)
        
        return {
            'metadados': metadados.to_dict(),
            'entidades': entidades,
            'classificacao': classificacao,
            'estatisticas': {
                'total_caracteres': len(texto),
                'total_palavras': len(texto.split()),
                'total_artigos': len(metadados.artigos) if metadados.artigos else 0
            }
        }
    
    def comparar_textos(self, texto1: str, texto2: str) -> Dict:
        """
        Comparar dois textos jurídicos
        
        Args:
            texto1: Primeiro texto
            texto2: Segundo texto
            
        Returns:
            Resultados da comparação
        """
        similaridade = self.modelo_ml.calcular_similaridade(texto1, texto2)
        
        return {
            'similaridade': similaridade,
            'interpretacao': self._interpretar_similaridade(similaridade),
            'entidades_texto1': self.modelo_ml.extrair_entidades(texto1),
            'entidades_texto2': self.modelo_ml.extrair_entidades(texto2)
        }
    
    def _interpretar_similaridade(self, score: float) -> str:
        """Interpretar score de similaridade"""
        if score >= 0.9:
            return "Muito alta - textos praticamente equivalentes"
        elif score >= 0.7:
            return "Alta - textos muito similares"
        elif score >= 0.5:
            return "Média - textos relacionados"
        elif score >= 0.3:
            return "Baixa - pouca relação"
        else:
            return "Muito baixa - textos distintos"
    
    def listar_legislacao(self, tipo: Optional[TipoNormativo] = None, limite: int = 50) -> List[Dict]:
        """
        Listar legislação ingerida
        
        Args:
            tipo: Filtrar por tipo normativo
            limite: Número máximo de resultados
            
        Returns:
            Lista de documentos
        """
        if not self.ingestor:
            return []
        
        return self.ingestor.listar_todos(tipo=tipo, limite=limite)
    
    def sugerir_legislacao_relacionada(self, contexto: str) -> List[Dict]:
        """
        Sugerir legislação relacionada a um contexto
        
        Args:
            contexto: Descrição do contexto
            
        Returns:
            Lista de legislação sugerida
        """
        if not self.banco_vetorial:
            return []
        
        return self.banco_vetorial.buscar_por_similaridade(
            consulta=contexto,
            limite=10,
            threshold=0.5
        )


# API FastAPI (opcional)
def criar_api():
    """Criar API FastAPI para o agente"""
    try:
        from fastapi import FastAPI, HTTPException
        from pydantic import BaseModel
        from typing import Optional
        
        app = FastAPI(
            title="Agente Jurídico LicitaGym",
            description="API para consultas jurídicas sobre legislação de licitações",
            version="1.0.0"
        )
        
        agente = AgenteJuridico()
        
        class ConsultaRequest(BaseModel):
            pergunta: str
            usar_embeddings: bool = True
        
        class DocumentoRequest(BaseModel):
            caminho: str
        
        class ComparacaoRequest(BaseModel):
            texto1: str
            texto2: str
        
        @app.on_event("startup")
        async def startup():
            agente.carregar_modelo()
        
        @app.post("/consultar")
        async def consultar(request: ConsultaRequest):
            try:
                resposta = agente.consultar(
                    request.pergunta,
                    request.usar_embeddings
                )
                return {"sucesso": True, "dados": resposta}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @app.post("/analisar-documento")
        async def analisar_documento(request: DocumentoRequest):
            try:
                resultado = agente.analisar_documento(request.caminho)
                return {"sucesso": True, "dados": resultado}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @app.post("/comparar")
        async def comparar(request: ComparacaoRequest):
            try:
                resultado = agente.comparar_textos(request.texto1, request.texto2)
                return {"sucesso": True, "dados": resultado}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @app.get("/legislacao")
        async def listar_legislacao(tipo: Optional[str] = None, limite: int = 50):
            try:
                tipo_enum = TipoNormativo(tipo) if tipo else None
                resultados = agente.listar_legislacao(tipo=tipo_enum, limite=limite)
                return {"sucesso": True, "dados": resultados}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        return app
        
    except ImportError:
        logger.warning("FastAPI não disponível. API REST não será criada.")
        return None


# Exemplo de uso
if __name__ == "__main__":
    # Criar agente
    agente = AgenteJuridico()
    
    # Carregar modelo (pode demorar na primeira vez)
    print("Carregando modelos...")
    agente.carregar_modelo()
    
    # Exemplo de consulta
    print("\n=== EXEMPLO DE CONSULTA ===")
    pergunta = "Quais são os requisitos para dispensa de licitação?"
    print(f"Pergunta: {pergunta}")
    
    resposta = agente.consultar(pergunta)
    
    print(f"\nClassificação: {resposta['classificacao']['tipo']}")
    print(f"Documentos encontrados: {resposta['total_documentos']}")
    print(f"\nFundamentação:")
    for fund in resposta['fundamentacao'][:3]:
        print(f"  • {fund}")
    
    print(f"\nRecomendações:")
    for rec in resposta['recomendacoes']:
        print(f"  • {rec}")
    
    # Se quiser rodar a API:
    # uvicorn agente:app --reload --host 0.0.0.0 --port 8000
