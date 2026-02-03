@echo off
echo Starting KataGo Bridge Server...
echo.
echo Make sure you have configured config.json with:
echo   - katago_path: Path to KataGo executable
echo   - model_path: Path to model file
echo.

cd /d "%~dp0"
python katago_bridge.py

pause
