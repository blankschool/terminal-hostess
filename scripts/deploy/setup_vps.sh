#!/usr/bin/env bash

# Setup inicial em VPS (Ubuntu/Debian-like) para rodar via systemd.
# Inclui dependências, venv, instalação de pacotes Python, atualização de yt-dlp/gallery-dl
# e criação da unit systemd a partir do template em infra/systemd.
#
# Uso (como sudo ou root): ./scripts/deploy/setup_vps.sh /opt/n8n-download-bridge

set -euo pipefail

APP_DIR="${1:-}"
if [ -z "$APP_DIR" ]; then
  echo "Uso: $0 /caminho/para/app"
  exit 1
fi

SERVICE_NAME="${SERVICE_NAME:-n8n-download-bridge}"
SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}.service"
RUN_AS_USER="${RUN_AS_USER:-$SUDO_USER}"
RUN_AS_GROUP="${RUN_AS_GROUP:-$SUDO_USER}"

log() { printf '[setup] %s\n' "$*"; }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "Instalando $1"
    apt-get update -y
    apt-get install -y "$1"
  fi
}

log "Preparando diretório $APP_DIR"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

log "Garantindo dependências base"
require_cmd curl
require_cmd git
require_cmd ffmpeg
require_cmd python3
require_cmd python3-venv

log "Criando venv"
python3 -m venv "$APP_DIR/venv"
# shellcheck disable=SC1090
source "$APP_DIR/venv/bin/activate"
pip install --upgrade pip

if [ -f "$APP_DIR/requirements.txt" ]; then
  log "Instalando dependências Python"
  pip install --no-cache-dir -r "$APP_DIR/requirements.txt"
fi

if [ -x "$APP_DIR/scripts/dev/update_downloaders.sh" ]; then
  log "Atualizando yt-dlp/gallery-dl (pip + clones)"
  "$APP_DIR/scripts/dev/update_downloaders.sh"
fi

log "Criando estrutura de dados (downloads, cookies, logs)"
mkdir -p "$APP_DIR/downloads" "$APP_DIR/config/cookies" "$APP_DIR/logs"
[ -f "$APP_DIR/config/cookies/cookies.txt" ] || : > "$APP_DIR/config/cookies/cookies.txt"

if [ ! -f "$APP_DIR/.env" ] && [ -f "$APP_DIR/config/.env.example" ]; then
  log "Copiando config/.env.example para .env (ajuste manual depois)"
  cp "$APP_DIR/config/.env.example" "$APP_DIR/.env"
fi

log "Gerando unit systemd em $SERVICE_PATH"
export APP_DIR RUN_AS_USER RUN_AS_GROUP
envsubst < "$APP_DIR/infra/systemd/n8n-download-bridge.service" > "/tmp/${SERVICE_NAME}.service"
mv "/tmp/${SERVICE_NAME}.service" "$SERVICE_PATH"

log "Recarregando systemd e habilitando serviço"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

log "Status do serviço:"
systemctl status "$SERVICE_NAME" --no-pager --full

log "Finalizado. Ajuste .env conforme necessário e use 'journalctl -u $SERVICE_NAME -f' para logs."
