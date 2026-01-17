#!/bin/bash

# Script de teste completo para n8n Download Bridge API
# Uso: ./scripts/tests/full_api_test.sh [URL]

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

API_URL="${API_URL:-http://localhost:8000}"
API_KEY_FROM_ENV=""
if [ -f ".env" ]; then
  API_KEY_FROM_ENV="$(grep -E '^API_KEY=' .env | cut -d'=' -f2)"
fi
API_KEY="${API_KEY:-${API_KEY_FROM_ENV:-minha-chave-teste-local-123}}"
TEST_URL="${1:-https://www.youtube.com/watch?v=jNQXAC9IVRw}"

if [ -z "$API_KEY" ]; then
  echo "API Key não encontrada. Exporte API_KEY ou crie um .env com API_KEY=..."
  exit 1
fi

echo "====================================="
echo "Testando n8n Download Bridge API"
echo "====================================="
echo ""

# Verificar se API está rodando
echo "0. Verificando se API está online..."
if ! curl -s -f "$API_URL/health" >/dev/null 2>&1; then
    echo "❌ Erro: API não está rodando!"
    echo "Execute em outro terminal: ./scripts/dev/run_api.sh"
    exit 1
fi
echo "✅ API está online"
echo ""

# Teste 1: Health Check
echo "1. Health Check:"
curl -s "$API_URL/health" | python3 -m json.tool
echo ""; echo ""

# Teste 2: Root endpoint
echo "2. Root endpoint:"
curl -s "$API_URL/" | python3 -m json.tool
echo ""; echo ""

# Teste 3: Download completo (JSON)
echo "3. Teste de Download Completo (YouTube via yt-dlp):"
echo "URL: $TEST_URL"
echo ""
RESPONSE=$(curl -s -X POST "$API_URL/download" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$TEST_URL\", \"tool\": \"yt-dlp\", \"format\": \"mp4\"}")

echo "$RESPONSE" | python3 -m json.tool
echo ""

# Teste 4: Apenas URL direta (sem download)
echo "4. Teste de URL Direta (sem download):"
curl -s -X POST "$API_URL/download/url" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$TEST_URL\", \"tool\": \"yt-dlp\", \"format\": \"mp4\"}" \
  | python3 -m json.tool

echo ""; echo ""

# Teste 5: Download binário direto
echo "5. Testando download binário direto:"
TEMP_FILE="/tmp/bridge-download-$(date +%s).mp4"
HTTP_STATUS=$(curl -s -w "%{http_code}" -o "$TEMP_FILE" \
  -X POST "$API_URL/download/binary?url=$TEST_URL&tool=yt-dlp&format=mp4" \
  -H "X-API-Key: $API_KEY")

if [ "$HTTP_STATUS" = "200" ] && [ -s "$TEMP_FILE" ]; then
  FILE_SIZE=$(ls -lh "$TEMP_FILE" | awk '{print $5}')
  echo "✅ Arquivo binário salvo em $TEMP_FILE ($FILE_SIZE)"
  rm "$TEMP_FILE"
else
  echo "❌ Falha ao baixar arquivo binário (status $HTTP_STATUS)"
fi

echo ""; echo ""

# Teste 6: Listar arquivos baixados
echo "6. Arquivos no diretório downloads/:"
ls -lh downloads/ 2>/dev/null || echo "Nenhum arquivo ainda"

echo ""
echo "====================================="
echo "✅ Testes concluídos!"
echo "====================================="
