#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

echo "Creating virtual environment at $SCRIPT_DIR/.venv-face..."
python3 -m venv "$SCRIPT_DIR/.venv-face"

echo "Upgrading pip..."
"$SCRIPT_DIR/.venv-face/bin/pip" install --upgrade pip

echo "Installing requirements..."
"$SCRIPT_DIR/.venv-face/bin/pip" install -r "$SCRIPT_DIR/requirements.txt"

if [ ! -f "$SCRIPT_DIR/config.json" ]; then
  cp "$SCRIPT_DIR/config.example.json" "$SCRIPT_DIR/config.json"
fi

echo "Face service venv siap. Edit services/face-service/config.json sebelum menjalankan PM2."
