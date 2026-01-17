# Setup Local - macOS

Guia para rodar a API no Mac e conectar ao n8n.

## 1. Setup automático (recomendado)
```bash
./scripts/dev/setup_macos.sh
```
O script instala dependências, cria `venv`, `.env`, `config/cookies/cookies.txt` e `downloads/`.

## 2. Iniciar a API
```bash
./scripts/dev/run_api.sh
# ou manualmente
source venv/bin/activate
python -m backend.main
```
API em `http://localhost:${PORT:-8000}` e UI em `/ui`.

## 3. Testes rápidos
```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/download \
  -H "X-API-Key: $(grep -E '^API_KEY=' .env | cut -d'=' -f2)" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "tool": "yt-dlp", "format": "mp4"}'
```
Para baixar o arquivo direto:
```bash
curl -X POST "http://localhost:8000/download/binary?url=https://www.youtube.com/watch?v=jNQXAC9IVRw&tool=yt-dlp&format=mp4" \
  -H "X-API-Key: $(grep -E '^API_KEY=' .env | cut -d'=' -f2)" \
  --output video.mp4
```

## 4. Configurar n8n
1. Credential Header Auth → `X-API-Key` com sua chave.
2. Nó HTTP Request (POST) para `http://localhost:8000/download` com body JSON `{"url": "...", "tool": "yt-dlp"}`.
3. Para receber binário direto use `POST /download/binary`.

## 5. Cookies
- Caminho padrão: `config/cookies/cookies.txt`
- Cookies por domínio: `config/cookies/www.tiktok.com_cookies.txt`, etc.
- Formato Netscape; arquivos vazios são ignorados.

## 6. Troubleshooting
- **Porta 8000 em uso:** `kill -9 $(lsof -t -i:8000)` ou mude `PORT` no `.env`.
- **API Key inválida:** confira `.env` ou variável `API_KEY` exportada.
- **yt-dlp/gallery-dl não encontrado:** `brew install yt-dlp ffmpeg` e `pip3 install gallery-dl`.
- **Downloads não aparecem:** verifique permissões do diretório `downloads/` e os logs no terminal.
