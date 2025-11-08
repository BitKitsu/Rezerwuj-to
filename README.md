# System do Zarządzania Rezerwacjami i Zasobami dla Małych Firm (Mikro SaaS)

## Stack

- **Backend:** C# .NET 8, ASP.NET Core, Entity Framework Core
- **Frontend:** React 18, Vite, Axios
- **Bazy danych:** PostgreSQL (3 osobne bazy)
- **Messaging:** RabbitMQ
- **Konteneryzacja:** Docker, Docker Compose
- **Autentykacja:** JWT (Access + Refresh Tokens)

## Komponenty Systemu

| Serwis                        | Port  | Opis                        | Funkcjonalności                                           |
| ----------------------------- | ----- | --------------------------- | ---------------------------------------------------------- |
| **IdentityService**     | 5001  | Autentykacja i użytkownicy | JWT, Refresh Tokens, Audit Logs, Role użytkowników       |
| **ReservationService**  | 5002  | Rezerwacje i usługi        | Firmy, Usługi, Rezerwacje, Harmonogramy, Time Sloty       |
| **NotificationService** | 5003  | Powiadomienia               | Email, SMS, In-App, SignalR Hub, Szablony                  |
| **API Gateway**         | 5000  | Gateway (Ocelot)            | Centralne wejście, routing, rate limiting, JWT validation |
| **RabbitMQ**            | 15672 | Message Broker              | Asynchroniczna komunikacja między serwisami               |
| **PostgreSQL**          | 5433  | Bazy danych                 | identitydb, reservationdb, notificationdb                  |

## Zaimplementowane Funkcjonalności

### Bezpieczeństwo

- **JWT Authentication** - Access Token (15 min) + Refresh Token (7 dni)
- **Auto-refresh tokenów** - Automatyczne odświeżanie w frontendzie
- **Protected Routes** - Chronione ścieżki w React
- **Audit Logs** - Śledzenie wszystkich operacji użytkowników
- **User Company Roles** - Role użytkowników per firma (multi-tenancy)

### Zarządzanie Rezerwacjami

- **Schedules** - Harmonogramy per firma/usługa/pracownik
- **Time Slots** - Dynamiczne generowanie dostępnych terminów
- **Appointment Booking** - Pełny flow rezerwacji
- **Event Sourcing** - Historia wszystkich zmian w rezerwacjach
- **Soft Delete** - Bezpieczne usuwanie danych

### Powiadomienia

- **Multi-channel** - Email, SMS, In-App
- **SignalR Hub** - Real-time powiadomienia
- **Templates** - Szablony powiadomień
- **History** - Historia wysłanych powiadomień

### API Gateway (Ocelot)

- **Centralne wejście** - Jeden punkt dostępu do wszystkich mikroserwisów
- **Routing** - Automatyczne przekierowanie do odpowiednich serwisów
- **Rate Limiting** - Ochrona przed przeciążeniem (100 req/min)
- **JWT Validation** - Weryfikacja tokenów na poziomie gateway
- **Circuit Breaker** - Automatyczna obsługa błędów z Polly
- **Load Balancing** - Round-robin dla wielu instancji
- **CORS** - Centralna konfiguracja CORS

## Quick Start

### Linux/Mac

```bash
# Uruchom cały system (backend + frontend)
./manage.sh all

# Lub
./manage.sh start      # Uruchom backend
./manage.sh frontend   # Uruchom frontend (w nowym terminalu)
```

### Windows

```batch
# Uruchom cały system (backend + frontend)
manage.bat all

# Lub
manage.bat start      # Uruchom backend
manage.bat frontend   # Uruchom frontend (w nowym oknie)
```

## Komendy

