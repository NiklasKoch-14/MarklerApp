-- Create agents table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    language_preference VARCHAR(10) NOT NULL DEFAULT 'DE',
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX idx_agents_email ON agents(email);
CREATE INDEX idx_agents_active ON agents(is_active);

-- Insert default admin agent (password: AdminPass123!)
INSERT INTO agents (id, email, first_name, last_name, phone, language_preference, password_hash, is_active)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@marklerapp.com',
    'Admin',
    'User',
    '+49 123 456 7890',
    'DE',
    '$2a$10$N5VX9Eq7CXXCOMeONhOV2uJmhUWwkz1kLnJjZQ1q2w2KxCp2MHJni',
    true
);