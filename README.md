# n8n Download Bridge API

API HTTP em Python (FastAPI) para atuar como ponte de download entre n8n e servidor, usando yt-dlp e gallery-dl.

## Funcionalidades

- Endpoint `/download` para processar URLs com yt-dlp ou gallery-dl
- Autenticação via API Key (header `X-API-Key`)
- Suporte automático para cookies.txt
- Retorna URL direta ou faz download completo
- Health check endpoint
- Docker e PM2 prontos para produção

## Estrutura do Projeto

```
n8n-download-bridge/
├── main.py                 # Aplicação FastAPI
├── requirements.txt        # Dependências Python
├── Dockerfile             # Imagem Docker
├── docker-compose.yml     # Orquestração Docker
├── ecosystem.config.js    # Configuração PM2
├── .env.example           # Exemplo de variáveis de ambiente
├── cookies.txt            # Seus cookies (criar manualmente)
└── downloads/             # Diretório de downloads (criado automaticamente)
```

## Instalação

### Método 1: Docker (Recomendado)

#### Pré-requisitos
```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo apt install docker-compose-plugin -y

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker
```

#### Deploy com Docker

```bash
# 1. Clonar ou criar o diretório
mkdir -p ~/n8n-download-bridge
cd ~/n8n-download-bridge

# 2. Copiar todos os arquivos para o diretório

# 3. Configurar variável de ambiente
cp .env.example .env
nano .env  # Editar e adicionar sua API_KEY

# 4. Criar arquivo de cookies (opcional)
touch cookies.txt
# Cole seus cookies no formato Netscape

# 5. Construir e iniciar
docker-compose up -d

# 6. Verificar logs
docker-compose logs -f

# 7. Testar
curl http://localhost:8000/health
```

#### Comandos úteis Docker

```bash
# Ver logs
docker-compose logs -f download-bridge

# Reiniciar
docker-compose restart

# Parar
docker-compose down

# Reconstruir após mudanças
docker-compose up -d --build

# Atualizar yt-dlp dentro do container
docker-compose exec download-bridge yt-dlp -U
```

### Método 2: PM2 (Deploy direto no sistema)

#### Pré-requisitos

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Python 3.12 e pip
sudo apt install python3.12 python3.12-venv python3-pip -y

# Instalar Node.js e PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# Instalar FFmpeg
sudo apt install ffmpeg -y

# Instalar yt-dlp (2026)
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp

# Instalar gallery-dl
sudo pip3 install -U gallery-dl
```

#### Deploy com PM2

```bash
# 1. Criar diretório
mkdir -p ~/n8n-download-bridge
cd ~/n8n-download-bridge

# 2. Copiar todos os arquivos para o diretório

# 3. Criar ambiente virtual Python
python3 -m venv venv
source venv/bin/activate

# 4. Instalar dependências
pip install -r requirements.txt

# 5. Configurar variável de ambiente
cp .env.example .env
nano .env  # Editar API_KEY

# 6. Criar arquivo de cookies (opcional)
touch cookies.txt

# 7. Criar diretório de logs
mkdir -p logs

# 8. Editar ecosystem.config.js
nano ecosystem.config.js
# Ajustar o caminho 'cwd' e 'API_KEY'

# 9. Iniciar com PM2
pm2 start ecosystem.config.js

# 10. Salvar configuração PM2
pm2 save

# 11. Configurar PM2 para iniciar no boot
pm2 startup
# Execute o comando que aparecer na tela

# 12. Testar
curl http://localhost:8000/health
```

#### Comandos úteis PM2

```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs n8n-download-bridge

# Reiniciar
pm2 restart n8n-download-bridge

# Parar
pm2 stop n8n-download-bridge

# Remover
pm2 delete n8n-download-bridge

# Monitoramento
pm2 monit

# Atualizar yt-dlp
sudo yt-dlp -U

# Atualizar gallery-dl
sudo pip3 install -U gallery-dl
```

## Configuração do cookies.txt

Para sites que requerem autenticação, exporte seus cookies usando extensões de navegador:

1. Chrome/Edge: [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
2. Firefox: [cookies.txt](https://addons.mozilla.org/firefox/addon/cookies-txt/)

Salve o arquivo como `cookies.txt` no diretório raiz do projeto.

## Uso da API

### Endpoints

#### GET /
Informações básicas da API

#### GET /health
Health check da API e ferramentas instaladas

```bash
curl http://seu-servidor:8000/health
```

#### POST /download
Endpoint principal para downloads

**Headers:**
```
X-API-Key: sua-chave-secreta-aqui
Content-Type: application/json
```

**Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=exemplo",
  "tool": "yt-dlp",
  "get_direct_url": true,
  "output_template": "%(title)s.%(ext)s"
}
```

