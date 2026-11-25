@echo off
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Seviye.vbs" 2>nul
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*server.py*--bg*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
echo Otomatik baslatma kaldirildi ve arka plandaki Seviye kapatildi.
pause
