# Guia Rápido de Deploy - Ubuntu VPS 2026

## Instalação Rápida com Docker (5 minutos)

### Passo 1: Instalar Docker
```bash
# Conectar via SSH na VPS
ssh usuario@seu-servidor

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Instalar Docker Compose
sudo apt install docker-compose-plugin -y
```

### Passo 2: Fazer Deploy da API
```bash
# Criar diretório
mkdir -p ~/n8n-download-bridge
cd ~/n8n-download-bridge

# Subir arquivos via SCP ou git
# Opção 1: SCP do seu computador local
# scp -r /caminho/local/* usuario@seu-servidor:~/n8n-download-bridge/

# Opção 2: Git (se você criar um repositório)
# git clone seu-repositorio.git .

# Criar arquivo .env com sua API Key
cat > .env << 'EOF'
API_KEY=SuaChaveSecretaSuperSegura123!@#
PORT=8000
HOST=0.0.0.0
EOF

# Criar arquivo cookies.txt vazio (adicione cookies depois se necessário)
touch cookies.txt

# Iniciar containers
docker-compose up -d

# Verificar se está funcionando
docker-compose ps
docker-compose logs -f
```

### Passo 3: Testar
```bash
# Health check
curl http://localhost:8000/health

# Teste de download (substitua pela sua API key)
curl -X POST http://localhost:8000/download \
  -H "X-API-Key: SuaChaveSecretaSuperSegura123!@#" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "tool": "yt-dlp",
    "get_direct_url": true
  }'
```

## Configurar Firewall

```bash
# Permitir porta 8000 (se não usar proxy reverso)
sudo ufw allow 8000/tcp
sudo ufw enable
```

## Proxy Reverso com Nginx (Opcional mas Recomendado)

### Instalar Nginx
```bash
sudo apt install nginx -y
```

### Configurar Nginx
```bash
sudo nano /etc/nginx/sites-available/download-bridge
```

Cole:
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

        # Limites para uploads grandes
        client_max_body_size 50M;
    }
}
```

Ativar:
```bash
sudo ln -s /etc/nginx/sites-available/download-bridge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Permitir Nginx no firewall
sudo ufw allow 'Nginx Full'
```

### Adicionar SSL com Certbot (HTTPS)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api-download.seu-dominio.com
```

## Configuração n8n

### Credencial HTTP Request

1. No n8n, vá em **Credentials** → **New**
2. Escolha **Header Auth**
3. Configure:
   - **Name:** Download Bridge API
   - **Header Name:** `X-API-Key`
   - **Header Value:** `SuaChaveSecretaSuperSegura123!@#`
4. Salve

### Nó HTTP Request

1. Adicione um nó **HTTP Request**
2. Configure:
   - **Method:** POST
   - **URL:** `http://seu-servidor:8000/download` (ou `https://api-download.seu-dominio.com/download` se usar nginx)
   - **Authentication:** Use a credencial criada acima
   - **Send Body:** Yes
   - **Body Content Type:** JSON
   - **Specify Body:** Using JSON
   - **JSON:**
   ```json
   {
     "url": "={{ $json.video_url }}",
     "tool": "yt-dlp",
     "get_direct_url": true
   }
   ```

## Comandos Úteis

```bash
# Ver logs em tempo real
docker-compose logs -f

# Reiniciar API
docker-compose restart

# Parar tudo
docker-compose down

# Atualizar API após mudanças
docker-compose up -d --build

# Ver uso de recursos
docker stats

# Backup de cookies e configuração
tar -czf backup-$(date +%Y%m%d).tar.gz cookies.txt .env

# Atualizar yt-dlp no container
docker-compose exec download-bridge yt-dlp -U
docker-compose restart
```

## Monitoramento

### Ver logs de erro
```bash
docker-compose logs --tail=100 -f download-bridge
```

### Verificar espaço em disco
```bash
df -h
du -sh ~/n8n-download-bridge/downloads
```

### Auto-limpeza de downloads antigos (opcional)
```bash
# Criar cron job para limpar downloads com mais de 7 dias
crontab -e

# Adicionar linha:
0 3 * * * find ~/n8n-download-bridge/downloads -type f -mtime +7 -delete
```

## Troubleshooting Rápido

### Erro 403
→ Verifique se a API_KEY está correta no n8n

### Container não inicia
```bash
docker-compose logs
# Verifique erros e permissões
```

### Downloads falham
```bash
# Testar yt-dlp manualmente
docker-compose exec download-bridge yt-dlp --version
docker-compose exec download-bridge yt-dlp -g "URL_TESTE"
```

### Porta 8000 em uso
```bash
sudo lsof -i :8000
# Mude a porta no docker-compose.yml: "8001:8000"
```

## Atualizações

### Atualizar código da API
```bash
cd ~/n8n-download-bridge
# Baixar novos arquivos (git pull ou scp)
docker-compose up -d --build
```

### Atualizar ferramentas
```bash
# Reconstruir imagem Docker (pega últimas versões)
docker-compose build --no-cache
docker-compose up -d
```

## Checklist Pós-Deploy

- [ ] API responde no health check
- [ ] Teste de download funciona
- [ ] Firewall configurado
- [ ] Nginx proxy reverso (opcional)
- [ ] SSL/HTTPS configurado (opcional)
- [ ] n8n consegue se conectar
- [ ] Logs sendo gerados corretamente
- [ ] Backup automático configurado
- [ ] Monitoramento configurado
