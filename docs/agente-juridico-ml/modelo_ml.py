"""
Modelo de Machine Learning para Agente Jurídico LicitaGym

Responsável por:
- Geração de embeddings de textos jurídicos (SentenceTransformers; TF removido do hot path)
- Similaridade semântica
- Classificação de consultas (regras/keywords — não é rede neural)
- Respostas fundamentadas (templates)

Fases ONNX/TensorRT: ver PLAN.md. Nsight DL Designer = lab, não runtime.
"""

import os
import re
import json
import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

from sklearn.metrics.pairwise import cosine_similarity
from loguru import logger

from embeddings_backend import (
    EmbeddingBackend,
    SentenceTransformerBackend,
    create_default_backend,
    DEFAULT_EMBEDDING_MODEL,
)


@dataclass
class EmbeddingResult:
    """Resultado de embedding"""
    texto: str
    embedding: np.ndarray
    metadados: Optional[Dict] = None


class ModeloJuridicoML:
    """Modelo de ML para processamento jurídico"""
    
    def __init__(
        self,
        modelo_nome: str = DEFAULT_EMBEDDING_MODEL,
        embedding_backend: Optional[EmbeddingBackend] = None,
        normalize_embeddings: bool = True,
    ):
        """
        Inicializar modelo
        
        Args:
            modelo_nome: Nome do modelo SentenceTransformers (hot path)
            embedding_backend: Backend opcional (ST hoje; ONNX/TRT nas fases 2–3)
            normalize_embeddings: L2-normalize (manter igual ao índice pgvector)
        """
        self.modelo_nome = modelo_nome
        self.normalize_embeddings = normalize_embeddings
        self.embedding_backend: Optional[EmbeddingBackend] = embedding_backend
        # Compat: campos antigos deixam de carregar TF
        self.tokenizer = None
        self.modelo = None
        self.embedding_model = None
        
        logger.info(f"Inicializando ModeloJuridicoML (embeddings={modelo_nome})")
    
    def carregar_modelo(self):
        """Carregar backend de embeddings (SentenceTransformers por padrão)."""
        try:
            if self.embedding_backend is None:
                self.embedding_backend = create_default_backend(
                    model_name=self.modelo_nome,
                    normalize=self.normalize_embeddings,
                )
            self.embedding_backend.load()
            # Expor handle ST se o backend for SentenceTransformerBackend
            self.embedding_model = getattr(self.embedding_backend, "_model", None)
            logger.success(
                f"Backend de embeddings carregado "
                f"(dim={self.embedding_backend.dimension}, normalize={self.normalize_embeddings})"
            )
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
        if self.embedding_backend is None:
            self.carregar_modelo()
        return self.embedding_backend.encode([texto])[0]
    
    def gerar_embeddings_lote(self, textos: List[str]) -> np.ndarray:
        """
        Gerar embeddings para múltiplos textos
        
        Args:
            textos: Lista de textos
            
        Returns:
            Matriz de embeddings
        """
        if self.embedding_backend is None:
            self.carregar_modelo()
        return self.embedding_backend.encode(textos)
    
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
            'licitacao': ['licitação', 'licitacao', 'licitar', 'licitante', 'pregão', 'pregao', 'concorrência', 'concorrencia', 'edital', 'proposta', 'candidatar', 'habilitação', 'habilitacao', 'pncp'],
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
    

    @staticmethod
    def _intent_participacao(pergunta: str) -> bool:
        q = (pergunta or "").lower()
        return any(k in q for k in (
            "candidat", "habilit", "particip", "proposta", "credenc",
            "inscrev", "como entra", "como disput", "como licit",
        ))

    @staticmethod
    def _expandir_consulta_busca(consulta: str) -> str:
        """Enriquece o texto embbedado para puxar chunks de habilitação/proposta."""
        base = (consulta or "").strip()
        if not base:
            return base
        if ModeloJuridicoML._intent_participacao(base):
            return (
                f"{base}. "
                "habilitação jurídica regularidade fiscal trabalhista técnica "
                "documentos de habilitação proposta comercial participação "
                "licitante Art. 62 Art. 63 Art. 64 Art. 65 Art. 66 Art. 67"
            )
        q = base.lower()
        if any(k in q for k in ("licit", "preg", "edital", "contrat", "pncp")):
            return f"{base}. lei 14.133 licitação contratos administrativos"
        return base

    @staticmethod
    def _priorizar_hits_licitacao(hits, pergunta: str):
        """Rebaixa ruído; favorece artigos de habilitação/proposta/participação."""
        q = (pergunta or "").lower()
        focada = any(k in q for k in (
            "licit", "contrat", "preg", "edital", "pncp", "habilit", "candidat",
            "proposta", "particip",
        ))
        intent_part = ModeloJuridicoML._intent_participacao(pergunta)
        arts_habilita = {str(n) for n in range(62, 71)}
        ranked = []
        for h in hits or []:
            meta = h.get("metadados") if isinstance(h.get("metadados"), dict) else {}
            art_raw = str(meta.get("artigo") or h.get("artigo") or "")
            m_art = re.search(r"(\d+)", art_raw)
            art_num = m_art.group(1) if m_art else ""
            blob = " ".join([
                str(h.get("titulo") or ""),
                str(meta.get("titulo") or ""),
                str(h.get("numero") or ""),
                str(h.get("tipo") or ""),
                art_raw,
                str(h.get("trecho") or h.get("texto_resumo") or "")[:800],
            ]).upper()
            score = float(h.get("similaridade") or h.get("score") or 0.5)

            if focada and ("PORTARIA DE PESSOAL" in blob or " DE PESSOAL " in f" {blob} "):
                continue
            # chrome / overview fraco
            if "VISÃO GERAL" in blob or "VISAO GERAL" in blob:
                score -= 0.08
            if "DOU - IMPRENSA" in blob or "IR PARA O CONTE" in blob:
                score -= 0.1
            if "REGIMENTO INTERNO" in blob:
                score -= 0.06

            if "14.133" in blob or (str(h.get("numero") or meta.get("numero") or "") == "14.133"):
                score += 0.06
            if any(x in blob for x in ("HABILITA", "PROPOSTA", "PARTICIPA", "LICITANTE", "DOCUMENTOS")):
                score += 0.1
            if art_num in arts_habilita:
                score += 0.22 if intent_part else 0.12
            if intent_part and art_num in {"17", "18", "19"}:
                # fases/competências: úteis, mas abaixo da habilitação
                score += 0.02
            if intent_part and art_num in {"74", "75"}:
                # inexigibilidade/dispensa: só se a pergunta for sobre isso
                if not any(k in q for k in ("inexig", "dispensa", "compra direta")):
                    score -= 0.08
            if focada and any(x in blob for x in ("LEI ", "DECRETO Nº", "DECRETO N")):
                score += 0.03

            ranked.append((score, h))
        ranked.sort(key=lambda x: -x[0])
        out = [h for _, h in ranked]
        if intent_part and out:
            prefer, rest = [], []
            for h in out:
                meta = h.get("metadados") if isinstance(h.get("metadados"), dict) else {}
                art_raw = str(meta.get("artigo") or h.get("artigo") or "")
                m = re.search(r"(\d+)", art_raw)
                n = m.group(1) if m else ""
                if n in arts_habilita:
                    prefer.append(h)
                else:
                    rest.append(h)
            # até 4 slots de habilitação, depois o restante
            out = prefer[:4] + rest
        return out

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
        
        documentos_relacionados = self._priorizar_hits_licitacao(documentos_relacionados, consulta)

        # Processar documentos relacionados (RPC hits trazem texto_resumo/texto/trecho)
        for doc in documentos_relacionados[:5]:
            meta = doc.get('metadados') or {}
            if not isinstance(meta, dict):
                meta = {}
            titulo = doc.get('titulo') or meta.get('titulo') or 'N/A'
            tipo = doc.get('tipo') or meta.get('tipo') or 'N/A'
            numero = doc.get('numero') or meta.get('numero') or 'N/A'
            ano = doc.get('ano') if doc.get('ano') is not None else meta.get('ano')
            if ano is None or ano == '':
                ano = 'N/A'
            trecho = (
                doc.get('trecho')
                or doc.get('texto_resumo')
                or doc.get('texto')
                or doc.get('ementa')
                or meta.get('ementa')
                or ''
            )
            # Drop navigational / chrome noise from PNCP / Planalto
            trecho_limpo = ' '.join(
                ln.strip()
                for ln in str(trecho).splitlines()
                if ln.strip()
                and ln.strip() not in {
                    'Presidência da República',
                    'Mensagem de veto',
                    'Regulamento',
                    'Vigência',
                    'L14133',
                    'D10764',
                    'Ir para o conteúdo',
                    'Ir para a navegação',
                    'Ir para a busca',
                    'Ir para o rodapé',
                    'Botão Menu',
                    'Sobre o PNCP',
                    'Você precisa habilitar o JavaScript para o funcionamento correto.',
                }
                and not ln.strip().startswith('Ir para ')
            )
            citacao = {
                'titulo': titulo,
                'tipo': tipo,
                'numero': numero,
                'ano': ano,
                'trecho_relevante': trecho_limpo[:400],
                'artigo': meta.get('artigo') or doc.get('artigo'),
                'similaridade': doc.get('similaridade'),
            }
            resposta['documentos_citados'].append(citacao)

            art_lbl = f" ({citacao['artigo']})" if citacao.get('artigo') else ''
            resposta['fundamentacao'].append(
                f"Conforme {citacao['tipo']} nº {citacao['numero']}/{citacao['ano']}{art_lbl}: "
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
        
        if resposta['fundamentacao']:
            resposta['resposta'] = (
                "Com base na legislação disponível, estes são os dispositivos mais próximos da sua pergunta."
            )
        else:
            resposta['resposta'] = (
                "Não encontrei trechos específicos nesta base para esta pergunta. "
                "Tente reformular com termos da Lei 14.133 (habilitação, pregão, dispensa, etc.)."
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
                    'documento_id': int(doc_id) if str(doc_id).isdigit() else doc_id,
                    'embedding': embedding.tolist(),
                    'texto_resumo': texto[:2000],
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
    
    def _hit_from_meta(self, documento_id, similaridade, resumo, meta) -> Dict:
        if not isinstance(meta, dict):
            meta = {}
        resumo = resumo or ''
        return {
            'documento_id': documento_id,
            'similaridade': float(similaridade),
            'texto': resumo,
            'texto_resumo': resumo,
            'trecho': resumo,
            'metadados': meta,
            'titulo': meta.get('titulo'),
            'tipo': meta.get('tipo'),
            'numero': meta.get('numero'),
            'ano': meta.get('ano'),
            'ementa': meta.get('ementa'),
            'artigo': meta.get('artigo'),
        }

    def _buscar_exato_supabase(
        self,
        embedding_consulta: np.ndarray,
        limite: int,
        threshold: float,
    ) -> List[Dict]:
        """Exact cosine over all rows — reliable for small corpora (IVFFlat misses)."""
        resp = (
            self.supabase.table('legislacao_embeddings')
            .select('documento_id,embedding,texto_resumo,metadados')
            .execute()
        )
        rows = resp.data or []
        if not rows:
            return []
        q = np.asarray(embedding_consulta, dtype=np.float32).reshape(1, -1)
        resultados = []
        for r in rows:
            emb = r.get('embedding')
            if emb is None:
                continue
            if isinstance(emb, str):
                # pgvector sometimes serialized as string
                emb = json.loads(emb)
            v = np.asarray(emb, dtype=np.float32).reshape(1, -1)
            sim = float(cosine_similarity(q, v)[0][0])
            if sim >= threshold:
                resultados.append(
                    self._hit_from_meta(
                        r.get('documento_id'),
                        sim,
                        r.get('texto_resumo') or '',
                        r.get('metadados') or {},
                    )
                )
        resultados.sort(key=lambda x: x['similaridade'], reverse=True)
        return resultados[:limite]



    @staticmethod
    def _mesclar_hits(base: List[Dict], extra: List[Dict], limite: int) -> List[Dict]:
        seen = set()
        out = []
        for h in list(extra or []) + list(base or []):
            meta = h.get("metadados") if isinstance(h.get("metadados"), dict) else {}
            key = (
                str(h.get("id") or h.get("documento_id") or ""),
                str(meta.get("artigo") or h.get("artigo") or ""),
                (h.get("trecho") or h.get("texto_resumo") or "")[:80],
            )
            if key in seen:
                continue
            seen.add(key)
            out.append(h)
        out.sort(key=lambda x: -float(x.get("similaridade") or 0))
        return out[: max(limite, 25)]

    def _artigos_habilitacao_lei(self, embedding_consulta, limite: int = 8) -> List[Dict]:
        """Garante chunks Arts. 62–70 da Lei 14.133 no pool de participação."""
        if not self.supabase:
            return []
        wanted = {str(n) for n in range(62, 71)}
        try:
            # Não seleciona embedding (vector) — só metadados/texto; score fixo alto
            resp = (
                self.supabase.table("legislacao_embeddings")
                .select("documento_id,texto_resumo,metadados")
                .eq("documento_id", 2)
                .execute()
            )
        except Exception as e:
            logger.warning(f"fetch arts habilitacao: {e}")
            return []
        scored = []
        for r in resp.data or []:
            meta = r.get("metadados") or {}
            if not isinstance(meta, dict):
                meta = {}
            art = str(meta.get("artigo") or "")
            mnum = re.search(r"(\d+)", art)
            if not mnum or mnum.group(1) not in wanted:
                continue
            n = int(mnum.group(1))
            # score alto e estável; 62 um pouco acima (definição de habilitação)
            sim = 0.97 - (n - 62) * 0.001
            scored.append(
                self._hit_from_meta(
                    r.get("documento_id"),
                    sim,
                    r.get("texto_resumo") or "",
                    meta,
                )
            )
        scored.sort(key=lambda x: -x.get("similaridade", 0))
        return scored[:limite]


    def buscar_por_similaridade(
        self, 
        consulta: str, 
        limite: int = 10,
        threshold: float = 0.7
    ) -> List[Dict]:
        """
        Buscar documentos por similaridade semântica.
        Preferência: exact scan no Supabase quando o corpus e pequeno
        (IVFFlat/pgvector RPC pode omitir vizinhos apos bulk insert).
        Fallback: RPC match_legislacao_embeddings, depois cache local.
        """
        consulta_busca = self.modelo_ml._expandir_consulta_busca(consulta)
        embedding_consulta = self.modelo_ml.gerar_embedding(consulta_busca)
        intent_part = self.modelo_ml._intent_participacao(consulta)

        if self.supabase:
            # Prefer RPC (HNSW/IVFFlat). Exact scan only as fallback.
            try:
                resp = self.supabase.rpc(
                    'match_legislacao_embeddings',
                    {
                        'query_embedding': embedding_consulta.tolist(),
                        'match_threshold': threshold,
                        'match_count': max(limite, 50),
                    },
                ).execute()
                rows = resp.data or []
                out = [
                    self._hit_from_meta(
                        r.get('documento_id'),
                        r.get('similaridade', 0),
                        r.get('texto_resumo') or '',
                        r.get('metadados') or {},
                    )
                    for r in rows
                ]
                if intent_part:
                    extra = self._artigos_habilitacao_lei(embedding_consulta)
                    out = self._mesclar_hits(out, extra, limite)
                if out:
                    return out[: max(limite, 25)]
            except Exception as e:
                logger.warning(
                    f"RPC match_legislacao_embeddings falhou; tentando exact scan: {e}"
                )

            try:
                exact = self._buscar_exato_supabase(
                    embedding_consulta, limite=limite, threshold=threshold
                )
                if exact:
                    if intent_part:
                        extra = self._artigos_habilitacao_lei(embedding_consulta)
                        exact = self._mesclar_hits(exact, extra, limite)
                    return exact
            except Exception as e:
                logger.warning(f"Exact embedding scan falhou; fallback cache local: {e}")

        resultados = []
        for doc_id, dados in self.embeddings_cache.items():
            similaridade = cosine_similarity(
                [embedding_consulta],
                [dados['embedding']],
            )[0][0]
            if similaridade >= threshold:
                meta = dados.get('metadados') or {}
                resultados.append(
                    self._hit_from_meta(
                        doc_id,
                        similaridade,
                        dados.get('texto') or '',
                        meta,
                    )
                )
        resultados.sort(key=lambda x: x['similaridade'], reverse=True)
        return resultados[:limite]
    
    def remover_documento(self, doc_id: str):
        """Remover documento do índice (cache local + linhas no Supabase)."""
        key = str(doc_id)
        if key in self.embeddings_cache:
            del self.embeddings_cache[key]
        # Also try int key used by some callers
        if doc_id in self.embeddings_cache:
            del self.embeddings_cache[doc_id]
        if self.supabase:
            try:
                did = int(doc_id) if str(doc_id).isdigit() else doc_id
                self.supabase.table('legislacao_embeddings').delete().eq(
                    'documento_id', did
                ).execute()
                logger.info(f"Embeddings do documento {doc_id} removidos do Supabase")
            except Exception as e:
                logger.error(f"Erro ao remover embeddings {doc_id}: {e}")
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
