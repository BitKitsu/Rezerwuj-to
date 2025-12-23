@echo off
setlocal EnableDelayedExpansion

rem ==============================================
rem Quick Commit Helper - automatic commit (Windows)
rem ==============================================

echo Quick Commit Helper (Windows)
echo ==========================
echo.

rem Ensure we operate from the repository root (parent of scripts folder)
cd /d "%~dp0.." || goto :eof

rem Verify we are inside a Git repository
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo This directory is not inside a Git repository.
    goto :eof
)

echo Repository status:
 git status --short
echo.

echo Choose commit type:
echo   1^)^ feat      - New feature
echo   2^)^ fix       - Bug fix
echo   3^)^ docs      - Documentation
echo   4^)^ style     - Formatting
echo   5^)^ refactor  - Refactor
echo   6^)^ test      - Tests
echo   7^)^ chore     - Chores / configuration
echo   8^)^ ci        - CI/CD
echo   9^)^ perf      - Performance
echo.
set /p type_choice=Select number (1-9): 

if "%type_choice%"=="1" set "commit_type=feat"
if "%type_choice%"=="2" set "commit_type=fix"
if "%type_choice%"=="3" set "commit_type=docs"
if "%type_choice%"=="4" set "commit_type=style"
if "%type_choice%"=="5" set "commit_type=refactor"
if "%type_choice%"=="6" set "commit_type=test"
if "%type_choice%"=="7" set "commit_type=chore"
if "%type_choice%"=="8" set "commit_type=ci"
if "%type_choice%"=="9" set "commit_type=perf"

if not defined commit_type (
    echo Invalid choice.
    goto :eof
)

echo.
set /p scope=Scope (optional, e.g.: api, gateway, frontend): 

echo.
set /p subject=Short description (e.g.: Add user authentication): 

if "%subject%"=="" (
    echo Description cannot be empty!
    goto :eof
)

echo.
set /p body=Additional description (optional, press Enter to skip): 

if not "%scope%"=="" (
    set "commit_msg=%commit_type%(%scope%): %subject%"
) else (
    set "commit_msg=%commit_type%: %subject%"
)

echo.
echo Commit preview:
echo ---
echo %commit_msg%
if not "%body%"=="" (
    echo.
    echo %body%
)
echo ---
echo.

set /p confirm=Continue? (y/n): 
if /I not "%confirm%"=="y" (
    echo Cancelled.
    goto :eof
)

echo.
echo Adding all changes (git add -A)...
git add -A
if errorlevel 1 (
    echo Error while adding files.
    goto :eof
)

echo.
if "%body%"=="" (
    git commit -m "%commit_msg%"
) else (
    git commit -m "%commit_msg%" -m "%body%"
)

if errorlevel 1 (
    echo Error while creating commit.
    goto :eof
)

echo Commit created successfully!
echo.

set /p push_confirm=Push changes to remote repo? (y/n): 
if /I "%push_confirm%"=="y" (
    for /f "delims=" %%b in ('git branch --show-current') do set "current_branch=%%b"
    echo.
    echo Pushing to origin/!current_branch!...
    git push origin "!current_branch!"
    if errorlevel 1 (
        echo Error while pushing.
    ) else (
        echo Changes pushed successfully!
        echo.
        for /f "delims=" %%u in ('git config --get remote.origin.url') do set "repo_url=%%u"
        echo Check GitHub Actions:
        echo !repo_url!/actions
    )
) else (
    echo.
    for /f "delims=" %%b in ('git branch --show-current') do set "current_branch=%%b"
    echo To push later:
    echo   git push origin !current_branch!
)

endlocal
