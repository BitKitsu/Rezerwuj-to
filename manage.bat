@echo off
setlocal enabledelayedexpansion

:: System do Zarządzania Rezerwacjami - Windows
:: Użycie: manage.bat [komenda]

set "COMMAND=%1"
set "ARG2=%2"

set "ENDPOINTS_PRINTED=0"
set "FRONTEND_DEPS_INSTALLED=0"

if "%COMMAND%"=="" (
    set COMMAND=help
)

if /i "%COMMAND%"=="log" set COMMAND=logs
if /i "%COMMAND%"=="run" set COMMAND=all
if /i "%COMMAND%"=="ci" set COMMAND=ci-test
if /i "%COMMAND%"=="--help" set COMMAND=help
if /i "%COMMAND%"=="-h" set COMMAND=help

:: Kolory (opcjonalne - działa w Windows 10+)
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

call :%COMMAND% %ARG2% 2>nul
if errorlevel 1 goto invalid
goto end

:help
echo.
echo ========================================
echo SYSTEM ZARZADZANIA - KOMENDY
echo ========================================
echo.
echo Uzycie: manage.bat [KOMENDA] [OPCJE]
echo.
echo KOMENDY:
echo   start         - Uruchom backend
echo   stop          - Zatrzymaj backend
echo   restart       - Restart backend (bez kasowania danych)
echo   reset         - Reset backend (USUNIE DANE: kontenery + wolumeny; bez startu)
echo   frontend      - Uruchom tylko frontend
echo   all           - Uruchom wszystko (backend + frontend)
echo   test          - Testuj caly system (porty, Gateway, JWT, routing)
echo   ci-test       - Test CI/CD lokalnie przed commitowaniem
echo   logs          - Pokaz logi (opcjonalnie: logs [nazwa_serwisu])
echo   status        - Pokaz status systemu
echo   help          - Pokaz te pomoc
echo.
echo PRZYKLADY:
echo   manage.bat all
echo   manage.bat restart
echo   manage.bat reset
echo   manage.bat logs identity_api
echo   manage.bat test
echo.
echo SERWISY (dla logs):
echo   postgres_db      - Baza danych PostgreSQL
echo   identity_api     - Serwis autoryzacji
echo   reservation_api  - Serwis rezerwacji
echo   notification_api - Serwis powiadomien
echo   mailhog          - SMTP + UI do testow email
echo   api_gateway      - API Gateway
echo.
exit /b 0

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

curl -s -f http://localhost:5000/health >nul 2>&1 && (
    echo %GREEN%API Gateway dziala na http://localhost:5000%NC%
) || (
    echo %RED%API Gateway nie odpowiada!%NC%
    echo Sprawdz logi: docker-compose logs api_gateway
)

curl -s -f http://localhost:5001/health >nul 2>&1 && (
    echo %GREEN%IdentityService dziala na http://localhost:5001/swagger%NC%
) || (
    echo %RED%IdentityService nie odpowiada!%NC%
    echo Sprawdz logi: docker-compose logs identity_api
)

curl -s -f http://localhost:5002/health >nul 2>&1 && (
    echo %GREEN%ReservationService dziala na http://localhost:5002/swagger%NC%
) || (
    echo %RED%ReservationService nie odpowiada!%NC%
    echo Sprawdz logi: docker-compose logs reservation_api
)

curl -s -f http://localhost:5003/health >nul 2>&1 && (
    echo %GREEN%NotificationService dziala na http://localhost:5003/swagger%NC%
) || (
    echo %RED%NotificationService nie odpowiada!%NC%
    echo Sprawdz logi: docker-compose logs notification_api
)

curl -s -f http://localhost:8025 >nul 2>&1 && (
    echo %GREEN%MailHog UI dziala na http://localhost:8025%NC%
) || (
    echo %RED%MailHog UI nie odpowiada!%NC%
    echo Sprawdz logi: docker-compose logs mailhog
)

