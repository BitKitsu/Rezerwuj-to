# 🗄️ Poprawki i Ulepszenia Bazy Danych

## ❌ Problemy w obecnym schemacie

### 1. **Brak separacji użytkowników od encji biznesowych**
- Staff i Customer mają duplikowane pola (email, password)
- Brak wspólnej tabeli Users dla autentykacji

### 2. **Nieprawidłowe przechowywanie harmonogramów**
- `weekday`, `start_time`, `end_time` w tabeli `services` - to nie miejsce
- Brak elastyczności (usługa może być dostępna w różne dni o różnych godzinach)

### 3. **Brak struktur dla mikroserwisów**
- Wszystko w jednej bazie - narusza zasadę mikroserwisów
- Brak Event Sourcing dla audytu

### 4. **Brak ważnych tabel**
- Brak tabeli dla slotów czasowych
- Brak tabeli dla powiadomień
- Brak historii zmian
- Brak tabeli dla refresh tokens

### 5. **Problemy z multi-tenancy**
- Słabe wsparcie dla wielu firm

---

## ✅ Proponowana architektura baz danych

### **1. Identity Database (Identity Service)**

```sql
-- Główna tabela użytkowników
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    normalized_email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('owner', 'employee', 'customer')),
    is_active BOOLEAN DEFAULT true,
    is_email_confirmed BOOLEAN DEFAULT false,
    lockout_end TIMESTAMPTZ,
    failed_access_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Refresh tokens dla JWT
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- Profile użytkowników
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    avatar_url VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Role użytkowników w firmach
CREATE TABLE user_company_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL, -- Reference do Company w Reservation DB
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'manager', 'employee')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);

-- Indeksy
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_normalized_email ON users(normalized_email);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_user_company_roles_user_id ON user_company_roles(user_id);
CREATE INDEX idx_user_company_roles_company_id ON user_company_roles(company_id);
```

---

### **2. Reservation Database (Reservation Service)**

```sql
-- Adresy
CREATE TABLE addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    street VARCHAR(200) NOT NULL,
    house_number VARCHAR(20) NOT NULL,
    apartment_number VARCHAR(20),
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Firmy
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE, -- dla URL: firma.example.com/slug
    description TEXT,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    address_id UUID REFERENCES addresses(id),
    owner_user_id UUID NOT NULL, -- Reference do User w Identity DB
    timezone VARCHAR(50) DEFAULT 'Europe/Warsaw',
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}', -- Elastyczne ustawienia
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kategorie usług
CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usługi
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    buffer_time_minutes INT DEFAULT 0, -- Czas przerwy po usłudze
    max_advance_booking_days INT DEFAULT 30,
    min_advance_booking_hours INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pracownicy (tylko dane biznesowe, auth w Identity)
CREATE TABLE staff_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Reference do User w Identity DB
    display_name VARCHAR(200) NOT NULL,
    title VARCHAR(100),
    bio TEXT,
    is_active BOOLEAN DEFAULT true,
    can_be_booked BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);

-- Przypisanie usług do pracowników
CREATE TABLE staff_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(staff_id, service_id)
);

-- Harmonogramy pracowników
CREATE TABLE staff_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Monday, 7=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time)
);

-- Wyjątki w harmonogramie (urlopy, dni wolne)
CREATE TABLE schedule_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES staff_members(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_working BOOLEAN DEFAULT false, -- false = dzień wolny, true = zmienione godziny
    reason VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (
        (is_working = false) OR 
        (is_working = true AND start_time IS NOT NULL AND end_time IS NOT NULL)
    )
);

-- Klienci (tylko dane biznesowe)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE, -- Reference do User w Identity DB
    phone_number VARCHAR(20),
    address_id UUID REFERENCES addresses(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rezerwacje
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id),
    staff_id UUID NOT NULL REFERENCES staff_members(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
    total_price DECIMAL(10, 2) NOT NULL,
    customer_notes TEXT,
    staff_notes TEXT,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID, -- User ID który anulował
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_time > start_time)
);

-- Historia zmian rezerwacji (audit log)
CREATE TABLE appointment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL, -- User ID
    change_type VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indeksy
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_owner ON companies(owner_user_id);
CREATE INDEX idx_services_company ON services(company_id);
CREATE INDEX idx_staff_members_user ON staff_members(user_id);
CREATE INDEX idx_appointments_company ON appointments(company_id);
CREATE INDEX idx_appointments_staff ON appointments(staff_id);
CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
```

---

### **3. Notification Database (Notification Service)**

```sql
-- Szablony powiadomień
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID, -- NULL = szablon systemowy
    type VARCHAR(50) NOT NULL, -- 'appointment_confirmation', 'reminder', etc.
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
    subject VARCHAR(500),
    body_template TEXT NOT NULL, -- Template z placeholderami {{name}}, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Kolejka powiadomień
CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    template_id UUID REFERENCES notification_templates(id),
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'push')),
    subject VARCHAR(500),
    body TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    attempts INT DEFAULT 0,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Historia wysłanych powiadomień
CREATE TABLE notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID REFERENCES notification_queue(id),
    recipient_user_id UUID NOT NULL,
    channel VARCHAR(20) NOT NULL,
    subject VARCHAR(500),
    sent_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL,
    provider_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indeksy
CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX idx_notification_history_user ON notification_history(recipient_user_id);
```

---

## 📝 Skrypty migracji

### **Migracja danych z obecnej struktury**

```sql
-- 1. Migracja użytkowników
INSERT INTO users (email, password_hash, user_type)
SELECT email, user_password, 'employee' FROM staff
UNION ALL
SELECT email, user_password, 'customer' FROM customer;

-- 2. Migracja profili
INSERT INTO user_profiles (user_id, first_name, last_name, phone_number)
SELECT u.id, s.first_name, s.last_name, s.phone
FROM staff s
JOIN users u ON u.email = s.email;

-- 3. Migracja firm i pracowników
-- ... (więcej skryptów migracyjnych)
```

---

## 🏗️ Event Sourcing dla Mikroserwisów

### **Events Table (wspólna dla wszystkich serwisów)**

```sql
CREATE TABLE domain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    event_type VARCHAR(200) NOT NULL,
    event_data JSONB NOT NULL,
    user_id UUID,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INT NOT NULL
);

CREATE INDEX idx_events_aggregate ON domain_events(aggregate_id, version);
```

### **Przykładowe eventy**
- `UserRegistered`
- `AppointmentCreated`
- `AppointmentCancelled`
- `ServiceUpdated`
- `NotificationSent`

---

## 🔐 Bezpieczeństwo

1. **Szyfrowanie haseł**: Używamy bcrypt lub Argon2
2. **UUID zamiast SERIAL**: Trudniejsze do zgadnięcia
3. **Row Level Security**: W PostgreSQL dla multi-tenancy
4. **Soft deletes**: Dodać kolumny `deleted_at` gdzie potrzebne
5. **Audyt**: Wszystkie zmiany logowane w event store

---

## 🚀 Kolejne kroki

1. **Osoba 2** powinna:
   - Utworzyć nowe migracje EF Core
   - Podzielić bazy między mikroserwisy
   - Zaimplementować repozytoria

2. **Osoba 4** powinna:
   - Skonfigurować 3 instancje PostgreSQL w Docker
   - Lub użyć jednej instancji z różnymi schematami

3. **Wszyscy**:
   - Używać UUID dla ID
   - Implementować soft deletes gdzie to ma sens
   - Logować wszystkie operacje
