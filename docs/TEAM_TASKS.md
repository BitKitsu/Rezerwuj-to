# Szczegółowe Zadania dla Zespołu

## Osoba 1: Backend Lead - Mikroserwisy & Security

### Tydzień 1

- [ ] **Dzień 1-2: Setup projektu Identity Service**

  ```bash
  cd src/Services/Identity
  dotnet new webapi -n Identity.API
  dotnet new classlib -n Identity.Domain
  dotnet new classlib -n Identity.Infrastructure
  ```

  - Dodaj pakiety NuGet:
    - Microsoft.AspNetCore.Authentication.JwtBearer
    - Microsoft.EntityFrameworkCore.PostgreSQL
    - BCrypt.Net-Next
    - FluentValidation.AspNetCore
- [ ] **Dzień 3-4: Implementacja User Management**

  - Stwórz modele: User, Role, RefreshToken
  - Implementuj repozytorium UserRepository
  - Stwórz AuthController z endpointami:
    - POST /api/auth/register
    - POST /api/auth/login
    - POST /api/auth/refresh
    - POST /api/auth/logout
- [ ] **Dzień 5: JWT Token Service**

  ```csharp
  public interface ITokenService
  {
      string GenerateAccessToken(User user);
      string GenerateRefreshToken();
      ClaimsPrincipal GetPrincipalFromExpiredToken(string token);
  }
  ```

### Tydzień 2

- [ ] **Dzień 1-2: API Gateway z Ocelot**

  ```bash
  cd src/ApiGateway
  dotnet new webapi -n Ocelot.Gateway
  dotnet add package Ocelot
  dotnet add package Ocelot.Provider.Consul
  ```

  - Konfiguracja routingu w ocelot.json
  - Authentication middleware
  - Rate limiting configuration
- [ ] **Dzień 3-4: RabbitMQ Integration**

  - Implementuj EventBus abstrakcję
  - Publikowanie eventów UserRegistered, UserLoggedIn
  - Konfiguracja RabbitMQ connection
- [ ] **Dzień 5: Testy & Dokumentacja**

  - Unit testy dla TokenService
  - Integration testy dla AuthController
  - Swagger/OpenAPI dokumentacja

---

## Osoba 2: Backend Developer - Business Logic

### Tydzień 1

- [ ] **Dzień 1-2: Setup Reservation Service**

  ```bash
  cd src/Services/Reservation
  dotnet new webapi -n Reservation.API
  dotnet new classlib -n Reservation.Domain
  dotnet new classlib -n Reservation.Infrastructure
  ```

  - Entity Framework Core setup
  - AutoMapper configuration
  - FluentValidation setup
- [ ] **Dzień 3: Domain Models**

  ```csharp
  // Przykładowe modele
  public class Company { }
  public class Service { }
  public class Staff { }
  public class Appointment { }
  public class Schedule { }
  public class TimeSlot { }
  ```
- [ ] **Dzień 4-5: Repositories & DbContext**

  - GenericRepository `<T>` implementation
  - Unit of Work pattern
  - Database migrations
  - Seed data dla testów

### Tydzień 2

- [ ] **Dzień 1-2: Business Logic Services**

  - AppointmentService (tworzenie, walidacja, anulowanie)
  - AvailabilityService (sprawdzanie wolnych terminów)
  - ScheduleService (zarządzanie grafikami)
- [ ] **Dzień 3: Controllers**

  - CompanyController (CRUD)
  - ServiceController (CRUD)
  - AppointmentController (Create, Cancel, Confirm)
  - SlotController (GetAvailable)
- [ ] **Dzień 4-5: Event Publishing**

  - Integracja z RabbitMQ
  - Publikowanie: AppointmentCreated, AppointmentCancelled
  - Domain Event Handlers

---

## Osoba 3: Frontend Developer

### Tydzień 1

- [ ] **Dzień 1: React Project Setup**

  ```bash
  cd src/Web
  npx create-react-app webapp --template typescript
  cd webapp
  npm install @reduxjs/toolkit react-redux
  npm install @mui/material @emotion/react @emotion/styled
  npm install axios react-router-dom
  npm install react-big-calendar date-fns
  ```
