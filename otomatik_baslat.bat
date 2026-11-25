@echo off
cd /d "%~dp0"
set "RUN="
where pyw >nul 2>nul && set "RUN=pyw -3"
if not defined RUN where pythonw >nul 2>nul && set "RUN=pythonw"
if not defined RUN (
  echo Python bulunamadi. https://www.python.org/downloads/ adresinden kurun.
  pause
  exit /b 1
)
set "VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Seviye.vbs"
> "%VBS%" echo Set sh = CreateObject("WScript.Shell")
>> "%VBS%" echo sh.CurrentDirectory = "%~dp0"
>> "%VBS%" echo sh.Run "%RUN% server.py --lan --bg", 0, False
start "" wscript "%VBS%"
echo Seviye artik bilgisayar acilinca arka planda calisacak ve su an baslatildi.
echo Bu bilgisayardan: http://localhost:8000
echo Telefondan: Ayarlar bolumundeki adres
pause
