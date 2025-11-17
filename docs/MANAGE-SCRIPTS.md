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

| Komenda      | Opis                             | Przykład                |
| ------------ | -------------------------------- | ------------------------ |
| `start`    | Uruchom backend (Docker Compose) | `./manage.sh start`    |
| `stop`     | Zatrzymaj backend                | `./manage.sh stop`     |
| `restart`  | Restart z czyszczeniem baz       | `./manage.sh restart`  |
| `frontend` | Uruchom tylko frontend           | `./manage.sh frontend` |
| `all`      | Uruchom backend + frontend       | `./manage.sh all`      |

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

# 3. Restart z czyszczeniem
./manage.sh restart

# 4. Sprawdź logi API Gateway
./manage.sh logs api_gateway

# 5. Test endpointów
./manage.sh test
```

### Wbudowane funkcje

Skrypt **manage.sh** zawiera wbudowane funkcje:

#### **ci_test()** - Test CI/CD lokalnie

```bash
# Sprawdza:
- Format commita (Conventional Commits)
- console.log w kodzie
- Build backend (.NET)
- Walidację docker-compose.yml
- Wrażliwe dane (hasła, klucze API)
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
- Routing przez API Gateway
- JWT Authentication
- Rejestrację użytkowników
- Pobieranie danych
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

# Funkcje główne
start_backend()      # Docker Compose up
stop_backend()       # Docker Compose down
restart_clean()      # Down + clean + up
start_frontend()     # npm run dev
run_all()           # Backend + Frontend
test_system()       # Testy integracyjne
ci_test()           # ⭐ Test CI/CD (wbudowane!)
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

REM 3. Restart z czyszczeniem
manage.bat restart

REM 4. Sprawdź logi
manage.bat logs-id

REM 5. Test endpointów
manage.bat test
```

### Dodatkowe komendy Windows

| Komenda                 | Opis                     |
| ----------------------- | ------------------------ |
| `manage.bat build`    | Przebuduj obrazy Docker  |
| `manage.bat clean`    | Usuń obrazy i wolumeny  |
| `manage.bat ps`       | Lista kontenerów        |
| `manage.bat logs-id`  | Logi IdentityService     |
| `manage.bat logs-res` | Logi ReservationService  |
| `manage.bat logs-not` | Logi NotificationService |

### Struktura manage.bat

```batch
@echo off
setlocal enabledelayedexpansion

:: Etykiety (funkcje)
:help
:start
:stop
:restart
:status
:test
:ci-test
:frontend
:all
:logs
:build
:clean
:ps

:: Routing do funkcji
goto %COMMAND% 2>nul || goto invalid
```

## CI/CD Test

### Co sprawdza `ci-test`?

```
  Format ostatniego commita
     Conventional Commits (feat, fix, docs, etc.)
  
  Console.log w kodzie
      Wykrywa console.log w plikach produkcyjnych
  
  Build backend
     dotnet restore + build dla każdego serwisu
  
  Walidacja docker-compose.yml
     docker-compose config
  
  Wrażliwe dane
     Wykrywa hasła, klucze API, tokeny
  
  Branch Git
      Ostrzeżenie jeśli jesteś na main/master
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
TEST CI/CD LOKALNIE
========================================

  Sprawdzanie formatu ostatniego commita...
 Format commita poprawny: feat: Add CI/CD pipeline

  Sprawdzanie console.log w kodzie...
 Brak console.log w kodzie produkcyjnym

  Testowanie budowania backend...
   Building IdentityService...
 IdentityService - build OK
   Building ReservationService...
 ReservationService - build OK
   Building NotificationService...
 NotificationService - build OK
   Building ApiGateway...
 ApiGateway - build OK

  Walidacja docker-compose.yml...
 docker-compose.yml - poprawny

  Sprawdzanie wrażliwych danych...
 Brak wrażliwych danych w stagowanych plikach

  Sprawdzanie brancha...
 Branch: feature/my-feature

========================================
 PODSUMOWANIE
========================================
 CI/CD workflow znaleziony

Aby uruchomić CI/CD:
1. git add .
2. git commit -m 'feat: your message'
3. git push origin feature/my-feature

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

# Restart z czyszczeniem (nowe migracje, zmiany w Docker)
./manage.sh restart

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
# Restart z czyszczeniem cache
./manage.sh restart

# Lub manualnie
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
- Używaj `restart` po większych zmianach

**DON'T:**

- Nie commituj bez `ci-test`
- Nie ignoruj warnings z `ci-test`
- Nie modyfikuj skryptów bez testowania
- Nie używaj `clean` na produkcji (kasuje dane!)

---

**Gotowe!** Masz teraz pełną kontrolę nad systemem z poziomu jednej komendy! 🚀