| Komenda  | Linux/Mac                | Windows                 | Opis                     |
| -------- | ------------------------ | ----------------------- | ------------------------ |
| Pomoc    | `./manage.sh help`     | `manage.bat help`     | Pokaż wszystkie komendy |
| Start    | `./manage.sh start`    | `manage.bat start`    | Uruchom backend          |
| Stop     | `./manage.sh stop`     | `manage.bat stop`     | Zatrzymaj backend        |
| Restart  | `./manage.sh restart`  | `manage.bat restart`  | Restart z czyszczeniem   |
| Status   | `./manage.sh status`   | `manage.bat status`   | Sprawdź status          |
| Test     | `./manage.sh test`     | `manage.bat test`     | Testuj endpointy         |
| Logi     | `./manage.sh logs`     | `manage.bat logs`     | Pokaż logi              |
| Frontend | `./manage.sh frontend` | `manage.bat frontend` | Uruchom React            |
| All      | `./manage.sh all`      | `manage.bat all`      | Backend + Frontend       |

## Adresy

- **Aplikacja:** http://localhost:5173
- **API Gateway:** http://localhost:5000 (główny punkt wejścia)
- **Identity API:** http://localhost:5001/swagger
- **Reservation API:** http://localhost:5002/swagger
- **Notification API:** http://localhost:5003/swagger
- **RabbitMQ Management:** http://localhost:15672 (guest/guest)
- **PostgreSQL:** localhost:5433

## API Gateway Routing

Wszystkie requesty przechodzą przez API Gateway (port 5000):

| Ścieżka Gateway   | Przekierowanie do        | Opis                       |
| ------------------- | ------------------------ | -------------------------- |
| `/identity/*`     | IdentityService:5001     | Autentykacja, użytkownicy |
| `/reservation/*`  | ReservationService:5002  | Rezerwacje, usługi        |
| `/notification/*` | NotificationService:5003 | Powiadomienia              |

### Przykłady:

```bash
# Zamiast: http://localhost:5001/api/account/login
# Używany:  http://localhost:5000/identity/account/login

# Zamiast: http://localhost:5002/api/services
# Używany:  http://localhost:5000/reservation/services
```

## JWT Authentication Endpoints

### Podstawowe

- `POST /api/account/register` - Rejestracja nowego użytkownika
- `POST /api/account/login` - Logowanie (zwraca access + refresh token)
- `POST /api/account/logout` - Wylogowanie

### Token Management

- `POST /api/refreshtoken/refresh` - Odśwież access token
- `POST /api/refreshtoken/revoke` - Unieważnij token
- `POST /api/refreshtoken/revoke-all` - Unieważnij wszystkie tokeny użytkownika

### Audit

- `GET /api/audit` - Lista wszystkich logów
- `GET /api/audit/my` - Logi zalogowanego użytkownika
- `GET /api/audit/user/{id}` - Logi konkretnego użytkownika

### Schedules

- `GET /api/schedules/company/{id}` - Harmonogramy firmy
- `GET /api/schedules/available-slots` - Dostępne sloty czasowe
- `POST /api/schedules` - Utwórz harmonogram
- `POST /api/schedules/book-slot` - Zarezerwuj slot

## Dane Testowe

Automatycznie tworzony użytkownik testowy:

- **Email:** test@example.com
- **Hasło:** Test123!

## Wymagania haseł

- Minimum **6 znaków**
- Musi zawierać **1 cyfrę**

## Status Implementacji

| Funkcjonalność        | Status | Priorytet |
| ----------------------- | ------ | --------- |
| 3 Mikroserwisy          | Gotowe | Wysoki    |
| Docker & Docker Compose | Gotowe | Wysoki    |
| PostgreSQL (3 bazy)     | Gotowe | Wysoki    |
| JWT Authentication      | Gotowe | Wysoki    |
| Refresh Tokens          | Gotowe | Wysoki    |
| Frontend React          | Gotowe | Wysoki    |
| RabbitMQ                | Gotowe | Średni   |
| Time Slots              | Gotowe | Średni   |
| Audit Logs              | Gotowe | Średni   |
| Event Sourcing          | Gotowe | Niski     |
| Soft Delete             | Gotowe | Niski     |
| API Gateway (Ocelot)    | Gotowe | Średni   |
| CI/CD Pipeline          | TODO   | Niski     |
