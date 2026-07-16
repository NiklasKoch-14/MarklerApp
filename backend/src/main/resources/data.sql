-- =============================================================================
-- data.sql -- Dev-only Seed (SQLite + Spring sql.init.mode: always)
-- Zweck: Realistische Demo-Daten fuer das deutsche Immobilien-CRM (Raum Muenchen)
-- NIEMALS in prod/docker aktiv (sql.init.mode: never in diesen Profilen)
--
-- Logins:
--   admin@marklerapp.com            Passwort: AdminPass123!
--   max.mustermann@realestate.de    Passwort: Test1234!
--
-- Technische Regeln:
--   1. IDs = 16-Byte-BLOB-Hexliterale: X'440E8400E29B41D4A716446655440000'
--      (UUID ohne Bindestriche, exakt 32 Hex-Zeichen, nur 0-9A-F)
--   2. Datumswerte immer via strftime mit %f-Direktive, Ergebnis:
--      'YYYY-MM-DD HH:MM:SS.SSS' -- xerial-JDBC erwartet genau dieses Format
-- =============================================================================

-- =============================================================================
-- AGENTS (2)
-- =============================================================================

-- Admin Agent (Passwort: AdminPass123!)
INSERT OR IGNORE INTO agents
    (id, created_at, updated_at, email, first_name, last_name, phone,
     language_preference, password_hash, is_active)
VALUES (
    X'440E8400E29B41D4A716446655440000',
    strftime('%Y-%m-%d %H:%M:%f','now','-180 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-180 days'),
    'admin@marklerapp.com',
    'Admin',
    'User',
    '+49 89 00000000',
    'DE',
    '$2a$10$3ChmE7AAdKOFQYBYitn2seyFk2SaK4PxQ3.Qe4mUT6C0Le6TGmgrq',
    1
);

-- Max Mustermann (Passwort: Test1234!)
INSERT OR IGNORE INTO agents
    (id, created_at, updated_at, email, first_name, last_name, phone,
     language_preference, password_hash, is_active)
VALUES (
    X'550E8400E29B41D4A716446655440000',
    strftime('%Y-%m-%d %H:%M:%f','now','-180 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-180 days'),
    'max.mustermann@realestate.de',
    'Max',
    'Mustermann',
    '+49 89 12345678',
    'DE',
    '$2a$10$i2VzZYh655qE9Rlmceux8./s4bjCCAw1fSIHULfp.gPN/FHrTwD0u',
    1
);

-- =============================================================================
-- CLIENTS (8) -- alle gehoeren dem Admin-Agenten
-- 5x BUYER, 2x RENTER, 1x SELLER
-- Stages: 2x PROSPECT, 3x ACTIVE_SEARCH, 2x VIEWING, 1x CLOSED
-- =============================================================================

-- Client 1: Thomas Bauer -- BUYER, PROSPECT (letzter Kontakt vor >35 Tagen -> Widget)
INSERT OR IGNORE INTO clients
    (id, created_at, updated_at, address_city, address_country, address_postal_code,
     address_street, client_type, email, financing_status, first_name,
     gdpr_consent_date, gdpr_consent_given, last_name, move_in_timeline,
     phone, pipeline_stage, agent_id)
VALUES (
    X'AA0E8400E29B41D4A716446655440001',
    strftime('%Y-%m-%d %H:%M:%f','now','-100 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-100 days'),
    'Muenchen', 'Germany', '81675', 'Rosenheimer Str. 45',
    'BUYER', 'thomas.bauer@web.de', 'BANK_PRE_APPROVED',
    'Thomas', strftime('%Y-%m-%d %H:%M:%f','now','-100 days'), 1,
    'Bauer', 'SIX_MONTHS', '+49 89 34512300', 'PROSPECT',
    X'440E8400E29B41D4A716446655440000'
);

-- Client 2: Sabine Hoffmann -- BUYER, ACTIVE_SEARCH
INSERT OR IGNORE INTO clients
    (id, created_at, updated_at, address_city, address_country, address_postal_code,
     address_street, client_type, email, financing_status, first_name,
     gdpr_consent_date, gdpr_consent_given, last_name, move_in_timeline,
     phone, pipeline_stage, agent_id)
VALUES (
    X'BB0E8400E29B41D4A716446655440002',
    strftime('%Y-%m-%d %H:%M:%f','now','-85 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-85 days'),
    'Muenchen', 'Germany', '80802', 'Leopoldstr. 78',
    'BUYER', 'sabine.hoffmann@gmx.de', 'SELF_FINANCED',
    'Sabine', strftime('%Y-%m-%d %H:%M:%f','now','-85 days'), 1,
    'Hoffmann', 'THREE_MONTHS', '+49 89 22233400', 'ACTIVE_SEARCH',
    X'440E8400E29B41D4A716446655440000'
);

