@echo off
setlocal

color 0A

set IMAGE_NAME=ai-fish-sort-api
set CONTAINER_NAME=ai-fish-sort-api
set NETWORK_NAME=ai-fish-sort-net
set HOST_PORT=3000
set CONTAINER_PORT=3000

echo ===================================================
echo  AI FISH SORT API - DOCKER REBUILD
echo ===================================================
echo.

echo Tarkistetaan Docker...
docker info >NUL 2>NUL
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo VIRHE: Docker ei ole kaynnissa tai docker-komento ei ole saatavilla.
    pause
    exit /b 1
)
echo       Docker OK.
echo.

echo Tarkistetaan Docker-verkko...
docker network inspect %NETWORK_NAME% >NUL 2>NUL
if %ERRORLEVEL% NEQ 0 (
    docker network create %NETWORK_NAME% >NUL
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo.
        echo VIRHE: Docker-verkon luonti epaonnistui!
        pause
        exit /b 1
    )
)
echo       Verkko OK: %NETWORK_NAME%
echo.

REM Pysayta ja poista vanha kontti, jos se on olemassa.
echo [1/3] Pysaytetaan vanha kontti...
docker stop %CONTAINER_NAME% >NUL 2>NUL
docker rm %CONTAINER_NAME% >NUL 2>NUL
echo       Valmis.
echo.

REM Rakenna uusi image.
echo [2/3] Rakennetaan uusi Docker-image...
docker build -t %IMAGE_NAME% .
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo VIRHE: Docker build epaonnistui!
    pause
    exit /b 1
)
echo       Valmis.
echo.

REM Kaynnista uusi kontti.
echo [3/3] Kaynnistetaan uusi kontti...
docker run -d ^
    --name %CONTAINER_NAME% ^
    --restart unless-stopped ^
    --network %NETWORK_NAME% ^
    -p %HOST_PORT%:%CONTAINER_PORT% ^
    --env-file .env ^
    -e NODE_ENV=production ^
    %IMAGE_NAME%

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo VIRHE: Kontin kaynnistys epaonnistui!
    pause
    exit /b 1
)

echo.
echo ===================================================
echo  VALMIS! AI Fish Sort API pyorii portissa %HOST_PORT%
echo  Kontti: %CONTAINER_NAME%
echo  Image:  %IMAGE_NAME%
echo  Logit:  docker logs -f %CONTAINER_NAME%
echo ===================================================
echo.

pause
