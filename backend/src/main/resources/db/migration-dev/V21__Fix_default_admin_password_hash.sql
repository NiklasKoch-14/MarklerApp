-- dev/docker only (see application.yml flyway.locations) — never runs against prod.
-- V1 seeded a password_hash comment claiming "AdminPass123!" but the actual
-- bcrypt hash did not match that password (login always failed with 401).
-- Guarded to only touch rows still holding that exact original stale hash, so
-- it's a no-op wherever the password was already changed by hand.
UPDATE agents
SET password_hash = '$2a$10$vl3yyLqLOb51DdE/ESAnXu1ibYpkpACmXJI.RW590KJbNJ/vEG1..'
WHERE id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  AND email = 'admin@marklerapp.com'
  AND password_hash = '$2a$10$N5VX9Eq7CXXCOMeONhOV2uJmhUWwkz1kLnJjZQ1q2w2KxCp2MHJni';
