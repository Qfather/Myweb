@echo off
REM ============================================================
REM  Build GitHub Pages static site (docs/)
REM  Double-click to: build frontend -> export data.json + assets
REM ============================================================
cd /d "%~dp0"

echo [1/2] Building frontend...
cd web
call npm run build
if errorlevel 1 (
  echo [ERROR] frontend build failed
  pause
  exit /b 1
)
cd ..

echo.
echo [2/2] Exporting static site to docs/...
python export_static.py
if errorlevel 1 (
  echo [ERROR] export failed
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  Done! docs/ generated.
echo  Next:
echo    1. git add docs
echo    2. git commit -m "update static site"
echo    3. git push
echo    4. GitHub repo Settings - Pages - Source: Deploy from a branch
echo       Branch: main   Folder: /docs   Save
echo    5. Visit https://YOURNAME.github.io/REPONAME/
echo ============================================================
pause