- [ ] **Dzień 2: Routing & Layout**

  ```typescript
  // Struktura routingu
  /                     - Landing page
  /login               - Login page
  /register            - Registration
  /dashboard           - Owner dashboard
  /dashboard/company   - Company management
  /dashboard/services  - Services management
  /dashboard/staff     - Staff management
  /booking             - Public booking page
  /my-appointments     - Customer appointments
  ```
- [ ] **Dzień 3-4: Authentication**

  - Login/Register components
  - JWT token storage (httpOnly cookies lub secure localStorage)
  - AuthContext/AuthProvider
  - Protected routes HOC
  - Axios interceptors dla auth
- [ ] **Dzień 5: Redux Store**

  ```typescript
  // Slices
  - authSlice (user, token, isAuthenticated)
  - companySlice (currentCompany, services, staff)
  - appointmentSlice (appointments, loading, error)
  - uiSlice (theme, loading, notifications)
  ```

### Tydzień 2

- [ ] **Dzień 1-2: Owner Dashboard**

  - Statistics cards (dzisiejsze wizyty, przychód, etc.)
  - Company settings form
  - Service management CRUD
  - Staff management CRUD
- [ ] **Dzień 3-4: Booking System**

  - Service selection
  - Staff selection (optional)
  - Calendar component z react-big-calendar
  - Time slot picker
  - Booking confirmation modal
- [ ] **Dzień 5: Responsive & Polish**

  - Mobile responsive design
  - Loading states
  - Error boundaries
  - Toast notifications

---

## Osoba 4: DevOps & Notifications

### Tydzień 1

- [ ] **Dzień 1: Docker Setup**

  - Dockerfile dla każdego serwisu
  - docker-compose.yml configuration
  - .dockerignore files
  - Environment variables setup
- [ ] **Dzień 2-3: Notification Service**

  ```bash
  cd src/Services/Notification
  dotnet new webapi -n Notification.API
  dotnet add package SendGrid
  dotnet add package Hangfire.AspNetCore
  dotnet add package Hangfire.PostgreSql
  ```

  - Email templates (Razor views lub Liquid)
  - SendGrid integration
  - Hangfire dashboard setup
- [ ] **Dzień 4: RabbitMQ Consumer**

  ```csharp
  // Event handlers
  public class AppointmentCreatedHandler : IEventHandler<AppointmentCreated>
  {
      public Task Handle(AppointmentCreated @event)
      {
          // Send confirmation email
      }
  }
  ```
- [ ] **Dzień 5: Docker Compose Testing**

  - Test całego stacku lokalnie
  - Volume configuration
  - Network setup
  - Health checks

### Tydzień 2

- [ ] **Dzień 1-2: GitHub Actions CI**

  - Build pipeline
  - Test pipeline
  - Docker image building
  - Push to registry
- [ ] **Dzień 3: VPS Setup**

  ```bash
  # Na serwerze VPS
  sudo apt update
  sudo apt install docker.io docker-compose nginx certbot
  # Konfiguracja nginx reverse proxy
  # SSL z Let's Encrypt
  ```
- [ ] **Dzień 4: Deployment Pipeline**

  - SSH deployment action
  - Blue-green deployment strategy
  - Rollback mechanism
  - Health checks
- [ ] **Dzień 5: Monitoring**

  - Seq logging setup
  - Basic Grafana dashboard
  - Alerts configuration

---

## Daily Tasks (Wszyscy)

### Codziennie

- [ ] Git pull najnowszych zmian
- [ ] Standup meeting (10 min)
- [ ] Update zadań w GitHub Projects
- [ ] Code review przynajmniej 1 PR

### Przed Merge

- [ ] Napisane testy
- [ ] Zaktualizowana dokumentacja
- [ ] Przeszło CI/CD
- [ ] Code review od 1 osoby

### Commit Messages

```
feat: Add JWT authentication to Identity Service
fix: Resolve appointment time validation bug
docs: Update API documentation for booking endpoint
refactor: Extract email service to separate class
test: Add unit tests for AppointmentService
```
