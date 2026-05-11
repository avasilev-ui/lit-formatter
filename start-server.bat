@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "NODE_EXE="
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
  set "NODE_EXE=node"
) else if exist "%LOCALAPPDATA%\Programs\cursor\resources\app\resources\helpers\node.exe" (
  set "NODE_EXE=%LOCALAPPDATA%\Programs\cursor\resources\app\resources\helpers\node.exe"
) else (
  echo Не найден Node.js.
  echo Установи LTS с https://nodejs.org затем снова запусти этот файл.
  pause
  exit /b 1
)

echo.
echo Запускаю сервер. Через пару секунд откроется браузер.
echo Адрес вручную: http://localhost:3000
echo Чтобы остановить сервер — закрой это окно или нажми Ctrl+C.
echo.

start "" cmd /c "ping 127.0.0.1 -n 4 >nul && start http://localhost:3000/"

"%NODE_EXE%" server.js
pause
