# Guia Rápido de Deploy - Ubuntu VPS 2026

## Instalação Rápida com Docker (5 minutos)

### 1) Instalar Docker
```bash
ssh usuario@seu-servidor
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
sudo apt install docker-compose-plugin -y
```

### 2) Preparar projeto
```bash
mkdir -p ~/n8n-download-bridge
cd ~/n8n-download-bridge

# Copie os arquivos do projeto (scp/git)

cp config/.env.example .env
mkdir -p config/cookies downloads
: > config/cookies/cookies.txt
```

### 3) Subir containers
```bash
docker compose -f infra/docker-compose.yml up -d

# Logs
docker compose -f infra/docker-compose.yml logs -f
```

### 4) Testar
```bash
curl http://localhost:8000/health

curl -X POST http://localhost:8000/download \
  -H "X-API-Key: SuaChaveSecreta" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "tool": "yt-dlp"}'
```

## Configurar Firewall
```bash
sudo ufw allow 8000/tcp
sudo ufw enable
```

## Proxy Reverso com Nginx (opcional)
```nginx
server {
    listen 80;
    server_name api-download.seu-dominio.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 600s;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        client_max_body_size 50M;
    }
}
```

## n8n
1. Credential Header Auth → `X-API-Key` com sua chave.
2. Nó HTTP Request (POST) para `http://seu-servidor:8000/download` com body JSON:
```json
{
  "url": "={{ $json.video_url }}",
  "tool": "yt-dlp",
  "format": "mp4"
}
```
3. Para binário direto use `POST /download/binary`.

## Comandos úteis
```bash
# Logs
docker compose -f infra/docker-compose.yml logs -f

# Reiniciar
docker compose -f infra/docker-compose.yml restart

# Parar
docker compose -f infra/docker-compose.yml down

# Atualizar imagem
docker compose -f infra/docker-compose.yml up -d --build

# Backup
tar -czf backup-$(date +%Y%m%d).tar.gz config/cookies/. .env downloads/

# Atualizar yt-dlp dentro do container
docker compose -f infra/docker-compose.yml exec download-bridge yt-dlp -U
```

## Manutenção/monitoramento
```bash
df -h
.du -sh downloads
docker stats download-bridge
```

## Auto-limpeza de downloads (opcional)
```bash
0 3 * * * find ~/n8n-download-bridge/downloads -type f -mtime +7 -delete
```

## Deploy via systemd (sem Docker)
Pensado para VPS Ubuntu/Debian.

1) Copie o projeto para o servidor (ex.: `/opt/n8n-download-bridge`).
2) Execute como root/sudo:
```bash
cd /opt/n8n-download-bridge
sudo ./scripts/deploy/setup_vps.sh /opt/n8n-download-bridge
```
3) Ajuste `.env` (copiado de `config/.env.example`), reinicie:
```bash
sudo systemctl restart n8n-download-bridge
sudo journalctl -u n8n-download-bridge -f
```

O template da unit está em `infra/systemd/n8n-download-bridge.service` (usa `APP_DIR` e `RUN_AS_USER/RUN_AS_GROUP` via `envsubst`).

## Atualização contínua (yt-dlp/gallery-dl)
- Script: `./scripts/dev/update_downloaders.sh` (atualiza pip + dá pull nos clones `yt-dlp-master` e `gallery-dl-master` se forem git).
- Crie um cron para atualizar semanalmente e reiniciar o serviço:
```bash
0 4 * * 1 /opt/n8n-download-bridge/scripts/dev/update_downloaders.sh && systemctl restart n8n-download-bridge
```
- Para atualizar app + deps: `git pull && ./scripts/dev/update_downloaders.sh && pip install -r requirements.txt && systemctl restart n8n-download-bridge`.
