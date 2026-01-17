# Quick Start - Teste Local em 3 Minutos ⚡

Testado no macOS. Siga abaixo ou use os scripts em `scripts/dev/`.

## 1. Setup rápido
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
mkdir -p downloads
```

## 2. Iniciar API
```bash
source venv/bin/activate
python -m backend.main
```
Logs esperados:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

## 3. Testar (outro terminal)
### Health Check
```bash
curl http://localhost:8000/health
```

### Download de vídeo (JSON)
```bash
curl -X POST http://localhost:8000/download \
  -H "X-API-Key: minha-chave-teste-local-123" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "tool": "yt-dlp", "format": "mp4"}'
```

### Download binário direto
```bash
curl -X POST "http://localhost:8000/download/binary?url=https://www.youtube.com/watch?v=jNQXAC9IVRw&tool=yt-dlp&format=mp4" \
  -H "X-API-Key: minha-chave-teste-local-123" \
  --output video.mp4
```

### Apenas URL direta (sem download)
```bash
curl -X POST http://localhost:8000/download/url \
  -H "X-API-Key: minha-chave-teste-local-123" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "tool": "yt-dlp"}'
```

## 4. n8n básico
1. Credential Header Auth: `Name = X-API-Key`, `Value = sua-chave`.
2. Nó HTTP Request (POST) → URL `http://localhost:8000/download` → Body JSON com `url` e `tool`.
3. Para arquivo binário direto use `POST /download/binary`.

## 5. Parar API
CTRL+C no terminal onde rodou o Uvicorn.

## Comandos úteis
```bash
# Ver se API está rodando
lsof -i :8000

# Listar downloads
ls -lh downloads/

# Atualizar yt-dlp
yt-dlp -U
```

## Cookies (opcional)
- Salve em `config/cookies/cookies.txt` no formato Netscape
- Cookies específicos por domínio podem ser salvos como `config/cookies/www.tiktok.com_cookies.txt` etc.
