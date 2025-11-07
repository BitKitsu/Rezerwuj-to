# 🏢 System Zarządzania Rezerwacjami i Zasobami dla Małych Firm (Mikro-SaaS)

## 📋 Opis Projektu

Elastyczna aplikacja typu SaaS pozwalająca małym firmom usługowym (fryzjer, fizjoterapeuta, korepetytor) zarządzać swoimi zasobami, grafikiem i rezerwacjami.

## 🎯 Cel: Ocena 5.0

- ✅ Architektura Mikroserwisów
- ✅ API Gateway (Ocelot)
- ✅ Komunikacja asynchroniczna (RabbitMQ)
- ✅ Pełny CI/CD Pipeline
- ✅ Role użytkowników i powiadomienia email

## 🚀 Quick Start

### Wymagania
- Docker Desktop
- .NET 8 SDK
- Node.js 18+
- Git

### Pierwsze uruchomienie

```bash
# 1. Klonuj repozytorium
git clone [URL_REPOZYTORIUM]
cd System-do-Zarzadzania-Rezerwacjami-i-Zasobami-dla-Malych-Firm_Mikro-SaaS_

# 2. Skopiuj plik z zmiennymi środowiskowymi
cp .env.example .env
# Edytuj .env i ustaw swoje wartości

# 3. Nadaj uprawnienia skryptowi
chmod +x docker/postgres/init-multiple-dbs.sh

# 4. Uruchom całą aplikację
docker-compose up -d

# 5. Sprawdź status
docker-compose ps
```

### Dostęp do serwisów

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:5000
- **Identity Service**: http://localhost:5001
- **Reservation Service**: http://localhost:5002
- **Notification Service**: http://localhost:5003
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)
- **pgAdmin**: http://localhost:5050 (admin@admin.com/admin)
- **Seq Logs**: http://localhost:5341

## 👥 Zespół i Podział Zadań

| Osoba | Rola | Odpowiedzialność |
|-------|------|------------------|
| **Osoba 1** | Backend Lead | Identity Service, API Gateway, Security |
| **Osoba 2** | Backend Dev | Reservation Service, Business Logic, DB |
| **Osoba 3** | Frontend Dev | React UI, Panel Admin, Widok Klienta |
| **Osoba 4** | DevOps | Docker, CI/CD, Notifications, Deployment |

## 📁 Struktura Projektu

```
├── src/
│   ├── Services/           # Mikroserwisy
│   │   ├── Identity/       # Autoryzacja i uwierzytelnianie
│   │   ├── Reservation/    # Logika rezerwacji
│   │   └── Notification/   # Powiadomienia email/SMS
│   ├── ApiGateway/         # Ocelot API Gateway
│   └── Web/                # Frontend React
├── tests/                  # Testy jednostkowe i integracyjne
├── docker/                 # Konfiguracja Docker
├── .github/workflows/      # CI/CD Pipeline
└── docs/                   # Dokumentacja
```

## 📚 Ważne Dokumenty

- **[PROJEKT_PLAN.md](PROJEKT_PLAN.md)** - Szczegółowy plan projektu z harmonogramem
- **[TEAM_TASKS.md](TEAM_TASKS.md)** - Konkretne zadania dla każdej osoby
- **[DATABASE_FIXES.md](DATABASE_FIXES.md)** - Poprawki i nowy schemat bazy danych
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Dokumentacja architektury mikroserwisów

## 🛠️ Stack Technologiczny

### Backend
- **C# / .NET 8** - Framework
- **PostgreSQL** - Baza danych
- **Entity Framework Core** - ORM
- **RabbitMQ** - Message broker
- **Ocelot** - API Gateway
- **JWT** - Autoryzacja
- **SendGrid** - Email service
- **Hangfire** - Background jobs

### Frontend
- **React 18** - UI Framework
- **TypeScript** - Type safety
- **Redux Toolkit** - State management
- **Material-UI** - Component library
- **React Router v6** - Routing
- **Axios** - HTTP client

### DevOps
- **Docker** - Konteneryzacja
- **GitHub Actions** - CI/CD
- **nginx** - Reverse proxy (production)
- **Let's Encrypt** - SSL certificates
- **Seq** - Structured logging

## 🔧 Komendy Przydatne

```bash
# Uruchom tylko bazę danych
docker-compose up postgres -d

# Uruchom tylko RabbitMQ
docker-compose up rabbitmq -d

# Zobacz logi serwisu
docker-compose logs -f [service-name]

# Restart serwisu
docker-compose restart [service-name]

# Zatrzymaj wszystko
docker-compose down

# Zatrzymaj i usuń volumes (UWAGA: usuwa dane!)
docker-compose down -v

# Rebuild images
docker-compose build --no-cache
```

## 🐛 Troubleshooting

### Problem: Ports already in use
```bash
# Znajdź proces używający portu
lsof -i :5432  # dla PostgreSQL
# Lub zmień porty w docker-compose.yml
```

### Problem: Permission denied dla skryptów
```bash
chmod +x docker/postgres/init-multiple-dbs.sh
```

### Problem: Docker containers nie startują
```bash
# Sprawdź logi
docker-compose logs [service-name]
# Restart Docker Desktop
```

## 📝 Git Workflow

```bash
# Nowy feature
git checkout -b feature/nazwa-funkcji
# ... kod ...
git add .
git commit -m "feat: opis zmian"
git push origin feature/nazwa-funkcji
# Stwórz Pull Request na GitHub
```

## 📞 Kontakt

- **Discord/Slack**: [Link do workspace]
- **GitHub Issues**: Dla raportowania błędów
- **Wiki**: [Link do wiki projektu]

## 📄 Licencja

MIT License - Projekt edukacyjny
