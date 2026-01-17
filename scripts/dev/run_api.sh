#!/bin/bash

# Script para rodar a API localmente
# Uso: ./scripts/dev/run_api.sh

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

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
    echo "Execute primeiro: ./scripts/dev/setup_macos.sh"
    exit 1
fi

# Verificar se porta está em uso
PORT_FROM_ENV=""
if [ -f ".env" ]; then
  PORT_FROM_ENV="$(grep -E '^PORT=' .env | cut -d'=' -f2)"
fi
PORT="${PORT:-${PORT_FROM_ENV:-8000}}"
if lsof -Pi :"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}Erro: Porta $PORT já está em uso.${NC}"
    echo ""
    echo "Processos usando a porta:"
    lsof -i :"$PORT"
    echo ""
    echo "Para liberar a porta:"
    echo "  kill -9 \$(lsof -t -i:$PORT)"
    exit 1
fi

# Ativar venv
echo -e "${YELLOW}Ativando ambiente virtual...${NC}"
source venv/bin/activate

# Ler configuração (suporta override local em .env.local)
set +a
if [ -f ".env" ]; then
  # shellcheck disable=SC1091
  set -a && source .env && set +a
fi
if [ -f ".env.local" ]; then
  echo -e "${YELLOW}Carregando overrides de .env.local (somente ambiente local)${NC}"
  # shellcheck disable=SC1091
  set -a && source .env.local && set +a
fi

API_KEY="${API_KEY:-}"

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
python -m backend.main
