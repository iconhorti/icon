@echo off
start "ICON Backend" cmd /k "cd /d "%~dp0backend" && C:\Python311\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"
start "ICON Web"     cmd /k "cd /d "%~dp0web"     && npm run dev"
