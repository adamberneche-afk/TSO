@echo off
:: RCRT Native Windows Installer (No Dependencies)
:: Double-click and run - no Docker or any other software needed

echo.
echo ════════════════════════════════════════════════════════════
echo   RCRT - Right Context, Right Time
echo   Native Windows Installer
echo ════════════════════════════════════════════════════════════
echo.

set "INSTALL_DIR=%USERPROFILE%\RCRT"
set "RELEASE_URL=https://github.com/anomalyco/rcrt/releases/latest/download"

:: Check for existing installation
if exist "%INSTALL_DIR%\rcrt.exe" (
    echo RCRT is already installed!
    echo.
    set /p RESTART="Run RCRT now? (Y/N): "
    if /i "%RESTART%"=="Y" (
        start "" "%INSTALL_DIR%\rcrt.exe"
        exit /b
    )
)

:: Create installation directory
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Download the latest release
echo Downloading RCRT...
echo (If this fails, manually download from:)
echo %RELEASE_URL%/RCRT-windows-x64.exe
echo.

powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%RELEASE_URL%/RCRT-windows-x64.exe' -OutFile '%INSTALL_DIR%\rcrt.exe' -UseBasicParsing; Write-Host 'Download complete' } catch { Write-Host 'Download failed: ' $_.Exception.Message; exit 1 }"

if not exist "%INSTALL_DIR%\rcrt.exe" (
    echo.
    echo Failed to download. Please:
    echo 1. Visit: https://github.com/anomalyco/rcrt/releases
    echo 2. Download RCRT-windows-x64.exe
    echo 3. Save it to: %INSTALL_DIR%\rcrt.exe
    echo.
    pause
    exit /b
)

echo.
echo ✓ RCRT downloaded successfully!

:: Create desktop shortcut
echo Creating shortcut on Desktop...
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%USERPROFILE%\Desktop\RCRT.lnk'); $s.TargetPath = '%INSTALL_DIR%\rcrt.exe'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Save()"

:: Create start menu entry
if not exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\RCRT" mkdir "%APPDATA%\Microsoft\Windows\Start Menu\Programs\RCRT"
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%APPDATA%\Microsoft\Windows\Start Menu\Programs\RCRT\RCRT.lnk'); $s.TargetPath = '%INSTALL_DIR%\rcrt.exe'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Save()"

echo.
echo ════════════════════════════════════════════════════════════
echo   Installation Complete!
echo ════════════════════════════════════════════════════════════
echo.
echo RCRT is now installed and ready to use!
echo.
echo Location: %INSTALL_DIR%\rcrt.exe
echo.
echo Starting RCRT...
echo.

start "" "%INSTALL_DIR%\rcrt.exe"

echo Done! RCRT should be running.
echo.
pause
