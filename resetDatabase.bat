@echo off
setlocal

color 0A
echo ===================================================
echo TUHOTAAN JA RAKENNETAAN TIETOKANTA UUDELLEEN...
echo ===================================================
echo.

call npm run db:reset
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo ===================================================
    echo VIRHE: Tietokannan nollaus epaonnistui.
    echo ===================================================
    pause
    exit /b 1
)

echo.
echo ===================================================
echo VALMIS! Tietokanta on nollattu onnistuneesti!
echo ===================================================
pause
