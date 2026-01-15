#!/bin/bash

# Script de setup local automatizado para macOS
# Uso: ./setup_local.sh

set -e

echo "====================================="
echo "Setup Local - n8n Download Bridge"
echo "====================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se está no macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}Este script é para macOS. Para Linux/Ubuntu, use o DEPLOY.md${NC}"
    exit 1
fi

# Verificar Homebrew
echo -e "${YELLOW}[1/7] Verificando Homebrew...${NC}"
if ! command -v brew &> /dev/null; then
    echo "Homebrew não encontrado. Instalando..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo -e "${GREEN}✓ Homebrew já instalado${NC}"
fi

# Instalar Python 3.12
echo ""
echo -e "${YELLOW}[2/7] Verificando Python 3...${NC}"
if ! command -v python3 &> /dev/null; then
    echo "Instalando Python 3.12..."
    brew install python@3.12
else
    echo -e "${GREEN}✓ Python 3 já instalado: $(python3 --version)${NC}"
fi

# Instalar FFmpeg
echo ""
echo -e "${YELLOW}[3/7] Verificando FFmpeg...${NC}"
if ! command -v ffmpeg &> /dev/null; then
    echo "Instalando FFmpeg..."
    brew install ffmpeg
else
    echo -e "${GREEN}✓ FFmpeg já instalado${NC}"
fi

# Instalar yt-dlp
echo ""
echo -e "${YELLOW}[4/7] Verificando yt-dlp...${NC}"
if ! command -v yt-dlp &> /dev/null; then
    echo "Instalando yt-dlp..."
    brew install yt-dlp
else
    echo -e "${GREEN}✓ yt-dlp já instalado: $(yt-dlp --version)${NC}"
fi

# Instalar gallery-dl
echo ""
echo -e "${YELLOW}[5/7] Verificando gallery-dl...${NC}"
if ! command -v gallery-dl &> /dev/null; then
    echo "Instalando gallery-dl..."
    pip3 install gallery-dl
else
    echo -e "${GREEN}✓ gallery-dl já instalado: $(gallery-dl --version)${NC}"
fi

# Setup do projeto
echo ""
echo -e "${YELLOW}[6/7] Configurando projeto...${NC}"

# Criar venv se não existir
if [ ! -d "venv" ]; then
    echo "Criando ambiente virtual Python..."
    python3 -m venv venv
else
    echo -e "${GREEN}✓ Ambiente virtual já existe${NC}"
fi

# Ativar venv e instalar dependências
echo "Instalando dependências Python..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Criar .env se não existir
if [ ! -f ".env" ]; then
    echo "Criando arquivo .env..."
    cat > .env << 'EOF'
API_KEY=minha-chave-teste-local-123
PORT=8000
HOST=0.0.0.0
EOF
    echo -e "${GREEN}✓ Arquivo .env criado${NC}"
else
    echo -e "${GREEN}✓ Arquivo .env já existe${NC}"
fi

# Criar cookies.txt se não existir
if [ ! -f "cookies.txt" ]; then
    echo "Criando arquivo cookies.txt vazio..."
    touch cookies.txt
    echo -e "${GREEN}✓ Arquivo cookies.txt criado${NC}"
else
    echo -e "${GREEN}✓ Arquivo cookies.txt já existe${NC}"
fi

# Criar diretório de downloads
mkdir -p downloads

echo ""
echo -e "${YELLOW}[7/7] Verificando configuração...${NC}"
echo ""
echo "Configuração atual:"
echo "  - API Key: $(grep API_KEY .env | cut -d'=' -f2)"
echo "  - Porta: $(grep PORT .env | cut -d'=' -f2 || echo '8000')"
echo "  - Cookies: $([ -s cookies.txt ] && echo 'Configurado' || echo 'Vazio (OK para testes básicos)')"
echo ""

echo -e "${GREEN}====================================="
echo "✓ Setup concluído com sucesso!"
echo "=====================================${NC}"
echo ""
echo "Para iniciar a API, execute:"
echo -e "${YELLOW}  ./run_local.sh${NC}"
echo ""
echo "Ou manualmente:"
echo -e "${YELLOW}  source venv/bin/activate${NC}"
echo -e "${YELLOW}  python main.py${NC}"
echo ""
echo "API estará disponível em: http://localhost:8000"
echo ""
echo "Para testar:"
echo -e "${YELLOW}  curl http://localhost:8000/health${NC}"
echo ""
