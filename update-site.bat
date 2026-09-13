@echo off
cd /d "%~dp0"

echo.
echo === Mise a jour du site LaPhilo.fr (Astro) ===
echo.

set /p MESSAGE="Message (description de l'ajout, ou laisser vide) : "
if "%MESSAGE%"=="" set MESSAGE=Met a jour les donnees (xlsx)

python scripts\update-site.py "%MESSAGE%"
if errorlevel 1 goto error

echo.
pause
exit /b 0

:error
echo.
echo ERREUR - verifiez que Python est installe et que le message ci-dessus explique le probleme.
pause
exit /b 1
