from fastapi import FastAPI, HTTPException, Security, status, Query, Response
from fastapi.security import APIKeyHeader
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
import subprocess
import shutil
import os
from pathlib import Path
from typing import Literal, Optional
import logging
from datetime import datetime
from dotenv import load_dotenv
import sys
from time import perf_counter
from urllib.parse import urlparse
from io import BytesIO
import tempfile
from starlette.background import BackgroundTask

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Diretórios base
ROOT_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = ROOT_DIR / "config"
COOKIES_DIR = CONFIG_DIR / "cookies"
FRONTEND_DIR = ROOT_DIR / "frontend"
FRONTEND_BUILD_DIR = FRONTEND_DIR / "dist"
DOWNLOADS_DIR = ROOT_DIR / "downloads"

# Configurações
load_dotenv(ROOT_DIR / ".env")
load_dotenv(CONFIG_DIR / ".env", override=False)
DEFAULT_API_KEY = "cI4cA4Xvml2O0TCXdxRDuhHdY1251G34gso3VdHfDIc"
API_KEY = os.getenv("API_KEY", DEFAULT_API_KEY)

# Cookies
COOKIES_CANDIDATES = [
    COOKIES_DIR / "cookies.txt",
    ROOT_DIR / "cookies.txt",  # compatibilidade com estrutura antiga
]
PRIMARY_COOKIES_FILE = COOKIES_CANDIDATES[0]
DOMAIN_COOKIE_MAP: dict[str, list[Path]] = {
    "tiktok.com": [
        COOKIES_DIR / "www.tiktok.com_cookies.txt",
        ROOT_DIR / "www.tiktok.com_cookies.txt",
    ],
    "instagram.com": [
        COOKIES_DIR / "www.instagram.com_cookies.txt",
        ROOT_DIR / "www.instagram.com_cookies.txt",
    ],
}
ALT_COOKIES_FILES = [p for paths in DOMAIN_COOKIE_MAP.values() for p in paths]
_cookies_cache: dict[Path, tuple[float, Optional[list[str]]]] = {}


def get_cookies_args(url: Optional[str] = None) -> list[str]:
    """
    Retorna os argumentos de cookies para yt-dlp/gallery-dl
    Ignora arquivos vazios ou com formato inválido para evitar erro 500.
    """
    candidates: list[Path] = []
    lower_host = ""
    if url:
        try:
            lower_host = urlparse(url).netloc.lower()
        except Exception:
            lower_host = url.lower()

    # Prioriza cookies específicos por domínio quando houver
    for domain, cookie_paths in DOMAIN_COOKIE_MAP.items():
        if domain in lower_host:
            for cookie_path in cookie_paths:
                if cookie_path not in candidates:
                    candidates.append(cookie_path)

    # Fallbacks genéricos (não usa cookies de outros domínios)
    for p in COOKIES_CANDIDATES:
        if p not in candidates:
            candidates.append(p)

    for file_path in candidates:
        args = _cached_cookie_args(file_path)
        if args:
            return args
    return []


def _cached_cookie_args(file_path: Path) -> Optional[list[str]]:
    """Lê cookies com cache por mtime para evitar I/O a cada requisição."""
    try:
        if not file_path.exists():
            _cookies_cache.pop(file_path, None)
            return None

        stat = file_path.stat()
        mtime = stat.st_mtime
        cached = _cookies_cache.get(file_path)
        if cached and cached[0] == mtime:
            return cached[1] or None

        if stat.st_size == 0:
            _cookies_cache[file_path] = (mtime, None)
            logger.info(f"{file_path.name} está vazio; ignorando.")
            return None

        with file_path.open("r", encoding="utf-8", errors="ignore") as f:
            head = f.read(200)
            if "HTTP Cookie File" not in head and "# Netscape" not in head:
                logger.warning(f"{file_path.name} não parece Netscape; ignorando.")
                _cookies_cache[file_path] = (mtime, None)
                return None

        args = ["--cookies", str(file_path)]
        _cookies_cache[file_path] = (mtime, args)
        logger.info(f"Usando cookies de {file_path.name}")
        return args
    except Exception as exc:
        _cookies_cache.pop(file_path, None)
        logger.warning(f"Não foi possível ler {file_path.name}, ignorando: {exc}")
        return None


_yt_dlp_path_cache: Optional[str] = None
_gallery_dl_path_cache: Optional[str] = None
_ffmpeg_path_cache: Optional[str] = None


