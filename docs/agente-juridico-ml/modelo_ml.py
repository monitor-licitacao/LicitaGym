"""
Modelo de Machine Learning para Agente Jurídico LicitaGym

Responsável por:
- Geração de embeddings de textos jurídicos
- Similaridade semântica
- Classificação de consultas
- Respostas fundamentadas
"""

import os
import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

import tensorflow as tf
from transformers import AutoTokenizer, TFAutoModel
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from loguru import logger


@dataclass
class EmbeddingResult:
    """Resultado de embedding"""
    texto: str
    embedding: np.ndarray
    metadados: Optional[Dict] = None


class ModeloJuridicoML:
    """Modelo de ML para processamento jurídico"""
    
    def __init__(self, modelo_nome: str = "neuralmind/bert-base-portuguese-cased"):
        """
        Inicializar modelo
        
        Args:
            modelo_nome: Nome do modelo Hugging Face
        """
        self.modelo_nome = modelo_nome
        self.tokenizer = None
        self.modelo = None
        self.embedding_model = None
        
        logger.info(f"Inicializando modelo: {modelo_nome}")
    
    def carregar_modelo(self):
        """Carregar modelo e tokenizer"""
        try:
            # Carregar tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(self.modelo_nome)
            
            # Carregar modelo TensorFlow
            self.modelo = TFAutoModel.from_pretrained(self.modelo_nome)
            
            # Carregar modelo de embeddings especializado
            self.embedding_model = SentenceTransformer(
                'pierreguillou/bert-base-cased-squad-v1.1-portuguese'
            )
            
            logger.success("Modelo carregado com sucesso")
            
        except Exception as e:
            logger.error(f"Erro ao carregar modelo: {e}")
            raise
    
    def gerar_embedding(self, texto: str) -> np.ndarray:
        """
        Gerar embedding para um texto
        
        Args:
            texto: Texto para embeddar
            
        Returns:
            Vetor de embedding
        """
        if not self.embedding_model:
            self.carregar_modelo()
        
        embedding = self.embedding_model.encode(texto)
        return embedding
    
    def gerar_embeddings_lote(self, textos: List[str]) -> np.ndarray:
        """
        Gerar embeddings para múltiplos textos
        
        Args:
            textos: Lista de textos
            
        Returns:
            Matriz de embeddings
        """
        if not self.embedding_model:
            self.carregar_modelo()
        
        embeddings = self.embedding_model.encode(textos)
        return embeddings
    
    def calcular_similaridade(self, texto1: str, texto2: str) -> float:
        """
        Calcular similaridade entre dois textos
        
        Args:
            texto1: Primeiro texto
            texto2: Segundo texto
            
        Returns:
            Score de similaridade (0-1)
        """
        emb1 = self.gerar_embedding(texto1)
        emb2 = self.gerar_embedding(texto2)
        
        similaridade = cosine_similarity([emb1], [emb2])[0][0]
        return float(similaridade)
    
    def buscar_similares(
        self, 
        consulta: str, 
        documentos: List[str], 
        embeddings_documentos: np.ndarray,
        top_k: int = 5
    ) -> List[Tuple[int, float]]:
        """
        Buscar documentos mais similares à consulta
        
        Args:
            consulta: Texto da consulta
            documentos: Lista de documentos
            embeddings_documentos: Embeddings dos documentos
            top_k: Número de resultados
            
        Returns:
            Lista de (índice, score) ordenada por similaridade
        """
        embedding_consulta = self.gerar_embedding(consulta)
        
        similaridades = cosine_similarity([embedding_consulta], embeddings_documentos)[0]
        
        # Obter índices dos top_k mais similares
        indices_top = np.argsort(similaridades)[::-1][:top_k]
        
        resultados = [(int(idx), float(similaridades[idx])) for idx in indices_top]
        
        return resultados
    
    def classificar_tipo_consulta(self, consulta: str) -> Dict:
        """
        Classificar o tipo de consulta jurídica
        
        Args:
            consulta: Texto da consulta
            
        Returns:
            Dicionário com classificação
        """
        consulta_lower = consulta.lower()
        
        classificacao = {
            'tipo': 'geral',
            'confianca': 0.0,
            'palavras_chave': [],
            'artigos_sugeridos': []
        }
        
        # Padrões de classificação
        padroes = {
            'licitacao': ['licitação', 'pregão', 'concorrência', 'edital', 'proposta'],
            'equipamento': ['equipamento', 'máquina', 'aparelho', 'fitness', 'academia'],
            'contrato': ['contrato', 'contratação', 'ajuste', 'convênio'],
            'penalidade': ['penalidade', 'sanção', 'multa', 'suspensão', 'impedimento'],
            'recurso': ['recurso', 'apelação', 'impugnação', 'contestação'],
            'compra_direta': ['dispensa', 'inexigibilidade', 'compra direta'],
        }
        
        palavras_encontradas = []
        tipo_detectado = 'geral'
        max_count = 0
        
        for tipo, palavras in padroes.items():
            count = sum(1 for p in palavras if p in consulta_lower)
            if count > max_count:
                max_count = count
                tipo_detectado = tipo
                palavras_encontradas = [p for p in palavras if p in consulta_lower]
        
        classificacao['tipo'] = tipo_detectado
        classificacao['palavras_chave'] = palavras_encontradas
        classificacao['confianca'] = min(max_count / 3.0, 1.0)  # Normalizar
        
        return classificacao
    
    def extrair_entidades(self, texto: str) -> Dict:
        """
        Extrair entidades jurídicas do texto
        
        Args:
            texto: Texto para análise
            
        Returns:
            Dicionário com entidades encontradas
        """
        entidades = {
            'numeros_lei': [],
            'datas': [],
            'orgaos': [],
            'valores': [],
            'artigos': []
        }
        
        import re
        
        # Extrair números de lei
        leis = re.findall(r'Lei\s*[ºn]?\.?\s*\d+[,\d]*\s+de\s+\d{4}', texto, re.IGNORECASE)
        entidades['numeros_lei'] = leis
        
        # Extrair datas
        datas = re.findall(r'\d{1,2}\s+de\s+\w+\s+de\s+\d{4}', texto, re.IGNORECASE)
        entidades['datas'] = datas
        
        # Extrair artigos
        artigos = re.findall(r'Art\.\s*\d+[ºo]?.*?(?=Art\.|$)', texto, re.IGNORECASE | re.DOTALL)
        entidades['artigos'] = [a.strip()[:200] for a in artigos[:10]]
        
        # Extrair órgãos
        orgaos_padroes = [
            r'Ministério\s+da\s+\w+',
            r'Secretaria\s+de\s+\w+',
            r'Tribunal\s+de\s+\w+',
            r'Prefeitura\s+(?:Municipal\s+)?de\s+\w+'
        ]
        
        for padrao in orgaos_padroes:
            matches = re.findall(padrao, texto, re.IGNORECASE)
            entidades['orgaos'].extend(matches)
        
        return entidades
    
    def gerar_resposta_fundamentada(
        self,
        consulta: str,
        documentos_relacionados: List[Dict],
        contexto_adicional: Optional[str] = None
    ) -> Dict:
        """
        Gerar resposta fundamentada para consulta jurídica
        
        Args:
            consulta: Consulta do usuário
            documentos_relacionados: Documentos relevantes encontrados
            contexto_adicional: Contexto extra
            
        Returns:
            Resposta estruturada
        """
        # Classificar consulta
        classificacao = self.classificar_tipo_consulta(consulta)
        
        # Extrair entidades da consulta
        entidades_consulta = self.extrair_entidades(consulta)
        
        # Construir resposta
        resposta = {
            'consulta': consulta,
            'classificacao': classificacao,
            'entidades': entidades_consulta,
            'fundamentacao': [],
            'documentos_citados': [],
            'recomendacoes': []
        }
        
        # Processar documentos relacionados
        for doc in documentos_relacionados[:5]:
            citacao = {
                'titulo': doc.get('titulo', 'N/A'),
                'tipo': doc.get('tipo', 'N/A'),
                'numero': doc.get('numero', 'N/A'),
                'ano': doc.get('ano', 'N/A'),
                'trecho_relevante': doc.get('ementa', '')[:200]
            }
            resposta['documentos_citados'].append(citacao)
            
            resposta['fundamentacao'].append(
                f"Conforme {citacao['tipo']} nº {citacao['numero']}/{citacao['ano']}: "
                f"{citacao['trecho_relevante']}"
            )
        
        # Gerar recomendações baseadas na classificação
        if classificacao['tipo'] == 'licitacao':
            resposta['recomendacoes'].append(
                "Verifique o edital completo e seus anexos técnicos."
            )
            resposta['recomendacoes'].append(
                "Confira os requisitos de habilitação jurídica e técnica."
            )
        elif classificacao['tipo'] == 'equipamento':
            resposta['recomendacoes'].append(
                "Valide as normas técnicas ABNT aplicáveis aos equipamentos."
            )
            resposta['recomendacoes'].append(
                "Verifique certificações obrigatórias (INMETRO, etc.)."
            )
        
        return resposta


