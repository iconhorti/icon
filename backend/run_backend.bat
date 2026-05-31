@echo off
title ICON Backend Server
cd /d "%~dp0"
C:\Python311\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
pause
