@echo off
net session >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
netsh advfirewall firewall delete rule name="Seviye 8000" >nul 2>&1
netsh advfirewall firewall add rule name="Seviye 8000" dir=in action=allow protocol=TCP localport=8000 profile=private
echo.
powershell -NoProfile -Command "Get-NetConnectionProfile | Format-Table Name,InterfaceAlias,NetworkCategory -AutoSize"
echo Ev aginin NetworkCategory degeri Public ise telefondan erisilemez.
choice /M "Internete bagli agi Ozel (Private) yapayim mi"
if errorlevel 2 goto :end
powershell -NoProfile -Command "Get-NetConnectionProfile | Where-Object { $_.IPv4Connectivity -eq 'Internet' } | Set-NetConnectionProfile -NetworkCategory Private"
powershell -NoProfile -Command "Get-NetConnectionProfile | Format-Table Name,InterfaceAlias,NetworkCategory -AutoSize"
:end
pause