-- Client 3: Klaus Weber -- BUYER, VIEWING (Besichtigungen zugeordnet)
INSERT OR IGNORE INTO clients
    (id, created_at, updated_at, address_city, address_country, address_postal_code,
     address_street, client_type, email, financing_status, first_name,
     gdpr_consent_date, gdpr_consent_given, last_name, move_in_timeline,
     phone, pipeline_stage, agent_id)
VALUES (
    X'CC0E8400E29B41D4A716446655440003',
    strftime('%Y-%m-%d %H:%M:%f','now','-70 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-70 days'),
    'Muenchen', 'Germany', '81539', 'Candidplatz 12',
    'BUYER', 'k.weber@t-online.de', 'BANK_PRE_APPROVED',
    'Klaus', strftime('%Y-%m-%d %H:%M:%f','now','-70 days'), 1,
    'Weber', 'IMMEDIATE', '+49 89 55566700', 'VIEWING',
    X'440E8400E29B41D4A716446655440000'
);

-- Client 4: Petra Schmitt -- BUYER, ACTIVE_SEARCH (letzter Kontakt vor >35 Tagen -> Widget)
INSERT OR IGNORE INTO clients
    (id, created_at, updated_at, address_city, address_country, address_postal_code,
     address_street, client_type, email, financing_status, first_name,
     gdpr_consent_date, gdpr_consent_given, last_name, move_in_timeline,
     phone, pipeline_stage, agent_id)
VALUES (
    X'DD0E8400E29B41D4A716446655440004',
    strftime('%Y-%m-%d %H:%M:%f','now','-60 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-60 days'),
    'Gruenwald', 'Germany', '82031', 'Toelzer Str. 3',
    'BUYER', 'petra.schmitt@icloud.com', 'NEEDS_FINANCING',
    'Petra', strftime('%Y-%m-%d %H:%M:%f','now','-60 days'), 1,
    'Schmitt', 'SIX_MONTHS', '+49 89 64100200', 'ACTIVE_SEARCH',
    X'440E8400E29B41D4A716446655440000'
);

-- Client 5: Markus Fischer -- BUYER, CLOSED
INSERT OR IGNORE INTO clients
    (id, created_at, updated_at, address_city, address_country, address_postal_code,
     address_street, client_type, email, financing_status, first_name,
     gdpr_consent_date, gdpr_consent_given, last_name, move_in_timeline,
     phone, pipeline_stage, agent_id)
VALUES (
    X'EE0E8400E29B41D4A716446655440005',
    strftime('%Y-%m-%d %H:%M:%f','now','-95 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-95 days'),
    'Muenchen', 'Germany', '80469', 'Fraunhoferstr. 22',
    'BUYER', 'markus.fischer@posteo.de', 'BANK_PRE_APPROVED',
    'Markus', strftime('%Y-%m-%d %H:%M:%f','now','-95 days'), 1,
    'Fischer', 'IMMEDIATE', '+49 89 77700100', 'CLOSED',
    X'440E8400E29B41D4A716446655440000'
);

-- Client 6: Julia Meier -- RENTER, PROSPECT
INSERT OR IGNORE INTO clients
    (id, created_at, updated_at, address_city, address_country, address_postal_code,
     address_street, client_type, email, financing_status, first_name,
     gdpr_consent_date, gdpr_consent_given, last_name, move_in_timeline,
     phone, pipeline_stage, agent_id)
VALUES (
    X'FF0E8400E29B41D4A716446655440006',
    strftime('%Y-%m-%d %H:%M:%f','now','-45 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-45 days'),
    'Muenchen', 'Germany', '80336', 'Sonnenstr. 5',
    'RENTER', 'julia.meier@outlook.de', 'UNKNOWN',
    'Julia', strftime('%Y-%m-%d %H:%M:%f','now','-45 days'), 1,
    'Meier', 'THREE_MONTHS', '+49 89 98711200', 'PROSPECT',
    X'440E8400E29B41D4A716446655440000'
);

-- Client 7: Andreas Braun -- RENTER, VIEWING
INSERT OR IGNORE INTO clients
    (id, created_at, updated_at, address_city, address_country, address_postal_code,
     address_street, client_type, email, financing_status, first_name,
     gdpr_consent_date, gdpr_consent_given, last_name, move_in_timeline,
     phone, pipeline_stage, agent_id)
VALUES (
    X'AA1E8400E29B41D4A716446655440007',
    strftime('%Y-%m-%d %H:%M:%f','now','-30 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-30 days'),
    'Muenchen', 'Germany', '81667', 'Haidhausener Str. 19',
    'RENTER', 'a.braun@gmx.net', 'UNKNOWN',
    'Andreas', strftime('%Y-%m-%d %H:%M:%f','now','-30 days'), 1,
    'Braun', 'IMMEDIATE', '+49 89 33322100', 'VIEWING',
    X'440E8400E29B41D4A716446655440000'
);

