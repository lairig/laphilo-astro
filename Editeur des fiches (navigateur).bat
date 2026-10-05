@echo off
rem Éditeur local des fiches (xlsx), ouvert dans un onglet du navigateur habituel
rem (le lanceur « Editeur des fiches.bat » l'ouvre dans sa propre fenêtre, comme une application).
rem Fermer cette fenêtre arrête l'éditeur.
chcp 65001 >nul
cd /d "%~dp0"
python scripts\editeur\serveur.py --navigateur
if errorlevel 1 pause
