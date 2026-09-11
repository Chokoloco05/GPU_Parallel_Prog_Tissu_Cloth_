@echo off
cd /d "%~dp0"
echo Demarrage de Tissu Cloth sur http://127.0.0.1:8000/
echo Garde cette fenetre ouverte pendant que tu utilises l'application.
python -m http.server 8000 --bind 127.0.0.1
