# Quick Start - Teste Local em 3 Minutos ⚡

Testado e funcionando no macOS! Vamos lá:

## 1. Setup Rápido

```bash
cd ~/Downloads/n8n-download-bridge

# Instalar dependências do sistema (Homebrew)
brew install python3 ffmpeg yt-dlp
pip3 install gallery-dl

# Criar ambiente virtual e instalar dependências Python
python3 -m venv venv
source venv/bin/activate
pip install fastapi "uvicorn[standard]" python-multipart

# Criar configuração
cat > .env << 'EOF'
API_KEY=minha-chave-teste-local-123
EOF

touch cookies.txt
mkdir -p downloads
```

## 2. Iniciar API

```bash
source venv/bin/activate
python main.py
```

Você verá:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

**API rodando em: http://localhost:8000** ✅

## 3. Testar (abra outro terminal)

### Health Check
```bash
curl http://localhost:8000/health
```

### Download de Vídeo (Download completo)
```bash
curl -X POST http://localhost:8000/download \
  -H "X-API-Key: minha-chave-teste-local-123" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}'
```

**Resposta:**
```json
{
  "success": true,
  "message": "Download concluído com sucesso",
  "download_url": "/files/Me%20at%20the%20zoo-jNQXAC9IVRw.webm",
  "filename": "Me at the zoo-jNQXAC9IVRw.webm"
}
```

### Baixar o arquivo via API
```bash
curl -o video.webm "http://localhost:8000/files/Me%20at%20the%20zoo-jNQXAC9IVRw.webm"
```

### Apenas obter URL direta (sem download)
```bash
curl -X POST http://localhost:8000/download \
  -H "X-API-Key: minha-chave-teste-local-123" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "download_file": false}'
```

## 4. Configurar n8n

### Instalar n8n (se não tiver)
```bash
npm install -g n8n
n8n start
```

Acesse: **http://localhost:5678**

### Criar Credencial no n8n

1. **Settings** (canto inferior) → **Credentials** → **Add Credential**
2. Busque: **Header Auth**
3. Configure:
   - **Credential name:** `Download Bridge Local`
   - **Name:** `X-API-Key`
   - **Value:** `minha-chave-teste-local-123`
4. **Save**

### Criar Workflow de Teste

1. Novo workflow
2. Adicione **Manual Trigger**
3. Adicione **HTTP Request**:
   - **Method:** POST
   - **URL:** `http://localhost:8000/download`
   - **Authentication:** Header Auth
   - **Credential:** Selecione "Download Bridge Local"
   - **Send Body:** Yes
   - **Body Content Type:** JSON
   - **Specify Body:** Using JSON
   - **JSON:**
   ```json
   {
     "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"
   }
   ```
4. Conecte os nós
5. **Execute Workflow**

### Resultado no n8n:
```json
{
  "success": true,
  "message": "Download concluído com sucesso",
  "download_url": "/files/Me%20at%20the%20zoo-jNQXAC9IVRw.webm",
  "filename": "Me at the zoo-jNQXAC9IVRw.webm"
}
```

### Para baixar o arquivo no n8n:

Adicione outro nó **HTTP Request** depois:
- **Method:** GET
- **URL:** `http://localhost:8000{{ $json.download_url }}`
- **Response Format:** File

## 5. Entendendo os Parâmetros

Por padrão, a API **baixa o arquivo** e retorna URL para acessá-lo:

```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID"
}
```

Opções disponíveis:
```json
{
  "url": "https://...",
  "tool": "yt-dlp",           // ou "gallery-dl"
  "download_file": true,       // true = baixa arquivo (padrão)
  "output_template": "..."     // opcional: formato do nome
}
```

**Sem download (apenas URL direta):**
```json
{
  "url": "https://...",
  "download_file": false
}
```

## 6. Parar API

No terminal da API: **CTRL+C**

## Arquivos no Seu Sistema

```
~/Downloads/n8n-download-bridge/
├── downloads/                         # Arquivos baixados ficam aqui
│   └── Me at the zoo-jNQXAC9IVRw.webm
├── main.py                            # Código da API
├── .env                               # Sua API Key
├── cookies.txt                        # Cookies (opcional)
└── venv/                              # Ambiente Python
```

## Troubleshooting

### "Porta 8000 em uso"
```bash
kill -9 $(lsof -t -i:8000)
```

### "Invalid API Key"
Verifique se o .env foi criado:
```bash
cat .env
```

### Ver logs da API
Os logs aparecem no terminal onde você rodou `python main.py`

### Limpar downloads antigos
```bash
rm ~/Downloads/n8n-download-bridge/downloads/*
```

## Próximos Passos

✅ Funcionou localmente? Ótimo!

Agora você pode:
1. Testar com diferentes URLs (YouTube, Twitter, Instagram, etc.)
2. Seguir **DEPLOY.md** para subir na VPS
3. Configurar workflows mais complexos no n8n

## Comandos Úteis

```bash
# Ver se API está rodando
lsof -i :8000

# Health check
curl http://localhost:8000/health

# Listar arquivos baixados
ls -lh downloads/

# Ver logs em tempo real (se rodando em background)
tail -f logs/output.log
```

## Cookies (Opcional)

Para sites que precisam login (Twitter, Instagram, etc.):

1. Instale extensão do navegador para exportar cookies
2. Salve como `cookies.txt` no diretório raiz
3. A API usa automaticamente se existir

**Sem cookies funcionam:** YouTube público, muitos sites públicos
