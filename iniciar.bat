@echo off
cd /d "%~dp0"
cls

echo.
echo  ==========================================
echo    LED MAP  ^|  Aplicacao (Vite)
echo  ==========================================
echo.
echo    A aplicacao abrira no navegador automaticamente.
echo    Neste computador: o endereco "Local:" que aparece abaixo
echo    (normalmente http://localhost:5173).
echo.
echo    Pra acessar do CELULAR (mesma rede Wi-Fi): use o endereco
echo    "Network:" que o Vite mostra abaixo (ex.: http://192.168.x.x:5173).
echo.
echo    Se o celular nao conectar, o Firewall do Windows esta bloqueando:
echo    na PRIMEIRA vez o Windows pergunta se permite o Node.js na rede,
echo    marque "Redes privadas" e clique Permitir. Se ja negou antes:
echo    Configuracoes ^> Firewall ^> Permitir um aplicativo ^> Node.js.
echo.
echo    Para parar: feche esta janela ou pressione Ctrl+C.
echo.

rem Node.js precisa estar instalado (https://nodejs.org).
where npm >nul 2>nul
if errorlevel 1 (
  echo  Node.js nao encontrado. Instale em https://nodejs.org e abra de novo.
  echo.
  pause
  exit /b 1
)

rem Primeira execucao: instala dependencias se a pasta node_modules nao existir.
if not exist "node_modules" (
  echo  Instalando dependencias pela primeira vez, aguarde...
  echo.
  call npm install
  echo.
)

rem Sobe o servidor aberto pra rede local (--host) e abre o navegador (--open).
rem Se a porta 5173 estiver ocupada, o Vite usa a proxima livre e abre nela.
call npm run dev -- --host --open

pause
