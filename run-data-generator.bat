@echo off
setlocal

color 0A
echo ===================================================
echo  AI FISH SORT - DATA GENERATOR
echo ===================================================
echo.
echo Starting data generator in background...
echo It will generate observations every 2 minutes.
echo.
echo To stop it later, run: stop-data-generator.bat
echo ===================================================
echo.

docker exec -d ai-fish-sort-api sh -c "node /app/data-generator.js"

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo Error: Failed to start data generator.
    echo Is the ai-fish-sort-api container running?
    echo.
    pause
    exit /b 1
)

echo Generator started successfully!
echo.
echo You can follow the output with:
echo   docker logs --tail 10 ai-fish-sort-api
echo.
pause
