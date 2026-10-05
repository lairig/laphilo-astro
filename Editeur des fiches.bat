@echo off
rem Éditeur local des fiches (xlsx) : s'ouvre dans le navigateur.
rem Fermer cette fenêtre arrête l'éditeur.
chcp 65001 >nul
cd /d "%~dp0"
python scripts\editeur\serveur.py
if errorlevel 1 pause
