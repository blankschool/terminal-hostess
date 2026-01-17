# 🚀 Comece Aqui - 2 Comandos

## O que mudou
- Scripts foram organizados em `scripts/dev` e `scripts/tests`
- Entry point Python agora é `backend.main`
- Cookies ficam em `config/cookies/`

## Como usar

### Terminal 1 - Rodar API
```bash
cd ~/Downloads/n8n-download-bridge
./scripts/dev/start_api.sh
```

### Terminal 2 - Testar
```bash
cd ~/Downloads/n8n-download-bridge
./scripts/tests/quick_smoke.sh
```

Pronto: a API baixa um vídeo e mostra o resultado.

## Testar outra URL
```bash
./scripts/tests/quick_smoke.sh "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

## O que os scripts fazem
**start_api.sh:**
- Mata processo na porta configurada (PORT do `.env`, padrão 8000)
- Ativa o venv
- Inicia a API com `python -m backend.main`

**quick_smoke.sh:**
- Verifica health
- Faz um download simples
- Lista arquivos em `downloads/`

## Comandos manuais
```bash
kill -9 $(lsof -t -i:8000)   # liberar porta
source venv/bin/activate
python -m backend.main       # iniciar API
```

## Próximo passo
Quando estiver funcionando no terminal, configure o n8n seguindo `docs/QUICK_START.md` (seção 4) ou use a UI em `http://localhost:8000/ui`.