echo.
echo RabbitMQ UI:     http://localhost:15672 (guest/guest)
echo MailHog UI:      http://localhost:8025
echo PostgreSQL:      localhost:5433
call :print_endpoints
cd ..\..
exit /b 0

:stop
echo.
echo ========================================
echo ZATRZYMYWANIE BACKEND
echo ========================================
cd app\backend
docker-compose down
cd ..\..
echo %GREEN%Backend zatrzymany%NC%
exit /b 0

:restart
echo.
echo ========================================
echo RESTART BACKEND
echo ========================================
cd app\backend
echo Uruchamianie (jesli nie dziala)...
docker-compose up -d
echo Restartowanie kontenerow...
docker-compose restart
echo.
echo Czekanie na inicjalizacje (15 sekund)...
timeout /t 15 /nobreak >nul

docker-compose ps

echo.
echo Testowanie API...
curl -s http://localhost:5002/api/services >nul 2>&1 && (
    echo Services endpoint: %GREEN%Dziala!%NC%
) || (
    echo Services endpoint: %RED%Nie dziala!%NC%
)
cd ..\..
echo %GREEN%System zrestartowany!%NC%
exit /b 0

:reset
echo.
echo ========================================
echo RESET SYSTEMU (USUNIE DANE!)
echo ========================================
echo.
echo %RED%UWAGA: Ta komenda usunie kontenery i wolumeny Docker (baza danych) i wszystkie dane.%NC%
echo Aby kontynuowac, wpisz RESET i nacisnij Enter.
set /p CONFIRM=
if /i not "!CONFIRM!"=="RESET" (
    echo Anulowano.
    exit /b 0
)
cd app\backend
echo Zatrzymywanie kontenerow i usuwanie wolumenow...
docker-compose down -v
cd ..\..
echo %GREEN%Reset zakonczony. Backend jest zatrzymany.%NC%
exit /b 0

:status
echo.
echo ========================================
echo STATUS SYSTEMU
echo ========================================
cd app\backend
docker-compose ps
cd ..\..

echo.
echo Porty:
curl -s -f http://localhost:5001/health >nul 2>&1 && (echo 5001: IdentityService %GREEN%%NC%) || (echo 5001: IdentityService %RED%%NC%)
curl -s -f http://localhost:5002/health >nul 2>&1 && (echo 5002: ReservationService %GREEN%%NC%) || (echo 5002: ReservationService %RED%%NC%)
curl -s -f http://localhost:5173 >nul 2>&1 && (echo 5173: Frontend React %GREEN%%NC%) || (echo 5173: Frontend React %RED%%NC%)

curl -s -f http://localhost:8025 >nul 2>&1 && (echo 8025: MailHog UI %GREEN%%NC%) || (echo 8025: MailHog UI %RED%%NC%)

for /f "delims=" %%i in ('powershell -NoProfile -Command "[bool](Test-NetConnection localhost -Port 5433 -InformationLevel Quiet)"') do set "PG_OK=%%i"
if /i "!PG_OK!"=="True" (echo 5433: PostgreSQL %GREEN%%NC%) else (echo 5433: PostgreSQL %RED%%NC%)
exit /b 0

:test
echo.
echo ========================================
echo TESTOWANIE SYSTEMU
echo ========================================
echo.
echo 1. Testowanie portow...

curl -s -f http://localhost:5000/health >nul 2>&1 && (
    echo API Gateway: %GREEN%Port otwarty%NC%
) || (
    echo API Gateway: %RED%Port zamkniety%NC%
)

curl -s -f http://localhost:5001/health >nul 2>&1 && (
    echo IdentityService: %GREEN%Port otwarty%NC%
) || (
    echo IdentityService: %RED%Port zamkniety%NC%
)

curl -s -f http://localhost:5002/health >nul 2>&1 && (
    echo ReservationService: %GREEN%Port otwarty%NC%
) || (
    echo ReservationService: %RED%Port zamkniety%NC%
)

