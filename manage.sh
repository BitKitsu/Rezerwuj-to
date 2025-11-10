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

# Funkcje główne
start_backend() {
    print_header "URUCHAMIANIE BACKEND"
    
    cd app/backend
    
    print_info "Uruchamianie Docker Compose..."
    docker-compose up -d
    
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
    
    cd ../..
}

stop_backend() {
    print_header "ZATRZYMYWANIE BACKEND"
    
    cd app/backend
    docker-compose down
    print_success "Backend zatrzymany"
    cd ../..
}

restart_clean() {
    print_header "RESTART Z CZYSZCZENIEM"
    
    cd app/backend
    
    print_info "Zatrzymywanie kontenerów..."
    docker-compose down -v
    
    print_info "Usuwanie starych obrazów..."
    docker rmi backend-identity_api backend-reservation_api 2>/dev/null
    
    print_info "Budowanie i uruchamianie..."
    docker-compose up --build -d
    
    print_info "Czekanie na inicjalizację (25 sekund)..."
    sleep 25
    
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
    
    cd app/frontend/my-frontend
    
    # Sprawdź czy node_modules istnieje
    if [ ! -d "node_modules" ]; then
        print_info "Instalowanie pakietów npm..."
        npm install
    fi
    
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
    
    # Login i pobierz token
    login_response=$(curl -s -X POST http://localhost:5000/identity/account/login \
        -H "Content-Type: application/json" \
        -d '{"email": "test@example.com", "password": "Test123!"}')
    
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
    response=$(curl -s -X POST http://localhost:5000/identity/account/register \
        -H "Content-Type: application/json" \
        -d '{"email": "test'$(date +%s)'@example.com", "password": "Test123!", "firstName": "Test", "lastName": "User"}' \
        -w "\nHTTP_CODE:%{http_code}")
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    
    if [ "$http_code" = "200" ]; then
        print_success "Rejestracja działa!"
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
    
    cd app/backend
    docker-compose ps
    cd ../..
    
    echo ""
    print_info "Porty:"
    echo "5001: $(check_port 5001 && echo 'IdentityService ${GREEN}${NC}' || echo 'IdentityService ${RED}${NC}')"
    echo "5002: $(check_port 5002 && echo 'ReservationService ${GREEN}${NC}' || echo 'ReservationService ${RED}${NC}')"
    echo "5173: $(check_port 5173 && echo 'Frontend React ${GREEN}${NC}' || echo 'Frontend React ${RED}${NC}')"
    echo "5432: $(check_port 5432 && echo 'PostgreSQL ${GREEN}${NC}' || echo 'PostgreSQL ${RED}${NC}')"
}

ci_test() {
    print_header "TEST CI/CD LOKALNIE (SYMULACJA GITHUB ACTIONS)"
    
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
        cd app/frontend/my-frontend
        
        # Check if node_modules exists
        if [ ! -d "node_modules" ]; then
            print_info "   Installing dependencies (npm ci)..."
            if npm ci > /dev/null 2>&1; then
                echo -e "   ${GREEN}✓${NC} Dependencies installed"
            else
                echo -e "   ${RED}✗${NC} Failed to install dependencies"
            fi
        fi
        
        # Run linter
        print_info "   Running linter..."
        if npm run lint > /dev/null 2>&1; then
            echo -e "   ${GREEN}✓${NC} Linting passed"
        else
            echo -e "   ${YELLOW}⚠${NC} Linting warnings (non-blocking)"
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
    sensitive_patterns="password.*=.*[a-zA-Z0-9]|secret.*=.*[a-zA-Z0-9]|token.*=.*[a-zA-Z0-9]|api[_-]?key.*=.*[a-zA-Z0-9]"
    
    found_sensitive=false
    if git diff --staged --name-only 2>/dev/null | xargs grep -iE "$sensitive_patterns" 2>/dev/null | grep -v ".example" | grep -v "test" | head -1; then
        found_sensitive=true
    fi
    
    if [ "$found_sensitive" = true ]; then
        print_error "Znaleziono potencjalne wrażliwe dane w commitach!"
        echo -e "${YELLOW}Sprawdź czy nie committujesz haseł lub kluczy API${NC}"
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
    echo "  restart       - Restart backend z czyszczeniem"
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
    echo "  ./manage.sh restart       # Restart z czyszczeniem"
    echo "  ./manage.sh logs identity_api  # Logi IdentityService"
    echo "  ./manage.sh test          # Testuj endpointy"
    echo ""
    echo "SERWISY (dla logs):"
    echo "  postgres_db    - Baza danych PostgreSQL"
    echo "  identity_api   - Serwis autoryzacji"
    echo "  reservation_api - Serwis rezerwacji"
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
        restart_clean
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
