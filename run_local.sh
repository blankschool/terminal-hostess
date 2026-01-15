#!/bin/bash

# Script para rodar a API localmente
# Uso: ./run_local.sh

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}====================================="
echo "Iniciando n8n Download Bridge API"
echo "=====================================${NC}"
echo ""

# Verificar se venv existe
if [ ! -d "venv" ]; then
    echo -e "${RED}Erro: Ambiente virtual não encontrado.${NC}"
    echo "Execute primeiro: ./setup_local.sh"
    exit 1
fi

# Verificar se porta está em uso
PORT=$(grep PORT .env 2>/dev/null | cut -d'=' -f2 || echo '8000')
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}Erro: Porta $PORT já está em uso.${NC}"
    echo ""
    echo "Processos usando a porta:"
    lsof -i :$PORT
    echo ""
    echo "Para liberar a porta:"
    echo "  kill -9 \$(lsof -t -i:$PORT)"
    exit 1
fi

# Ativar venv
echo -e "${YELLOW}Ativando ambiente virtual...${NC}"
source venv/bin/activate

# Ler configuração
API_KEY=$(grep API_KEY .env | cut -d'=' -f2)

echo -e "${GREEN}✓ Ambiente configurado${NC}"
echo ""
echo "Configuração:"
echo "  - URL: http://localhost:$PORT"
echo "  - API Key: $API_KEY"
echo "  - Health Check: http://localhost:$PORT/health"
echo ""
echo -e "${YELLOW}Pressione CTRL+C para parar${NC}"
echo ""
echo "====================================="
echo ""

# Rodar API
python main.py