curl -s -f http://localhost:5003/health >nul 2>&1 && (
    echo NotificationService: %GREEN%Port otwarty%NC%
) || (
    echo NotificationService: %RED%Port zamkniety%NC%
)

curl -s -f http://guest:guest@localhost:15672/api/overview >nul 2>&1 && (
    echo RabbitMQ: %GREEN%Management UI dziala%NC%
) || (
    echo RabbitMQ: %RED%Management UI niedostepne%NC%
)

curl -s -f http://localhost:8025 >nul 2>&1 && (
    echo MailHog: %GREEN%UI dziala%NC%
) || (
    echo MailHog: %RED%UI niedostepne%NC%
)
echo.
echo 2. Test routingu przez API Gateway:
curl -s -f http://localhost:5000/identity/health >nul 2>&1 && (
    echo Gateway -^> Identity: %GREEN%Routing dziala%NC%
) || (
    echo Gateway -^> Identity: %RED%Routing nie dziala%NC%
)
curl -s -f http://localhost:5000/reservation/health >nul 2>&1 && (
    echo Gateway -^> Reservation: %GREEN%Routing dziala%NC%
) || (
    echo Gateway -^> Reservation: %RED%Routing nie dziala%NC%
)
echo.
echo 3. Test JWT Authentication przez Gateway...
set "ACCESS_TOKEN="
for /f "delims=" %%i in ('curl -s -X POST http://localhost:5000/identity/account/login -H "Content-Type: application/json" -d "{\"loginIdentifier\":\"test@example.com\",\"password\":\"Test123!\"}" ^| powershell -NoProfile -Command "$json=[Console]::In.ReadToEnd(); try { ($json ^| ConvertFrom-Json).accessToken } catch { '' }"') do set "ACCESS_TOKEN=%%i"

if not "!ACCESS_TOKEN!"=="" (
    echo Login JWT: %GREEN%Dziala%NC%

    for /f "delims=" %%i in ('curl -s -o nul -w "%%{http_code}" -H "Authorization: Bearer !ACCESS_TOKEN!" http://localhost:5000/identity/audit/my') do set "AUTH_STATUS=%%i"
    if "!AUTH_STATUS!"=="200" (
        echo Autoryzacja JWT: %GREEN%Dziala%NC%
    ) else (
        echo Autoryzacja JWT: %RED%Problem (HTTP !AUTH_STATUS!)%NC%
    )
) else (
    echo Login JWT: %RED%Nie dziala%NC%
)

echo.
echo 4. Test rejestracji przez API Gateway...
for /f "delims=" %%i in ('powershell -NoProfile -Command "[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()"') do set "TEST_TS=%%i"
set "TEST_EMAIL=test!TEST_TS!@example.com"
set "TEST_USERNAME=testuser!TEST_TS!"
set "TEST_PHONE=+48!TEST_TS:~1!"

for /f "delims=" %%i in ('curl -s -o nul -w "%%{http_code}" -X POST http://localhost:5000/identity/account/register -H "Content-Type: application/json" -d "{\"email\":\"!TEST_EMAIL!\",\"username\":\"!TEST_USERNAME!\",\"password\":\"Test123!\",\"firstName\":\"Test\",\"lastName\":\"User\",\"phone\":\"!TEST_PHONE!\"}"') do set "REG_STATUS=%%i"

