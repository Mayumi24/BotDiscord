@echo off
cd /d "%~dp0"

:inicio
echo Iniciando o bot...
node index.js

echo O bot terminou ou crashou! A reiniciar em 5 segundos...
timeout /t 5

goto inicio