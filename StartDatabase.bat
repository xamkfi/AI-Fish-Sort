@echo off
setlocal

color 0A

set "DB_DIR=%~dp0mySQL"
set "COMPOSE_FILE=%DB_DIR%\docker-compose.yml"
set "PROJECT_NAME=ai-fish-sort-db"
set "NETWORK_NAME=ai-fish-sort-net"

echo ===================================================
echo  AI FISH SORT - START DATABASE
echo ===================================================
echo.

if not exist "%COMPOSE_FILE%" (
    color 0C
    echo VIRHE: docker-compose.yml ei loydy kansiosta:
    echo %DB_DIR%
    echo.
    pause
    exit /b 1
)

docker compose version >NUL 2>NUL
if %ERRORLEVEL% EQU 0 (
    set "COMPOSE=docker compose"
) else (
    docker-compose version >NUL 2>NUL
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo VIRHE: Docker Compose ei ole saatavilla.
        echo Asenna Docker Desktop tai varmista, etta docker compose toimii.
        echo.
        pause
        exit /b 1
    )
    set "COMPOSE=docker-compose"
)

echo Tarkistetaan Docker-verkko...
docker network inspect %NETWORK_NAME% >NUL 2>NUL
if %ERRORLEVEL% NEQ 0 (
    docker network create %NETWORK_NAME% >NUL
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo.
        echo VIRHE: Docker-verkon luonti epaonnistui.
        echo.
        pause
        exit /b 1
    )
)
echo       Verkko OK: %NETWORK_NAME%
echo.

pushd "%DB_DIR%"
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo VIRHE: mySQL-kansioon siirtyminen epaonnistui.
    echo.
    pause
    exit /b 1
)

echo [1/2] Suljetaan nykyinen tietokantakontti...
%COMPOSE% -p %PROJECT_NAME% down
if %ERRORLEVEL% NEQ 0 (
    popd
    color 0C
    echo.
    echo VIRHE: docker compose down epaonnistui.
    pause
    exit /b 1
)
echo       Valmis.
echo.

echo [2/2] Kaynnistetaan tietokanta uudelleen...
%COMPOSE% -p %PROJECT_NAME% up -d
if %ERRORLEVEL% NEQ 0 (
    popd
    color 0C
    echo.
    echo VIRHE: docker compose up -d epaonnistui.
    pause
    exit /b 1
)

popd

echo.
echo ===================================================
echo  VALMIS! MySQL-kontti kaynnistyy taustalla.
echo  Kontti: aifishsort_mysql
echo  Portti: 3306
echo  Logit:  docker logs -f aifishsort_mysql
echo ===================================================
echo.

pause
