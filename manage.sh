#!/bin/bash

# Kolory dla lepszej czytelności
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funkcje pomocnicze
print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

ensure_frontend_deps() {
    if [ ! -d "app/frontend/my-frontend" ]; then
        return 1
    fi

    cd app/frontend/my-frontend

    local rc=0

    if [ -f "package-lock.json" ]; then
        if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ] || [ "package-lock.json" -nt "node_modules/.package-lock.json" ]; then
            print_info "Instalowanie pakietów npm (npm ci)..."
            npm ci
            rc=$?
        fi
    else
        if [ ! -d "node_modules" ]; then
            print_info "Instalowanie pakietów npm..."
            npm install
            rc=$?
        fi
    fi

    cd ../../..

    return $rc
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_error() {
    echo -e "${RED}$1${NC}"
}

print_info() {
    echo -e "${YELLOW}$1${NC}"
}

check_port() {
    nc -z localhost $1 2>/dev/null
    return $?
}

DOCKER_CONFIG_TEMP_DIR=""

ENDPOINTS_PRINTED=0

cleanup_docker_config_workaround() {
    if [ -n "$DOCKER_CONFIG_TEMP_DIR" ] && [ -d "$DOCKER_CONFIG_TEMP_DIR" ]; then
        rm -rf "$DOCKER_CONFIG_TEMP_DIR"
    fi
}

print_endpoints() {
    if [ "${ENDPOINTS_PRINTED:-0}" = "1" ]; then
        return 0
    fi
    ENDPOINTS_PRINTED=1
    print_header "DOSTĘPNE ADRESY"
    echo "Aplikacja (Frontend): http://localhost:5173"
    echo "API Gateway:         http://localhost:5000"
    echo "API Gateway (health): http://localhost:5000/health"
    echo "Identity (Swagger):  http://localhost:5001/swagger"
    echo "Reservation (Swagger): http://localhost:5002/swagger"
    echo "Notification (Swagger): http://localhost:5003/swagger"
    echo "SMS Inbox (dev):     http://localhost:5003/sms-inbox"
    echo "RabbitMQ UI:         http://localhost:15672 (guest/guest)"
    echo "MailHog UI:          http://localhost:8025"
    echo "PostgreSQL:          localhost:5433"
}

init_docker_config_workaround() {
    if [ -n "$DOCKER_CONFIG_TEMP_DIR" ]; then
        return 0
    fi

    local docker_cfg="$HOME/.docker/config.json"
    if [ -f "$docker_cfg" ] \
        && grep -q '"credsStore"[[:space:]]*:[[:space:]]*"desktop"' "$docker_cfg" \
        && ! command -v docker-credential-desktop >/dev/null 2>&1; then

        DOCKER_CONFIG_TEMP_DIR="$(mktemp -d)"
        export DOCKER_CONFIG="$DOCKER_CONFIG_TEMP_DIR"
        echo '{}' > "$DOCKER_CONFIG_TEMP_DIR/config.json"
        trap cleanup_docker_config_workaround EXIT

        print_info "Wykryto docker credsStore=desktop bez docker-credential-desktop. Używam tymczasowej konfiguracji Dockera dla tego skryptu."
    fi
}