if "!REG_STATUS!"=="200" (
    echo %GREEN%Rejestracja dziala!%NC%

    set "TEST_ACCESS_TOKEN="
    for /f "delims=" %%i in ('curl -s -X POST http://localhost:5000/identity/account/login -H "Content-Type: application/json" -d "{\"loginIdentifier\":\"!TEST_EMAIL!\",\"password\":\"Test123!\"}" ^| powershell -NoProfile -Command "$json=[Console]::In.ReadToEnd(); try { ($json ^| ConvertFrom-Json).accessToken } catch { '' }"') do set "TEST_ACCESS_TOKEN=%%i"

    if not "!TEST_ACCESS_TOKEN!"=="" (
        for /f "delims=" %%i in ('curl -s -o nul -w "%%{http_code}" -X DELETE -H "Authorization: Bearer !TEST_ACCESS_TOKEN!" http://localhost:5000/identity/account/delete') do set "DELETE_STATUS=%%i"
        if "!DELETE_STATUS!"=="200" (
            echo Testowy uzytkownik rejestracji zostal usuniety.
        ) else (
            echo %RED%Nie udalo sie usunac testowego uzytkownika rejestracji (HTTP !DELETE_STATUS!)%NC%
        )
    ) else (
        echo %RED%Nie udalo sie zalogowac testowego uzytkownika do usuniecia.%NC%
    )
) else (
    echo %RED%Problem z rejestracja (HTTP !REG_STATUS!)%NC%
)

echo.
echo 5. Test pobierania danych przez Gateway...
curl -s http://localhost:5000/reservation/services | findstr /i "serviceName" >nul && (
    echo %GREEN%API zwraca dane o uslugach%NC%
) || (
    echo %RED%API nie zwraca poprawnych danych%NC%
)

exit /b 0

:print_endpoints
if "%ENDPOINTS_PRINTED%"=="1" exit /b 0
set "ENDPOINTS_PRINTED=1"
echo.
echo ========================================
echo DOSTEPNE ADRESY
echo ========================================
echo Aplikacja (Frontend): http://localhost:5173
echo API Gateway:         http://localhost:5000
echo API Gateway (health): http://localhost:5000/health
echo Identity (Swagger):  http://localhost:5001/swagger
echo Reservation (Swagger): http://localhost:5002/swagger
echo Notification (Swagger): http://localhost:5003/swagger
echo SMS Inbox (dev):     http://localhost:5003/sms-inbox
echo RabbitMQ UI:         http://localhost:15672 (guest/guest)
echo MailHog UI:          http://localhost:8025
echo PostgreSQL:          localhost:5433
exit /b 0

:ensure_frontend_deps
if "%FRONTEND_DEPS_INSTALLED%"=="1" exit /b 0
set "FRONTEND_DEPS_INSTALLED=1"

if not exist app\frontend\my-frontend exit /b 1

:: prefer npm ci when package-lock.json exists and is newer than node_modules\.package-lock.json
pushd app\frontend\my-frontend
if exist package-lock.json (
    if not exist node_modules (goto :do_npm_ci)
    if not exist node_modules\.package-lock.json (goto :do_npm_ci)
    powershell -NoProfile -Command "if((Get-Item 'package-lock.json').LastWriteTimeUtc -gt (Get-Item 'node_modules\\.package-lock.json').LastWriteTimeUtc){ exit 0 } else { exit 1 }" >nul 2>&1
    if not errorlevel 1 (goto :do_npm_ci)
    goto :deps_done
)

if not exist node_modules (
    echo Instalowanie pakietow npm...
    npm install
    if errorlevel 1 (popd & exit /b 1)
)
goto :deps_done

:do_npm_ci
echo Instalowanie pakietow npm (npm ci)...
npm ci
if errorlevel 1 (popd & exit /b 1)
copy /y package-lock.json node_modules\.package-lock.json >nul 2>&1
goto :deps_done

:deps_done
popd
exit /b 0

:frontend
echo.
echo ========================================
echo URUCHAMIANIE FRONTEND
echo ========================================
call :print_endpoints
call :ensure_frontend_deps
cd app\frontend\my-frontend
echo Uruchamianie React...
npm run dev
cd ..\..\..
exit /b 0