-- Client 8: Claudia Richter -- SELLER, ACTIVE_SEARCH
INSERT OR IGNORE INTO clients
    (id, created_at, updated_at, address_city, address_country, address_postal_code,
     address_street, client_type, email, financing_status, first_name,
     gdpr_consent_date, gdpr_consent_given, last_name, move_in_timeline,
     phone, pipeline_stage, agent_id)
VALUES (
    X'BB1E8400E29B41D4A716446655440008',
    strftime('%Y-%m-%d %H:%M:%f','now','-20 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-20 days'),
    'Muenchen', 'Germany', '81925', 'Boschetsrieder Str. 71',
    'SELLER', 'claudia.richter@yahoo.de', 'UNKNOWN',
    'Claudia', strftime('%Y-%m-%d %H:%M:%f','now','-20 days'), 1,
    'Richter', 'FLEXIBLE', '+49 89 41200900', 'ACTIVE_SEARCH',
    X'440E8400E29B41D4A716446655440000'
);

-- =============================================================================
-- PROPERTY_SEARCH_CRITERIA (5 -- fuer die 5 BUYER)
-- Budgets realistisch zu Muenchen (600k-2M Kauf)
-- =============================================================================

-- Suchprofil Thomas Bauer (Budget 650k-900k -> passt zu Objekt 1 + 2)
INSERT OR IGNORE INTO property_search_criteria
    (id, created_at, updated_at, additional_requirements, max_budget, max_rooms,
     max_square_meters, min_budget, min_rooms, min_square_meters,
     preferred_locations, property_types, client_id)
VALUES (
    X'CC1E8400E29B41D4A716446655440009',
    strftime('%Y-%m-%d %H:%M:%f','now','-98 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-98 days'),
    'Balkon oder Terrasse, Tiefgaragenstellplatz, Renovierter Zustand',
    900000, 5, 160, 650000, 3, 100,
    'Muenchen-Haidhausen, Bogenhausen, Schwabing',
    'APARTMENT,HOUSE',
    X'AA0E8400E29B41D4A716446655440001'
);

-- Suchprofil Sabine Hoffmann (Budget 800k-1.4M -> passt zu Objekt 2 + 3)
INSERT OR IGNORE INTO property_search_criteria
    (id, created_at, updated_at, additional_requirements, max_budget, max_rooms,
     max_square_meters, min_budget, min_rooms, min_square_meters,
     preferred_locations, property_types, client_id)
VALUES (
    X'DD1E8400E29B41D4A716446655440010',
    strftime('%Y-%m-%d %H:%M:%f','now','-83 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-83 days'),
    'Ruhige Lage, gehobene Ausstattung, Suedausrichtung bevorzugt',
    1400000, 6, 200, 800000, 4, 130,
    'Bogenhausen, Herzogpark, Nymphenburg',
    'APARTMENT,HOUSE,VILLA',
    X'BB0E8400E29B41D4A716446655440002'
);

-- Suchprofil Klaus Weber (Budget 500k-800k -> passt zu Objekt 1)
INSERT OR IGNORE INTO property_search_criteria
    (id, created_at, updated_at, additional_requirements, max_budget, max_rooms,
     max_square_meters, min_budget, min_rooms, min_square_meters,
     preferred_locations, property_types, client_id)
VALUES (
    X'EE1E8400E29B41D4A716446655440011',
    strftime('%Y-%m-%d %H:%M:%f','now','-68 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-68 days'),
    'Gute U-Bahn-Anbindung, Balkon, familienfreundliche Nachbarschaft',
    800000, 5, 150, 500000, 3, 90,
    'Haidhausen, Giesing, Obergiesing',
    'APARTMENT,TOWNHOUSE',
    X'CC0E8400E29B41D4A716446655440003'
);

-- Suchprofil Petra Schmitt (Budget 1.2M-2M -> passt zu Objekt 3 + 4)
INSERT OR IGNORE INTO property_search_criteria
    (id, created_at, updated_at, additional_requirements, max_budget, max_rooms,
     max_square_meters, min_budget, min_rooms, min_square_meters,
     preferred_locations, property_types, client_id)
VALUES (
    X'FF1E8400E29B41D4A716446655440012',
    strftime('%Y-%m-%d %H:%M:%f','now','-58 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-58 days'),
    'Grosser Garten, Doppelgarage, gehobene Wohngegend, Repraesentativ',
    2000000, 8, 300, 1200000, 5, 180,
    'Gruenwald, Pullach, Solln, Starnberg',
    'HOUSE,VILLA',
    X'DD0E8400E29B41D4A716446655440004'
);

-- Suchprofil Markus Fischer (bereits CLOSED -- historisch)
INSERT OR IGNORE INTO property_search_criteria
    (id, created_at, updated_at, additional_requirements, max_budget, max_rooms,
     max_square_meters, min_budget, min_rooms, min_square_meters,
     preferred_locations, property_types, client_id)
