@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 server.py
  goto :end
)
python --version >nul 2>nul
if %errorlevel%==0 (
  python server.py
  goto :end
)
echo Python bulunamadi. https://www.python.org/downloads/ adresinden kurun ve kurulumda "Add python.exe to PATH" secenegini isaretleyin.
:end
pause
