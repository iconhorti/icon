@echo off
title ICON Web Frontend
cd /d "%~dp0web"
powershell -ExecutionPolicy Bypass -Command "npm run dev"
pause
