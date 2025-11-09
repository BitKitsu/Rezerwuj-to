@echo off
setlocal enabledelayedexpansion

:: System do Zarządzania Rezerwacjami - Windows
:: Użycie: manage.bat [komenda]

set "COMMAND=%1"

if "%COMMAND%"=="" (
    set COMMAND=help
)

:: Kolory (opcjonalne - działa w Windows 10+)
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

goto %COMMAND% 2>nul || goto invalid

:help
echo.
echo ========================================
echo SYSTEM ZARZADZANIA - KOMENDY
echo ========================================
echo.
echo Podstawowe:
echo   manage.bat start      - Uruchom backend (Docker)
echo   manage.bat stop       - Zatrzymaj backend
echo   manage.bat restart    - Restart z czyszczeniem
echo   manage.bat status     - Sprawdz status
echo   manage.bat test       - Testuj caly system (porty, Gateway, JWT)
echo.
echo Frontend:
echo   manage.bat frontend   - Uruchom frontend React
echo   manage.bat all        - Uruchom backend + frontend
echo.
echo Logi i debugowanie:
echo   manage.bat logs       - Pokaz logi (wszystkie)
echo   manage.bat logs-id    - Logi IdentityService
echo   manage.bat logs-res   - Logi ReservationService
echo   manage.bat logs-not   - Logi NotificationService
echo.
echo Docker:
echo   manage.bat build      - Przebuduj obrazy
echo   manage.bat clean      - Usun obrazy i wolumeny
echo   manage.bat ps         - Lista kontenerow
echo.
goto end

:start
echo.
echo ========================================
echo URUCHAMIANIE BACKEND
echo ========================================
cd app\backend
docker-compose up -d
echo.
echo Czekanie na inicjalizacje (20 sekund)...
timeout /t 20 /nobreak >nul
echo.
echo %GREEN%Backend uruchomiony!%NC%
echo.
echo API Gateway:     http://localhost:5000 (glowny punkt wejscia)
echo Identity API:    http://localhost:5001/swagger
echo Reservation API: http://localhost:5002/swagger
echo Notification API: http://localhost:5003/swagger
echo RabbitMQ:        http://localhost:15672 (guest/guest)
cd ..\..
goto end

:stop
echo.
echo ========================================
echo ZATRZYMYWANIE BACKEND
echo ========================================
cd app\backend
docker-compose down
cd ..\..
echo %GREEN%Backend zatrzymany%NC%
goto end

:restart
echo.
echo ========================================
echo RESTART Z CZYSZCZENIEM
echo ========================================
cd app\backend
echo Zatrzymywanie kontenerow...
docker-compose down -v
echo Budowanie i uruchamianie...
docker-compose build --no-cache
docker-compose up -d
echo.
echo Czekanie na inicjalizacje (25 sekund)...
timeout /t 25 /nobreak >nul
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
cd ..\..
echo %GREEN%System zrestartowany!%NC%
goto end

:status
echo.
echo ========================================
echo STATUS SYSTEMU
echo ========================================
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | findstr /i "backend-"
echo.
:: Test połączeń
echo Testowanie połaczen...
curl -s http://localhost:5001/health >nul 2>&1 && (
    echo %GREEN%[OK]%NC% IdentityService
) || (
    echo %RED%[FAIL]%NC% IdentityService
)
curl -s http://localhost:5002/health >nul 2>&1 && (
    echo %GREEN%[OK]%NC% ReservationService
) || (
    echo %RED%[FAIL]%NC% ReservationService
)
curl -s http://localhost:5003/health >nul 2>&1 && (
    echo %GREEN%[OK]%NC% NotificationService
) || (
    echo %RED%[FAIL]%NC% NotificationService
)
goto end

:test
echo.
echo ========================================
echo TESTOWANIE SYSTEMU
echo ========================================
echo.
echo 1. Test portow:
curl -s http://localhost:5000/health >nul 2>&1 && (
    echo API Gateway: [OK]
) || (
    echo API Gateway: [FAIL]
)
curl -s http://localhost:5001/health >nul 2>&1 && (
    echo IdentityService: [OK]
) || (
    echo IdentityService: [FAIL]
)
curl -s http://localhost:5002/health >nul 2>&1 && (
    echo ReservationService: [OK]
) || (
    echo ReservationService: [FAIL]
)
curl -s http://localhost:5003/health >nul 2>&1 && (
    echo NotificationService: [OK]
) || (
    echo NotificationService: [FAIL]
)
echo.
echo 2. Test routingu przez API Gateway:
curl -s http://localhost:5000/identity/health >nul 2>&1 && (
    echo Gateway -^> Identity: [OK]
) || (
    echo Gateway -^> Identity: [FAIL]
)
curl -s http://localhost:5000/reservation/health >nul 2>&1 && (
    echo Gateway -^> Reservation: [OK]
) || (
    echo Gateway -^> Reservation: [FAIL]
)
echo.
echo 3. Test JWT przez Gateway:
for /f "delims=" %%i in ('curl -s -X POST http://localhost:5000/identity/account/login -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\",\"password\":\"Test123!\"}"') do set LOGIN_RESPONSE=%%i
echo %LOGIN_RESPONSE% | findstr "accessToken" >nul && (
    echo Login JWT: [OK]
) || (
    echo Login JWT: [FAIL]
)
echo.
echo 4. Test rejestracji przez Gateway:
curl -X POST http://localhost:5000/identity/account/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test%RANDOM%@example.com\",\"password\":\"Test123!\",\"firstName\":\"Test\",\"lastName\":\"User\"}"
echo.
goto end

:frontend
echo.
echo ========================================
echo URUCHAMIANIE FRONTEND
echo ========================================
cd app\frontend\my-frontend
echo Uruchamianie React...
npm run dev
cd ..\..\..
goto end

:all
echo.
echo ========================================
echo URUCHAMIANIE CALEGO SYSTEMU
echo ========================================
call :start
echo.
echo Za 3 sekundy uruchomi sie frontend...
timeout /t 3 /nobreak >nul
start cmd /k "cd app\frontend\my-frontend && npm run dev"
echo.
echo %GREEN%System gotowy!%NC%
echo.
echo Aplikacja:       http://localhost:5173
echo Identity API:    http://localhost:5001/swagger
echo Reservation API: http://localhost:5002/swagger
echo.
echo Dane testowe:
echo   Email: test@example.com
echo   Haslo: Test123!
goto end

:logs
cd app\backend
docker-compose logs -f
cd ..\..
goto end

:logs-id
docker logs -f backend-identity_api-1
goto end

:logs-res
docker logs -f backend-reservation_api-1
goto end

:logs-not
docker logs -f backend-notification_api-1
goto end

:build
echo.
echo ========================================
echo BUDOWANIE OBRAZOW
echo ========================================
cd app\backend
docker-compose build --no-cache
cd ..\..
echo %GREEN%Obrazy zbudowane!%NC%
goto end

:clean
echo.
echo ========================================
echo CZYSZCZENIE DOCKER
echo ========================================
cd app\backend
docker-compose down -v
docker system prune -af
cd ..\..
echo %GREEN%Wyczyszczono!%NC%
goto end

:ps
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
goto end

:invalid
echo %RED%Nieznana komenda: %COMMAND%%NC%
echo Uzyj: manage.bat help
goto end

:end
endlocal
