-- Google Sign-In: accounts created via Google have no password of their own.
ALTER TABLE agents ALTER COLUMN password_hash DROP NOT NULL;

-- Google's stable subject identifier. Preferred over email for lookups because a
-- Google account's email address can change while the sub never does.
ALTER TABLE agents ADD COLUMN google_sub VARCHAR(255) UNIQUE;