# Funkcje główne
start_backend() {
    print_header "URUCHAMIANIE BACKEND"

    init_docker_config_workaround
    
    cd app/backend
    
    print_info "Uruchamianie Docker Compose..."
    docker-compose up -d --build
    if [ $? -ne 0 ]; then
        print_error "Docker Compose nie wystartował poprawnie."
        print_info "Sprawdź: docker-compose logs"
        cd ../..
        return 1
    fi
    
    print_info "Czekanie na inicjalizację baz danych (20 sekund)..."
    sleep 20
    
    # Sprawdź status
    if check_port 5000; then
        print_success "API Gateway działa na http://localhost:5000"
    else
        print_error "API Gateway nie odpowiada!"
        print_info "Sprawdź logi: docker-compose logs api_gateway"
    fi
    
    if check_port 5001; then
        print_success "IdentityService działa na http://localhost:5001/swagger"
    else
        print_error "IdentityService nie odpowiada!"
        print_info "Sprawdź logi: docker-compose logs identity_api"
    fi
    
    if check_port 5002; then
        print_success "ReservationService działa na http://localhost:5002/swagger"
    else
        print_error "ReservationService nie odpowiada!"
        print_info "Sprawdź logi: docker-compose logs reservation_api"
    fi
    
    if check_port 5003; then
        print_success "NotificationService działa na http://localhost:5003/swagger"
    else
        print_error "NotificationService nie odpowiada!"
        print_info "Sprawdź logi: docker-compose logs notification_api"
    fi

    if check_port 8025; then
        print_success "MailHog UI działa na http://localhost:8025"
    else
        print_error "MailHog UI nie odpowiada na http://localhost:8025"
        print_info "Sprawdź logi: docker-compose logs mailhog"
    fi

    print_endpoints

    cd ../..
}

reset_backend() {
    print_header "RESET SYSTEMU (USUNIE DANE!)"

    init_docker_config_workaround

    print_error "UWAGA: Ta komenda usunie kontenery i wolumeny Docker (baza danych) oraz wszystkie dane."
    print_info "Aby kontynuowac, wpisz RESET i nacisnij Enter."

    read -r confirm
    if [ "$confirm" != "RESET" ]; then
        print_info "Anulowano."
        return 0
    fi

    cd app/backend

    print_info "Zatrzymywanie kontenerow i usuwanie wolumenow..."
    docker-compose down -v
    if [ $? -ne 0 ]; then
        print_error "Docker Compose down nie powiódł się."
        cd ../..
        return 1
    fi

    cd ../..

    print_success "Reset zakonczony. Backend jest zatrzymany."
}

stop_backend() {
    print_header "ZATRZYMYWANIE BACKEND"

    init_docker_config_workaround
    
    cd app/backend
    docker-compose down
    if [ $? -ne 0 ]; then
        print_error "Docker Compose down nie powiódł się."
        cd ../..
        return 1
    fi
    print_success "Backend zatrzymany"
    cd ../..
}

restart_backend() {
    print_header "RESTART BACKEND"

    init_docker_config_workaround
    
    cd app/backend
    
    print_info "Uruchamianie (jeśli nie działa)..."
    docker-compose up -d --build
    if [ $? -ne 0 ]; then
        print_error "Docker Compose up nie wystartował poprawnie."
        print_info "Sprawdź: docker-compose logs"
        cd ../..
        return 1
    fi

    print_info "Restartowanie kontenerów..."
    docker-compose restart
    if [ $? -ne 0 ]; then
        print_error "Docker Compose restart nie powiódł się."
        print_info "Sprawdź: docker-compose logs"
        cd ../..
        return 1
    fi
    
    print_info "Czekanie na inicjalizację (15 sekund)..."
    sleep 15
    
    # Status
    docker-compose ps
    
    # Test API
    print_info "Testowanie API..."
    echo -n "Services endpoint: "
    if curl -s http://localhost:5002/api/services > /dev/null 2>&1; then
        print_success "Działa!"
    else
        print_error "Nie działa!"
    fi
    
    cd ../..
}

start_frontend() {
    print_header "URUCHAMIANIE FRONTEND"

    print_endpoints

    ensure_frontend_deps || return 1

    cd app/frontend/my-frontend
    
    print_info "Uruchamianie React..."
    npm run dev
}

