# n8n Download Bridge - Guia Simplificado 🚀

API HTTP em Python para baixar vídeos/imagens via yt-dlp e gallery-dl, perfeita para integração com n8n.

## ✨ O que faz?

Você envia uma URL → A API baixa o arquivo → Retorna URL para você acessar o arquivo

**Funciona sem cookies** para sites públicos como YouTube!

## 🎯 Teste Local (3 minutos)

### 1. Instalar dependências
```bash
cd ~/Downloads/n8n-download-bridge

# Instalar ferramentas
brew install python3 ffmpeg yt-dlp
pip3 install gallery-dl

# Setup Python
python3 -m venv venv
source venv/bin/activate
pip install fastapi "uvicorn[standard]" python-multipart

# Configuração
cat > .env << 'EOF'
API_KEY=minha-chave-teste-local-123
EOF

touch cookies.txt
```

### 2. Rodar API
```bash
source venv/bin/activate
python main.py
```

Pronto! API rodando em **http://localhost:8000**

### 3. Testar (outro terminal)
```bash
# Health check
curl http://localhost:8000/health

# Baixar vídeo do YouTube
curl -X POST http://localhost:8000/download \
  -H "X-API-Key: minha-chave-teste-local-123" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}'
```

**Resposta:**
```json
{
  "success": true,
  "download_url": "/files/Me%20at%20the%20zoo-jNQXAC9IVRw.webm",
  "filename": "Me at the zoo-jNQXAC9IVRw.webm"
}
```

## 🔧 Integração com n8n

### Configurar Credencial
1. n8n → Settings → Credentials → Add → **Header Auth**
2. Name: `X-API-Key`
3. Value: `minha-chave-teste-local-123`

### Workflow Básico
```
Manual Trigger → HTTP Request (POST /download) → HTTP Request (GET /files/...)
```

**Nó 1 - Fazer Download:**
- Method: POST
- URL: `http://localhost:8000/download`
- Body: `{"url": "https://www.youtube.com/watch?v=..."}`

**Nó 2 - Pegar Arquivo:**
- Method: GET
- URL: `http://localhost:8000{{ $json.download_url }}`
- Response Format: File

## 📋 Parâmetros da API

### Download completo (padrão)
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

### Apenas URL direta (sem download)
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "download_file": false
}
```

### Usar gallery-dl
```json
{
  "url": "https://imgur.com/gallery/ALBUM_ID",
  "tool": "gallery-dl"
}
```

## 🔐 Cookies (Opcional)

Para sites que precisam login (Twitter, Instagram):

1. Instale extensão para exportar cookies
2. Salve como `cookies.txt` no diretório
3. A API usa automaticamente

**Sem cookies:** YouTube, muitos sites públicos funcionam!

## 🚀 Deploy em VPS

Depois de testar localmente, veja **DEPLOY.md** para:
- Rodar 24/7 com Docker
- Configurar firewall
- Adicionar SSL/HTTPS
- Monitoramento

## 📂 Estrutura de Arquivos

```
n8n-download-bridge/
├── main.py              # API (já pronta!)
├── .env                 # Sua API Key
├── cookies.txt          # Cookies (opcional)
├── downloads/           # Arquivos baixados
├── QUICK_START.md       # Guia detalhado
└── DEPLOY.md            # Deploy em VPS
```

## 💡 Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/` | GET | Info da API |
| `/health` | GET | Status e ferramentas |
| `/download` | POST | Fazer download |
| `/files/{filename}` | GET | Servir arquivo |

## 🆘 Troubleshooting

**Porta em uso:**
```bash
kill -9 $(lsof -t -i:8000)
```

**API Key inválida:**
Verifique `.env` existe e tem a chave correta

**yt-dlp não encontrado:**
```bash
brew install yt-dlp
```

## 📚 Próximos Passos

1. ✅ **QUICK_START.md** - Guia passo a passo detalhado
2. ✅ **DEPLOY.md** - Colocar em produção na VPS
3. ✅ **README.md** - Documentação completa da API

## 🎉 Funciona!

Testado e funcionando:
- ✅ macOS local
- ✅ Downloads do YouTube sem cookies
- ✅ Integração com n8n
- ✅ Endpoint para servir arquivos
- ✅ API Key funcionando

**Curtiu?** Siga os guias e coloque em produção!