def _is_executable(path: Path) -> bool:
    return path.is_file() and os.access(path, os.X_OK)


def get_ffmpeg_location() -> Optional[str]:
    """
    Resolve o caminho do ffmpeg.
    Prioridade:
    1) FFMPEG_PATH (arquivo ou diretório)
    2) bin/ffmpeg dentro do projeto
    3) ffmpeg do PATH
    """
    global _ffmpeg_path_cache
    if _ffmpeg_path_cache is not None:
        return _ffmpeg_path_cache or None

    env_path = os.getenv("FFMPEG_PATH")
    if env_path:
        candidate = Path(env_path)
        if candidate.is_dir():
            ffmpeg_name = "ffmpeg.exe" if os.name == "nt" else "ffmpeg"
            dir_ffmpeg = candidate / ffmpeg_name
            if _is_executable(dir_ffmpeg):
                _ffmpeg_path_cache = str(candidate)
                logger.info(f"ffmpeg selecionado via FFMPEG_PATH (dir): {_ffmpeg_path_cache}")
                return _ffmpeg_path_cache
        if _is_executable(candidate):
            _ffmpeg_path_cache = str(candidate)
            logger.info(f"ffmpeg selecionado via FFMPEG_PATH: {_ffmpeg_path_cache}")
            return _ffmpeg_path_cache
        logger.warning(f"FFMPEG_PATH configurado, mas inválido: {env_path}")

    local_bin = ROOT_DIR / "bin"
    ffmpeg_name = "ffmpeg.exe" if os.name == "nt" else "ffmpeg"
    local_ffmpeg = local_bin / ffmpeg_name
    if _is_executable(local_ffmpeg):
        _ffmpeg_path_cache = str(local_bin)
        logger.info(f"ffmpeg selecionado no projeto: {_ffmpeg_path_cache}")
        return _ffmpeg_path_cache

    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        _ffmpeg_path_cache = system_ffmpeg
        logger.info(f"ffmpeg encontrado no PATH: {_ffmpeg_path_cache}")
        return _ffmpeg_path_cache

    _ffmpeg_path_cache = ""
    logger.warning("ffmpeg não encontrado; conversões podem falhar.")
    return None


def get_ffmpeg_location_arg() -> list[str]:
    location = get_ffmpeg_location()
    if location:
        return ["--ffmpeg-location", location]
    return []


def choose_yt_dlp_binary_for_url(url: str) -> str:
    """
    Fixa o binário principal; para TikTok, prioriza ./bin/yt-dlp (impersonation).
    """
    lower = url.lower()
    main_bin = get_yt_dlp_binary()
    if "tiktok.com" in lower:
        alt_bin = str(ROOT_DIR / "bin" / "yt-dlp")
        if _is_executable(Path(alt_bin)):
            return alt_bin
    return main_bin


def get_yt_dlp_binary() -> str:
    """
    Resolve binário do yt-dlp priorizando a instalação estável (pip/venv).
    Ordem:
    1) YT_DLP_PATH (override explícito)
    2) Binário do venv (pip)
    3) yt-dlp do PATH
    4) Repo local yt-dlp-master (download do GitHub) como fallback
    """
    global _yt_dlp_path_cache
    if _yt_dlp_path_cache:
        return _yt_dlp_path_cache

    env_path = os.getenv("YT_DLP_PATH")
    if env_path:
        env_candidate = Path(env_path)
        if _is_executable(env_candidate):
            _yt_dlp_path_cache = str(env_candidate)
            logger.info(f"yt-dlp selecionado via YT_DLP_PATH: {_yt_dlp_path_cache}")
            return _yt_dlp_path_cache
        logger.warning(f"YT_DLP_PATH configurado, mas não executável: {env_path}")

    candidates: list[str] = []

    venv_bin = Path(sys.executable).parent / "yt-dlp"
    if _is_executable(venv_bin):
        candidates.append(str(venv_bin))

    path_bin = shutil.which("yt-dlp")
    if path_bin:
        candidates.append(path_bin)

    local_repo = ROOT_DIR / "yt-dlp-master"
    for name in ("yt-dlp.sh", "yt-dlp"):
        candidate = local_repo / name
        if _is_executable(candidate):
            candidates.append(str(candidate))

    for path in candidates:
        _yt_dlp_path_cache = path
        logger.info(f"yt-dlp selecionado: {_yt_dlp_path_cache}")
        return _yt_dlp_path_cache

    _yt_dlp_path_cache = "yt-dlp"
    logger.info("yt-dlp selecionado: yt-dlp (PATH)")
    return _yt_dlp_path_cache


