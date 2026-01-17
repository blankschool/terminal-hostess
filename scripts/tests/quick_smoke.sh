#!/bin/bash

# Smoke test simples para API
# Uso: ./scripts/tests/quick_smoke.sh [URL]

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

API_URL="${API_URL:-http://localhost:8000}"
API_KEY_FROM_ENV=""
if [ -f ".env" ]; then
  API_KEY_FROM_ENV="$(grep -E '^API_KEY=' .env | cut -d'=' -f2)"
fi
API_KEY="${API_KEY:-${API_KEY_FROM_ENV:-minha-chave-teste-local-123}}"
URL="${1:-https://www.youtube.com/watch?v=jNQXAC9IVRw}"

if [ -z "$API_KEY" ]; then
  echo "API Key não encontrada. Exporte API_KEY ou crie um .env com API_KEY=..."
  exit 1
fi

echo "================================"
echo "Testando n8n Download Bridge API"
echo "================================"
echo ""

# Verificar se API está rodando
echo "1. Verificando se API está online..."
if ! curl -s -f "$API_URL/health" >/dev/null 2>&1; then
    echo "❌ Erro: API não está rodando!"
    echo "Execute em outro terminal: ./scripts/dev/run_api.sh"
    exit 1
fi
echo "✅ API está online"
echo ""

# Health check
echo "2. Health Check:"
curl -s "$API_URL/health" | python3 -m json.tool
echo ""; echo ""

# Teste de download simples
echo "3. Testando download de: $URL"
echo ""

curl -s -X POST "$API_URL/download" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$URL\", \"tool\": \"yt-dlp\", \"format\": \"mp4\"}" \
  | python3 -m json.tool

echo ""; echo ""
echo "4. Arquivos baixados:"
ls -lh downloads/ 2>/dev/null || echo "Nenhum arquivo ainda"
echo ""
