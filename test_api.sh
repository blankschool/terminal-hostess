#!/bin/bash

# Script de teste completo para n8n Download Bridge API
# Uso: ./test_api.sh

API_URL="http://localhost:8000"
API_KEY="minha-chave-teste-local-123"

echo "====================================="
echo "Testando n8n Download Bridge API"
echo "====================================="
echo ""

# Verificar se API está rodando
echo "0. Verificando se API está online..."
if ! curl -s -f "$API_URL/health" >/dev/null 2>&1; then
    echo "❌ Erro: API não está rodando!"
    echo "Execute em outro terminal: ./start.sh"
    exit 1
fi
echo "✅ API está online"
echo ""

# Teste 1: Health Check
echo "1. Health Check:"
curl -s "$API_URL/health" | python3 -m json.tool
echo ""
echo ""

# Teste 2: Root endpoint
echo "2. Root endpoint:"
curl -s "$API_URL/" | python3 -m json.tool
echo ""
echo ""

# Teste 3: Download completo (padrão)
echo "3. Teste de Download Completo (YouTube):"
echo "URL: https://www.youtube.com/watch?v=jNQXAC9IVRw"
echo ""
RESPONSE=$(curl -s -X POST "$API_URL/download" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}')

echo "$RESPONSE" | python3 -m json.tool
echo ""

# Extrair download_url da resposta
DOWNLOAD_URL=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('download_url', ''))" 2>/dev/null)

if [ -n "$DOWNLOAD_URL" ]; then
    echo ""
    echo "4. Testando download do arquivo:"
    echo "URL: $API_URL$DOWNLOAD_URL"

    # Baixar arquivo para /tmp
    TEMP_FILE="/tmp/teste-download-$(date +%s).webm"
    curl -s -o "$TEMP_FILE" "$API_URL$DOWNLOAD_URL"

    if [ -f "$TEMP_FILE" ]; then
        FILE_SIZE=$(ls -lh "$TEMP_FILE" | awk '{print $5}')
        echo "✅ Arquivo baixado: $TEMP_FILE ($FILE_SIZE)"
        rm "$TEMP_FILE"
    else
        echo "❌ Erro ao baixar arquivo"
    fi
fi

echo ""
echo ""

# Teste 5: Apenas URL direta (sem download)
echo "5. Teste de URL Direta (sem download):"
curl -s -X POST "$API_URL/download" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw", "download_file": false}' \
  | python3 -m json.tool

echo ""
echo ""

# Teste 6: Listar arquivos baixados
echo "6. Arquivos no diretório downloads/:"
ls -lh downloads/ 2>/dev/null || echo "Nenhum arquivo ainda"

echo ""
echo "====================================="
echo "✅ Testes concluídos!"
echo "====================================="
