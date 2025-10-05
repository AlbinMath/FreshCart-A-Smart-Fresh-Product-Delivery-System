@echo off
REM FreshCart E2E Test Runner Script for Windows
REM This script starts the required services and runs Playwright tests

setlocal enabledelayedexpansion

echo 🚀 FreshCart E2E Test Runner (Windows)
echo =====================================

REM Default values
set HEADLESS=true
set BROWSER=chromium
set TEST_SUITE=all
set CLEANUP=true
set BACKEND_PORT=5000
set FRONTEND_PORT=5173

REM Parse command line arguments
:parse_args
if "%~1"=="" goto :start_tests
if "%~1"=="--headed" (
    set HEADLESS=false
    shift
    goto :parse_args
)
if "%~1"=="--browser" (
    set BROWSER=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--test-suite" (
    set TEST_SUITE=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--no-cleanup" (
    set CLEANUP=false
    shift
    goto :parse_args
)
if "%~1"=="--help" (
    echo FreshCart E2E Test Runner
    echo Usage: %0 [options]
    echo.
    echo Options:
    echo   --headed              Run tests in headed mode (visible browser^)
    echo   --browser BROWSER     Browser to use (chromium, firefox, webkit, all^)
    echo   --test-suite SUITE    Test suite to run (all, auth, products, admin, delivery^)
    echo   --no-cleanup          Don't clean up processes after tests
    echo   --help               Show this help message
    echo.
    echo Examples:
    echo   %0                                    # Run all tests headless
    echo   %0 --headed --browser firefox         # Run in Firefox with visible browser
    echo   %0 --test-suite auth                  # Run only authentication tests
    echo   %0 --headed --test-suite products     # Run product tests with visible browser
    exit /b 0
)
shift
goto :parse_args

:start_tests
echo [INFO] Configuration:
echo   - Browser: %BROWSER%
echo   - Test Suite: %TEST_SUITE%
echo   - Headless: %HEADLESS%
echo   - Backend Port: %BACKEND_PORT%
echo   - Frontend Port: %FRONTEND_PORT%
echo   - Cleanup: %CLEANUP%
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ and try again.
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm is not installed. Please install npm and try again.
    exit /b 1
)

echo [INFO] Prerequisites check passed

REM Install dependencies if needed
echo [INFO] Checking and installing dependencies...

if not exist "..\backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    cd ..\backend
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install backend dependencies
        exit /b 1
    )
    cd ..\tests
)

if not exist "..\frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd ..\frontend
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install frontend dependencies
        exit /b 1
    )
    cd ..\tests
)

if not exist "node_modules" (
    echo [INFO] Installing test dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install test dependencies
        exit /b 1
    )
)

if not exist "node_modules\@playwright" (
    echo [INFO] Installing Playwright browsers...
    call npx playwright install
    if errorlevel 1 (
        echo [ERROR] Failed to install Playwright browsers
        exit /b 1
    )
)

echo [SUCCESS] Dependencies installation completed

REM Check if backend port is in use
netstat -an | findstr ":%BACKEND_PORT%" | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo [WARNING] Port %BACKEND_PORT% is already in use. Attempting to use existing server.
) else (
    echo [INFO] Starting backend server on port %BACKEND_PORT%...
    cd ..\backend
    start /B "" npm start
    cd ..\tests
    
    REM Wait for backend to be ready
    echo [INFO] Waiting for backend server to be ready...
    timeout /t 10 /nobreak >nul
    
    REM Simple check - try to connect to the port
    for /L %%i in (1,1,15) do (
        netstat -an | findstr ":%BACKEND_PORT%" | findstr "LISTENING" >nul
        if not errorlevel 1 goto :backend_ready
        timeout /t 2 /nobreak >nul
    )
    
    echo [ERROR] Backend server failed to start or is not responding
    goto :cleanup_and_exit
    
    :backend_ready
    echo [SUCCESS] Backend server is ready
)

REM Check if frontend port is in use
netstat -an | findstr ":%FRONTEND_PORT%" | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo [WARNING] Port %FRONTEND_PORT% is already in use. Attempting to use existing server.
) else (
    echo [INFO] Building and starting frontend server on port %FRONTEND_PORT%...
    cd ..\frontend
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Failed to build frontend
        cd ..\tests
        goto :cleanup_and_exit
    )
    
    start /B "" npm run preview -- --port %FRONTEND_PORT%
    cd ..\tests
    
    REM Wait for frontend to be ready
    echo [INFO] Waiting for frontend server to be ready...
    timeout /t 10 /nobreak >nul
    
    for /L %%i in (1,1,15) do (
        netstat -an | findstr ":%FRONTEND_PORT%" | findstr "LISTENING" >nul
        if not errorlevel 1 goto :frontend_ready
        timeout /t 2 /nobreak >nul
    )
    
    echo [ERROR] Frontend server failed to start or is not responding
    goto :cleanup_and_exit
    
    :frontend_ready
    echo [SUCCESS] Frontend server is ready
)

REM Set environment variables
set NODE_ENV=test
set FRONTEND_URL=http://localhost:%FRONTEND_PORT%
set API_BASE_URL=http://localhost:%BACKEND_PORT%

REM Run tests
echo [INFO] Running Playwright tests...

set TEST_CMD=npx playwright test

REM Add browser selection
if not "%BROWSER%"=="all" (
    set TEST_CMD=!TEST_CMD! --project=%BROWSER%
)

REM Add headless/headed mode
if "%HEADLESS%"=="false" (
    set TEST_CMD=!TEST_CMD! --headed
)

REM Add test suite selection
if "%TEST_SUITE%"=="auth" (
    set TEST_CMD=!TEST_CMD! e2e\auth.spec.js
) else if "%TEST_SUITE%"=="products" (
    set TEST_CMD=!TEST_CMD! e2e\products.spec.js
) else if "%TEST_SUITE%"=="admin" (
    set TEST_CMD=!TEST_CMD! e2e\admin.spec.js
) else if "%TEST_SUITE%"=="delivery" (
    set TEST_CMD=!TEST_CMD! e2e\delivery.spec.js
)

echo [INFO] Executing: !TEST_CMD!

REM Run the tests
call !TEST_CMD!
set TEST_RESULT=%errorlevel%

REM Generate report
if exist "playwright-report\index.html" (
    echo [SUCCESS] Test report generated: playwright-report\index.html
    echo [INFO] Opening test report in browser...
    start "" "playwright-report\index.html"
) else (
    echo [WARNING] No test report found
)

if %TEST_RESULT%==0 (
    echo [SUCCESS] All tests completed successfully! 🎉
) else (
    echo [ERROR] Tests failed! ❌
)

:cleanup_and_exit
if "%CLEANUP%"=="true" (
    echo [INFO] Cleaning up processes...
    
    REM Kill processes on the ports
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%BACKEND_PORT%" ^| findstr "LISTENING"') do (
        echo [INFO] Stopping process on port %BACKEND_PORT% (PID: %%a^)
        taskkill /F /PID %%a >nul 2>nul
    )
    
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%FRONTEND_PORT%" ^| findstr "LISTENING"') do (
        echo [INFO] Stopping process on port %FRONTEND_PORT% (PID: %%a^)
        taskkill /F /PID %%a >nul 2>nul
    )
    
    echo [SUCCESS] Cleanup completed
)

if %TEST_RESULT%==0 (
    exit /b 0
) else (
    exit /b 1
)