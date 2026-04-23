@echo off
echo =========================================
echo       Starting NxVET Dashboard
echo =========================================

echo 1. Starting the local proxy server...
start "NxVET Proxy Server" cmd /k "python server.py"

echo 2. Waiting for server to initialize...
timeout /t 2 /nobreak > NUL

echo 3. Opening your default web browser...
start "" "http://localhost:8000"

echo.
echo Done! 
echo - Your dashboard should now be open in your browser.
echo - The server is running in the newly opened command prompt window.
echo - To stop the dashboard, simply close the server's command prompt window.
echo.
pause
