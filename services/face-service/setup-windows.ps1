$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Creating virtual environment at $ScriptDir\.venv-face..."
python -m venv "$ScriptDir\.venv-face"

Write-Host "Upgrading pip..."
& "$ScriptDir\.venv-face\Scripts\python.exe" -m pip install --upgrade pip

Write-Host "Installing requirements..."
& "$ScriptDir\.venv-face\Scripts\python.exe" -m pip install -r "$ScriptDir\requirements.txt"

$ConfigFile = Join-Path $ScriptDir "config.json"
$ConfigExample = Join-Path $ScriptDir "config.example.json"
if (-not (Test-Path $ConfigFile)) {
  Copy-Item $ConfigExample $ConfigFile
  Write-Host "Created config.json from config.example.json"
}

Write-Host "Face service venv siap. Edit services\face-service\config.json sebelum menjalankan PM2."