VALUES (
    X'AA2E8400E29B41D4A716446655440013',
    strftime('%Y-%m-%d %H:%M:%f','now','-93 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-93 days'),
    'Penthouse oder hohes Stockwerk, Concierge, Dachterrasse',
    1980000, 5, 200, 1400000, 3, 120,
    'Schwabing-West, Maxvorstadt, Glockenbachviertel',
    'PENTHOUSE,APARTMENT',
    X'EE0E8400E29B41D4A716446655440005'
);

-- =============================================================================
-- PROPERTIES (6) -- alle Admin-Agent
-- 5x SALE, 1x RENT | 1x RESERVED, Rest AVAILABLE
-- created_at gestaffelt fuer "Tage am Markt"-Ranking (-160/-95/-41/-12/-8/0 Tage)
-- Preise: mind. 2 Objekte passen zu Suchprofilen (Matching-Feature)
-- =============================================================================

-- Objekt 1: 3-Zi-Wohnung Haidhausen, 720k -- passt zu Bauer (650-900k) und Weber (500-800k)
INSERT OR IGNORE INTO properties
    (id, created_at, updated_at, address_city, address_postal_code, address_street,
     address_house_number, data_processing_consent, listing_type, property_type,
     status, title, agent_id, price, living_area_sqm, rooms, bedrooms, bathrooms,
     has_balcony, has_garden, construction_year, owner_name, owner_phone,
     description, commission)
VALUES (
    X'BB2E8400E29B41D4A716446655440014',
    strftime('%Y-%m-%d %H:%M:%f','now','-160 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-160 days'),
    'Muenchen', '81667', 'Woerthstrasse', '14',
    1, 'SALE', 'APARTMENT', 'AVAILABLE',
    '3-Zi-Wohnung mit Suedbalkon in Haidhausen',
    X'440E8400E29B41D4A716446655440000',
    720000.00, 112.5, 3, 2, 1,
    1, 0, 2015,
    'Familie Gruber', '+49 89 48800100',
    'Helles Suedlage-Apartment im begehrten Haidhausen. Hochwertige Einbaukueche, Fussbodenheizung, Tiefgarage. U-Bahn Max-Weber-Platz in 4 Gehminuten.',
    '3,57% inkl. MwSt.'
);

-- Objekt 2: Stadthaus Bogenhausen, 1.12M -- passt zu Hoffmann (800k-1.4M)
INSERT OR IGNORE INTO properties
    (id, created_at, updated_at, address_city, address_postal_code, address_street,
     address_house_number, data_processing_consent, listing_type, property_type,
     status, title, agent_id, price, living_area_sqm, rooms, bedrooms, bathrooms,
     has_balcony, has_garden, construction_year, owner_name, owner_phone,
     description, commission)
VALUES (
    X'CC2E8400E29B41D4A716446655440015',
    strftime('%Y-%m-%d %H:%M:%f','now','-95 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-95 days'),
    'Muenchen', '81679', 'Prinzregentenallee', '88',
    1, 'SALE', 'TOWNHOUSE', 'AVAILABLE',
    'Elegantes Stadthaus in Bogenhausen - 5 Zimmer, Garten',
    X'440E8400E29B41D4A716446655440000',
    1120000.00, 185.0, 5, 4, 2,
    1, 1, 2003,
    'Heinrich Vogel', '+49 89 98200300',
    'Ruhiges Reihenhaus in Toplage Bogenhausen. Grosszuegiger Garten, Suedterrasse, 2 Stellplaetze. Perfekt fuer Familien mit Schulkindern.',
    '3,57% inkl. MwSt.'
);

-- Objekt 3: Villa Gruenwald, 1.98M -- passt zu Schmitt (1.2M-2M)
INSERT OR IGNORE INTO properties
    (id, created_at, updated_at, address_city, address_postal_code, address_street,
     address_house_number, data_processing_consent, listing_type, property_type,
     status, title, agent_id, price, living_area_sqm, rooms, bedrooms, bathrooms,
     has_balcony, has_garden, construction_year, owner_name, owner_phone,
     description, commission)
VALUES (
    X'DD2E8400E29B41D4A716446655440016',
    strftime('%Y-%m-%d %H:%M:%f','now','-41 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-41 days'),
    'Gruenwald', '82031', 'Toelzer Str.', '5A',
    1, 'SALE', 'VILLA', 'AVAILABLE',
    'Repraesentative Villa in Gruenwald - 280 m2, Pool, Doppelgarage',
    X'440E8400E29B41D4A716446655440000',
    1980000.00, 280.0, 7, 5, 3,
    1, 1, 1998,
    'Dr. Bernd Kellner', '+49 89 64100800',
    'Exklusive Villenlage direkt am Isarkanal. Schwimmbad, Whirlpool, Doppelgarage, Weinkeller. Komplett saniert 2021.',
    '3,57% inkl. MwSt.'
);