def get_gallery_dl_binary() -> str:
    """
    Resolve binário do gallery-dl priorizando a instalação estável (pip/venv).
    Ordem:
    1) GALLERY_DL_PATH (override explícito)
    2) Binário do venv (pip)
    3) gallery-dl do PATH
    4) Repo local gallery-dl-master/bin/gallery-dl como fallback
    """
    global _gallery_dl_path_cache
    if _gallery_dl_path_cache:
        return _gallery_dl_path_cache

    env_path = os.getenv("GALLERY_DL_PATH")
    if env_path:
        env_candidate = Path(env_path)
        if _is_executable(env_candidate):
            _gallery_dl_path_cache = str(env_candidate)
            logger.info(f"gallery-dl selecionado via GALLERY_DL_PATH: {_gallery_dl_path_cache}")
            return _gallery_dl_path_cache
        logger.warning(f"GALLERY_DL_PATH configurado, mas não executável: {env_path}")

    candidates: list[str] = []

    venv_bin = Path(sys.executable).parent / "gallery-dl"
    if _is_executable(venv_bin):
        candidates.append(str(venv_bin))

    path_bin = shutil.which("gallery-dl")
    if path_bin:
        candidates.append(path_bin)

    local_repo = ROOT_DIR / "gallery-dl-master"
    for name in ("bin/gallery-dl", "gallery-dl"):
        candidate = local_repo / name
        if _is_executable(candidate):
            candidates.append(str(candidate))

    for path in candidates:
        _gallery_dl_path_cache = path
        logger.info(f"gallery-dl selecionado: {_gallery_dl_path_cache}")
        return _gallery_dl_path_cache

    _gallery_dl_path_cache = "gallery-dl"
    logger.info("gallery-dl selecionado: gallery-dl (PATH)")
    return _gallery_dl_path_cache


def get_impersonate_args(url: str) -> list[str]:
    """
    Retorna args de impersonation para TikTok (Chrome-120).
    Se não for TikTok, retorna vazio.
    """
    lowered = url.lower()
    if "tiktok.com" not in lowered:
        return []
    return ["--impersonate", "Chrome-120"]


_impersonation_cache_by_path: dict[str, bool] = {}

# Criar diretórios essenciais
COOKIES_DIR.mkdir(parents=True, exist_ok=True)
DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

# FastAPI app
app = FastAPI(
    title="N8N Download Bridge API",
    description="API para download de vídeos e imagens via yt-dlp e gallery-dl",
    version="2.0.0"
)

# CORS para chamadas de browser (preflight/OPTIONS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-File-Size", "X-Tool-Used", "X-Format", "X-Total-Files"],
)

# Security
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)

# Frontend estático (UI) - prioriza build do Vite (frontend/dist)
if FRONTEND_BUILD_DIR.exists():
    app.mount("/ui", StaticFiles(directory=FRONTEND_BUILD_DIR, html=True), name="ui")
elif FRONTEND_DIR.exists():
    app.mount("/ui", StaticFiles(directory=FRONTEND_DIR, html=True), name="ui")
else:
    logger.warning("Frontend directory não encontrado; rota /ui desabilitada.")


# Models
class DownloadRequest(BaseModel):
    url: HttpUrl
    tool: Literal["yt-dlp", "gallery-dl"]
    format: Optional[Literal["mp4", "webm", "best"]] = "mp4"
    quality: Optional[str] = "best"


class DownloadResponse(BaseModel):
    success: bool
    message: str
    file_path: Optional[str] = None
    file_size: Optional[str] = None
    direct_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    tool_used: str
    format: Optional[str] = None
    direct_urls: Optional[list[str]] = None  # para respostas que trazem várias URLs


# Dependency para validar API Key
async def validate_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        logger.warning(f"Tentativa de acesso com API Key inválida: {api_key[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API Key inválida"
        )
    return api_key


def get_file_size(file_path: Path) -> str:
    """Retorna o tamanho do arquivo em formato legível"""
    size = file_path.stat().st_size
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size < 1024.0:
            return f"{size:.1f}{unit}"
        size /= 1024.0
    return f"{size:.1f}TB"


