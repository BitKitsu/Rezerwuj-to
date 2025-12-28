# Skrypty Zarządzania - manage.sh / manage.bat

## Spis treści

1. [Przegląd](#przegląd)
2. [Dostępne komendy](#dostępne-komendy)
3. [Linux/Mac - manage.sh](#linuxmac---managesh)
4. [Windows - manage.bat](#windows---managebat)
5. [CI/CD Test](#cicd-test)

## Przegląd

Projekt zawiera dwa skrypty zarządzania systemem:

- **`manage.sh`** - dla Linux/Mac (bash)
- **`manage.bat`** - dla Windows (cmd/PowerShell)

Oba oferują te same funkcjonalności i pozwalają na łatwe zarządzanie całym systemem mikrousług.

## Dostępne komendy

### Podstawowe operacje

| Komenda      | Opis                                                          | Przykład                |
| ------------ | ------------------------------------------------------------- | ------------------------ |
| `start`    | Uruchom backend (Docker Compose)                              | `./manage.sh start`    |
| `stop`     | Zatrzymaj backend                                             | `./manage.sh stop`     |
| `restart`  | Restart backend (bez kasowania danych)                        | `./manage.sh restart`  |
| `reset`    | Reset backend (USUNIE DANE: kontenery + wolumeny; bez startu) | `./manage.sh reset`    |
| `frontend` | Uruchom tylko frontend                                        | `./manage.sh frontend` |
| `all`      | Uruchom backend + frontend                                    | `./manage.sh all`      |

### Testowanie i monitoring

| Komenda            | Opis                               | Przykład                         |
| ------------------ | ---------------------------------- | --------------------------------- |
| `test`           | Test systemu (porty, routing, JWT) | `./manage.sh test`              |
| `ci-test`        | Test CI/CD lokalnie                | `./manage.sh ci-test`           |
| `status`         | Status kontenerów                 | `./manage.sh status`            |
| `logs`           | Wszystkie logi                     | `./manage.sh logs`              |
| `logs [service]` | Logi konkretnego serwisu           | `./manage.sh logs identity_api` |

### Pomoc

| Komenda  | Opis         | Przykład            |
| -------- | ------------ | -------------------- |
| `help` | Pokaż pomoc | `./manage.sh help` |

## Linux/Mac - manage.sh

### Instalacja i przygotowanie

```bash
# Upewnij się że skrypt jest wykonywalny
chmod +x manage.sh

# Sprawdź pomoc
./manage.sh help
```

### Przykłady użycia

```bash
# 1. Uruchom cały system
./manage.sh all

# 2. Test przed commitowaniem
./manage.sh ci-test

# 3. Restart backend (bez kasowania danych)
./manage.sh restart

# 4. Reset backend (usuwa dane!)
./manage.sh reset

# 5. Sprawdź logi API Gateway
./manage.sh logs api_gateway

# 6. Test endpointów
./manage.sh test
```

### Wbudowane funkcje

Skrypt **manage.sh** zawiera wbudowane funkcje:

#### **ci_test()** - Test CI/CD lokalnie

```bash
# Sprawdza:
- Format commita (Conventional Commits)
- console.log w kodzie (PR Validation)
- Build backend (.NET) - restore + build wszystkich serwisów
- Lint frontend (npm run lint)
- Build frontend (npm run build)
- Walidację docker-compose.yml
- Wrażliwe dane (hasła, klucze API, tokeny)
- Aktualny branch Git
```

Wywołanie:

```bash
./manage.sh ci-test
# lub
./manage.sh ci
```

#### 🔍 **test_system()** - Test działania systemu

```bash
# Testuje:
- Porty (5000-5003, 15672, 5433)
- Routing przez API Gateway (identity, reservation)
- JWT Authentication przez Gateway
- Login JWT (test@example.com)
- Autoryzację z Bearer token
- Rejestrację użytkowników przez Gateway
- Automatyczne czyszczenie testowych użytkowników
- Pobieranie danych (API Services)
```

Wywołanie:

```bash
./manage.sh test
```

### Struktura manage.sh

```bash
#!/bin/bash

# Kolory i funkcje pomocnicze
print_header()
print_success()
print_error()
print_info()
check_port()        # Sprawdzenie czy port jest otwarty

# Funkcje główne
start_backend()      # Docker Compose up
stop_backend()       # Docker Compose down
restart_backend()    # Restart bez kasowania danych
reset_backend()      # RESET z usunięciem wolumenów (KASUJE DANE!)
start_frontend()     # npm run dev
run_all()           # Backend + Frontend
test_system()       # Testy integracyjne (porty, routing, JWT, rejestracja)
ci_test()           # Test CI/CD (wbudowane!)
show_logs()         # Docker logs
show_status()       # Status kontenerów
show_help()         # Pomoc
```

## Windows - manage.bat

### Przykłady użycia

```cmd
REM 1. Uruchom cały system
manage.bat all

REM 2. Test przed commitowaniem
manage.bat ci-test

REM 3. Restart backend (bez kasowania danych)
manage.bat restart

REM 4. Reset backend (usuwa dane!)
manage.bat reset

REM 5. Sprawdź logi
manage.bat logs identity_api

REM 6. Test endpointów
manage.bat test
```

### Dodatkowe komendy Windows

| Komenda                              | Opis                                             |
| ------------------------------------ | ------------------------------------------------ |
| `manage.bat build`                 | Przebuduj obrazy Docker                          |
| `manage.bat clean`                 | Usuń obrazy i wolumeny                          |
| `manage.bat ps`                    | Lista kontenerów                                |
| `manage.bat logs [service]`        | Logi konkretnego serwisu (np. identity_api)      |
| `manage.bat logs-id` (deprecated)  | Logi IdentityService (użyj `logs identity_api`) |
| `manage.bat logs-res` (deprecated) | Logi ReservationService                          |
| `manage.bat logs-not` (deprecated) | Logi NotificationService                         |

### Struktura manage.bat

```batch
@echo off
setlocal enabledelayedexpansion

:: Etykiety (funkcje)
:help
:start
:stop
:restart
:reset          # Nowe! Reset z usunięciem danych
:status
:test
:ci-test        # Test CI/CD lokalnie
:frontend
:all
:logs           # Teraz z parametrem [service]
:logs-id        # Deprecated
:logs-res       # Deprecated
:logs-not       # Deprecated
:build
:clean
:ps

:: Routing do funkcji
goto %COMMAND% 2>nul || goto invalid
```

## CI/CD Test

### Co sprawdza `ci-test`?

```
  1. Format ostatniego commita
     └─ Conventional Commits (feat, fix, docs, etc.)
  
  2. Console.log w kodzie (PR Validation)
     └─ Wykrywa console.log w plikach produkcyjnych (.js, .jsx, .ts, .tsx)
  
  3. Build backend (symulacja GitHub Actions)
     ├─ dotnet restore dla wszystkich serwisów
     └─ dotnet build dla wszystkich serwisów
  
  4. Build frontend (symulacja GitHub Actions)
     ├─ npm ci (jeśli brak node_modules)
     ├─ npm run lint (ESLint)
     └─ npm run build
  
  5. Walidacja docker-compose.yml
     └─ docker-compose config
  
  6. Wrażliwe dane
     └─ Wykrywa hasła, klucze API, tokeny w stagowanych plikach
  
  7. Branch Git
     └─ Ostrzeżenie jeśli jesteś na main/master
```

### Kiedy używać?

```bash
# Przed każdym commitem:
git add .
./manage.sh ci-test     # Test lokalny

# Jeśli wszystko OK:
git commit -m "feat: Add new feature"
git push
```

### Output przykładowy

```
========================================
TEST CI/CD LOKALNIE (SYMULACJA GITHUB ACTIONS)
========================================

1. Sprawdzanie formatu ostatniego commita...
Format commita poprawny: feat: Add CI/CD pipeline

2. Sprawdzanie console.log w kodzie (PR Validation)...
Brak console.log w kodzie produkcyjnym

3. TEST BACKEND (symulacja GitHub Actions)...
   Restoring dependencies...
   ✓ IdentityService - restore OK
   ✓ ReservationService - restore OK
   ✓ NotificationService - restore OK
   ✓ ApiGateway - restore OK
   Building services...
   ✓ IdentityService - build OK
   ✓ ReservationService - build OK
   ✓ NotificationService - build OK
   ✓ ApiGateway - build OK

4. TEST FRONTEND (symulacja GitHub Actions)...
   Running linter...
   ✓ Linting passed
   Building frontend...
   ✓ Frontend build successful

5. Walidacja docker-compose.yml...
docker-compose.yml - poprawny

6. Sprawdzanie wrażliwych danych...
Brak wrażliwych danych w stagowanych plikach

7. Sprawdzanie brancha...
Branch: feature/my-feature

========================================
PODSUMOWANIE
========================================
CI/CD workflow znaleziony

Aby uruchomić CI/CD:
1. git add .
2. git commit -m 'feat: your message'
3. git push origin feature/my-feature


Wskazówki:
- Użyj './scripts/quick-commit.sh' dla interaktywnego commita
- Sprawdź Actions tab na GitHub po pushu
- Użyj 'git push --dry-run' aby sprawdzić co zostanie wypchnięte
- Dokumentacja: docs/CI-CD-SETUP.md

Test lokalny zakończony!
```

## Workflow rekomendowany

### 1. Codzienne użycie

```bash
# Rano - uruchom system
./manage.sh all

# Praca...
# Zmiany w kodzie...

# Przed commitem
./manage.sh ci-test

# Commit i push
git add .
git commit -m "feat: your changes"
git push

# Wieczorem - zatrzymaj
./manage.sh stop
```

### 2. Po pull z repo

```bash
# Pull zmian
git pull

# Restart backend (nowe zmiany, ale bez kasowania danych)
./manage.sh restart

# Jeśli są nowe migracje lub chcesz czystą bazę
./manage.sh reset
./manage.sh start

# Test czy wszystko działa
./manage.sh test
```

### 3. Debug problemu

```bash
# Status
./manage.sh status

# Logi wszystkich serwisów
./manage.sh logs

# Logi konkretnego serwisu
./manage.sh logs identity_api

# Test endpointów
./manage.sh test
```

## Troubleshooting

### Problem: "Permission denied"

```bash
chmod +x manage.sh
./manage.sh help
```

### Problem: "Docker not running"

```bash
# Linux
sudo systemctl start docker

# Mac
# Uruchom Docker Desktop

# Windows
# Uruchom Docker Desktop
```

### Problem: "Port already in use"

```bash
# Zatrzymaj poprzednie kontenery
./manage.sh stop

# Lub znajdź proces na porcie
lsof -i :5000
kill -9 <PID>
```

### Problem: "Build failed"

```bash
# Restart bez kasowania danych
./manage.sh restart

# Jeśli dalej nie działa - reset z czyszczeniem danych
./manage.sh reset

# Rebuild z czyszczeniem cache
cd app/backend
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Integracja z CI/CD

Funkcja `ci-test` jest używana przez GitHub Actions:

```yaml
# .github/workflows/ci-cd.yml
jobs:
  test:
    steps:
      - name: Run CI tests
        run: ./manage.sh ci-test
```

## Rozszerzanie skryptów

### Dodanie nowej komendy

**manage.sh:**

```bash
# 1. Dodaj funkcję
my_custom_function() {
    print_header "MY CUSTOM FUNCTION"
    # twój kod
}

# 2. Dodaj do case
case "$1" in
    # ...
    custom)
        my_custom_function
        ;;
esac

# 3. Dodaj do help
show_help() {
    echo "  custom        - My custom command"
}
```

**manage.bat:**

```batch
REM 1. Dodaj etykietę
:custom
echo Custom command
goto end

REM 2. Help
:help
echo   manage.bat custom    - My custom command
```

## Najlepsze praktyki

**DO:**

- Używaj `ci-test` przed każdym commitowaniem
- Regularnie uruchamiaj `test` aby sprawdzić system
- Sprawdzaj `logs` gdy coś nie działa
- Używaj `restart` po zmianach w kodzie (zachowuje dane)
- Używaj `reset` tylko gdy potrzebujesz czystej bazy danych

**DON'T:**

- Nie commituj bez `ci-test`
- Nie ignoruj warnings z `ci-test`
- Nie modyfikuj skryptów bez testowania
- Nie używaj `reset` lub `clean` bez potwierdzenia (KASUJE DANE!)
- Nie używaj `reset` na produkcji

---