:all
echo.
echo ========================================
echo URUCHAMIANIE CALEGO SYSTEMU
echo ========================================
call :start
echo.
echo Za 3 sekundy uruchomi sie frontend...
timeout /t 3 /nobreak >nul
echo.
echo %GREEN%System gotowy!%NC%
echo.
echo Dostepne adresy:
echo -------------------
echo Aplikacja:          http://localhost:5173
echo %GREEN%API Gateway:        http://localhost:5000%NC% (glowny punkt wejscia)
echo Identity API:       http://localhost:5001/swagger
echo Reservation API:    http://localhost:5002/swagger
echo Notification API:   http://localhost:5003/swagger
echo RabbitMQ UI:        http://localhost:15672 (guest/guest)
echo MailHog UI:         http://localhost:8025
echo PostgreSQL:         localhost:5433
echo.
echo Dane testowe:
echo   Email: test@example.com
echo   Haslo: Test123!
echo.
echo Aby zatrzymac: Ctrl+C, potem: manage.bat stop
echo.
set "ENDPOINTS_PRINTED=1"
call :frontend
exit /b 0

:logs
cd app\backend
if "%~1"=="" (
    docker-compose logs --tail=50
) else (
    docker-compose logs --tail=50 %~1
)
cd ..\..
exit /b 0

:logs-id
docker logs -f backend-identity_api-1
exit /b 0

:logs-res
docker logs -f backend-reservation_api-1
exit /b 0

:logs-not
docker logs -f backend-notification_api-1
exit /b 0

:build
echo.
echo ========================================
echo BUDOWANIE OBRAZOW
echo ========================================
cd app\backend
docker-compose build --no-cache
cd ..\..
echo %GREEN%Obrazy zbudowane!%NC%
exit /b 0

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
exit /b 0

:ps
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
exit /b 0