def execute_ytdlp(url: str, download_file: bool = True, output_format: str = "mp4") -> dict:
    """Executa yt-dlp e retorna informações do download"""

    t0 = perf_counter()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_template = str(DOWNLOADS_DIR / f"video_{timestamp}.%(ext)s")

    # Comando base
    cmd = [choose_yt_dlp_binary_for_url(url)]

    # Adicionar cookies se existir
    cookies_args = get_cookies_args(url)
    cmd.extend(cookies_args)
    t1 = perf_counter()
    # Adicionar impersonation se necessário
    cmd.extend(get_impersonate_args(url))

    if download_file:
        # Configurar formato de acordo com a preferência
        if output_format == "mp4":
            # Preferir h264/aac para compatibilidade ampla (Safari/iOS)
            cmd.extend([
                '-f',
                'bv*[vcodec^=avc1][ext=mp4]+ba[ext=m4a]/'
                'bv*[vcodec^=h264][ext=mp4]+ba[ext=m4a]/'
                'b[ext=mp4]',
                '--merge-output-format', 'mp4',
                '--remux-video', 'mp4'
            ])
        elif output_format == "webm":
            cmd.extend(['-f', 'bestvideo[ext=webm]+bestaudio[ext=webm]/best[ext=webm]/best'])
        else:  # best
            cmd.extend(['-f', 'best'])

        cmd.extend([
            '-o', output_template,
            '--no-playlist',
            '--progress',
            '--newline'
        ])
    else:
        # Modo URL direta: retorna melhor URL disponível (pode ser m3u8/MP4)
        cmd.extend([
            '--skip-download',
            '--print', 'thumbnail',
            '--print', 'url',
        ])

    cmd.append(str(url))

    logger.info(f"Executando: {' '.join(cmd)}")

    t2 = perf_counter()
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            check=True
        )
        t3 = perf_counter()

        if download_file:
            # Procurar arquivo baixado
            downloaded_files = list(DOWNLOADS_DIR.glob(f"video_{timestamp}.*"))
            if downloaded_files:
                file_path = downloaded_files[0]
                t4 = perf_counter()
                logger.info(
                    "yt-dlp timing cookies=%.1fms prep=%.1fms run=%.1fms post=%.1fms",
                    (t1 - t0) * 1000,  # resolução de cookies
                    (t2 - t1) * 1000,  # montagem de comando
                    (t3 - t2) * 1000,  # execução yt-dlp
                    (t4 - t3) * 1000,  # pós-processamento
                )
                return {
                    "success": True,
                    "file_path": str(file_path),
                    "file_size": get_file_size(file_path),
                    "output": result.stdout,
                    "format": file_path.suffix[1:]  # Remove o ponto da extensão
                }
            else:
                raise Exception("Arquivo não encontrado após download")
        else:
            # Retornar URL direta + thumbnail (quando disponível)
            lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
            thumbnail_url = None
            direct_urls: list[str] = []
            if not lines:
                raise Exception("Nenhuma URL retornada pelo yt-dlp")

            if len(lines) >= 2:
                thumb = lines[0]
                if thumb.lower() not in ("na", "none"):
                    thumbnail_url = thumb
                direct_urls = [line for line in lines[1:] if line.lower() not in ("na", "none")]
            else:
                if lines[0].lower() not in ("na", "none"):
                    direct_urls = [lines[0]]

            direct_url = direct_urls[0] if direct_urls else None
            t4 = perf_counter()
            logger.info(
                "yt-dlp timing cookies=%.1fms prep=%.1fms run=%.1fms post=%.1fms",
                (t1 - t0) * 1000,  # resolução de cookies
                (t2 - t1) * 1000,  # montagem de comando
                (t3 - t2) * 1000,  # execução yt-dlp
                (t4 - t3) * 1000,  # pós-processamento
            )
            return {
                "success": True,
                "direct_url": direct_url,
                "direct_urls": direct_urls,
                "thumbnail_url": thumbnail_url,
                "output": result.stdout
            }

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Download timeout (5 minutos)")
    except subprocess.CalledProcessError as e:
        logger.error(f"Erro no yt-dlp: {e.stderr}")
        raise HTTPException(status_code=500, detail=f"Erro no yt-dlp: {e.stderr}")
    except Exception as e:
        logger.error(f"Erro inesperado: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def stream_ytdlp(url: str, output_format: str = "mp4") -> dict:
    """
    Executa yt-dlp mandando saída para stdout (sem gravar em disco).
    Retorna bytes do arquivo e metadados básicos.
    """
    t0 = perf_counter()

    cmd = [choose_yt_dlp_binary_for_url(url)]
    cmd.extend(get_cookies_args(url))
    cmd.extend(get_impersonate_args(url))

    # Para TikTok, não force formato; deixe yt-dlp escolher progressivo quando possível
    if "tiktok.com" in url.lower():
        fmt = "best"
    elif output_format == "mp4":
        fmt = (
            "best[ext=mp4][vcodec!=none][acodec!=none][protocol!*=m3u8]/"
            "best[ext=mp4][vcodec!=none][acodec!=none]/"
            "best[ext=mp4][protocol!*=m3u8]/"
            "best[protocol!*=m3u8]"
        )
    elif output_format == "webm":
        fmt = (
            "best[ext=webm][vcodec!=none][acodec!=none][protocol!*=m3u8]/"
            "best[ext=webm][vcodec!=none][acodec!=none]/"
            "best[ext=webm][protocol!*=m3u8]/"
            "best[protocol!*=m3u8]"
        )
    else:
        fmt = "best"

    cmd.extend([
        "-f", fmt,
        "-o", "-",
        "--no-playlist",
        "--quiet",
        "--no-warnings",
        "--no-progress",
    ])

    cmd.append(str(url))
    logger.info(f"Streaming yt-dlp: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            timeout=600
        )
        data = result.stdout or b""
        if not data:
            raise HTTPException(status_code=500, detail="The downloaded stream is empty")
        # Verificação rápida de header MP4/WebM para evitar enviar lixo
        if output_format == "mp4" and b"ftyp" not in data[:128]:
            raise HTTPException(status_code=500, detail="Stream não é MP4 válido (faltando ftyp); tente /download/binary")
        if output_format == "webm" and not (data.startswith(b"\x1aE\xdf\xa3") or b"webm" in data[:128].lower()):
            raise HTTPException(status_code=500, detail="Stream não é WebM válido; tente /download/binary")
        mime = "video/mp4" if output_format == "mp4" else "video/webm"
        t1 = perf_counter()
        logger.info("yt-dlp stream timing total=%.1fms", (t1 - t0) * 1000)
        return {
            "data": data,
            "mime": mime,
            "size": len(data),
            "format": output_format
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Streaming timeout (10 minutos)")
    except subprocess.CalledProcessError as e:
        logger.error(f"Erro no yt-dlp (stream): {e.stderr}")
        raise HTTPException(status_code=500, detail=f"Erro no yt-dlp: {e.stderr.decode(errors='ignore')}")
    except Exception as e:
        logger.error(f"Erro inesperado (stream): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def stream_ytdlp_merge(url: str, output_format: str = "mp4") -> dict:
    """
    Baixa melhor qualidade (vídeo+áudio separados) e mescla em arquivo temporário.
    Remove o arquivo após o streaming (via BackgroundTask).
    """
    t0 = perf_counter()

    # caminho temporário controlado
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f".{output_format}")
    tmp_path = Path(tmp.name)
    tmp.close()

    cmd = [choose_yt_dlp_binary_for_url(url)]
    cmd.extend(get_cookies_args(url))
    cmd.extend(get_impersonate_args(url))
    cmd.extend([
        "-f", "bv*+ba/bestvideo+bestaudio/best",
        "--merge-output-format", output_format,
        "-o", str(tmp_path.with_suffix(".%(ext)s")),
        "--no-playlist",
        "--newline",
    ])
    cmd.append(str(url))

    logger.info(f"Streaming (merge) yt-dlp: {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            timeout=900
        )
        # localizar arquivo gerado (pode ter extensão real diferente)
        generated = list(tmp_path.parent.glob(f"{tmp_path.stem}.*"))
        if not generated:
            raise HTTPException(status_code=500, detail="Arquivo mesclado não encontrado")
        file_path = generated[0]
        mime = "video/mp4" if output_format == "mp4" else "video/webm"
        size = file_path.stat().st_size
        if size == 0:
            raise HTTPException(status_code=500, detail="Arquivo mesclado está vazio")
        t1 = perf_counter()
        logger.info("yt-dlp merge timing total=%.1fms", (t1 - t0) * 1000)
        return {
            "file_path": file_path,
            "mime": mime,
            "size": size,
            "format": output_format
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Merge timeout (15 minutos)")
    except subprocess.CalledProcessError as e:
        logger.error(f"Erro no yt-dlp (merge stream): {e.stderr}")
        raise HTTPException(status_code=500, detail=f"Erro no yt-dlp: {e.stderr.decode(errors='ignore')}")
    except Exception as e:
        logger.error(f"Erro inesperado (merge stream): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def execute_gallery_dl(url: str) -> dict:
    """Executa gallery-dl e retorna informações do download"""

    t0 = perf_counter()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = DOWNLOADS_DIR / f"gallery_{timestamp}"
    output_dir.mkdir(exist_ok=True)

    cmd = [get_gallery_dl_binary()]

    # Adicionar cookies se existir
    cookies_args = get_cookies_args(url)
    cmd.extend(cookies_args)
    t1 = perf_counter()

    cmd.extend([
        "-d", str(output_dir),
        "--write-metadata",
        str(url)
    ])

    logger.info(f"Executando: {' '.join(cmd)}")

    t2 = perf_counter()
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            check=True
        )
        t3 = perf_counter()

        # Procurar arquivos baixados
        downloaded_files = [f for f in output_dir.rglob("*") if f.is_file() and not f.name.endswith('.json')]

        if downloaded_files:
            files_info = [
                {
                    "path": str(f),
                    "size": get_file_size(f),
                    "name": f.name
                }
                for f in downloaded_files
            ]

            t4 = perf_counter()
            logger.info(
                "gallery-dl timing cookies=%.1fms prep=%.1fms run=%.1fms post=%.1fms",
                (t1 - t0) * 1000,  # resolução de cookies
                (t2 - t1) * 1000,  # montagem de comando
                (t3 - t2) * 1000,  # execução gallery-dl
                (t4 - t3) * 1000,  # pós-processamento
            )
            return {
                "success": True,
                "files": files_info,
                "output": result.stdout,
                "download_dir": str(output_dir)
            }
        else:
            raise Exception("Nenhum arquivo encontrado após download")

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Download timeout (5 minutos)")
    except subprocess.CalledProcessError as e:
        logger.error(f"Erro no gallery-dl: {e.stderr}")
        raise HTTPException(status_code=500, detail=f"Erro no gallery-dl: {e.stderr}")
    except Exception as e:
        logger.error(f"Erro inesperado: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def execute_gallery_dl_urls(url: str) -> list[str]:
    """Retorna URLs diretas usando gallery-dl sem baixar arquivos"""
    cmd = [get_gallery_dl_binary(), "-g"]
    cmd.extend(get_cookies_args(url))
    cmd.append(str(url))

    logger.info(f"Executando (URLs apenas): {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=180,
            check=True
        )
        urls = [line.strip() for line in result.stdout.splitlines() if line.strip()]
        if not urls:
            raise HTTPException(status_code=404, detail="Nenhuma URL retornada pelo gallery-dl")
        return urls
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Timeout ao obter URLs (3 minutos)")
    except subprocess.CalledProcessError as e:
        logger.error(f"Erro no gallery-dl (URLs): {e.stderr}")
        raise HTTPException(status_code=500, detail=f"Erro no gallery-dl: {e.stderr}")
    except Exception as e:
        logger.error(f"Erro inesperado (URLs): {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


def zip_directory(source_dir: Path) -> Path:
    """Compacta um diretório em ZIP e retorna o caminho do arquivo"""
    zip_name = DOWNLOADS_DIR / f"{source_dir.name}.zip"
    try:
        if zip_name.exists():
            zip_name.unlink()
        shutil.make_archive(zip_name.with_suffix(''), 'zip', root_dir=source_dir)
        return zip_name
    except Exception as e:
        logger.error(f"Erro ao zipar diretório {source_dir}: {e}")
        raise HTTPException(status_code=500, detail="Falha ao gerar ZIP")


# Endpoints
@app.get("/")
async def root():
    # Redireciona para a UI quando ela estiver presente
    if FRONTEND_DIR.exists():
        return RedirectResponse(url="/ui", status_code=307)
    return {
        "name": "N8N Download Bridge API",
        "version": "2.0.0",
        "status": "online",
        "endpoints": {
            "/health": "Health check",
            "/download": "Download e retorna JSON com info do arquivo",
            "/download/binary": "Download e retorna arquivo binário direto",
            "/download/url": "Retorna URL direta sem fazer download"
        }
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "yt-dlp": subprocess.run(["yt-dlp", "--version"], capture_output=True, text=True).stdout.strip(),
        "gallery-dl": subprocess.run(["gallery-dl", "--version"], capture_output=True, text=True).stdout.strip(),
        "cookies_file_exists": any(path.exists() for path in COOKIES_CANDIDATES + ALT_COOKIES_FILES),
        "downloads_dir": str(DOWNLOADS_DIR),
        "cookies_dir": str(COOKIES_DIR)
    }


@app.post("/download", response_model=DownloadResponse)
async def download_json(
    request: DownloadRequest,
    api_key: str = Security(validate_api_key)
):
    """
    Faz download e retorna JSON com informações do arquivo.
    Ideal para: processos que precisam de metadados do arquivo.
    """
    logger.info(f"Download JSON request: {request.url} usando {request.tool}")

    try:
        if request.tool == "yt-dlp":
            result = execute_ytdlp(str(request.url), download_file=True, output_format=request.format)
            return DownloadResponse(
                success=True,
                message="Download concluído com sucesso",
                file_path=result.get("file_path"),
                file_size=result.get("file_size"),
                tool_used="yt-dlp",
                format=result.get("format")
            )
        else:
            result = execute_gallery_dl(str(request.url))
            first_file = result["files"][0] if result["files"] else {}
            return DownloadResponse(
                success=True,
                message=f"Download concluído: {len(result['files'])} arquivo(s)",
                file_path=first_file.get("path"),
                file_size=first_file.get("size"),
                tool_used="gallery-dl"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no download: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/download/binary")
async def download_binary(
    url: str = Query(..., description="URL do vídeo/imagem"),
    tool: Literal["yt-dlp", "gallery-dl"] = Query(..., description="Ferramenta a usar"),
    format: Literal["mp4", "webm", "best"] = Query(default="mp4", description="Formato do vídeo (apenas yt-dlp)"),
    api_key: str = Security(validate_api_key)
):
    """
    Faz download e retorna o arquivo binário diretamente.
    Ideal para: n8n processar o arquivo diretamente como binary.
    """
    logger.info(f"Download Binary request: {url} usando {tool}")

    try:
        if tool == "yt-dlp":
            result = execute_ytdlp(url, download_file=True, output_format=format)
            file_path = Path(result["file_path"])
            # Detect MIME pelo arquivo gerado
            mime_type = "application/octet-stream"
            ext = file_path.suffix.lower()
            if ext == ".mp4":
                mime_type = "video/mp4"
            elif ext == ".webm":
                mime_type = "video/webm"

            return FileResponse(
                path=file_path,
                media_type=mime_type,
                filename=file_path.name,
                headers={
                    "X-File-Size": result["file_size"],
                    "X-Tool-Used": "yt-dlp",
                    "X-Format": result.get("format", format)
                }
            )
        else:
            result = execute_gallery_dl(url)
            if not result["files"]:
                raise HTTPException(status_code=404, detail="Nenhum arquivo baixado")

            first_file = Path(result["files"][0]["path"])

            # Detectar tipo MIME
            mime_type = "application/octet-stream"
            if first_file.suffix.lower() in ['.jpg', '.jpeg']:
                mime_type = "image/jpeg"
            elif first_file.suffix.lower() == '.png':
                mime_type = "image/png"
            elif first_file.suffix.lower() == '.gif':
                mime_type = "image/gif"
            elif first_file.suffix.lower() == '.webp':
                mime_type = "image/webp"

            return FileResponse(
                path=first_file,
                media_type=mime_type,
                filename=first_file.name,
                headers={
                    "X-File-Size": result["files"][0]["size"],
                    "X-Tool-Used": "gallery-dl",
                    "X-Total-Files": str(len(result["files"]))
                }
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no download binary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.options("/download/binary")
async def options_download_binary():
    """Permite preflight CORS do navegador para rota binária."""
    return Response(status_code=200)


@app.post("/download/url", response_model=DownloadResponse)
async def download_url(
    payload: DownloadRequest,
    api_key: str = Security(validate_api_key)
):
    """
    Retorna a URL direta do vídeo sem fazer download.
    Apenas funciona com yt-dlp.
    Ideal para: quando você quer apenas o link direto do vídeo.
    """
    if payload.tool != "yt-dlp":
        raise HTTPException(
            status_code=400,
            detail="Endpoint /download/url apenas suporta yt-dlp"
        )

    logger.info(f"Download URL request: {payload.url}")

    try:
        fmt = payload.format or "mp4"
        result = execute_ytdlp(str(payload.url), download_file=False, output_format=fmt)
        direct_url = result.get("direct_url")
        thumbnail_url = result.get("thumbnail_url")
        return DownloadResponse(
            success=True,
            message="URL obtida com sucesso",
            direct_url=direct_url,
            thumbnail_url=thumbnail_url,
            tool_used="yt-dlp",
            format=fmt
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter URL: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/download/gallery/zip")
async def download_gallery_zip(
    request: DownloadRequest,
    api_key: str = Security(validate_api_key)
):
    """Baixa todos os itens do carrossel/galeria, gera ZIP e retorna o arquivo"""
    if request.tool != "gallery-dl":
        raise HTTPException(status_code=400, detail="Use tool=gallery-dl para este endpoint")

    logger.info(f"Download Gallery ZIP: {request.url}")
    result = execute_gallery_dl(str(request.url))
    download_dir = Path(result["download_dir"])
    zip_path = zip_directory(download_dir)

    return FileResponse(
        path=zip_path,
        media_type="application/zip",
        filename=zip_path.name,
        headers={
            "X-File-Size": get_file_size(zip_path),
            "X-Tool-Used": "gallery-dl",
            "X-Total-Files": str(len(result.get("files", [])))
        }
    )


@app.post("/download/gallery/urls", response_model=DownloadResponse)
async def download_gallery_urls(
    request: DownloadRequest,
    api_key: str = Security(validate_api_key)
):
    """Retorna URLs diretas das imagens do carrossel/galeria sem baixar nada"""
    if request.tool != "gallery-dl":
        raise HTTPException(status_code=400, detail="Use tool=gallery-dl para este endpoint")

    logger.info(f"Gallery URLs request: {request.url}")
    urls = execute_gallery_dl_urls(str(request.url))

    return DownloadResponse(
        success=True,
        message=f"{len(urls)} URL(s) obtidas com sucesso",
        tool_used="gallery-dl",
        direct_urls=urls
    )


@app.post("/convert/hls")
async def convert_hls_to_mp4(
    url: HttpUrl = Query(..., description="URL HLS (.m3u8)"),
    api_key: str = Security(validate_api_key)
):
    """
    Converte um link HLS (.m3u8) em MP4 usando yt-dlp+ffmpeg.
    Ideal para casos onde só há stream HLS disponível.
    """
    logger.info(f"Convert HLS request: {url}")
    try:
        result = execute_ytdlp(str(url), download_file=True, output_format="mp4")
        file_path = Path(result["file_path"])
        return FileResponse(
            path=file_path,
            media_type="video/mp4",
            filename=file_path.name,
            headers={
                "X-File-Size": result["file_size"],
                "X-Tool-Used": "yt-dlp",
                "X-Format": result.get("format", "mp4")
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro na conversão HLS: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/download/stream")
async def download_stream(
    url: str = Query(..., description="URL do vídeo"),
    format: Literal["mp4", "webm", "best"] = Query(default="mp4"),
    allow_merge: bool = Query(default=False, description="Permite mesclar vídeo+áudio em temp file para melhor qualidade"),
    api_key: str = Security(validate_api_key)
):
    """
    Faz download e retorna o arquivo via streaming (sem salvar no disco).
    Suporta apenas yt-dlp. Se allow_merge=true, baixa melhor qualidade (merge) e apaga o temp após envio.
    """
    logger.info(f"Download Stream request: {url} fmt={format}")
    try:
        if allow_merge:
            merged = stream_ytdlp_merge(url, output_format=format if format != "best" else "mp4")
            headers = {
                "X-Tool-Used": "yt-dlp",
                "X-Format": merged.get("format", format),
                "X-File-Size": str(merged.get("size", 0)),
                "Content-Disposition": f'attachment; filename="video_merge.{merged.get("format", format)}"'
            }
            return StreamingResponse(
                merged["file_path"].open("rb"),
                media_type=merged["mime"],
                headers=headers,
                background=BackgroundTask(merged["file_path"].unlink, missing_ok=True)
            )
        else:
            result = stream_ytdlp(url, output_format=format)
            headers = {
                "X-Tool-Used": "yt-dlp",
                "X-Format": result.get("format", format),
                "X-File-Size": str(result.get("size", 0)),
                "Content-Disposition": f'attachment; filename="video_stream.{result.get("format", format)}"'
            }
            return StreamingResponse(
                BytesIO(result["data"]),
                media_type=result["mime"],
                headers=headers
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no stream: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
