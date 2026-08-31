@echo off
chcp 65001 >nul
title Puentes - Desplegar version de prueba
cd /d "%~dp0"

rem Node no siempre queda en el PATH del sistema; lo agregamos por las dudas.
set "PATH=C:\Program Files\nodejs;%PATH%"

echo.
echo ==========================================================
echo    PUENTES - Desplegar version de PRUEBA
echo ==========================================================
echo.
echo  Esto NO toca www.puentescuba.com.
echo  Crea una direccion temporal para probar en el telefono.
echo.
echo ----------------------------------------------------------
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [ERROR] No encuentro Node.js.
  echo  Instalalo desde https://nodejs.org y volve a intentar.
  echo.
  pause
  exit /b 1
)

echo  PASO 1 de 2 - Iniciar sesion en Vercel
echo.
echo  Se va a abrir el navegador. Entra con la cuenta
echo  pelaoert@gmail.com y confirma. Despues volve a esta ventana.
echo.
echo  Si ya iniciaste sesion antes, va a decir que ya estas
echo  autenticado y sigue de largo.
echo.
pause

call npx --yes vercel login
if errorlevel 1 (
  echo.
  echo  [ERROR] Fallo el inicio de sesion.
  echo.
  pause
  exit /b 1
)

echo.
echo ----------------------------------------------------------
echo.
echo  PASO 2 de 2 - Subir la version de prueba
echo.
echo  Si pregunta a que proyecto vincularlo:
echo.
echo    - "Set up and deploy?"        --^> Y  (enter)
echo    - "Link to existing project?" --^> Y  (enter)
echo    - "What's the name...?"       --^> escribi:  puente
echo.
pause

call npx --yes vercel deploy web

echo.
echo ==========================================================
echo.
echo  Si todo salio bien, arriba aparece una linea que dice
echo  "Production" o "Preview" con una direccion que termina
echo  en .vercel.app
echo.
echo  ESA es la direccion. Copiala y abrila en Safari en tu
echo  iPhone para instalar la app.
echo.
echo ==========================================================
echo.
pause
