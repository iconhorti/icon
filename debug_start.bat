@echo off
title ICON Backend - DEBUG MODE
echo =========================================================
echo  ICON Backend - Debug Startup
echo =========================================================
echo.

cd /d "%~dp0backend"
echo Working directory: %CD%
echo.

echo Checking Python...
C:\Python311\python.exe --version
if errorlevel 1 (
    echo [ERROR] C:\Python311\python.exe not found!
    echo Try: py --version  or  python --version
    pause
    exit /b 1
)

echo.
echo Checking uvicorn...
C:\Python311\python.exe -c "import uvicorn; print('uvicorn OK:', uvicorn.__version__)"
if errorlevel 1 (
    echo [ERROR] uvicorn not installed for C:\Python311\python.exe
    echo Run: C:\Python311\python.exe -m pip install -r requirements.txt
    pause
    exit /b 1
)

echo.
echo Checking FastAPI imports...
C:\Python311\python.exe -c "import fastapi, sqlalchemy, jose, bcrypt; print('All imports OK')"
if errorlevel 1 (
    echo [ERROR] Missing packages. Run:
    echo   C:\Python311\python.exe -m pip install -r requirements.txt
    pause
    exit /b 1
)

echo.
echo Starting server... (errors will show below)
echo =========================================================
C:\Python311\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

echo.
echo =========================================================
echo Server stopped. See any errors above.
pause
