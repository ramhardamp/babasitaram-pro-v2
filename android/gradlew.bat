@echo off
where gradle >nul 2>nul
if %ERRORLEVEL% EQU 0 (
  gradle %*
  exit /b %ERRORLEVEL%
)
echo Gradle 8.11.1 bootstrap for Windows is not included in this shell launcher. Install Gradle 8.11.1 or open android\ in Android Studio.
exit /b 127
