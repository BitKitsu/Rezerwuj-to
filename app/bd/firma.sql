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
	email VARCHAR(255) NOT NULL
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
	registration_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	id_address INTEGER NOT NULL,
	FOREIGN KEY (id_address) REFERENCES address (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE TABLE staff (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL CHECK (first_name ~ '^[\p{L}\s\-]+$'),
    last_name VARCHAR(50) NOT NULL CHECK (last_name ~ '^[\p{L}\s\-]+$'),
	user_roles VARCHAR(50) NOT NULL CHECK (user_roles ~ '^[\p{L}\s\-]+$'),
	email VARCHAR(255) NOT NULL
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
	phone VARCHAR(9) NOT NULL CHECK (phone ~ '^\d{9}$'),
	user_password VARCHAR(255) NOT NULL,
	id_company INTEGER NOT NULL,
    FOREIGN KEY (id_company) REFERENCES company (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);   


CREATE TABLE customer (
	id SERIAL PRIMARY KEY,
	first_name VARCHAR(50) NOT NULL CHECK (first_name ~ '^[\p{L}\s\-]+$'),
    last_name VARCHAR(50) NOT NULL CHECK (last_name ~ '^[\p{L}\s\-]+$'),
	email VARCHAR(255) NOT NULL
    CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
	phone VARCHAR(9) NOT NULL CHECK (phone ~ '^\d{9}$'),
	user_password VARCHAR(255) NOT NULL,
	id_address INTEGER NOT NULL,
	FOREIGN KEY (id_address) REFERENCES address (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE TABLE services (
	id SERIAL PRIMARY KEY,
	services_name VARCHAR(50) NOT NULL CHECK (services_name ~ '^[\p{L}\s\-]+$'), 
	description VARCHAR(200) NOT NULL, 
	price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
	id_company INTEGER NOT NULL,
	FOREIGN KEY (id_company) REFERENCES company (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    id_company INT NOT NULL REFERENCES company(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    id_service INT NOT NULL REFERENCES services(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    id_staff INT NOT NULL REFERENCES staff(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    id_customer INT NOT NULL REFERENCES customer(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    date_start TIMESTAMPTZ NOT NULL,
    date_end TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE services_availability (
	id SERIAL PRIMARY KEY,
	weekday VARCHAR(15) NOT NULL CHECK (
        weekday IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
    ), 
	start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CHECK (start_time < end_time), 
	id_service INTEGER NOT NULL,
	FOREIGN KEY (id_service) REFERENCES services (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

