# Plan Projektu: System Zarządzania Rezerwacjami - Ocena 5.0

## Informacje o projekcie

- **Zespół**: 4 osoby
- **Cel**: Ocena 5.0
- **Stack technologiczny**: C# (.NET 8), React, PostgreSQL, Docker, RabbitMQ
- **Architektura**: Mikroserwisy z API Gateway

## Podział Zespołu i Zadania

### **Osoba 1: Backend Developer - Mikroserwisy (Lead)**

**Odpowiedzialność**: Architektura mikroserwisów, Identity Service, API Gateway

#### Sprint 1 (Tydzień 1-2)

- [ ] Utworzenie struktury mikroserwisów
  - Identity.API (port 5001)
  - Reservation.API (port 5002)
  - Notification.API (port 5003)
  - ApiGateway (port 5000)
- [ ] Implementacja Identity Service
  - Rejestracja użytkowników (Owner, Employee, Customer)
  - Logowanie z JWT
  - Zarządzanie rolami i uprawnieniami
  - Refresh tokens
- [ ] Konfiguracja API Gateway (Ocelot)
  - Routing do mikroserwisów
  - Autoryzacja na poziomie gateway
  - Rate limiting

#### Sprint 2 (Tydzień 3-4)

- [ ] Integracja z RabbitMQ
  - Konfiguracja Message Bus
  - Implementacja Event Bus
- [ ] Implementacja wzorca CQRS w Identity Service
- [ ] Testy jednostkowe i integracyjne
- [ ] Dokumentacja API (Swagger)

---

### **Osoba 2: Backend Developer - Business Logic**

**Odpowiedzialność**: Reservation Service, Business Logic, Baza danych

#### Sprint 1 (Tydzień 1-2)

- [ ] Implementacja Reservation Service
  - CRUD dla firm (Companies)
  - CRUD dla usług (Services)
  - CRUD dla pracowników (Staff)
  - System slotów czasowych
- [ ] Projektowanie i implementacja bazy danych
  - Migracje Entity Framework
  - Seedowanie danych testowych
  - Optymalizacja zapytań

#### Sprint 2 (Tydzień 3-4)

- [ ] Logika rezerwacji
  - Sprawdzanie dostępności
  - Walidacja konfliktów
  - Anulowanie i modyfikacja rezerwacji
- [ ] System harmonogramów (Schedules)
  - Grafiki pracowników
  - Dostępność usług
- [ ] Implementacja wzorca Repository i Unit of Work
- [ ] Testy jednostkowe logiki biznesowej

---

### **Osoba 3: Frontend Developer**

**Odpowiedzialność**: React UI, Panel administracyjny, Widok klienta

#### Sprint 1 (Tydzień 1-2)

- [ ] Konfiguracja projektu React
  - React Router v6
  - Redux Toolkit + RTK Query
  - Material-UI lub Ant Design
  - Axios dla API calls
- [ ] Implementacja autoryzacji
  - Strona logowania/rejestracji
  - JWT token management
  - Protected routes
  - Role-based access control
- [ ] Panel właściciela firmy
  - Dashboard z statystykami
  - Zarządzanie firmą
  - Zarządzanie usługami

#### Sprint 2 (Tydzień 3-4)

- [ ] Panel pracownika
  - Widok własnego grafiku
  - Lista rezerwacji
- [ ] Widok publiczny dla klientów
  - Wybór usługi
  - Kalendarz z dostępnymi terminami
  - Formularz rezerwacji
  - Potwierdzenie rezerwacji
- [ ] Responsywność (mobile-first)
- [ ] Testy komponentów (Jest + React Testing Library)

---

### **Osoba 4: DevOps Engineer + Notification Service**

**Odpowiedzialność**: Docker, CI/CD, Notification Service, Infrastruktura

#### Sprint 1 (Tydzień 1-2)

- [ ] Konfiguracja Docker
  - Dockerfile dla każdego mikroserwisu
  - docker-compose.yml dla środowiska dev
  - docker-compose.prod.yml dla produkcji
  - Volumen dla PostgreSQL
  - Sieć Docker dla mikroserwisów
- [ ] Notification Service
  - Integracja z SendGrid
  - Szablony emaili (potwierdzenie, przypomnienie, anulowanie)
  - Kolejkowanie z Hangfire
- [ ] Konfiguracja RabbitMQ w Docker

#### Sprint 2 (Tydzień 3-4)

- [ ] CI/CD Pipeline (GitHub Actions)
  - Build i testy przy każdym push
  - Budowanie obrazów Docker
  - Push do Docker Hub/GitHub Registry
  - Automatyczne tagowanie wersji
- [ ] Deployment na VPS
  - Konfiguracja serwera (nginx jako reverse proxy)
  - SSL certyfikaty (Let's Encrypt)
  - Monitoring (Prometheus + Grafana)
  - Logi (ELK Stack lub seq)
- [ ] Backup bazy danych
- [ ] Dokumentacja deployment

---

## Harmonogram Sprintów

### **Sprint 0 (Dzień 1-3)**: Setup

- Wszyscy: Przegląd wymagań, setup środowiska
- Osoba 1: Struktura projektu mikroserwisów
- Osoba 2: Poprawka schematu bazy danych
- Osoba 3: Setup projektu React
- Osoba 4: Konfiguracja Docker i repozytorium

### **Sprint 1 (Tydzień 1-2)**: MVP

- Podstawowa funkcjonalność każdego komponentu
- Komunikacja synchroniczna (REST)
- Podstawowy UI

### **Sprint 2 (Tydzień 3-4)**: Rozszerzenie

- Komunikacja asynchroniczna (RabbitMQ)
- Pełny UI z wszystkimi rolami
- Notyfikacje email
- CI/CD

### **Sprint 3 (Tydzień 5)**: Finalizacja

- Testy E2E
- Dokumentacja
- Deployment na produkcję
- Prezentacja

## Kamienie Milowe

1. **Tydzień 1**: Działający Identity Service + podstawowy frontend
2. **Tydzień 2**: Działający Reservation Service + integracja z frontendem
3. **Tydzień 3**: RabbitMQ + Notification Service działające
4. **Tydzień 4**: CI/CD pipeline + deployment na VPS
5. **Tydzień 5**: Finalna wersja z pełną dokumentacją
