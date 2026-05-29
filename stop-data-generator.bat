@echo off
setlocal

color 0C
echo ===================================================
echo  STOPPING DATA GENERATOR
echo ===================================================
echo.

docker exec ai-fish-sort-api sh -c "PID=$(cat /tmp/data-generator.pid 2>/dev/null) && echo 'Stopping PID '$PID && kill $PID && rm -f /tmp/data-generator.pid && echo 'Done' || echo 'No generator running'"

echo.
pause
