@echo off
set GIT_PATH="C:\Program Files\Git\cmd\git.exe"
echo ==========================================
echo Brandeck ERP - New Repo Upload (V1)
echo ==========================================
echo.
echo 1. Adding files...
%GIT_PATH% add .
echo.
echo 2. Committing changes...
%GIT_PATH% commit -m "Fresh upload to ERP1"
echo.
set REPO_URL=https://github.com/omkaramajay-dev/Brandeck-ERP1.git

echo 3. Connecting to NEW Repo...
echo Target Repo: %REPO_URL%
%GIT_PATH% remote remove origin >nul 2>&1
%GIT_PATH% remote add origin %REPO_URL%
echo.
echo 4. Uploading to GitHub...
echo (A LOGIN POPUP MIGHT APPEAR - PLEASE SIGN IN)
%GIT_PATH% push -u origin main
echo.
if %errorlevel% neq 0 (
    echo.
    echo [!!!] UPLOAD FAILED! 
    echo Please see the error message above.
) else (
    echo [SUCCESS] Your code is now online at Brandeck-ERP1!
)
echo.
echo ==========================================
pause
