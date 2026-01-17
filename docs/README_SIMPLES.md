# n8n Download Bridge - Guia Simplificado 🚀

API HTTP em Python para baixar vídeos/imagens via `yt-dlp` e `gallery-dl`, pronta para integrar com n8n.

## Teste Local (3 minutos)

### 1) Dependências rápidas
```bash
cd ~/Downloads/n8n-download-bridge
brew install python3 ffmpeg yt-dlp
pip3 install gallery-dl
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp config/.env.example .env
mkdir -p config/cookies
: > config/cookies/cookies.txt
```

### 2) Rodar API
```bash
source venv/bin/activate
python -m backend.main
```
API em **http://localhost:8000**.

### 3) Testar
```bash
# Health check
curl http://localhost:8000/health

# Baixar vídeo do YouTube
curl -X POST http://localhost:8000/download \
  -H "X-API-Key: minha-chave-teste-local-123" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "tool": "yt-dlp", "format": "mp4"}'
```
**Resposta típica:**
```json
{
  "success": true,
  "message": "Download concluído com sucesso",
  "file_path": "/abs/path/downloads/video_20260116_095946.mp4",
  "file_size": "120.4MB",
  "direct_url": null,
  "tool_used": "yt-dlp",
  "format": "mp4",
  "direct_urls": null
}
```

Para baixar o binário direto:
```bash
curl -X POST "http://localhost:8000/download/binary?url=https://www.youtube.com/watch?v=jNQXAC9IVRw&tool=yt-dlp&format=mp4" \
  -H "X-API-Key: minha-chave-teste-local-123" \
  --output video.mp4
```

## Integração com n8n (resumo)
1. Crie credencial Header Auth com `X-API-Key` = sua chave.
2. Nó HTTP Request (POST) para `/download` com body JSON: `{ "url": "...", "tool": "yt-dlp" }`.
3. Use `/download/binary` se precisar do arquivo binário direto.

## Parâmetros
- `url` (obrigatório): URL do conteúdo
- `tool`: `yt-dlp` ou `gallery-dl`
- `format` (yt-dlp): `mp4`, `webm` ou `best`

## Pastas principais
```
backend/              # Código FastAPI
config/.env.example   # Modelo de env
config/cookies/       # cookies.txt e cookies por domínio
docs/                 # Documentação
frontend/             # UI opcional (/ui)
infra/                # Dockerfile, docker-compose, PM2
scripts/              # Dev e testes
```

## Dúvidas rápidas
- **API Key inválida:** confira `.env`
- **Porta em uso:** `kill -9 $(lsof -t -i:8000)`
- **Cookies:** salve em `config/cookies/cookies.txt` (formato Netscape)
