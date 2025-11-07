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
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
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
    echo "📌 Dostępne adresy:"
    echo "-------------------"
    echo "🏠 Aplikacja:          http://localhost:5173"
    echo "🔐 Identity API:       http://localhost:5001/swagger"
    echo "📅 Reservation API:    http://localhost:5002/swagger"
    echo "🐘 PostgreSQL:         localhost:5432"
    echo ""
    echo "📝 Dane testowe (automatycznie utworzone):"
    echo "-------------------------------------------"
    echo "Email:    test@example.com"
    echo "Hasło:    Test123!"
    echo ""
    echo "⚙️ Wymagania dla nowych haseł:"
    echo "- Minimum 6 znaków"
    echo "- Musi zawierać cyfrę"
    echo "- NIE wymaga wielkiej litery/znaków specjalnych"
    echo ""
    echo "🛑 Aby zatrzymać: Ctrl+C, potem: ./manage.sh stop"
    echo ""
    
    start_frontend
}

test_system() {
    print_header "TESTOWANIE SYSTEMU"
    
    # Test backend
    print_info "Testowanie endpointów..."
    
    echo -n "IdentityService: "
    if check_port 5001; then
        print_success "Port otwarty"
    else
        print_error "Port zamknięty"
    fi
    
    echo -n "ReservationService: "
    if check_port 5002; then
        print_success "Port otwarty"
    else
        print_error "Port zamknięty"
    fi
    
    # Test rejestracji
    print_info "Test rejestracji użytkownika..."
    response=$(curl -s -X POST http://localhost:5001/register \
        -H "Content-Type: application/json" \
        -d '{"email": "test'$(date +%s)'@example.com", "password": "Test123!"}' \
        -w "\nHTTP_CODE:%{http_code}")
    
    http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    
    if [ "$http_code" = "200" ]; then
        print_success "Rejestracja działa!"
    else
        print_error "Problem z rejestracją (HTTP $http_code)"
    fi
    
    # Test API services
    print_info "Test API Services..."
    services=$(curl -s http://localhost:5002/api/services)
    
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
    echo "5001: $(check_port 5001 && echo 'IdentityService ✅' || echo 'IdentityService ❌')"
    echo "5002: $(check_port 5002 && echo 'ReservationService ✅' || echo 'ReservationService ❌')"
    echo "5173: $(check_port 5173 && echo 'Frontend React ✅' || echo 'Frontend React ❌')"
    echo "5432: $(check_port 5432 && echo 'PostgreSQL ✅' || echo 'PostgreSQL ❌')"
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
    echo "  test          - Testuj czy system działa"
    echo "  logs [serwis] - Pokaż logi (opcjonalnie konkretnego serwisu)"
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
