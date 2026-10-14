@echo off
setlocal EnableExtensions
cd /d "%~dp0"
color 0A

set "IMAGE_NAME=ai-fish-sort-api"
set "CONTAINER_NAME=ai-fish-sort-api"
set "ENV_FILE=.env"
if not defined FISH_HTTP_PORT set "FISH_HTTP_PORT=3000"
if not defined FISH_DB_HOST set "FISH_DB_HOST=host.docker.internal"

echo ===================================================
echo  AI FISH SORT - LOCAL DOCKER REBUILD
echo  URL: http://localhost:%FISH_HTTP_PORT%
echo ===================================================

where docker >NUL 2>&1
if errorlevel 1 (
    echo VIRHE: Docker ei loydy PATH-muuttujasta.
    goto :fail
)
docker info >NUL 2>&1
if errorlevel 1 (
    echo VIRHE: Docker Desktop ei ole kaynnissa tai Linux-kontit eivat ole saatavilla.
    goto :fail
)
if not exist "%ENV_FILE%" (
    echo VIRHE: %ENV_FILE% puuttuu. Kopioi .env.example ja tayta asetukset.
    goto :fail
)

echo [1/3] Rakennetaan uusi image...
docker build --pull --target runtime -t "%IMAGE_NAME%" .
if errorlevel 1 goto :fail

echo [2/3] Korvataan vanha sovelluskontti...
docker stop "%CONTAINER_NAME%" >NUL 2>&1
docker rm "%CONTAINER_NAME%" >NUL 2>&1

echo [3/3] Kaynnistetaan paikallinen kontti...
docker run -d ^
    --init ^
    --name "%CONTAINER_NAME%" ^
    --restart unless-stopped ^
    -p "127.0.0.1:%FISH_HTTP_PORT%:3000" ^
    --env-file "%ENV_FILE%" ^
    -e NODE_ENV=production ^
    -e PORT=3000 ^
    -e "DB_HOST=%FISH_DB_HOST%" ^
    "%IMAGE_NAME%"
if errorlevel 1 goto :fail

echo Odotetaan tietokantayhteytta ja health-tarkistusta...
for /l %%I in (1,1,30) do (
    docker exec "%CONTAINER_NAME%" node -e "fetch('http://127.0.0.1:3000/health', {signal: AbortSignal.timeout(2000)}).then(r => {if (!r.ok) process.exit(1);}).catch(() => process.exit(1));" >NUL 2>&1
    if not errorlevel 1 goto :ready
    powershell -NoProfile -Command "Start-Sleep -Seconds 2"
)
echo VIRHE: Kontti ei tullut kayttovalmiiksi. Tarkista .env:n DB-asetukset ja tietokanta.
docker logs --tail 40 "%CONTAINER_NAME%"
goto :fail

:ready
echo.
echo VALMIS! http://localhost:%FISH_HTTP_PORT%
echo Health: http://localhost:%FISH_HTTP_PORT%/health
echo Image: %IMAGE_NAME%
echo Logit: docker logs -f %CONTAINER_NAME%
if /i not "%~1"=="--no-pause" pause
exit /b 0

:fail
color 0C
echo VIRHE: AI Fish Sort Docker rebuild epaonnistui.
if /i not "%~1"=="--no-pause" pause
exit /b 1
