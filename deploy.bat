@echo off
echo Tagitaan image...
docker tag KONTIN_NIMI ARTIFAKTIN_NIMI

echo Pusketaan Google Artifact Registryyn...
docker push ARTIFAKTIN_NIMI

echo Valmis!
pause
