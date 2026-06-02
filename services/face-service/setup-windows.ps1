$ErrorActionPreference = "Stop"

python -m venv .venv-face
.\.venv-face\Scripts\python.exe -m pip install --upgrade pip
.\.venv-face\Scripts\python.exe -m pip install -r services\face-service\requirements.txt

if (-not (Test-Path services\face-service\config.json)) {
  Copy-Item services\face-service\config.example.json services\face-service\config.json
}

Write-Host "Face service venv siap. Edit services\face-service\config.json sebelum menjalankan PM2."
