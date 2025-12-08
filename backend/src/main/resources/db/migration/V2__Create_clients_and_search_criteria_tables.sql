-- Create clients table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address_street VARCHAR(200),
    address_city VARCHAR(100),
    address_postal_code VARCHAR(5),
    address_country VARCHAR(100) DEFAULT 'Germany',
    gdpr_consent_given BOOLEAN NOT NULL DEFAULT false,
    gdpr_consent_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Create property search criteria table
CREATE TABLE property_search_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL UNIQUE,
    min_square_meters INTEGER,
    max_square_meters INTEGER,
    min_rooms INTEGER,
    max_rooms INTEGER,
    min_budget DECIMAL(12,2),
    max_budget DECIMAL(12,2),
    preferred_locations VARCHAR(500),
    property_types VARCHAR(200),
    additional_requirements TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_clients_agent_id ON clients(agent_id);
CREATE INDEX idx_clients_email ON clients(agent_id, email);
CREATE INDEX idx_clients_name ON clients(agent_id, first_name, last_name);
CREATE INDEX idx_clients_city ON clients(agent_id, address_city);
CREATE INDEX idx_clients_gdpr ON clients(agent_id, gdpr_consent_given);
CREATE INDEX idx_clients_created ON clients(agent_id, created_at);

CREATE INDEX idx_search_criteria_client ON property_search_criteria(client_id);
CREATE INDEX idx_search_criteria_budget ON property_search_criteria(min_budget, max_budget);
CREATE INDEX idx_search_criteria_size ON property_search_criteria(min_square_meters, max_square_meters);
CREATE INDEX idx_search_criteria_rooms ON property_search_criteria(min_rooms, max_rooms);

-- Insert sample clients for the admin agent
INSERT INTO clients (id, agent_id, first_name, last_name, email, phone, address_street, address_city, address_postal_code, gdpr_consent_given, gdpr_consent_date)
VALUES
    ('c1234567-8901-2345-6789-012345678901', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Hans', 'Mueller', 'hans.mueller@example.com', '+49 30 12345678', 'Kurfuerstendamm 123', 'Berlin', '10707', true, CURRENT_TIMESTAMP),
    ('c2345678-9012-3456-7890-123456789012', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Anna', 'Schmidt', 'anna.schmidt@example.com', '+49 89 87654321', 'Maximilianstrasse 45', 'Munich', '80539', true, CURRENT_TIMESTAMP),
    ('c3456789-0123-4567-8901-234567890123', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Peter', 'Weber', 'peter.weber@example.com', '+49 40 11223344', 'Speicherstadt 67', 'Hamburg', '20457', true, CURRENT_TIMESTAMP);

-- Insert sample search criteria for the clients
INSERT INTO property_search_criteria (id, client_id, min_square_meters, max_square_meters, min_rooms, max_rooms, min_budget, max_budget, preferred_locations, property_types)
VALUES
    ('s1234567-8901-2345-6789-012345678901', 'c1234567-8901-2345-6789-012345678901', 80, 120, 3, 4, 300000.00, 500000.00, 'Berlin, Charlottenburg, Wilmersdorf', 'APARTMENT'),
    ('s2345678-9012-3456-7890-123456789012', 'c2345678-9012-3456-7890-123456789012', 100, 150, 2, 3, 400000.00, 700000.00, 'Munich, Schwabing, Maxvorstadt', 'APARTMENT, HOUSE'),
    ('s3456789-0123-4567-8901-234567890123', 'c3456789-0123-4567-8901-234567890123', 120, 200, 4, 5, 500000.00, 800000.00, 'Hamburg, Altona, Eppendorf', 'HOUSE');