run_all() {
    print_header "URUCHAMIANIE CAŁEGO SYSTEMU"
    
    # Najpierw backend
    start_backend
    
    # Potem frontend
    print_info "Za 3 sekundy uruchomi się frontend..."
    sleep 3
    
    print_header "SYSTEM GOTOWY!"
    echo ""
    echo "Dostępne adresy:"
    echo "-------------------"
    echo "Aplikacja:          http://localhost:5173"
    echo -e "${GREEN}API Gateway:        http://localhost:5000${NC} (główny punkt wejścia)"
    echo "Identity API:       http://localhost:5001/swagger"
    echo "Reservation API:    http://localhost:5002/swagger"
    echo "Notification API:   http://localhost:5003/swagger"
    echo "RabbitMQ UI:        http://localhost:15672 (guest/guest)"
    echo "MailHog UI:         http://localhost:8025"
    echo "PostgreSQL:         localhost:5433"
    echo ""
    echo "Dane testowe (automatycznie utworzone):"
    echo "-------------------------------------------"
    echo "Email:    test@example.com"
    echo "Hasło:    Test123!"
    echo ""
    echo "Wymagania dla nowych haseł:"
    echo "- Minimum 6 znaków"
    echo "- Musi zawierać cyfrę"
    echo "- NIE wymaga wielkiej litery/znaków specjalnych"
    echo ""
    echo "Aby zatrzymać: Ctrl+C, potem: ./manage.sh stop"
    echo ""

    ENDPOINTS_PRINTED=1
    
    start_frontend
}

