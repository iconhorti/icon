@echo off
echo Starting ICON Greenhouse ERP Backend...
start cmd /k "cd /d e:\ICON\backend && C:\Python311\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo Starting ICON Greenhouse ERP Frontend...
start cmd /k "cd /d e:\ICON\web && npm run dev"

echo =========================================================
echo Both services are starting up in separate windows!
echo Frontend will be available at http://localhost:5173
echo Backend will be available at http://localhost:8000
echo =========================================================
