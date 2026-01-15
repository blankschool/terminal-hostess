# 🚀 Comece Aqui - 2 Comandos!

## Problema que você teve (resolvido!)

1. **Porta 8000 em uso** → Scripts agora matam processo antigo automaticamente
2. **Curl com erro no zsh** → Criado script `teste.sh` que funciona perfeitamente

## ✨ Como Usar (SUPER SIMPLES)

### Terminal 1 - Rodar API
```bash
cd ~/Downloads/n8n-download-bridge
./start.sh
```

### Terminal 2 - Testar
```bash
cd ~/Downloads/n8n-download-bridge
./teste.sh
```

**Pronto!** A API vai baixar um vídeo e mostrar o resultado.

## 📋 Testar com outra URL

```bash
./teste.sh "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

## 🔧 Comandos Manuais (se quiser fazer na mão)

### Iniciar API manualmente
```bash
# Matar processo antigo (se tiver)
kill -9 $(lsof -t -i:8000)

# Iniciar
source venv/bin/activate
python main.py
```

### Testar manualmente (funciona no zsh!)
```bash
curl -X POST http://localhost:8000/download \
  -H "X-API-Key: minha-chave-teste-local-123" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}'
```

**Nota:** No zsh, use aspas simples `'` no `-d`, não as aspas invertidas que foram copiadas!

## 🎯 O que os scripts fazem

**start.sh:**
- ✅ Mata processo antigo na porta 8000 automaticamente
- ✅ Ativa o venv
- ✅ Inicia a API

**teste.sh:**
- ✅ Verifica se API está online
- ✅ Faz health check
- ✅ Baixa um vídeo de teste
- ✅ Mostra arquivos baixados
- ✅ Funciona perfeitamente no zsh!

## 🔥 Erros Comuns

### "Address already in use"
```bash
kill -9 $(lsof -t -i:8000)
```

### "Not authenticated"
Você copiou as aspas erradas do terminal. Use o script `./teste.sh` ou:
```bash
# CORRETO (aspas simples normais)
curl -d '{"url": "..."}'

# ERRADO (aspas tipográficas)
curl -d '{"url": "..."}'
```

### Ver se API está rodando
```bash
lsof -i :8000
```

## 🎉 Resultado Esperado

```json
{
  "success": true,
  "message": "Download concluído com sucesso",
  "download_url": "/files/Me%20at%20the%20zoo-jNQXAC9IVRw.webm",
  "filename": "Me at the zoo-jNQXAC9IVRw.webm"
}
```

## 📱 Próximo Passo: Configurar n8n

Quando funcionar no terminal, veja **QUICK_START.md** seção 4 para configurar o n8n.

---

**Resumo:** Use `./start.sh` em um terminal e `./teste.sh` em outro. Simples assim! 🚀