class BancoVetorialLegislacao:
    """Gerenciador de banco vetorial para legislação"""
    
    def __init__(self, modelo_ml: ModeloJuridicoML, supabase_client=None):
        """
        Inicializar banco vetorial
        
        Args:
            modelo_ml: Instância do modelo de ML
            supabase_client: Cliente Supabase
        """
        self.modelo_ml = modelo_ml
        self.supabase = supabase_client
        self.embeddings_cache = {}
        
        logger.info("Banco Vetorial inicializado")
    
    def indexar_documento(self, doc_id: str, texto: str, metadados: Dict):
        """
        Indexar documento no banco vetorial
        
        Args:
            doc_id: ID do documento
            texto: Texto completo
            metadados: Metadados do documento
        """
        # Gerar embedding
        embedding = self.modelo_ml.gerar_embedding(texto)
        
        # Armazenar no Supabase (se disponível)
        if self.supabase:
            try:
                self.supabase.table('legislacao_embeddings').insert({
                    'documento_id': doc_id,
                    'embedding': embedding.tolist(),
                    'texto_resumo': texto[:1000],
                    'metadados': metadados
                }).execute()
                
                logger.success(f"Documento {doc_id} indexado")
                
            except Exception as e:
                logger.error(f"Erro ao indexar: {e}")
        
        # Cache local
        self.embeddings_cache[doc_id] = {
            'embedding': embedding,
            'texto': texto,
            'metadados': metadados
        }
    
    def buscar_por_similaridade(
        self, 
        consulta: str, 
        limite: int = 10,
        threshold: float = 0.7
    ) -> List[Dict]:
        """
        Buscar documentos por similaridade semântica
        
        Args:
            consulta: Texto da consulta
            limite: Número máximo de resultados
            threshold: Limiar mínimo de similaridade
            
        Returns:
            Lista de documentos similares
        """
        # Gerar embedding da consulta
        embedding_consulta = self.modelo_ml.gerar_embedding(consulta)
        
        resultados = []
        
        # Buscar no cache local
        for doc_id, dados in self.embeddings_cache.items():
            similaridade = cosine_similarity(
                [embedding_consulta], 
                [dados['embedding']]
            )[0][0]
            
            if similaridade >= threshold:
                resultados.append({
                    'documento_id': doc_id,
                    'similaridade': float(similaridade),
                    'texto': dados['texto'],
                    'metadados': dados['metadados']
                })
        
        # Ordenar por similaridade
        resultados.sort(key=lambda x: x['similaridade'], reverse=True)
        
        return resultados[:limite]
    
    def remover_documento(self, doc_id: str):
        """Remover documento do índice"""
        if doc_id in self.embeddings_cache:
            del self.embeddings_cache[doc_id]
            logger.info(f"Documento {doc_id} removido do cache")


# Exemplo de uso
if __name__ == "__main__":
    from dotenv import load_dotenv
    
    load_dotenv()
    
    # Inicializar modelo
    modelo = ModeloJuridicoML()
    modelo.carregar_modelo()
    
    # Testar similaridade
    texto1 = "A licitação deve seguir o princípio da isonomia"
    texto2 = "É necessário garantir igualdade entre os licitantes"
    
    similaridade = modelo.calcular_similaridade(texto1, texto2)
    print(f"Similaridade: {similaridade:.2%}")
    
    # Classificar consulta
    consulta = "Quais os requisitos para dispensa de licitação?"
    classificacao = modelo.classificar_tipo_consulta(consulta)
    print(f"Classificação: {classificacao}")
    
    # Extrair entidades
    exemplo = "Conforme a Lei 14.133 de 1º de abril de 2021, Art. 75..."
    entidades = modelo.extrair_entidades(exemplo)
    print(f"Entidades: {entidades}")
    
    logger.info("Modelo ML pronto para uso")
