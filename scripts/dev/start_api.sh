#!/bin/bash

# Script para iniciar a API facilmente
# Uso: ./scripts/dev/start_api.sh

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}n8n Download Bridge API${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

PORT_FROM_ENV=""
if [ -f ".env" ]; then
  PORT_FROM_ENV="$(grep -E '^PORT=' .env | cut -d'=' -f2)"
fi
PORT="${PORT:-${PORT_FROM_ENV:-8000}}"

# Verificar se porta está em uso
if lsof -Pi :"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}Porta $PORT em uso. Matando processo...${NC}"
    kill -9 $(lsof -t -i:"$PORT") 2>/dev/null
    sleep 1
fi

# Verificar venv
if [ ! -d "venv" ]; then
    echo -e "${RED}Erro: venv não encontrado${NC}"
    echo "Execute: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Ativar venv e rodar
echo -e "${GREEN}Iniciando API...${NC}"
echo ""
source venv/bin/activate
python -m backend.main
