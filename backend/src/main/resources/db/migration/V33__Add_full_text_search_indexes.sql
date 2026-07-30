-- V33: Volltextsuche fuer die globale Suche (Issue #42)
--
-- Statt LIKE '%…%' ueber alle Spalten bekommt jede durchsuchbare Tabelle eine
-- generierte tsvector-Spalte plus GIN-Index. Die zweiargumentige Form
-- to_tsvector('german', …) ist IMMUTABLE und darf deshalb in einer
-- GENERATED-ALWAYS-Spalte stehen (einargumentig waere sie nur STABLE).
--
-- Gewichte: A = das, wonach der Makler tippt (Name, Objekttitel, Betreff),
--           B = Beiwerk, das trotzdem treffen soll (E-Mail/Telefon, Adresse, Notiztext).
-- ts_rank bewertet A deutlich hoeher als B, daher landet der Namenstreffer oben.
--
-- Der agent_id-Filter bleibt in jeder Abfrage bestehen; die GIN-Indizes stehen
-- absichtlich nur auf dem Vektor, Postgres kombiniert sie per Bitmap-AND mit
-- den bereits vorhandenen agent_id-Indizes (V12).
--
-- Nur Postgres: im dev-Profil (SQLite) ist Flyway deaktiviert, dort faellt die
-- Suche auf portable JPQL-LIKE-Abfragen zurueck (siehe SearchService).

-- ── Kunden: Name (A), E-Mail/Telefon (B) ──────────────────────────────────
ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('german',
            coalesce(first_name, '') || ' ' || coalesce(last_name, '')), 'A')
        ||
        setweight(to_tsvector('german',
            coalesce(email, '') || ' ' || coalesce(phone, '')), 'B')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_clients_search_vector
    ON clients USING GIN (search_vector);

-- ── Immobilien: Titel (A), Adresse/Ort (B) ────────────────────────────────
ALTER TABLE properties
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('german', coalesce(title, '')), 'A')
        ||
        setweight(to_tsvector('german',
            coalesce(address_street, '') || ' ' ||
            coalesce(address_house_number, '') || ' ' ||
            coalesce(address_postal_code, '') || ' ' ||
            coalesce(address_city, '') || ' ' ||
            coalesce(address_district, '')), 'B')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_properties_search_vector
    ON properties USING GIN (search_vector);

-- ── Gespraechsnotizen: Betreff (A), Inhalt (B) ────────────────────────────
ALTER TABLE call_notes
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('german', coalesce(subject, '')), 'A')
        ||
        setweight(to_tsvector('german', coalesce(notes, '')), 'B')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_call_notes_search_vector
    ON call_notes USING GIN (search_vector);
