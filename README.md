# n8n Download Bridge API

API HTTP em Python (FastAPI) que faz ponte entre o n8n e ferramentas de download (`yt-dlp` e `gallery-dl`). Agora o projeto está organizado por pastas para facilitar operação, deploy e testes.

## Estrutura em pastas
```
backend/              # Código FastAPI (entrypoint: backend.main)
config/
  .env.example        # Modelo de variáveis de ambiente
  cookies/            # cookies.txt e cookies por domínio
docs/                 # Guias detalhados (quick start, deploy, etc.)
examples/             # Exemplos de workflow
frontend/             # UI opcional servida em /ui
infra/                # Dockerfile, docker-compose, PM2
scripts/
  dev/                # Scripts de setup/run locais
  tests/              # Testes e smoke tests
requirements.txt      # Dependências Python
downloads/            # Saída dos arquivos baixados
logs/                 # Saída do PM2
```

## Como rodar localmente
1) Crie o `.env` (ou copie `config/.env.example` para `.env`) e ajuste `API_KEY`.
2) Garanta `yt-dlp`, `gallery-dl` e `ffmpeg` instalados no sistema.
3) Crie o venv e instale dependências:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```
4) Garanta o arquivo de cookies (opcional) em `config/cookies/cookies.txt`.
5) Inicie:
```bash
./scripts/dev/run_api.sh
# ou
source venv/bin/activate
python -m backend.main
```

Front-end opcional disponível em `http://localhost:8000/ui`.

### Docker Compose
```bash
docker compose -f infra/docker-compose.yml up -d
```
Pré-crie `config/cookies/cookies.txt` (mesmo vazio) e `downloads/` na raiz; ambos são montados no container. Use `.env` na raiz para `API_KEY`.

### PM2
```bash
pm2 start infra/ecosystem.config.js
pm2 logs n8n-download-bridge
```

## Autenticação
Todas as rotas protegidas exigem header `X-API-Key` com o valor definido em `API_KEY`.

## Endpoints principais
- `GET /` – informações básicas
- `GET /health` – status da API e ferramentas instaladas
- `POST /download` – baixa arquivo e retorna metadados (`file_path`, `file_size`, `tool_used`)
- `POST /download/binary` – retorna o arquivo diretamente (ideal para n8n binary)
- `POST /download/url` – retorna apenas a URL direta (yt-dlp)

Exemplo de download JSON:
```bash
curl -X POST http://localhost:8000/download \
  -H "X-API-Key: sua-chave" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "tool": "yt-dlp", "format": "mp4"}'
```

Exemplo de download binário direto:
```bash
curl -X POST "http://localhost:8000/download/binary?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&tool=yt-dlp&format=mp4" \
  -H "X-API-Key: sua-chave" \
  --output video.mp4
```

## Cookies
- Use `config/cookies/cookies.txt` para cookies padrão.
- Suporte a cookies por domínio (por ex.: `config/cookies/www.tiktok.com_cookies.txt`).
- A API ignora arquivos vazios ou com formato inválido para evitar erro 500.

## Scripts úteis
- `scripts/dev/setup_macos.sh` – instala dependências e prepara `.env/cookies` no macOS
- `scripts/dev/run_api.sh` – ativa o venv e inicia a API
- `scripts/dev/start_api.sh` – mata processo na porta configurada e inicia a API
- `scripts/tests/quick_smoke.sh` – smoke test rápido
- `scripts/tests/full_api_test.sh` – suite de testes via curl

## UI e n8n
- UI: `http://localhost:8000/ui`
- Workflow de exemplo: `examples/n8n-workflow-example.json`

## Documentação extra
Guias detalhados permanecem em `docs/` (Quick Start, Deploy, etc.).