:ci-test
echo.
echo ========================================
echo TEST CI/CD LOKALNIE (SYMULACJA GITHUB ACTIONS)
echo ========================================
echo.
echo 1. Sprawdzanie formatu ostatniego commita...
for /f "delims=" %%i in ('git log -1 --pretty^=%%B') do set LAST_COMMIT=%%i
echo !LAST_COMMIT! | powershell -NoProfile -Command "$line=[Console]::In.ReadLine(); if($line -match '^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+') { exit 0 } else { exit 1 }" >nul
if not errorlevel 1 (
    echo %GREEN%[OK]%NC% Format commita poprawny: !LAST_COMMIT!
) else (
    echo %RED%[FAIL]%NC% Niepoprawny format commita
    echo Przyklad: 'feat: Add new feature' lub 'fix(api): Resolve issue'
)
echo.
echo 2. Sprawdzanie console.log w kodzie (PR Validation)...
if exist app\frontend\my-frontend\src (
    findstr /s /i "console.log" app\frontend\my-frontend\src\*.js app\frontend\my-frontend\src\*.jsx app\frontend\my-frontend\src\*.ts app\frontend\my-frontend\src\*.tsx >nul 2>&1 && (
        echo %YELLOW%[WARN]%NC% Znaleziono console.log w kodzie
    ) || (
        echo %GREEN%[OK]%NC% Brak console.log w kodzie produkcyjnym
    )
) else (
    echo %YELLOW%[WARN]%NC% Katalog frontend/my-frontend/src nie istnieje
)
echo.
echo 3. TEST BACKEND (symulacja GitHub Actions)...
cd app\backend
echo    Restoring dependencies...
for %%s in (IdentityService ReservationService NotificationService ApiGateway) do (
    if exist %%s (
        dotnet restore %%s\%%s.csproj >nul 2>&1 && (
            echo    %GREEN%[OK]%NC% %%s - restore OK
        ) || (
            echo    %RED%[FAIL]%NC% %%s - restore FAILED
        )
    )
)
echo    Building services...
for %%s in (IdentityService ReservationService NotificationService ApiGateway) do (
    if exist %%s (
        dotnet build %%s\%%s.csproj --no-restore -c Release >nul 2>&1 && (
            echo    %GREEN%[OK]%NC% %%s - build OK
        ) || (
            echo    %RED%[FAIL]%NC% %%s - build FAILED
        )
    )
)
cd ..\..
echo.
echo 4. TEST FRONTEND (symulacja GitHub Actions)...
if exist app\frontend\my-frontend (
    call :ensure_frontend_deps
    cd app\frontend\my-frontend
    echo    Running linter...
    npm run lint >nul 2>&1 && (
        echo    %GREEN%[OK]%NC% Linting passed
    ) || (
        echo    %YELLOW%[WARN]%NC% Linting warnings (non-blocking)
    )
    echo    Building frontend...
    npm run build >nul 2>&1 && (
        echo    %GREEN%[OK]%NC% Frontend build successful
    ) || (
        echo    %RED%[FAIL]%NC% Frontend build FAILED
    )
    cd ..\..\..
) else (
    echo    %YELLOW%[WARN]%NC% Frontend directory not found
)
echo.
echo 5. Walidacja docker-compose.yml...
cd app\backend
docker-compose config >nul 2>&1 && (
    echo %GREEN%[OK]%NC% docker-compose.yml - poprawny
) || (
    echo %RED%[FAIL]%NC% docker-compose.yml - bledy w skladni
)
cd ..\..
echo.
echo 6. Sprawdzanie wrazliwych danych...
set "FOUND_SENSITIVE="
for /f "delims=" %%i in ('powershell -NoProfile -Command "$patterns='password\s*[:=]\s*[^\s\"\''`]+|secret\s*[:=]\s*[^\s\"\''`]+|token\s*[:=]\s*[^\s\"\''`]+|api[_-]?key\s*[:=]\s*[^\s\"\''`]+'; $files=(git diff --staged --name-only 2^>$null); foreach($f in $files){ if($f -match '\\.example$' -or $f -match 'test'){ continue }; if(Test-Path $f){ $m=Select-String -Path $f -Pattern $patterns -CaseSensitive:$false -ErrorAction SilentlyContinue ^| Select-Object -First 1; if($m){ Write-Output (\"$f:$($m.LineNumber):$($m.Line)\"); break } } }"') do set "FOUND_SENSITIVE=%%i"
if defined FOUND_SENSITIVE (
    echo %RED%[FAIL]%NC% Znaleziono potencjalne wrazliwe dane w commitach!
    echo Sprawdz czy nie committujesz hasel lub kluczy API
    for /f "tokens=1,2 delims=:" %%a in ("!FOUND_SENSITIVE!") do echo %%a:%%b
) else (
    echo %GREEN%[OK]%NC% Brak wrazliwych danych w stagowanych plikach
)

echo.
echo 7. Sprawdzanie brancha...
for /f "delims=" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Branch: !CURRENT_BRANCH!
if "!CURRENT_BRANCH!"=="main" (
    echo %YELLOW%[WARN]%NC% Jestes na branchu main - czy na pewno chcesz pushowac?
) else if "!CURRENT_BRANCH!"=="master" (
    echo %YELLOW%[WARN]%NC% Jestes na branchu master - czy na pewno chcesz pushowac?
) else (
    echo %GREEN%[OK]%NC% Branch: !CURRENT_BRANCH!
)
echo.
echo ========================================
echo PODSUMOWANIE
echo ========================================
if exist .github\workflows\ci-cd.yml (
    echo %GREEN%[OK]%NC% CI/CD workflow znaleziony
    echo.
    echo Aby uruchomic CI/CD:
    echo 1. git add .
    echo 2. git commit -m "feat: your message"
    echo 3. git push origin !CURRENT_BRANCH!
) else (
    echo %YELLOW%[WARN]%NC% Brak pliku .github\workflows\ci-cd.yml
)
echo.
echo Wskazowki:
echo - Uzyj 'scripts\quick-commit.sh' dla interaktywnego commita
echo - Sprawdz Actions tab na GitHub po pushu
echo - Uzyj 'git push --dry-run' aby sprawdzic co zostanie wypchniete
echo - Dokumentacja: docs\CI-CD-SETUP.md
echo.
echo %GREEN%Test lokalny zakonczony!%NC%
exit /b 0

:invalid
echo %RED%Nieznana komenda: %COMMAND%%NC%
echo Uzyj: manage.bat help
goto end

:end
endlocal

