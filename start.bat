@echo off
rem Starts the backend (port 8000) and the frontend (https, port 5173) in two windows.
rem Open https://localhost:5173 on this PC, or https://<this PC's Wi-Fi IP>:5173 on your phone
rem (same Wi-Fi). The certificate is self-signed: tap "Advanced" -> "Proceed" once.
cd /d "%~dp0"

if not exist backend\venv\Scripts\python.exe (
  echo Backend venv missing. See README "Run locally" to create backend\venv first.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm install
)

start "Kanji backend" cmd /k "cd backend && set PYTHONUTF8=1 && set HF_HUB_DISABLE_SYMLINKS_WARNING=1 && venv\Scripts\python -m uvicorn main:app --port 8000"
start "Kanji frontend" cmd /k "npm run dev:phone"
