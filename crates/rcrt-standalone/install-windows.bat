@echo off
setlocal enabledelayedexpansion

echo ============================================
echo RCRT Installer - Windows Native
echo ============================================
echo.

REM Check if Rust is installed
where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Rust is not installed
    echo Please install Rust from: https://rustup.rs
    echo.
    pause
    exit /b 1
)

echo [1/3] Building RCRT...
cargo build --release -p rcrt-standalone
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo [2/3] Copying binary...
copy /Y target\release\rcrt-standalone.exe "%USERPROFILE%\RCRT\RCRT.exe" >nul
if not exist "%USERPROFILE%\RCRT" mkdir "%USERPROFILE%\RCRT"

echo [3/3] Creating startup shortcut...
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%USERPROFILE%\Desktop\RCRT.lnk'); $s.TargetPath = '%USERPROFILE%\RCRT\RCRT.exe'; $s.WorkingDirectory = '%USERPROFILE%\RCRT'; $s.Save()"

echo.
echo ============================================
echo Installation Complete!
echo ============================================
echo.
echo RCRT has been installed to: %USERPROFILE%\RCRT\RCRT.exe
echo A shortcut has been created on your desktop
echo.
echo To run RCRT:
echo   1. Double-click the RCRT shortcut on your desktop
echo   2. Or run: %USERPROFILE%\RCRT\RCRT.exe
echo.
echo RCRT will start on http://localhost:8090
echo.
pause
