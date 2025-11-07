# System do Zarządzania Rezerwacjami i Zasobami dla Małych Firm (Mikro SaaS)

## Architektura Mikroserwisów

- **IdentityService** (Port 5001) - Autentykacja i zarządzanie użytkownikami
- **ReservationService** (Port 5002) - Zarządzanie firmami, usługami i rezerwacjami
- **NotificationService** (Port 5003) - Powiadomienia email, SMS, in-app
- **RabbitMQ** - Komunikacja asynchroniczna między serwisami
- **PostgreSQL** - Osobne bazy dla każdego serwisu (identitydb, reservationdb, notificationdb)

## Szybki Start

```bash
# Uruchom cały system (backend + frontend)
./manage.sh all

# Lub krok po kroku:
./manage.sh start      # Uruchom backend
./manage.sh frontend   # Uruchom frontend (w nowym terminalu)
```

## Komendy

```bash
./manage.sh help       # Pokaż wszystkie dostępne komendy
./manage.sh status     # Sprawdź status systemu
./manage.sh test       # Testuj endpointy
./manage.sh logs       # Pokaż logi
./manage.sh restart    # Restart z czyszczeniem
./manage.sh stop       # Zatrzymaj backend
```

## Adresy

- **Aplikacja:** http://localhost:5173
- **Identity API:** http://localhost:5001/swagger
- **Reservation API:** http://localhost:5002/swagger
- **Notification API:** http://localhost:5003/swagger
- **RabbitMQ Management:** http://localhost:15672 (guest/guest)
- **PostgreSQL:** localhost:5433

## Dane Testowe

Automatycznie tworzony użytkownik testowy:
- **Email:** test@example.com
- **Hasło:** Test123!

## Wymagania haseł

- Minimum **6 znaków**
- Musi zawierać **1 cyfrę**
- NIE wymaga wielkiej litery
- NIE wymaga znaków specjalnych