-- Objekt 4: Penthouse Maxvorstadt, 1.65M -- RESERVED (Fischer-Deal)
INSERT OR IGNORE INTO properties
    (id, created_at, updated_at, address_city, address_postal_code, address_street,
     address_house_number, data_processing_consent, listing_type, property_type,
     status, title, agent_id, price, living_area_sqm, rooms, bedrooms, bathrooms,
     has_balcony, has_garden, construction_year, owner_name, owner_phone,
     description, commission)
VALUES (
    X'EE2E8400E29B41D4A716446655440017',
    strftime('%Y-%m-%d %H:%M:%f','now','-12 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-12 days'),
    'Muenchen', '80333', 'Karlstrasse', '30',
    1, 'SALE', 'PENTHOUSE', 'RESERVED',
    'Penthouse Maxvorstadt - Dachterrasse 80 m2, Panoramablick',
    X'440E8400E29B41D4A716446655440000',
    1650000.00, 155.0, 4, 3, 2,
    1, 0, 2018,
    'Susanne Lang', '+49 89 28800500',
    'Exklusives Penthouse auf dem 8. OG. 80 m2 umlaufende Dachterrasse mit Blick auf Frauenkirche. Concierge-Service im Haus.',
    '3,57% inkl. MwSt.'
);

-- Objekt 5: Einfamilienhaus Pasing, 895k -- AVAILABLE
INSERT OR IGNORE INTO properties
    (id, created_at, updated_at, address_city, address_postal_code, address_street,
     address_house_number, data_processing_consent, listing_type, property_type,
     status, title, agent_id, price, living_area_sqm, rooms, bedrooms, bathrooms,
     has_balcony, has_garden, construction_year, owner_name, owner_phone,
     description, commission)
VALUES (
    X'FF2E8400E29B41D4A716446655440018',
    strftime('%Y-%m-%d %H:%M:%f','now','-8 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-8 days'),
    'Muenchen', '81241', 'August-Exter-Str.', '7',
    1, 'SALE', 'HOUSE', 'AVAILABLE',
    'Freistehendes EFH in Pasing - 6 Zi., Garten, 2 Garagen',
    X'440E8400E29B41D4A716446655440000',
    895000.00, 175.0, 6, 4, 2,
    1, 1, 1972,
    'Werner Schoenberg', '+49 89 89000400',
    'Gepflegtes Einfamilienhaus auf 620 m2 Grundstueck. Neues Dach (2019), Gasheizung, ausgebauter Keller. S-Bahn Pasing in 6 Minuten.',
    '3,57% inkl. MwSt.'
);

-- Objekt 6: Mietwohnung Schwabing, 1.450 EUR/Monat
INSERT OR IGNORE INTO properties
    (id, created_at, updated_at, address_city, address_postal_code, address_street,
     address_house_number, data_processing_consent, listing_type, property_type,
     status, title, agent_id, price, living_area_sqm, rooms, bedrooms, bathrooms,
     has_balcony, has_garden, construction_year, owner_name, owner_phone,
     description, commission)
VALUES (
    X'AA3E8400E29B41D4A716446655440019',
    strftime('%Y-%m-%d %H:%M:%f','now'),
    strftime('%Y-%m-%d %H:%M:%f','now'),
    'Muenchen', '80796', 'Schleissheimer Str.', '102',
    1, 'RENT', 'APARTMENT', 'AVAILABLE',
    '2-Zi-Wohnung Schwabing - hell, ruhig, sofort frei',
    X'440E8400E29B41D4A716446655440000',
    1450.00, 68.0, 2, 1, 1,
    1, 0, 1965,
    'Gerda Brandt', '+49 89 35800700',
    'Helle Altbauwohnung im 3. OG, frisch renoviert. Suedbalkon, Einbaukueche, Keller. Bus und U-Bahn direkt vor der Tuer.',
    '2 Nettokaltmieten inkl. MwSt.'
);

-- =============================================================================
-- CALL_NOTES (10) -- realistisch verteilt auf alle Kunden
-- Spezielle Bedingungen:
--  - Client 1 (Bauer) + Client 4 (Schmitt): letzter Kontakt >35 Tage -> Widget
--  - 2x follow_up_required=1 und follow_up_date=heute (Notes 2 + 3)
--  - 1x follow_up_date=vor 3 Tagen und follow_up_required=1 (ueberfaellig, Note 6)
-- =============================================================================

-- Note 1: Thomas Bauer -- Erstkontakt vor 90 Tagen (letzter Kontakt alt -> Widget)
INSERT OR IGNORE INTO call_notes
    (id, created_at, updated_at, call_date, call_type, duration_minutes,
     follow_up_date, follow_up_required, notes, outcome,
     properties_discussed, subject, agent_id, client_id, property_id)
