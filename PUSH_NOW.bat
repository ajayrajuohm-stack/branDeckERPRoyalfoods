@echo off
set GIT_PATH="C:\Program Files\Git\cmd\git.exe"
echo ==========================================
echo Brandeck ERP - Cloud Upload Debugger
echo ==========================================
echo.
echo Checking Git:
if exist %GIT_PATH% (echo [OK] Git found) else (echo [ERROR] Git not found at default path)
echo.
echo 1. Adding files...
%GIT_PATH% add .
echo.
echo 2. Committing changes...
%GIT_PATH% commit -m "Final Cloud Ready Version"
echo.
echo 3. Setting Remote...
%GIT_PATH% remote set-url origin https://github.com/omkaramajay-dev/Brandeck-ERP.git
echo.
echo 4. Pushing to GitHub...
echo (A LOGIN POPUP MIGHT APPEAR - PLEASE SIGN IN)
%GIT_PATH% push -u origin main
echo.
if %errorlevel% neq 0 (
    echo.
    echo [!!!] UPLOAD FAILED! 
    echo Please see the error message above.
) else (
    echo [SUCCESS] Upload complete!
)
echo.
echo ==========================================
pause
