@echo off
setlocal

color 0A
echo ===================================================
echo  AI FISH SORT - DATA GENERATOR
echo ===================================================
echo.
echo Generating fake fish observations every 2 minutes...
echo Press Ctrl+C to stop.
echo.

docker exec ai-fish-sort-api node /app/data-generator.js

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo Virhe: Data-generatorin ajo epaonnistui.
    echo Onko ai-fish-sort-api-kontti kaynnissa?
    echo.
    pause
    exit /b 1
)

pause