VALUES (
    X'BB3E8400E29B41D4A716446655440020',
    strftime('%Y-%m-%d %H:%M:%f','now','-90 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-90 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-90 days'),
    'PHONE_INBOUND', 20,
    strftime('%Y-%m-%d %H:%M:%f','now','-83 days'), 0,
    'Herr Bauer meldet sich erstmals. Sucht 3-4-Zimmer-Wohnung in Haidhausen oder Bogenhausen, Budget 650-900 Tsd. Finanzierung durch Sparkasse bereits vorgenehmigt. Keine Eile, Zeitplan 6 Monate.',
    'INTERESTED',
    NULL, 'Erstkontakt - Wohnungssuche Haidhausen/Bogenhausen',
    X'440E8400E29B41D4A716446655440000',
    X'AA0E8400E29B41D4A716446655440001',
    NULL
);

-- Note 2: Sabine Hoffmann -- Expose-Besprechung, follow_up HEUTE (faellig heute)
INSERT OR IGNORE INTO call_notes
    (id, created_at, updated_at, call_date, call_type, duration_minutes,
     follow_up_date, follow_up_required, notes, outcome,
     properties_discussed, subject, agent_id, client_id, property_id)
VALUES (
    X'CC3E8400E29B41D4A716446655440021',
    strftime('%Y-%m-%d %H:%M:%f','now','-5 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-5 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-5 days'),
    'PHONE_OUTBOUND', 35,
    strftime('%Y-%m-%d %H:%M:%f','now'), 1,
    'Stadthaus Bogenhausen vorgestellt. Frau Hoffmann sehr interessiert - Lage und Grundriss passen perfekt. Sie moechte das Expose mit ihrem Mann besprechen. Rueckruf heute vereinbart.',
    'INTERESTED',
    'Prinzregentenallee 88, Muenchen-Bogenhausen',
    'Expose Stadthaus Bogenhausen besprochen',
    X'440E8400E29B41D4A716446655440000',
    X'BB0E8400E29B41D4A716446655440002',
    X'CC2E8400E29B41D4A716446655440015'
);

-- Note 3: Klaus Weber -- Besichtigungsvorbereitung, follow_up HEUTE (faellig heute)
INSERT OR IGNORE INTO call_notes
    (id, created_at, updated_at, call_date, call_type, duration_minutes,
     follow_up_date, follow_up_required, notes, outcome,
     properties_discussed, subject, agent_id, client_id, property_id)
VALUES (
    X'DD3E8400E29B41D4A716446655440022',
    strftime('%Y-%m-%d %H:%M:%f','now','-3 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-3 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-3 days'),
    'PHONE_OUTBOUND', 15,
    strftime('%Y-%m-%d %H:%M:%f','now'), 1,
    'Besichtigungstermin Haidhausen fuer heute Nachmittag bestaetigt. Herr Weber kommt mit Frau und moechte Grundbuchauszug sehen. Budget und Lage passen. Unterlagen vorbereiten.',
    'SCHEDULED_VIEWING',
    'Woerthstrasse 14, Muenchen-Haidhausen',
    'Besichtigungstermin Haidhausen bestaetigt',
    X'440E8400E29B41D4A716446655440000',
    X'CC0E8400E29B41D4A716446655440003',
    X'BB2E8400E29B41D4A716446655440014'
);

-- Note 4: Petra Schmitt -- letzter Kontakt vor 50 Tagen (Widget: kein Kontakt >30 Tage)
INSERT OR IGNORE INTO call_notes
    (id, created_at, updated_at, call_date, call_type, duration_minutes,
     follow_up_date, follow_up_required, notes, outcome,
     properties_discussed, subject, agent_id, client_id, property_id)
VALUES (
    X'EE3E8400E29B41D4A716446655440023',
    strftime('%Y-%m-%d %H:%M:%f','now','-50 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-50 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-50 days'),
    'MEETING', 60,
    strftime('%Y-%m-%d %H:%M:%f','now','-44 days'), 0,
    'Erstes persoenliches Gespraech mit Frau Schmitt. Sucht repraesentative Villa in Gruenwald/Pullach, Budget bis 2 Mio. Zwei Kinder im Schulalter, grosser Garten Pflicht. Derzeit noch nichts Passendes auf Lager.',
    'INTERESTED',
    NULL, 'Erstgespraech - Villensuche Gruenwald/Pullach',
    X'440E8400E29B41D4A716446655440000',
    X'DD0E8400E29B41D4A716446655440004',
    NULL
);

-- Note 5: Markus Fischer -- Abschlusskommunikation (CLOSED)
INSERT OR IGNORE INTO call_notes
    (id, created_at, updated_at, call_date, call_type, duration_minutes,
     follow_up_date, follow_up_required, notes, outcome,
     properties_discussed, subject, agent_id, client_id, property_id)
