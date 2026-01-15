# Setup Local - macOS

Guia para rodar a API localmente no seu Mac e testar com n8n.

## 1. Instalar Dependências

### Homebrew (se não tiver)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Python 3, yt-dlp e FFmpeg
```bash
# Instalar via Homebrew
brew install python@3.12 ffmpeg yt-dlp

# Instalar gallery-dl via pip
pip3 install gallery-dl
```

## 2. Setup do Projeto

```bash
# Ir para o diretório do projeto
cd ~/Downloads/n8n-download-bridge

# Criar ambiente virtual Python
python3 -m venv venv

# Ativar ambiente virtual
source venv/bin/activate

# Instalar dependências Python
pip install -r requirements.txt

# Criar arquivo .env
cat > .env << 'EOF'
API_KEY=minha-chave-teste-local-123
PORT=8000
HOST=0.0.0.0
EOF

# Criar cookies.txt vazio (adicione cookies depois se precisar)
touch cookies.txt
```

## 3. Rodar a API

```bash
# Ativar ambiente virtual (se não estiver ativo)
source venv/bin/activate

# Rodar a API
python main.py
```

Você verá algo como:
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**A API está rodando em:** `http://localhost:8000`

## 4. Testar a API

### Abra outro terminal e teste:

```bash
# Health check
curl http://localhost:8000/health

# Teste de download (obter URL direta)
curl -X POST http://localhost:8000/download \
  -H "X-API-Key: minha-chave-teste-local-123" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "tool": "yt-dlp",
    "get_direct_url": true
  }'
```

## 5. Configurar n8n Local

### Se você não tem n8n instalado:
```bash
# Instalar n8n via npm
npm install -g n8n

# Rodar n8n
n8n start
```

Acesse: `http://localhost:5678`

### Configurar credencial no n8n:

1. No n8n, vá em **Settings** (canto inferior) → **Credentials**
2. Clique em **Add Credential**
3. Procure por **Header Auth**
4. Configure:
   - **Credential name:** `Download Bridge Local`
   - **Name:** `X-API-Key`
   - **Value:** `minha-chave-teste-local-123`
5. Clique em **Save**

### Criar workflow de teste:

1. Crie um novo workflow
2. Adicione nó **Manual Trigger** (para testar manualmente)
3. Adicione nó **HTTP Request**:
   - **Method:** POST
   - **URL:** `http://localhost:8000/download`
   - **Authentication:** Header Auth
   - **Credential for Header Auth:** Selecione "Download Bridge Local"
   - **Send Body:** Yes
   - **Body Content Type:** JSON
   - **Specify Body:** Using JSON
   - **JSON:**
   ```json
   {
     "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
     "tool": "yt-dlp",
     "get_direct_url": true
   }
   ```
4. Conecte os nós
5. Clique em **Execute Workflow**

### Resposta esperada:
```json
{
  "success": true,
  "message": "URL direta obtida com sucesso",
  "direct_url": "https://rr3---sn-...",
  "file_path": null,
  "stderr": null
}
```

## 6. Testar com Diferentes URLs

### YouTube
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "tool": "yt-dlp",
  "get_direct_url": true
}
```

### Twitter/X (requer cookies)
```json
{
  "url": "https://twitter.com/usuario/status/123456",
  "tool": "yt-dlp",
  "get_direct_url": false
}
```

### Instagram (requer cookies)
```json
{
  "url": "https://www.instagram.com/p/ABC123/",
  "tool": "gallery-dl",
  "get_direct_url": false
}
```

## 7. Adicionar Cookies (se necessário)

Alguns sites requerem autenticação. Para exportar cookies:

### Chrome/Edge:
1. Instale a extensão: [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
2. Vá para o site (ex: Twitter, Instagram)
3. Clique na extensão e clique em "Export"
4. Salve como `cookies.txt` no diretório do projeto

### Firefox:
1. Instale a extensão: [cookies.txt](https://addons.mozilla.org/firefox/addon/cookies-txt/)
2. Vá para o site
3. Clique na extensão e exporte

## 8. Parar a API

No terminal onde a API está rodando:
- Pressione `CTRL+C`

## Troubleshooting

### Porta 8000 já está em uso
```bash
# Verificar o que está usando a porta
lsof -i :8000

# Matar o processo (substitua PID pelo número mostrado)
kill -9 PID

# Ou use outra porta
# Edite .env e mude PORT=8001
# E use http://localhost:8001 nas URLs
```

### yt-dlp não encontrado
```bash
# Instalar via Homebrew
brew install yt-dlp

# Ou via pip
pip3 install yt-dlp
```

### Erro de permissão
```bash
# Dar permissão de execução
chmod +x test_api.sh
```

### Verificar se tudo está instalado
```bash
# Python
python3 --version

# yt-dlp
yt-dlp --version

# gallery-dl
gallery-dl --version

# ffmpeg
ffmpeg -version
```

## Workflow Completo de Teste

```
1. Terminal 1: Rodar a API
   cd ~/Downloads/n8n-download-bridge
   source venv/bin/activate
   python main.py

2. Terminal 2: Rodar n8n (se não estiver rodando)
   n8n start

3. Browser: Configurar n8n
   http://localhost:5678
   - Criar credencial Header Auth
   - Criar workflow de teste
   - Executar e ver resultado

4. Para parar:
   CTRL+C em ambos os terminais
```

## Próximos Passos

Depois de testar localmente e confirmar que funciona:
1. Siga o **DEPLOY.md** para subir na VPS
2. Mude a URL no n8n de `localhost:8000` para `http://seu-servidor:8000`
3. Atualize a API_KEY na credencial do n8n
