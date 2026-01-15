from fastapi import FastAPI, HTTPException, Security, status, Query
from fastapi.security import APIKeyHeader
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, HttpUrl
import subprocess
import os
import json
from pathlib import Path
from typing import Literal, Optional
import logging
from datetime import datetime
from dotenv import load_dotenv

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configurações
load_dotenv()
API_KEY = os.getenv("API_KEY", "sua-chave-secreta-aqui")
DOWNLOADS_DIR = Path("./downloads")
COOKIES_FILE = Path("./cookies.txt")


def get_cookies_args() -> list[str]:
    """
    Retorna os argumentos de cookies para yt-dlp/gallery-dl
    Ignora arquivos vazios ou com formato inválido para evitar erro 500.
    """
    if not COOKIES_FILE.exists():
        return []

    try:
        if COOKIES_FILE.stat().st_size == 0:
            logger.info("cookies.txt está vazio; ignorando cookies.")
            return []

        # Checagem simples de formato Netscape
        with COOKIES_FILE.open("r", encoding="utf-8", errors="ignore") as f:
            head = f.read(200)
            if "HTTP Cookie File" not in head and "# Netscape" not in head:
                logger.warning("cookies.txt não parece Netscape; ignorando cookies.")
                return []

        return ["--cookies", str(COOKIES_FILE)]
    except Exception as exc:
        logger.warning(f"Não foi possível ler cookies.txt, ignorando: {exc}")
        return []

# Criar diretório de downloads se não existir
DOWNLOADS_DIR.mkdir(exist_ok=True)

# FastAPI app
app = FastAPI(
    title="N8N Download Bridge API",
    description="API para download de vídeos e imagens via yt-dlp e gallery-dl",
    version="2.0.0"
)

# Security
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)

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
    tool_used: str
    format: Optional[str] = None

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
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_template = str(DOWNLOADS_DIR / f"video_{timestamp}.%(ext)s")
    
    # Comando base
    cmd = ["yt-dlp"]
    
    # Adicionar cookies se existir
    cmd.extend(get_cookies_args())
    
    if download_file:
        # Configurar formato de acordo com a preferência
        if output_format == "mp4":
            cmd.extend([
                '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                '--merge-output-format', 'mp4'
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
        # Modo URL direta
        cmd.extend(['-g', '-f', 'best'])
    
    cmd.append(str(url))
    
    logger.info(f"Executando: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            check=True
        )
        
        if download_file:
            # Procurar arquivo baixado
            downloaded_files = list(DOWNLOADS_DIR.glob(f"video_{timestamp}.*"))
            if downloaded_files:
                file_path = downloaded_files[0]
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
            # Retornar URL direta
            direct_url = result.stdout.strip().split('\n')[0]
            return {
                "success": True,
                "direct_url": direct_url,
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

def execute_gallery_dl(url: str) -> dict:
    """Executa gallery-dl e retorna informações do download"""
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = DOWNLOADS_DIR / f"gallery_{timestamp}"
    output_dir.mkdir(exist_ok=True)
    
    cmd = ["gallery-dl"]
    
    # Adicionar cookies se existir
    cmd.extend(get_cookies_args())
    
    cmd.extend([
        "-d", str(output_dir),
        "--write-metadata",
        str(url)
    ])
    
    logger.info(f"Executando: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            check=True
        )
        
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

# Endpoints
@app.get("/")
async def root():
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
        "cookies_file_exists": COOKIES_FILE.exists()
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
            
            return FileResponse(
                path=file_path,
                media_type="video/mp4" if format == "mp4" else "video/webm",
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

@app.post("/download/url", response_model=DownloadResponse)
async def download_url(
    request: DownloadRequest,
    api_key: str = Security(validate_api_key)
):
    """
    Retorna a URL direta do vídeo sem fazer download.
    Apenas funciona com yt-dlp.
    Ideal para: quando você quer apenas o link direto do vídeo.
    """
    if request.tool != "yt-dlp":
        raise HTTPException(
            status_code=400,
            detail="Endpoint /download/url apenas suporta yt-dlp"
        )
    
    logger.info(f"Download URL request: {request.url}")
    
    try:
        result = execute_ytdlp(str(request.url), download_file=False)
        return DownloadResponse(
            success=True,
            message="URL obtida com sucesso",
            direct_url=result.get("direct_url"),
            tool_used="yt-dlp"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao obter URL: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