VALUES (
    X'FF3E8400E29B41D4A716446655440024',
    strftime('%Y-%m-%d %H:%M:%f','now','-40 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-40 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-40 days'),
    'PHONE_INBOUND', 30,
    NULL, 0,
    'Herr Fischer teilt mit, dass Notartermin erfolgreich stattgefunden hat. Kaufvertrag unterzeichnet. Schluesseluebergabe in 3 Wochen. Sehr zufriedener Abschluss - Herr Fischer empfiehlt uns weiter.',
    'DEAL_CLOSED',
    'Karlstrasse 30, Muenchen-Maxvorstadt',
    'Notartermin erfolgreich - Kaufabschluss bestaetigt',
    X'440E8400E29B41D4A716446655440000',
    X'EE0E8400E29B41D4A716446655440005',
    X'EE2E8400E29B41D4A716446655440017'
);

-- Note 6: Julia Meier -- Mietanfrage, follow_up UEBERFAELLIG (vor 3 Tagen)
INSERT OR IGNORE INTO call_notes
    (id, created_at, updated_at, call_date, call_type, duration_minutes,
     follow_up_date, follow_up_required, notes, outcome,
     properties_discussed, subject, agent_id, client_id, property_id)
VALUES (
    X'AA4E8400E29B41D4A716446655440025',
    strftime('%Y-%m-%d %H:%M:%f','now','-7 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-7 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-7 days'),
    'EMAIL', 0,
    strftime('%Y-%m-%d %H:%M:%f','now','-3 days'), 1,
    'Frau Meier schreibt per E-Mail. Sucht 2-Zimmer-Mietwohnung in Schwabing oder Maxvorstadt, max. 1.600 EUR warm, ab sofort. Hat Wohnung in Schleissheimer Str. gesehen und ist sehr interessiert. Rueckruf angefordert.',
    'INTERESTED',
    'Schleissheimer Str. 102, Schwabing',
    'Mietanfrage 2-Zi-Wohnung Schwabing',
    X'440E8400E29B41D4A716446655440000',
    X'FF0E8400E29B41D4A716446655440006',
    X'AA3E8400E29B41D4A716446655440019'
);

-- Note 7: Andreas Braun -- Besichtigungsvorbereitung Mietwohnung
INSERT OR IGNORE INTO call_notes
    (id, created_at, updated_at, call_date, call_type, duration_minutes,
     follow_up_date, follow_up_required, notes, outcome,
     properties_discussed, subject, agent_id, client_id, property_id)
VALUES (
    X'BB4E8400E29B41D4A716446655440026',
    strftime('%Y-%m-%d %H:%M:%f','now','-2 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-2 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-2 days'),
    'PHONE_OUTBOUND', 10,
    NULL, 0,
    'Besichtigungstermin mit Herrn Braun fuer morgen frueh vereinbart. Er sucht 2-Zimmer-Wohnung zur Miete ab sofort - Jobanfang in Muenchen. Wohnung in Schleissheimer Str. passt gut.',
    'SCHEDULED_VIEWING',
    'Schleissheimer Str. 102, Schwabing',
    'Besichtigungstermin Mietwohnung vereinbart',
    X'440E8400E29B41D4A716446655440000',
    X'AA1E8400E29B41D4A716446655440007',
    X'AA3E8400E29B41D4A716446655440019'
);

-- Note 8: Claudia Richter -- Verkaeufer, Erstgespraech
INSERT OR IGNORE INTO call_notes
    (id, created_at, updated_at, call_date, call_type, duration_minutes,
     follow_up_date, follow_up_required, notes, outcome,
     properties_discussed, subject, agent_id, client_id, property_id)
VALUES (
    X'CC4E8400E29B41D4A716446655440027',
    strftime('%Y-%m-%d %H:%M:%f','now','-18 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-18 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-18 days'),
    'MEETING', 75,
    strftime('%Y-%m-%d %H:%M:%f','now','-11 days'), 0,
    'Vor-Ort-Termin bei Frau Richter. Scheidung - Immobilie soll schnell verkauft werden. 4-Zimmer-Wohnung, ca. 120 m2, Bogenhausen. Marktpreisanalyse zugesagt. Alleinauftrag angeboten.',
    'INTERESTED',
    'Boschetsrieder Str. 71, Muenchen',
    'Erstgespraech Verkaufsmandat - Wohnung Bogenhausen',
    X'440E8400E29B41D4A716446655440000',
    X'BB1E8400E29B41D4A716446655440008',
    NULL
);

-- Note 9: Sabine Hoffmann -- zweites Gespraech, Finanzierungsstand
INSERT OR IGNORE INTO call_notes
    (id, created_at, updated_at, call_date, call_type, duration_minutes,
     follow_up_date, follow_up_required, notes, outcome,
     properties_discussed, subject, agent_id, client_id, property_id)
