"""
Módulo de Ingestão de Legislação para Agente Jurídico LicitaGym

Responsável por:
- Coleta de leis, decretos, portarias e regulamentos
- Parsing de documentos (PDF, DOCX, HTML)
- Extração de metadados
- Armazenamento estruturado no Supabase
"""

import os
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum

import requests
from bs4 import BeautifulSoup
from PyPDF2 import PdfReader
from docx import Document
from loguru import logger
from supabase import create_client, Client


class TipoNormativo(Enum):
    LEI = "lei"
    DECRETO = "decreto"
    PORTARIA = "portaria"
    INSTRUCAO_NORMATIVA = "instrucao_normativa"
    RESOLUCAO = "resolucao"
    MEDIDA_PROVISORIA = "medida_provisoria"
    EMENDA_CONSTITUCIONAL = "emenda_constitucional"
    OUTRO = "outro"


@dataclass
class MetadadosLegislacao:
    """Metadados de um documento legislativo"""
    titulo: str
    numero: str
    ano: int
    data_publicacao: datetime
    orgao_emissor: str
    tipo: TipoNormativo
    ementa: str
    texto_completo: str
    url_origem: str
    tags: List[str]
    esfera: str  # federal, estadual, municipal
    uf: Optional[str] = None
    municipio: Optional[str] = None
    palavras_chave: List[str] = None
    artigos: List[Dict] = None
    id_supabase: Optional[str] = None
    
    def to_dict(self) -> Dict:
        """Converter para dicionário serializável"""
        data = asdict(self)
        data['tipo'] = self.tipo.value
        if self.data_publicacao:
            data['data_publicacao'] = self.data_publicacao.isoformat()
        return data


