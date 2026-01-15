#!/bin/bash

# Script de teste para API
# Uso: ./teste.sh [URL]

API_URL="http://localhost:8000"
API_KEY="minha-chave-teste-local-123"

echo "================================"
echo "Testando n8n Download Bridge API"
echo "================================"
echo ""

# Verificar se API está rodando
echo "1. Verificando se API está online..."
if ! curl -s -f "$API_URL/health" >/dev/null 2>&1; then
    echo "❌ Erro: API não está rodando!"
    echo "Execute em outro terminal: ./start.sh"
    exit 1
fi
echo "✅ API está online"
echo ""

# Health check
echo "2. Health Check:"
curl -s "$API_URL/health" | python3 -m json.tool
echo ""
echo ""

# Teste de download
URL="${1:-https://www.youtube.com/watch?v=jNQXAC9IVRw}"
echo "3. Testando download de: $URL"
echo ""

curl -X POST "$API_URL/download" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$URL\"}" \
  2>/dev/null | python3 -m json.tool

echo ""
echo ""
echo "4. Arquivos baixados:"
ls -lh downloads/
echo ""