VALUES (
    X'DD4E8400E29B41D4A716446655440028',
    strftime('%Y-%m-%d %H:%M:%f','now','-12 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-12 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-12 days'),
    'PHONE_INBOUND', 25,
    strftime('%Y-%m-%d %H:%M:%f','now','-5 days'), 0,
    'Frau Hoffmann ruft zurueck. Mann ebenfalls ueberzeugt von Bogenhausen-Objekt. Finanzierung laeuft (Eigenkapital vorhanden, kein Kredit noetig). Besichtigungstermin fuer Villa Gruenwald ebenfalls gewuenscht.',
    'SCHEDULED_VIEWING',
    'Prinzregentenallee 88, Bogenhausen | Toelzer Str. 5A, Gruenwald',
    'Finanzierung OK - Besichtigungstermin fuer beide Objekte',
    X'440E8400E29B41D4A716446655440000',
    X'BB0E8400E29B41D4A716446655440002',
    X'CC2E8400E29B41D4A716446655440015'
);

-- Note 10: Klaus Weber -- Nachfassgespraech nach Besichtigung
INSERT OR IGNORE INTO call_notes
    (id, created_at, updated_at, call_date, call_type, duration_minutes,
     follow_up_date, follow_up_required, notes, outcome,
     properties_discussed, subject, agent_id, client_id, property_id)
VALUES (
    X'EE4E8400E29B41D4A716446655440029',
    strftime('%Y-%m-%d %H:%M:%f','now','-1 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-1 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-1 days'),
    'PHONE_OUTBOUND', 20,
    strftime('%Y-%m-%d %H:%M:%f','now','+2 days'), 1,
    'Nachfassgespraech nach gestriger Besichtigung. Herr Weber: Wohnung gefaellt sehr gut, Frau auch begeistert. Eine Frage zur Nebenkosten-Abrechnung noch offen. Kaufentscheidung soll morgen fallen.',
    'OFFER_MADE',
    'Woerthstrasse 14, Muenchen-Haidhausen',
    'Nachfassgespraech Besichtigung Haidhausen - Kaufinteresse stark',
    X'440E8400E29B41D4A716446655440000',
    X'CC0E8400E29B41D4A716446655440003',
    X'BB2E8400E29B41D4A716446655440014'
);

-- =============================================================================
-- VIEWINGS (3)
-- 2x SCHEDULED heute (+5h / +9h), 1x COMPLETED vor 6 Tagen mit feedback LIKED
-- =============================================================================

-- Viewing 1: Klaus Weber @ Haidhausen heute +5h (SCHEDULED)
INSERT OR IGNORE INTO viewings
    (id, created_at, updated_at, client_notes, duration_minutes, feedback,
     follow_up_action, status, viewing_date, agent_id, client_id, property_id)
VALUES (
    X'FF4E8400E29B41D4A716446655440030',
    strftime('%Y-%m-%d %H:%M:%f','now','-1 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-1 days'),
    NULL, 60, NULL,
    NULL, 'SCHEDULED',
    strftime('%Y-%m-%d %H:%M:%f','now','+5 hours'),
    X'440E8400E29B41D4A716446655440000',
    X'CC0E8400E29B41D4A716446655440003',
    X'BB2E8400E29B41D4A716446655440014'
);

-- Viewing 2: Andreas Braun @ Mietwohnung Schwabing heute +9h (SCHEDULED)
INSERT OR IGNORE INTO viewings
    (id, created_at, updated_at, client_notes, duration_minutes, feedback,
     follow_up_action, status, viewing_date, agent_id, client_id, property_id)
VALUES (
    X'AA5E8400E29B41D4A716446655440031',
    strftime('%Y-%m-%d %H:%M:%f','now','-1 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-1 days'),
    NULL, 45, NULL,
    NULL, 'SCHEDULED',
    strftime('%Y-%m-%d %H:%M:%f','now','+9 hours'),
    X'440E8400E29B41D4A716446655440000',
    X'AA1E8400E29B41D4A716446655440007',
    X'AA3E8400E29B41D4A716446655440019'
);

-- Viewing 3: Sabine Hoffmann @ Stadthaus Bogenhausen vor 6 Tagen (COMPLETED, LIKED)
INSERT OR IGNORE INTO viewings
    (id, created_at, updated_at, client_notes, duration_minutes, feedback,
     follow_up_action, status, viewing_date, agent_id, client_id, property_id)
VALUES (
    X'BB5E8400E29B41D4A716446655440032',
    strftime('%Y-%m-%d %H:%M:%f','now','-6 days'),
    strftime('%Y-%m-%d %H:%M:%f','now','-6 days'),
    'Sehr schoenes Haus! Garten ist gross genug fuer die Kinder. Mann findet den Grundriss ideal. Einzige Frage: Wann kann fruehestens eingezogen werden?',
    90, 'LIKED',
    'Finanzierungsbestaetigung anfordern und Kaufangebot vorbereiten',
    'COMPLETED',
    strftime('%Y-%m-%d %H:%M:%f','now','-6 days','+10 hours'),
    X'440E8400E29B41D4A716446655440000',
    X'BB0E8400E29B41D4A716446655440002',
    X'CC2E8400E29B41D4A716446655440015'
);
