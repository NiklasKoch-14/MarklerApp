-- Insert default admin agent (password: AdminPass123!)
-- Note: SQLite doesn't have UUID generation, using a string UUID
INSERT OR REPLACE INTO agents (id, email, first_name, last_name, phone, language_preference, password_hash, is_active, created_at, updated_at)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin@marklerapp.com',
    'Admin',
    'User',
    '+49 123 456 7890',
    'DE',
    '$2a$10$IfNSjLwPUFq/ZLjPGmhF/uzrPRNXMBU8zUU5n5IxRbuxLhO8DE3Oi',
    1,
    datetime('now'),
    datetime('now')
);