**Parâmetros:**
- `url` (string, obrigatório): URL do conteúdo
- `tool` (string, obrigatório): "yt-dlp" ou "gallery-dl"
- `get_direct_url` (bool, opcional): Se true, retorna apenas URL direta sem baixar (padrão: true, apenas yt-dlp)
- `output_template` (string, opcional): Template de nome do arquivo

**Resposta:**
```json
{
  "success": true,
  "message": "URL direta obtida com sucesso",
  "direct_url": "https://...",
  "file_path": null,
  "stderr": null
}
```

### Exemplos de uso

#### Obter URL direta (yt-dlp)
```bash
curl -X POST http://localhost:8000/download \
  -H "X-API-Key: sua-chave-secreta-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "tool": "yt-dlp",
    "get_direct_url": true
  }'
```

#### Baixar vídeo (yt-dlp)
```bash
curl -X POST http://localhost:8000/download \
  -H "X-API-Key: sua-chave-secreta-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "tool": "yt-dlp",
    "get_direct_url": false,
    "output_template": "%(title)s-%(id)s.%(ext)s"
  }'
```

#### Baixar galeria (gallery-dl)
```bash
curl -X POST http://localhost:8000/download \
  -H "X-API-Key: sua-chave-secreta-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://imgur.com/gallery/exemplo",
    "tool": "gallery-dl"
  }'
```

## Integração com n8n

### Configurar nó HTTP Request no n8n

1. Adicione um nó "HTTP Request"
2. Configure:
   - **Method:** POST
   - **URL:** `http://seu-servidor:8000/download`
   - **Authentication:** Generic Credential Type → Header Auth
   - **Header Name:** `X-API-Key`
   - **Header Value:** `sua-chave-secreta-aqui`
   - **Body Content Type:** JSON
   - **Body:**
   ```json
   {
     "url": "{{ $json.url }}",
     "tool": "yt-dlp",
     "get_direct_url": true
   }
   ```

3. A resposta terá o campo `direct_url` que você pode usar em nós seguintes

### Exemplo de workflow n8n

```
Webhook (recebe URL)
  → HTTP Request (chama /download)
  → IF (verifica success)
  → HTTP Request (usa direct_url para processar)
```

## Firewall e Segurança

```bash
# Permitir porta 8000 (se usar UFW)
sudo ufw allow 8000/tcp

# Ou usar apenas via localhost e proxy reverso (recomendado)
# Configure nginx ou caddy como proxy reverso
```

### Exemplo Nginx proxy reverso

```nginx
server {
    listen 80;
    server_name download-api.seu-dominio.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout para downloads longos
        proxy_read_timeout 600s;
    }
}
```

## Manutenção

### Atualizar dependências

```bash
# Docker
docker-compose pull
docker-compose up -d --build

# PM2
cd ~/n8n-download-bridge
source venv/bin/activate
pip install -U -r requirements.txt
pm2 restart n8n-download-bridge
```

### Backup

```bash
# Backup essencial (cookies e .env)
tar -czf backup-$(date +%Y%m%d).tar.gz cookies.txt .env downloads/
```

### Monitoramento

```bash
# Verificar uso de recursos (Docker)
docker stats n8n-download-bridge

# Verificar uso de recursos (PM2)
pm2 monit

# Verificar logs de erro
tail -f logs/error.log  # PM2
docker-compose logs -f  # Docker
```

## Troubleshooting

### Erro 403 (Forbidden)
- Verifique se o header `X-API-Key` está correto
- Confirme que a API_KEY está configurada no .env ou docker-compose.yml

### Erro ao baixar vídeo
- Verifique se yt-dlp está atualizado: `yt-dlp -U` (ou dentro do container)
- Teste manualmente: `yt-dlp -g URL`
- Verifique se cookies.txt está correto e acessível

### Container não inicia
- Verifique logs: `docker-compose logs`
- Verifique permissões do arquivo cookies.txt
- Confirme que a porta 8000 não está em uso

### PM2 não reinicia após reboot
- Execute: `pm2 startup` e siga as instruções
- Salve configuração: `pm2 save`

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `API_KEY` | Chave de autenticação | `sua-chave-secreta-aqui` |
| `PORT` | Porta da aplicação | `8000` |
| `HOST` | Host da aplicação | `0.0.0.0` |

## Licença

MIT

## Suporte

Para problemas ou dúvidas, consulte a documentação oficial:
- [FastAPI](https://fastapi.tiangolo.com/)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [gallery-dl](https://github.com/mikf/gallery-dl)