class ParserDocumento:
    """Parser para diferentes formatos de documentos"""
    
    @staticmethod
    def parse_pdf(caminho: str) -> str:
        """Extrair texto de PDF"""
        try:
            reader = PdfReader(caminho)
            texto = ""
            for page in reader.pages:
                texto += page.extract_text() + "\n"
            return texto.strip()
        except Exception as e:
            logger.error(f"Erro ao parsear PDF {caminho}: {e}")
            return ""
    
    @staticmethod
    def parse_docx(caminho: str) -> str:
        """Extrair texto de DOCX"""
        try:
            doc = Document(caminho)
            texto = "\n".join([para.text for para in doc.paragraphs])
            return texto.strip()
        except Exception as e:
            logger.error(f"Erro ao parsear DOCX {caminho}: {e}")
            return ""
    
    @staticmethod
    def _drop_chrome_lines(texto: str) -> str:
        """Remove linhas de chrome Planalto/PNCP que poluem embeddings."""
        drop_exact = {
            "Presidência da República",
            "Mensagem de veto",
            "Regulamento",
            "Vigência",
            "L14133",
            "D10764",
            "Secretaria-Geral",
            "Subchefia para Assuntos Jurídicos",
            "Assuntos Jurídicos",
            "Promulgação partes vetadas",
            'Acessibilidade',
            'Acesso rápido',
            'Acesso à Informação',
            'Acesso à informação',
            'Botão Menu',
            'Compartilhe :',
            'Ir para a busca',
            'Ir para a navegação',
            'Ir para o conteúdo',
            'Ir para o rodapé',
            'Legislação',
            'Links de compartilhamento em redes sociais',
            'Mudar para o modo de alto contraste',
            'Portal Gov.br',
            'Portarias',
            'Sobre o PNCP',
            'Você precisa habilitar o JavaScript para o funcionamento correto.',
            'Órgãos do Governo'
        }
        drop_re = re.compile(
            r"^(Presidência da República|Mensagem de\s*veto|Regulamento|Vigência|"
            r"L\d+|D\d+|Secretaria-Geral|Subchefia.*|Promulgação partes vetadas)\s*$",
            re.IGNORECASE,
        )
        out = []
        for ln in texto.splitlines():
            s = ln.strip()
            if not s:
                out.append("")
                continue
            if s in drop_exact or drop_re.match(s):
                continue
            out.append(ln)
        return "\n".join(out)

    @staticmethod
    def read_text_file(caminho: str) -> str:
        """Ler arquivo texto com fallback latin-1/cp1252 (HTML Planalto/PNCP)."""
        raw = Path(caminho).read_bytes()
        for enc in ("utf-8", "utf-8-sig", "cp1252", "latin-1"):
            try:
                return raw.decode(enc)
            except UnicodeDecodeError:
                continue
        return raw.decode("utf-8", errors="replace")

    @staticmethod
    def parse_html(conteudo: str) -> str:
        """Extrair texto de HTML"""
        try:
            soup = BeautifulSoup(conteudo, 'lxml')
            # Remover scripts e styles
            for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
                tag.decompose()
            texto = soup.get_text(separator='\n', strip=True)
            return ParserDocumento._drop_chrome_lines(texto)
        except Exception as e:
            logger.error(f"Erro ao parsear HTML: {e}")
            return ""
    
    @staticmethod
    def parse_url(url: str) -> Tuple[str, str]:
        """Baixar e parsear conteúdo de URL"""
        try:
            headers = {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/pdf,*/*",
            }
            # Prefer HTTPS for planalto (HTTP often stalls)
            fetch_url = url
            if fetch_url.startswith("http://www.planalto.gov.br"):
                fetch_url = "https://" + fetch_url[len("http://"):]
            response = requests.get(fetch_url, headers=headers, timeout=90, allow_redirects=True)
            response.raise_for_status()
            
            # Detectar tipo de conteúdo
            content_type = response.headers.get('Content-Type', '')
            
            if 'pdf' in content_type or fetch_url.lower().endswith('.pdf'):
                # Salvar temporariamente
                caminho_temp = f"/tmp/doc_{datetime.now().timestamp()}.pdf"
                with open(caminho_temp, 'wb') as f:
                    f.write(response.content)
                texto = ParserDocumento.parse_pdf(caminho_temp)
                os.remove(caminho_temp)
                return texto, 'pdf'
            elif 'html' in content_type or fetch_url.lower().endswith(('.htm', '.html')):
                return ParserDocumento.parse_html(response.text), 'html'
            else:
                # Many gov pages omit charset/html clearly
                if b'<' in response.content[:200] or '<' in response.text[:200]:
                    return ParserDocumento.parse_html(response.text), 'html'
                return response.text, 'text'
                
        except Exception as e:
            logger.error(f"Erro ao baixar URL {url}: {e}")
            return "", ""


class ExtratorMetadados:
    """Extrai metadados de textos legislativos"""
    
    # Padrões regex para extração
    PATTERNS = {
        # Aceita Nº/N./n.º, número com ponto (14.133) e dia ordinal (1º)
        'lei': r'(?:LEI|Lei)\s*(?:N[º°oO\.]?|n[º°oO\.]?)?\s*(\d{1,3}(?:\.\d{3})*|\d{1,6})\s*,?\s*DE\s+(\d{1,2})[ºª°]?\s+DE\s+(\w+)\s+DE\s+(\d{4})',
        'decreto': r'(?:DECRETO|Decreto)\s*(?:N[º°oO\.]?|n[º°oO\.]?)?\s*(\d{1,3}(?:\.\d{3})*|\d{1,6})\s*,?\s*DE\s+(\d{1,2})[ºª°]?\s+DE\s+(\w+)\s+DE\s+(\d{4})',
        'portaria': r'(?:PORTARIA|Portaria)(?:\s+[A-ZÀ-Üa-zà-ü0-9/\.\-]+){0,8}?\s*(?:N[º°oO\.]?|n[º°oO\.]?)?\s*(\d{1,3}(?:\.\d{3})*|\d{1,6})\s*,?\s*DE\s+(\d{1,2})[ºª°]?\s+DE\s+(\w+)\s+DE\s+(\d{4})',
        'resolucao': r'(?:RESOLU[CÇ][AÃ]O|Resolu[cç][aã]o)(?:\s+[A-ZÀ-Üa-zà-ü0-9/\.\-]+){0,8}?\s*(?:N[º°oO\.]?|n[º°oO\.]?)?\s*(\d{1,3}(?:\.\d{3})*|\d{1,6})\s*,?\s*DE\s+(\d{1,2})[ºª°]?\s+DE\s+(\w+)\s+DE\s+(\d{4})',
    }
    
    MESES = {
        'janeiro': 1, 'fevereiro': 2, 'março': 3, 'abril': 4,
        'maio': 5, 'junho': 6, 'julho': 7, 'agosto': 8,
        'setembro': 9, 'outubro': 10, 'novembro': 11, 'dezembro': 12
    }
    
    @classmethod
    def extrair(cls, texto: str, url_origem: str = "") -> Optional[MetadadosLegislacao]:
        """Extrair metadados do texto"""
        
        # Detectar tipo normativo
        tipo = cls._detectar_tipo(texto)
        
        # Extrair número e data
        numero, data_pub = cls._extrair_numero_data(texto, tipo)
        
        # Extrair órgão emissor
        orgao = cls._extrair_orgao(texto)
        
        # Extrair ementa (primeiros parágrafos)
        ementa = cls._extrair_ementa(texto)
        
        # Extrair palavras-chave
        palavras_chave = cls._extrair_palavras_chave(texto)
        
        # Extrair artigos
        artigos = cls._extrair_artigos(texto)
        
        if not numero or not data_pub:
            logger.warning("Não foi possível extrair número ou data do documento")
            return None
        
        return MetadadosLegislacao(
            titulo=f"{tipo.value.upper()} Nº {numero}/{data_pub.year}",
            numero=numero,
            ano=data_pub.year,
            data_publicacao=data_pub,
            orgao_emissor=orgao,
            tipo=tipo,
            ementa=ementa,
            texto_completo=texto,
            url_origem=url_origem,
            tags=palavras_chave[:10],
            esfera=cls._detectar_esfera(texto, orgao),
            palavras_chave=palavras_chave,
            artigos=artigos
        )
    
    @classmethod
    def _detectar_tipo(cls, texto: str) -> TipoNormativo:
        """Detectar tipo pelo primeiro cabeçalho normativo no início do texto."""
        head = texto[:3000]
        checks = [
            (TipoNormativo.EMENDA_CONSTITUCIONAL, r'EMENDA\s+CONSTITUCIONAL'),
            (TipoNormativo.MEDIDA_PROVISORIA, r'MEDIDA\s+PROVIS[OÓ]RIA'),
            (TipoNormativo.INSTRUCAO_NORMATIVA, r'INSTRU[CÇ][AÃ]O\s+NORMATIVA'),
            (TipoNormativo.RESOLUCAO, r'RESOLU[CÇ][AÃ]O'),
            (TipoNormativo.PORTARIA, r'PORTARIA'),
            (TipoNormativo.DECRETO, r'DECRETO'),
            (TipoNormativo.LEI, r'LEI'),
        ]
        best = None  # (pos, tipo)
        for tipo, pat in checks:
            m = re.search(pat, head, re.IGNORECASE)
            if not m:
                continue
            pos = m.start()
            if best is None or pos < best[0]:
                best = (pos, tipo)
        return best[1] if best else TipoNormativo.OUTRO
    
    @classmethod
    def _extrair_numero_data(cls, texto: str, tipo: TipoNormativo) -> Tuple[Optional[str], Optional[datetime]]:
        """Extrair número e data do documento"""
        pattern_key = {
            TipoNormativo.LEI: 'lei',
            TipoNormativo.DECRETO: 'decreto',
            TipoNormativo.PORTARIA: 'portaria',
            TipoNormativo.RESOLUCAO: 'resolucao',
        }.get(tipo, tipo.value.split('_')[0])
        pattern = cls.PATTERNS.get(pattern_key)
        
        if not pattern:
            # Tentar padrão genérico (número com ponto + dia ordinal)
            pattern = r'(\d{1,3}(?:\.\d{3})*|\d{1,6})\s*,?\s*DE\s+(\d{1,2})[ºª°]?\s+DE\s+(\w+)\s+DE\s+(\d{4})'
        
        match = re.search(pattern, texto[:2500], re.IGNORECASE)
        
        if match:
            grupos = match.groups()
            numero = grupos[0]
            dia = int(grupos[1])
            mes_str = grupos[2].lower()
            ano = int(grupos[3])
            mes = cls.MESES.get(mes_str, 1)
            
            try:
                data = datetime(ano, mes, dia)
                return numero, data
            except:
                return numero, None
        
        return None, None
    
    @classmethod
    def _extrair_orgao(cls, texto: str) -> str:
        """Extrair órgão emissor"""
        # Padrões comuns
        padroes = [
            r'(?:PRESIDÊNCIA|PRESIDENCIA)\s+DA\s+REPÚBLICA',
            r'MINISTÉRIO\s+DA\s+ECONOMIA',
            r'SEGES.*?MINISTÉRIO',
            r'GOVERNO\s+FEDERAL',
            r'ASSEMBLEIA\s+LEGISLATIVA',
            r'CÂMARA\s+DOS\s+DEPUTADOS',
            r'SENADO\s+FEDERAL'
        ]
        
        for padrao in padroes:
            match = re.search(padrao, texto[:1000], re.IGNORECASE)
            if match:
                return match.group(0)
        
        return "Órgão não identificado"
    
    @classmethod
    def _extrair_ementa(cls, texto: str) -> str:
        """Extrair ementa/resumo"""
        # Geralmente está no início após o cabeçalho
        linhas = texto.split('\n')
        ementa_linhas = []
        
        capturando = False
        for linha in linhas[:50]:
            linha_limpa = linha.strip()
            
            if 'EMENTA' in linha_limpa.upper() or 'RESUMO' in linha_limpa.upper():
                capturando = True
                continue
            
            if capturando:
                if linha_limpa and len(linha_limpa) > 20:
                    ementa_linhas.append(linha_limpa)
                elif len(ementa_linhas) > 0:
                    break
        
        if ementa_linhas:
            return ' '.join(ementa_linhas[:5])
        
        # Fallback: primeiros parágrafos relevantes
        for linha in linhas[:20]:
            linha_limpa = linha.strip()
            if len(linha_limpa) > 50 and len(linha_limpa) < 500:
                return linha_limpa
        
        return texto[:300] + "..."
    
    @classmethod
    def _extrair_palavras_chave(cls, texto: str) -> List[str]:
        """Extrair palavras-chave relevantes"""
        # Palavras-chave comuns em licitações
        keywords_licitacao = [
            'licitação', 'pregão', 'concorrência', 'dispensa', 'inexigibilidade',
            'equipamento', 'fitness', 'academia', 'exercício', 'ginástica',
            'compra', 'contratação', 'fornecedor', 'proposta', 'edital',
            'segurança', 'qualidade', 'norma técnica', 'ABNT', 'especificação'
        ]
        
        texto_lower = texto.lower()
        encontradas = [kw for kw in keywords_licitacao if kw in texto_lower]
        
        return encontradas[:20]
    
    @classmethod
    def _extrair_artigos(cls, texto: str) -> List[Dict]:
        """Extrair estrutura de artigos"""
        artigos = []
        
        # Padrão para artigos: Art. X, Parágrafo único, § X, Inciso X
        padrao_artigo = r'(?:Art\.|ARTIGO)\s*(\d+[ºo]?)'
        padrao_paragrafo = r'§\s*(\d+[ºo]?|único)'
        padrao_inciso = r'([IVX]+|[a-z]|[0-9]+)[-\)]'
        
        matches = list(re.finditer(padrao_artigo, texto))
        
        for i, match in enumerate(matches):
            num_artigo = match.group(1)
            inicio = match.start()
            fim = matches[i + 1].start() if i + 1 < len(matches) else len(texto)
            
            conteudo_artigo = texto[inicio:fim].strip()
            
            artigo_dict = {
                'numero': num_artigo,
                'conteudo': conteudo_artigo[:500],
                'paragrafos': []
            }
            
            # Extrair parágrafos
            paragrafos = re.findall(padrao_paragrafo, conteudo_artigo)
            artigo_dict['paragrafos'] = paragrafos[:10]
            
            artigos.append(artigo_dict)
        
        return artigos[:50]  # Limitar a 50 artigos
    
    @classmethod
    def _detectar_esfera(cls, texto: str, orgao: str) -> str:
        """Detectar esfera de governo"""
        texto_upper = texto.upper()
        orgao_upper = orgao.upper()
        
        if any(p in orgao_upper for p in ['FEDERAL', 'UNIÃO', 'MINISTÉRIO', 'PRESIDÊNCIA']):
            return 'federal'
        elif 'ESTADO' in texto_upper or 'ASSEMBLEIA LEGISLATIVA' in orgao_upper:
            return 'estadual'
        elif 'MUNICÍPIO' in texto_upper or 'MUNICIPIO' in texto_upper or 'PREFEITURA' in orgao_upper:
            return 'municipal'
        else:
            return 'nao_identificada'


class IngestorLegislacao:
    """Classe principal para ingestão de legislação"""
    
    def __init__(self, supabase_url: str, supabase_key: str):
        """Inicializar com credenciais do Supabase"""
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.parser = ParserDocumento()
        self.extrator = ExtratorMetadados()
        
        logger.info("Ingestor de Legislação inicializado")
    
    def ingerir_documento(self, caminho_arquivo: str, url_origem: str = "") -> Optional[Dict]:
        """Ingerir um documento local"""
        logger.info(f"Iniciando ingestão de {caminho_arquivo}")
        
        # Parse do documento
        extensao = Path(caminho_arquivo).suffix.lower()
        
        if extensao == '.pdf':
            texto = self.parser.parse_pdf(caminho_arquivo)
        elif extensao == '.docx':
            texto = self.parser.parse_docx(caminho_arquivo)
        elif extensao in ['.html', '.htm']:
            texto = self.parser.parse_html(ParserDocumento.read_text_file(caminho_arquivo))
        else:
            logger.error(f"Extensão não suportada: {extensao}")
            return None
        
        if not texto:
            logger.error("Texto vazio após parsing")
            return None
        
        # Extrair metadados
        metadados = self.extrator.extrair(texto, url_origem or caminho_arquivo)
        
        if not metadados:
            logger.error("Falha ao extrair metadados")
            return None
        
        # Armazenar no Supabase
        resultado = self._armazenar_supabase(metadados)
        
        logger.success(f"Documento ingerido com sucesso: {metadados.titulo}")
        return resultado
    
    def ingerir_url(self, url: str) -> Optional[Dict]:
        """Ingerir documento a partir de URL"""
        logger.info(f"Iniciando ingestão de URL: {url}")
        
        # Baixar e parsear
        texto, tipo = self.parser.parse_url(url)
        
        if not texto:
            logger.error("Falha ao baixar/parsear URL")
            return None
        
        # Extrair metadados
        metadados = self.extrator.extrair(texto, url)
        
        if not metadados:
            logger.error("Falha ao extrair metadados")
            return None
        
        # Armazenar
        resultado = self._armazenar_supabase(metadados)
        
        logger.success(f"URL ingerida com sucesso: {metadados.titulo}")
        return resultado
    
    def _armazenar_supabase(self, metadados: MetadadosLegislacao) -> Dict:
        """Armazenar metadados no Supabase"""
        
        dados = metadados.to_dict()
        # Colunas reais da tabela (não persistir id_supabase local)
        dados.pop('id_supabase', None)
        
        # Inserir na tabela legislacao
        resposta = self.supabase.table('legislacao').insert(dados).execute()
        
        # Atualizar ID
        if resposta.data and len(resposta.data) > 0:
            metadados.id_supabase = resposta.data[0]['id']
        
        return {
            'sucesso': True,
            'id': metadados.id_supabase,
            'titulo': metadados.titulo,
            'tipo': metadados.tipo.value,
            'data_publicacao': metadados.data_publicacao.isoformat() if metadados.data_publicacao else None
        }
    
    def buscar_legislacao(self, query: str, limite: int = 10) -> List[Dict]:
        """Buscar legislação por termos"""
        resposta = self.supabase.table('legislacao')\
            .select('*')\
            .ilike('texto_completo', f'%{query}%')\
            .limit(limite)\
            .execute()
        
        return resposta.data if resposta.data else []
    
    def listar_todos(self, tipo: Optional[TipoNormativo] = None, limite: int = 100) -> List[Dict]:
        """Listar toda legislação ingerida"""
        query = self.supabase.table('legislacao').select('*').limit(limite)
        
        if tipo:
            query = query.eq('tipo', tipo.value)
        
        resposta = query.execute()
        return resposta.data if resposta.data else []


# Exemplo de uso
if __name__ == "__main__":
    from dotenv import load_dotenv
    
    load_dotenv()
    
    # Configurar
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("Configure SUPABASE_URL e SUPABASE_KEY no .env")
        exit(1)
    
    # Criar ingestor
    ingestor = IngestorLegislacao(SUPABASE_URL, SUPABASE_KEY)
    
    # Exemplo: ingerir arquivo local
    # resultado = ingestor.ingerir_documento("/caminho/para/lei.pdf")
    
    # Exemplo: ingerir URL
    # resultado = ingestor.ingerir_url("https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm")
    
    # Exemplo: buscar
    # resultados = ingestor.buscar_legislacao("pregão eletrônico")
    
    logger.info("Ingestor pronto para uso")
