
CREATE TABLE address (
    id SERIAL PRIMARY KEY,
    country VARCHAR(50) NOT NULL CHECK (country ~ '^[\p{L}\s\-]+$'),
    city VARCHAR(50) NOT NULL CHECK (city ~ '^[\p{L}\s\-]+$'),
    house_number VARCHAR(50) NOT NULL,
    apartment_number VARCHAR(50),
    street VARCHAR(50) NOT NULL CHECK (street ~ '^[\p{L}\s\-]+$')
);

CREATE TABLE company (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(50) NOT NULL CHECK (company_name ~ '^[\p{L}\s\-]+$'),
    phone VARCHAR(9) NOT NULL CHECK (phone ~ '^\d{9}$'),
    email VARCHAR(255) NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    registration_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    id_address INT REFERENCES address(id) ON DELETE CASCADE
);
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL CHECK (first_name ~ '^[\p{L}\s\-]+$'),
    last_name VARCHAR(50) NOT NULL CHECK (last_name ~ '^[\p{L}\s\-]+$'),
    email VARCHAR(255) UNIQUE NOT NULL
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    phone VARCHAR(9) NOT NULL CHECK (phone ~ '^\d{9}$'),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'staff', 'customer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    id_company INT NOT NULL REFERENCES company(id) ON DELETE CASCADE
);

CREATE TABLE staff_profile (
    id_user INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    position VARCHAR(50)
);

CREATE TABLE customer_profile (
    id_user INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    id_address INT NOT NULL REFERENCES address(id) ON DELETE RESTRICT
);

CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    services_name VARCHAR(50) NOT NULL CHECK (services_name ~ '^[\p{L}\s\-]+$'),
    description VARCHAR(200) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    weekday VARCHAR(15) NOT NULL CHECK (
        weekday IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
    ),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    id_company INT NOT NULL REFERENCES company(id) ON DELETE CASCADE
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    id_user INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    entity_name VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    performed_by INT REFERENCES users(id),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    details JSONB
);

CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    id_company INT NOT NULL REFERENCES company(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    id_service INT NOT NULL REFERENCES services(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    id_staff INT NOT NULL REFERENCES staff_profile(id_user)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    id_customer INT NOT NULL REFERENCES customer_profile(id_user)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    date_start TIMESTAMPTZ NOT NULL,
    date_end TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (date_end > date_start)
);
