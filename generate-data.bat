@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo  AI Fish Sort – Mockup Data Generator
echo ========================================
echo.

echo Starting data generator...
echo   Base URL  : %API_BASE_URL%
echo   Bearer key: Node loads SORTER_API_BEARER_TOKEN from .env.
echo.
echo 2 observations will be generated every 60 seconds.
echo.

:: Node reads .env directly; keep credentials out of the child command line.
start "AI-Fish-Sort Data Generator" /D "%~dp0" cmd /c "node data-generator.js && pause"

echo Data generator started. Close the generator window or run kill-generator.bat to stop.
