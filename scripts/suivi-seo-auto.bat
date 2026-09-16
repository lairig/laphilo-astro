@echo off
REM Suivi SEO automatique — lance par le Planificateur de taches Windows.
REM Pas de pause : la tache doit se terminer seule.
cd /d "%~dp0\.."

if not exist "rapports-seo" mkdir "rapports-seo"

for /f "tokens=1-3 delims=/" %%a in ("%date%") do set JOUR=%%c-%%b-%%a
set JOUR=%JOUR: =%
set RAPPORT=rapports-seo\seo-%JOUR%.txt

python scripts\seo-monitor.py --days 28 > "%RAPPORT%" 2>&1

REM Ouvre le rapport seulement si une degradation ou une remontee est detectee.
findstr /C:"REMONTEE" /C:"DEGRADATION" /C:"[BAISSE]" "%RAPPORT%" >nul
if %errorlevel%==0 notepad "%RAPPORT%"
