@echo off
title ICON Expo Frontend
cd /d "%~dp0frontend"
powershell -ExecutionPolicy Bypass -Command "npm start"
pause
