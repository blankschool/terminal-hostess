#!/usr/bin/env bash

# Mantém yt-dlp e gallery-dl atualizados no venv e tenta atualizar clones locais.
# Uso: ./scripts/dev/update_downloaders.sh

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname "$0")/../.." && pwd)"
VENV_PATH="${VENV_PATH:-$ROOT_DIR/venv}"
PYTHON_BIN="${PYTHON:-python3}"

log() { printf '[update] %s\n' "$*"; }

ensure_venv() {
  if [ ! -d "$VENV_PATH" ]; then
    log "Criando venv em $VENV_PATH"
    "$PYTHON_BIN" -m venv "$VENV_PATH"
  fi
}

pip_install() {
  log "Ativando venv"
  # shellcheck disable=SC1090
  source "$VENV_PATH/bin/activate"
  pip install --upgrade pip >/dev/null
  log "Atualizando yt-dlp (com extras para impersonation) e gallery-dl via pip"
  pip install --upgrade "yt-dlp[default]" gallery-dl
}

update_repo_if_git() {
  local dir="$1"
  local name="$2"
  if [ -d "$dir/.git" ]; then
    log "Atualizando clone $name em $dir"
    git -C "$dir" pull --ff-only || log "Aviso: git pull falhou em $dir"
  else
    log "Clone $name não é um repositório git; pulei (baixe por git para auto-update)."
  fi
}

ensure_venv
pip_install

update_repo_if_git "$ROOT_DIR/yt-dlp-master" "yt-dlp"
update_repo_if_git "$ROOT_DIR/gallery-dl-master" "gallery-dl"

log "Pronto. Reinicie a API para usar os binários atualizados."
