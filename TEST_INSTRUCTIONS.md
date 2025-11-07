# 🚀 INSTRUKCJE TESTOWANIA - Krok po Kroku

## ✅ Co już zrobiliśmy

1. **Zaktualizowałem docker-compose.yml** - dodałem ReservationService i wsparcie dla wielu baz
2. **Stworzyłem modele** - Company, Service, Appointment
3. **Stworzyłem kontrolery** - CompaniesController, ServicesController, AppointmentsController
4. **Dodałem DbContext** z przykładowymi danymi (seed data)
5. **Skonfigurowałem CORS** dla frontendu

---

## 🧪 KROK 1: Uruchom wszystko w Docker

```bash
# Przejdź do folderu backend
cd app/backend

# Zatrzymaj stare kontenery (jeśli działają)
docker-compose down

# Zbuduj i uruchom wszystko
docker-compose up --build -d

# Sprawdź status
docker-compose ps

# Zobacz logi (jeśli coś nie działa)
docker-compose logs identity_api
docker-compose logs reservation_api
docker-compose logs postgres_db
```

---

## 🧪 KROK 2: Testuj IdentityService (Port 5001)

### Otwórz Swagger UI:
```bash
# W przeglądarce:
http://localhost:5001/swagger
```

### Test rejestracji (w terminalu):
```bash
curl -X POST http://localhost:5001/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

### Test logowania:
```bash
curl -X POST http://localhost:5001/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

---

## 🧪 KROK 3: Testuj ReservationService (Port 5002)

### Otwórz Swagger UI:
```bash
# W przeglądarce:
http://localhost:5002/swagger
```

### Test pobierania firm:
```bash
curl http://localhost:5002/api/companies
```

### Test pobierania usług:
```bash
curl http://localhost:5002/api/services
```

### Test tworzenia nowej usługi:
```bash
curl -X POST http://localhost:5002/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "serviceName": "Koloryzacja",
    "description": "Profesjonalna koloryzacja włosów",
    "price": 150.00,
    "durationMinutes": 90,
    "companyId": 1
  }'
```

### Test tworzenia rezerwacji:
```bash
curl -X POST http://localhost:5002/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": 1,
    "customerId": "user-123",
    "staffId": "staff-456",
    "dateStart": "2025-11-10T10:00:00",
    "dateEnd": "2025-11-10T10:30:00"
  }'
```

### Test sprawdzania wolnych terminów:
```bash
curl "http://localhost:5002/api/appointments/available-slots?serviceId=1&date=2025-11-10"
```

---

## 🧪 KROK 4: Frontend (dla Osoby 3)

### Instalacja pakietów:
```bash
cd app/frontend/my-frontend
npm install axios react-router-dom
```

### Stwórz strukturę folderów:
```bash
mkdir -p src/pages src/components src/services
```

### Utwórz plik src/services/api.js:
```javascript
import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5002/api',
});

export const getServices = () => API.get('/services');
export const getCompanies = () => API.get('/companies');
export const createAppointment = (data) => API.post('/appointments', data);
export const getAvailableSlots = (serviceId, date) => 
  API.get(`/appointments/available-slots?serviceId=${serviceId}&date=${date}`);
```

### Uruchom frontend:
```bash
npm run dev
```

---

## 🔴 PROBLEMY I ROZWIĄZANIA

### Problem: "Connection refused" dla bazy danych

```bash
# Sprawdź czy postgres działa
docker ps | grep postgres

# Jeśli nie, restartuj
docker-compose restart postgres_db

# Poczekaj 10 sekund i spróbuj ponownie
```

### Problem: "Database does not exist"

```bash
# Wejdź do kontenera postgres
docker exec -it backend-postgres_db-1 psql -U user -d postgres

# Stwórz bazy ręcznie
CREATE DATABASE identitydb;
CREATE DATABASE reservationdb;
\q
```

### Problem: Porty zajęte

```bash
# Znajdź co używa portu
lsof -i :5001
lsof -i :5002

# Zabij proces lub zmień porty w docker-compose.yml
```

---

## 📝 CO DALEJ?

### Dla Osoby 1 (Backend Lead):
- [ ] Dodaj JWT authentication do ReservationService
- [ ] Stwórz middleware do weryfikacji tokenów
- [ ] Dodaj role użytkowników (Owner, Employee, Customer)

### Dla Osoby 2 (Backend Dev):
- [ ] Dodaj więcej walidacji w kontrolerach
- [ ] Implementuj filtrowanie i paginację
- [ ] Dodaj endpoint do statystyk

### Dla Osoby 3 (Frontend):
- [ ] Stwórz komponent LoginForm
- [ ] Stwórz komponent BookingCalendar
- [ ] Dodaj stan globalny (Context API lub Redux)

### Dla Osoby 4 (DevOps):
- [ ] Dodaj NotificationService
- [ ] Skonfiguruj RabbitMQ
- [ ] Stwórz skrypt do automatycznego seedowania danych

---

## ✅ CHECKLIST - Sprawdź czy wszystko działa

- [ ] Docker compose uruchamia się bez błędów
- [ ] PostgreSQL ma 2 bazy: identitydb i reservationdb
- [ ] IdentityService odpowiada na http://localhost:5001/swagger
- [ ] ReservationService odpowiada na http://localhost:5002/swagger
- [ ] Endpoint GET /api/services zwraca przykładowe dane
- [ ] Można utworzyć nową rezerwację przez POST /api/appointments
- [ ] Frontend uruchamia się na http://localhost:5173

---

## 🎉 Jeśli wszystko działa - ŚWIĘTUJCIE!

Macie działające 2 mikroserwisy z bazą danych. To już 50% projektu! 

**Następne kroki:**
1. Połączcie frontend z backendem
2. Dodajcie autentykację JWT
3. Zróbcie ładny UI
4. Dodajcie NotificationService
5. Deployment!

**POWODZENIA! 💪**
