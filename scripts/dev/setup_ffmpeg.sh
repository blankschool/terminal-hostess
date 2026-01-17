#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BIN_DIR="${ROOT_DIR}/bin"

mkdir -p "${BIN_DIR}"

OS_NAME="$(uname -s)"
ARCH="$(uname -m)"

download_macos() {
  tmpdir="$(mktemp -d)"
  curl -L "https://evermeet.cx/ffmpeg/getrelease/zip" -o "${tmpdir}/ffmpeg.zip"
  curl -L "https://evermeet.cx/ffprobe/getrelease/zip" -o "${tmpdir}/ffprobe.zip"
  unzip -o "${tmpdir}/ffmpeg.zip" -d "${tmpdir}/ffmpeg" >/dev/null
  unzip -o "${tmpdir}/ffprobe.zip" -d "${tmpdir}/ffprobe" >/dev/null
  mv "${tmpdir}/ffmpeg/ffmpeg" "${BIN_DIR}/ffmpeg"
  mv "${tmpdir}/ffprobe/ffprobe" "${BIN_DIR}/ffprobe"
  chmod +x "${BIN_DIR}/ffmpeg" "${BIN_DIR}/ffprobe"
}

download_linux() {
  local url=""
  case "${ARCH}" in
    x86_64|amd64)
      url="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
      ;;
    arm64|aarch64)
      url="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz"
      ;;
    *)
      echo "Arquitetura não suportada: ${ARCH}"
      exit 1
      ;;
  esac

  local tmpdir
  tmpdir="$(mktemp -d)"
  curl -L "${url}" -o "${tmpdir}/ffmpeg.tar.xz"
  tar -xf "${tmpdir}/ffmpeg.tar.xz" -C "${tmpdir}"

  local extracted
  extracted="$(find "${tmpdir}" -maxdepth 1 -type d -name 'ffmpeg-*-static' | head -n 1)"
  if [[ -z "${extracted}" ]]; then
    echo "Falha ao localizar ffmpeg extraído."
    exit 1
  fi

  cp "${extracted}/ffmpeg" "${BIN_DIR}/ffmpeg"
  cp "${extracted}/ffprobe" "${BIN_DIR}/ffprobe"
  chmod +x "${BIN_DIR}/ffmpeg" "${BIN_DIR}/ffprobe"
}

case "${OS_NAME}" in
  Darwin)
    download_macos
    ;;
  Linux)
    download_linux
    ;;
  *)
    echo "Sistema não suportado: ${OS_NAME}"
    exit 1
    ;;
esac

echo "ffmpeg instalado em ${BIN_DIR}"
