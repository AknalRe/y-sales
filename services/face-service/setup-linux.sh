#!/usr/bin/env sh
set -eu

python3 -m venv .venv-face
. .venv-face/bin/activate
python -m pip install --upgrade pip
python -m pip install -r services/face-service/requirements.txt

if [ ! -f services/face-service/config.json ]; then
  cp services/face-service/config.example.json services/face-service/config.json
fi

echo "Face service venv siap. Edit services/face-service/config.json sebelum menjalankan PM2."
