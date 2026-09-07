@echo off
:: ============================================================
:: SAT - Sistema de Asistencia Tecnologica - Arranque Automatico
:: ============================================================
:: Esperar 10 segundos para que el sistema operativo cargue bien
ping 127.0.0.1 -n 11 >nul

:: Iniciar el Backend (Node.js / Prisma / SQLite)
start "SAT-Backend" /MIN cmd /k "cd /D C:\Users\Amy Uzcategui\Documents\SAT\backend && node node_modules\tsx\dist\cli.mjs index.ts"

:: Esperar 8 segundos a que el backend levante antes de iniciar el frontend
ping 127.0.0.1 -n 9 >nul

:: Iniciar el Frontend (Vite)
start "SAT-Frontend" /MIN cmd /k "cd /D C:\Users\Amy Uzcategui\Documents\SAT\frontend && node node_modules\vite\bin\vite.js --host 127.0.0.1"

exit
