@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo  AI Fish Sort – Mockup Data Generator
echo ========================================
echo.

:: Load WRITE_API_KEY from .env if not already set
if not defined WRITE_API_KEY (
    if exist .env (
        for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
            if "%%a"=="WRITE_API_KEY" set "WRITE_API_KEY=%%b"
        )
    )
)

echo Starting data generator...
echo   Base URL  : %API_BASE_URL%
if defined WRITE_API_KEY (
    echo   API Key   : [loaded from .env]
) else (
    echo   API Key   : NOT SET - POSTs will fail!
)
echo.
echo 2 observations will be generated every 60 seconds.
echo.

:: Pass the env var explicitly to the child process
start "AI-Fish-Sort Data Generator" /D "%~dp0" cmd /c "set WRITE_API_KEY=%WRITE_API_KEY% && node data-generator.js && pause"

echo Data generator started. Close the generator window or run kill-generator.bat to stop.