test_system() {
    print_header "TESTOWANIE SYSTEMU"
    
    # Test backend
    print_info "1. Testowanie portów..."
    
    # Test API Gateway
    if curl -s -f http://localhost:5000/health > /dev/null 2>&1; then
        echo -e "API Gateway: ${GREEN}Port otwarty${NC}"
    else
        echo -e "API Gateway: ${RED}Port zamknięty${NC}"
    fi
    
    # Test IdentityService
    if curl -s -f http://localhost:5001/health > /dev/null 2>&1; then
        echo -e "IdentityService: ${GREEN}Port otwarty${NC}"
    else
        echo -e "IdentityService: ${RED}Port zamknięty${NC}"
    fi
    
    # Test ReservationService
    if curl -s -f http://localhost:5002/health > /dev/null 2>&1; then
        echo -e "ReservationService: ${GREEN}Port otwarty${NC}"
    else
        echo -e "ReservationService: ${RED}Port zamknięty${NC}"
    fi
    
    # Test NotificationService
    if curl -s -f http://localhost:5003/health > /dev/null 2>&1; then
        echo -e "NotificationService: ${GREEN}Port otwarty${NC}"
    else
        echo -e "NotificationService: ${RED}Port zamknięty${NC}"
    fi
    
    # Test RabbitMQ
    if curl -s -f http://guest:guest@localhost:15672/api/overview > /dev/null 2>&1; then
        echo -e "RabbitMQ: ${GREEN}Management UI działa${NC}"
    else
        echo -e "RabbitMQ: ${RED}Management UI niedostępne${NC}"
    fi

    # Test MailHog
    if curl -s -f http://localhost:8025 > /dev/null 2>&1; then
        echo -e "MailHog: ${GREEN}UI działa${NC}"
    else
        echo -e "MailHog: ${RED}UI niedostępne${NC}"
    fi
    
    # Test API Gateway routing
    echo ""
    print_info "2. Test routingu przez API Gateway..."
    if curl -s -f http://localhost:5000/identity/health > /dev/null 2>&1; then
        echo -e "Gateway → Identity: ${GREEN}Routing działa${NC}"
    else
        echo -e "Gateway → Identity: ${RED}Routing nie działa${NC}"
    fi
    
    if curl -s -f http://localhost:5000/reservation/health > /dev/null 2>&1; then
        echo -e "Gateway → Reservation: ${GREEN}Routing działa${NC}"
    else
        echo -e "Gateway → Reservation: ${RED}Routing nie działa${NC}"
    fi
    
    # Test JWT przez Gateway
    echo ""
    print_info "3. Test JWT Authentication przez Gateway..."
    
    # Login i pobierz token (admin seedingowy test@example.com)
    login_response=$(curl -s -X POST http://localhost:5000/identity/account/login \
        -H "Content-Type: application/json" \
        -d '{"loginIdentifier": "test@example.com", "password": "Test123!"}')
    
    if echo "$login_response" | grep -q "accessToken"; then
        echo -e "Login JWT: ${GREEN}Działa${NC}"
        ACCESS_TOKEN=$(echo "$login_response" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
        
        # Test autoryzacji
        auth_response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            http://localhost:5000/identity/audit/my)
        
        if [ "$auth_response" = "200" ]; then
            echo -e "Autoryzacja JWT: ${GREEN}Działa${NC}"
        else
            echo -e "Autoryzacja JWT: ${RED}Problem (HTTP $auth_response)${NC}"
        fi
    else
        echo -e "Login JWT: ${RED}Nie działa${NC}"
    fi
    
    # Test rejestracji przez Gateway
    echo ""
    print_info "4. Test rejestracji przez API Gateway..."

    # Dane tymczasowego użytkownika testowego (z timestampem, żeby uniknąć kolizji)
    timestamp=$(date +%s)
    test_email="test${timestamp}@example.com"
    test_username="testuser${timestamp}"
    test_phone="+48${timestamp:1}"  # +48 + 9 cyfr

    response=$(curl -s -X POST http://localhost:5000/identity/account/register \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$test_email\", \"username\": \"$test_username\", \"password\": \"Test123!\", \"firstName\": \"Test\", \"lastName\": \"User\", \"phone\": \"$test_phone\"}" \
        -w "\nHTTP_CODE:%{http_code}")

    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)

    if [ "$http_code" = "200" ]; then
        print_success "Rejestracja działa!"

        verification_code=""
        for i in {1..15}; do
            verification_code=$(python3 - "$test_email" <<'PY'
import json
import re
import sys
import urllib.request
import quopri

target = (sys.argv[1] if len(sys.argv) > 1 else "").strip().lower()

def recipients(msg):
    rec = []
    content = msg.get("Content") or {}
    headers = content.get("Headers") or {}
    to_list = headers.get("To") or []
    if isinstance(to_list, list):
        rec.extend([str(x) for x in to_list])
    raw = msg.get("Raw") or {}
    raw_to = raw.get("To") or []
    if isinstance(raw_to, list):
        rec.extend([str(x) for x in raw_to])
    return [r.lower() for r in rec]

def extract_body(msg):
    content = msg.get("Content") or {}
    body = content.get("Body")
    if isinstance(body, str) and body:
        return body

    mime = msg.get("MIME") or {}
    parts = mime.get("Parts") or []
    if isinstance(parts, list) and parts:
        p0 = parts[0] or {}
        b = p0.get("Body")
        if isinstance(b, str) and b:
            return b
    return ""

try:
    with urllib.request.urlopen("http://localhost:8025/api/v2/messages", timeout=2) as r:
        data = json.loads(r.read().decode("utf-8", errors="ignore"))
except Exception:
    sys.exit(0)

items = data.get("items") or []
for msg in items:
    recs = recipients(msg)
    if target and not any(target in r for r in recs):
        continue

    body = extract_body(msg)
    if not body:
        continue

    decoded = body
    try:
        decoded = quopri.decodestring(body.encode("utf-8", errors="ignore")).decode("utf-8", errors="ignore")
    except Exception:
        decoded = body

    m = re.search(r"\b(\d{6})\b", decoded)
    if m:
        sys.stdout.write(m.group(1))
        sys.exit(0)

sys.exit(0)
PY
)
            if [ -n "$verification_code" ]; then
                break
            fi
            sleep 1
        done

        if [ -n "$verification_code" ]; then
            verify_response=$(curl -s -X POST http://localhost:5000/identity/account/verify-email \
                -H "Content-Type: application/json" \
                -d "{\"email\": \"$test_email\", \"code\": \"$verification_code\"}" \
                -w "\nHTTP_CODE:%{http_code}")
            verify_http_code=$(echo "$verify_response" | grep "HTTP_CODE:" | cut -d: -f2)

            if [ "$verify_http_code" != "200" ]; then
                print_error "Nie udało się potwierdzić email testowego użytkownika (HTTP $verify_http_code)"
            fi
        else
            print_error "Nie udało się pobrać kodu weryfikacyjnego z MailHog."
        fi

        # Po udanym teście rejestracji wyczyść testowego użytkownika,
        # żeby nie zaśmiecać bazy danymi z automatycznych testów.
        login_response=$(curl -s -X POST http://localhost:5000/identity/account/login \
            -H "Content-Type: application/json" \
            -d "{\"loginIdentifier\": \"$test_email\", \"password\": \"Test123!\"}")

        test_access_token=$(echo "$login_response" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')

        if [ -n "$test_access_token" ]; then
            delete_status=$(curl -s -o /dev/null -w "%{http_code}" \
                -X DELETE \
                -H "Authorization: Bearer $test_access_token" \
                http://localhost:5000/identity/account/delete)

            if [ "$delete_status" = "200" ]; then
                print_info "Testowy użytkownik rejestracji został usunięty."
            else
                print_error "Nie udało się usunąć testowego użytkownika rejestracji (HTTP $delete_status)"
            fi
        else
            print_error "Nie udało się zalogować testowego użytkownika do usunięcia."
        fi
    else
        print_error "Problem z rejestracją (HTTP $http_code)"
    fi
    
    # Test API Services przez Gateway
    echo ""
    print_info "5. Test pobierania danych przez Gateway..."
    services=$(curl -s http://localhost:5000/reservation/services)
    
    if echo "$services" | grep -q "serviceName"; then
        print_success "API zwraca dane o usługach"
        echo "$services" | jq '.[0]' 2>/dev/null || echo "$services" | head -100
    else
        print_error "API nie zwraca poprawnych danych"
    fi

}

show_logs() {
    init_docker_config_workaround
    service=$1
    if [ -z "$service" ]; then
        print_header "LOGI WSZYSTKICH SERWISÓW"
        cd app/backend
        docker-compose logs --tail=50
    else
        print_header "LOGI: $service"
        cd app/backend
        docker-compose logs --tail=50 $service
    fi
    cd ../..
}

show_status() {
    print_header "STATUS SYSTEMU"

    init_docker_config_workaround
    
    cd app/backend
    docker-compose ps
    cd ../..
    
    echo ""
    print_info "Porty:"
    check_port 5001 && echo -e "5001: IdentityService ${GREEN}${NC}" || echo -e "5001: IdentityService ${RED}${NC}"
    check_port 5002 && echo -e "5002: ReservationService ${GREEN}${NC}" || echo -e "5002: ReservationService ${RED}${NC}"
    check_port 5173 && echo -e "5173: Frontend React ${GREEN}${NC}" || echo -e "5173: Frontend React ${RED}${NC}"
    check_port 5433 && echo -e "5433: PostgreSQL ${GREEN}${NC}" || echo -e "5433: PostgreSQL ${RED}${NC}"
    check_port 8025 && echo -e "8025: MailHog UI ${GREEN}${NC}" || echo -e "8025: MailHog UI ${RED}${NC}"
}

ci_test() {
    print_header "TEST CI/CD LOKALNIE (SYMULACJA GITHUB ACTIONS)"

    init_docker_config_workaround
    
    # 1. Sprawdzanie formatu ostatniego commita
    echo ""
    print_info "1. Sprawdzanie formatu ostatniego commita..."
    last_commit=$(git log -1 --pretty=%B | head -n1)
    if echo "$last_commit" | grep -qE "^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .+"; then
        print_success "Format commita poprawny: $last_commit"
    else
        print_error "Niepoprawny format commita"
        echo -e "${YELLOW}Przykład: 'feat: Add new feature' lub 'fix(api): Resolve issue'${NC}"
    fi
    
    # 2. Sprawdzanie console.log w kodzie
    echo ""
    print_info "2. Sprawdzanie console.log w kodzie (PR Validation)..."
    if [ -d "app/frontend/my-frontend/src" ]; then
        console_logs=$(grep -r "console.log" app/frontend/my-frontend/src --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null | head -1)
        if [ -n "$console_logs" ]; then
            echo -e "${YELLOW}Znaleziono console.log w kodzie - usuń przed deploymentem!${NC}"
            echo "$console_logs"
        else
            print_success "Brak console.log w kodzie produkcyjnym"
        fi
    else
        echo -e "${YELLOW}Katalog frontend/my-frontend/src nie istnieje${NC}"
    fi
    
    # 3. Test Backend (jak w CI/CD)
    echo ""
    print_info "3. TEST BACKEND (symulacja GitHub Actions)..."
    cd app/backend
    
    # Restore dependencies
    print_info "   Restoring dependencies..."
    
    build_failed=0
    for service in IdentityService ReservationService NotificationService ApiGateway; do
        if [ -d "$service" ]; then
            if dotnet restore "$service/$service.csproj" > /dev/null 2>&1; then
                echo -e "   ${GREEN}✓${NC} $service - restore OK"
            else
                echo -e "   ${RED}✗${NC} $service - restore FAILED"
                build_failed=1
            fi
        fi
    done
    
    # Build services
    print_info "   Building services..."
    for service in IdentityService ReservationService NotificationService ApiGateway; do
        if [ -d "$service" ]; then
            if dotnet build "$service/$service.csproj" --no-restore -c Release > /dev/null 2>&1; then
                echo -e "   ${GREEN}✓${NC} $service - build OK"
            else
                echo -e "   ${RED}✗${NC} $service - build FAILED"
                build_failed=1
            fi
        fi
    done
    cd ../..
    
    # 4. Test Frontend (jak w CI/CD)
    echo ""
    print_info "4. TEST FRONTEND (symulacja GitHub Actions)..."
    if [ -d "app/frontend/my-frontend" ]; then
        if ensure_frontend_deps > /dev/null 2>&1; then
            echo -e "   ${GREEN}✓${NC} Dependencies installed"
        else
            echo -e "   ${RED}✗${NC} Failed to install dependencies"
        fi

        cd app/frontend/my-frontend
        
        # Run linter
        print_info "   Running linter..."
        lint_output=$(npm run lint 2>&1)
        lint_exit=$?
        if [ $lint_exit -eq 0 ]; then
            echo -e "   ${GREEN}✓${NC} Linting passed"
        else
            echo -e "   ${YELLOW}⚠${NC} Linting warnings (non-blocking)"
            echo "$lint_output"
        fi
        
        # Build frontend
        print_info "   Building frontend..."
        if npm run build > /dev/null 2>&1; then
            echo -e "   ${GREEN}✓${NC} Frontend build successful"
        else
            echo -e "   ${RED}✗${NC} Frontend build FAILED"
        fi
        
        cd ../../..
    else
        echo -e "   ${YELLOW}Frontend directory not found${NC}"
    fi
    
    # 5. Docker Compose validation
    echo ""
    print_info "5. Walidacja docker-compose.yml..."
    cd app/backend
    if docker-compose config > /dev/null 2>&1; then
        print_success "docker-compose.yml - poprawny"
    else
        print_error "docker-compose.yml - błędy w składni"
    fi
    cd ../..
    
    # 6. Sprawdzanie wrażliwych danych
    echo ""
    print_info "6. Sprawdzanie wrażliwych danych..."
    sensitive_patterns="password[[:space:]]*[=:][[:space:]]*[^[:space:]]+|secret[[:space:]]*[=:][[:space:]]*[^[:space:]]+|token[[:space:]]*[=:][[:space:]]*[^[:space:]]+|api[_-]?key[[:space:]]*[=:][[:space:]]*[^[:space:]]+"

    sensitive_match=$(git diff --staged --name-only -z 2>/dev/null | xargs -0 -r grep -nHiE "$sensitive_patterns" 2>/dev/null | grep -v ".example" | grep -v "test" | head -n 1)

    if [ -n "$sensitive_match" ]; then
        print_error "Znaleziono potencjalne wrażliwe dane w stagowanych plikach!"
        echo -e "${YELLOW}Sprawdź czy nie committujesz haseł lub kluczy API${NC}"
        echo "$(echo "$sensitive_match" | cut -d: -f1-2)"
    else
        print_success "Brak wrażliwych danych w stagowanych plikach"
    fi
    
    # 7. Sprawdzanie brancha
    echo ""
    print_info "7. Sprawdzanie brancha..."
    current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
    if [[ "$current_branch" == "main" ]] || [[ "$current_branch" == "master" ]]; then
        echo -e "${YELLOW}Jesteś na branchu $current_branch - czy na pewno chcesz pushować?${NC}"
    else
        print_success "Branch: $current_branch"
    fi
    
    # Podsumowanie
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}PODSUMOWANIE${NC}"
    echo -e "${BLUE}========================================${NC}"
    
    if [ -f ".github/workflows/ci-cd.yml" ]; then
        print_success "CI/CD workflow znaleziony"
        echo ""
        echo "Aby uruchomić CI/CD:"
        echo "1. git add ."
        echo "2. git commit -m 'feat: your message'"
        echo "3. git push origin $current_branch"
    else
        echo -e "${YELLOW}Brak pliku .github/workflows/ci-cd.yml${NC}"
    fi
    
    echo ""
    echo ""
    echo -e "${YELLOW}Wskazówki:${NC}"
    echo "- Użyj './scripts/quick-commit.sh' dla interaktywnego commita"
    echo "- Sprawdź Actions tab na GitHub po pushu"
    echo "- Użyj 'git push --dry-run' aby sprawdzić co zostanie wypchnięte"
    echo "- Dokumentacja: docs/CI-CD-SETUP.md"
    
    echo ""
    print_success "Test lokalny zakończony!"
}

show_help() {
    print_header "SYSTEM REZERWACJI - MENEDŻER"
    
    echo "Użycie: ./manage.sh [KOMENDA] [OPCJE]"
    echo ""
    echo "KOMENDY:"
    echo "  start         - Uruchom backend"
    echo "  stop          - Zatrzymaj backend"
    echo "  restart       - Restart backend (bez kasowania danych)"
    echo "  reset         - Reset backend (USUNIE DANE: kontenery + wolumeny; bez startu)"
    echo "  frontend      - Uruchom tylko frontend"
    echo "  all           - Uruchom wszystko (backend + frontend)"
    echo "  test          - Testuj cały system (porty, Gateway, JWT, routing)"
    echo "  ci-test       - Test CI/CD lokalnie przed commitowaniem"
    echo "  logs          - Pokaż logi (opcjonalnie: logs [nazwa_serwisu])"
    echo "  status        - Pokaż status systemu"
    echo "  help          - Pokaż tę pomoc"
    echo ""
    echo "PRZYKŁADY:"
    echo "  ./manage.sh all           # Uruchom cały system"
    echo "  ./manage.sh restart       # Restart backend"
    echo "  ./manage.sh reset         # Reset danych (usuwa kontenery i wolumeny)"
    echo "  ./manage.sh logs identity_api  # Logi IdentityService"
    echo "  ./manage.sh test          # Testuj endpointy"
    echo ""
    echo "SERWISY (dla logs):"
    echo "  postgres_db    - Baza danych PostgreSQL"
    echo "  identity_api   - Serwis autoryzacji"
    echo "  reservation_api - Serwis rezerwacji"
    echo "  notification_api - Serwis powiadomień"
    echo "  mailhog        - SMTP + UI do testów email"
    echo "  api_gateway    - API Gateway"
}

# Główna logika
case "$1" in
    start)
        start_backend
        ;;
    stop)
        stop_backend
        ;;
    restart)
        restart_backend
        ;;
    reset)
        reset_backend
        ;;
    frontend)
        start_frontend
        ;;
    all|run)
        run_all
        ;;
    test)
        test_system
        ;;
    ci-test|ci)
        ci_test
        ;;
    logs|log)
        show_logs $2
        ;;
    status)
        show_status
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        print_error "Nieznana komenda: $1"
        echo "Użyj: ./manage.sh help"
        exit 1
        ;;
esac
