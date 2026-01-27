-- Sample data for development and testing
-- This script creates admin agent, test agent, client Peter Müller, a property, and 5 call notes showing progressive buy interest

-- Insert admin agent (password: AdminPass123! - bcrypt hashed)
INSERT INTO agents (id, first_name, last_name, email, password_hash, phone, language_preference, is_active, created_at, updated_at)
VALUES (
    '440e8400-e29b-41d4-a716-446655440000',
    'Admin',
    'User',
    'admin@marklerapp.com',
    '$2b$10$21KxD7Bwud8UvfNu6DYPLu5vRNc9q3ghcajNytdG4VWizyUwkAbjS', -- AdminPass123!
    '+49 89 00000000',
    'EN',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

-- Insert test agent (password: Test1234! - bcrypt hashed)
INSERT INTO agents (id, first_name, last_name, email, password_hash, phone, language_preference, is_active, created_at, updated_at)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Max',
    'Mustermann',
    'max.mustermann@realestate.de',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- Test1234!
    '+49 89 12345678',
    'DE',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

-- Insert client Peter Müller from Germany
INSERT INTO clients (id, agent_id, first_name, last_name, email, phone, address_street, address_city, address_postal_code, address_country, gdpr_consent_given, gdpr_consent_date, created_at, updated_at)
VALUES (
    '660e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    'Peter',
    'Müller',
    'peter.mueller@email.de',
    '+49 89 98765432',
    'Musterstraße 42',
    'München',
    '80331',
    'Germany',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

-- Insert property search criteria for Peter Müller
INSERT INTO property_search_criteria (id, client_id, min_budget, max_budget, min_square_meters, max_square_meters, min_rooms, max_rooms, preferred_locations, property_types, additional_requirements, created_at, updated_at)
VALUES (
    '770e8400-e29b-41d4-a716-446655440002',
    '660e8400-e29b-41d4-a716-446655440001',
    350000,
    550000,
    90,
    150,
    3,
    5,
    'München, München-Schwabing, München-Giesing',
    'APARTMENT, HOUSE',
    'Balkon, moderne Ausstattung, gute Verkehrsanbindung, Nähe zu Schulen',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

-- Insert test property in Munich
INSERT INTO properties (id, agent_id, title, description, property_type, listing_type, price, living_area_sqm, rooms, bedrooms, bathrooms, floor_number, floors, construction_year, available_from, address_street, address_city, address_postal_code, address_country, heating_type, energy_efficiency_class, has_balcony, has_garden, has_elevator, has_basement, status, data_processing_consent, created_at, updated_at)
VALUES (
    '880e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440000',
    'Moderne 4-Zimmer Wohnung in München-Schwabing',
    'Helle und geräumige 4-Zimmer Wohnung in begehrter Lage von München-Schwabing. Die Wohnung wurde 2018 vollständig renoviert und verfügt über einen großzügigen Südbalkon mit Blick ins Grüne. Hochwertige Ausstattung mit Echtholzparkett, Fußbodenheizung und modernem Bad. Die Küche ist mit allen notwendigen Geräten ausgestattet. Perfekt geeignet für Familien - Schulen und Kindergärten in unmittelbarer Nähe. Sehr gute Verkehrsanbindung (U-Bahn in 5 Minuten zu Fuß).',
    'APARTMENT',
    'SALE',
    485000.00,
    115.50,
    4,
    3,
    1,
    3,
    5,
    1975,
    '2025-02-01',
    'Leopoldstraße 123',
    'München',
    '80802',
    'Germany',
    'GAS',
    'B',
    true,
    false,
    true,
    true,
    'AVAILABLE',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

-- Call Note 1: Initial contact - General interest
INSERT INTO call_notes (id, agent_id, client_id, property_id, call_date, duration_minutes, call_type, subject, notes, follow_up_required, follow_up_date, properties_discussed, outcome, created_at, updated_at)
VALUES (
    '990e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440001',
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '14 days',
    25,
    'PHONE_INBOUND',
    'Erstkontakt - Wohnungssuche München',
    'Herr Müller meldet sich auf unsere Anzeige. Er sucht eine Wohnung in München für seine Familie (Frau und 2 Kinder). Budget: 350.000 - 550.000 Euro. Wichtig sind ihm: 3-4 Zimmer, Balkon, gute Verkehrsanbindung und Nähe zu Schulen. Er bevorzugt die Stadtteile Schwabing oder Giesing. Herr Müller erwähnt, dass er derzeit zur Miete wohnt und bis Ende März eine Kaufentscheidung treffen möchte.',
    true,
    CURRENT_DATE - INTERVAL '12 days',
    NULL,
    'INTERESTED',
    CURRENT_TIMESTAMP - INTERVAL '14 days',
    CURRENT_TIMESTAMP - INTERVAL '14 days'
)
ON CONFLICT (id) DO NOTHING;

-- Call Note 2: Property presentation - Specific interest
INSERT INTO call_notes (id, agent_id, client_id, property_id, call_date, duration_minutes, call_type, subject, notes, follow_up_required, follow_up_date, properties_discussed, outcome, created_at, updated_at)
VALUES (
    'aa0e8400-e29b-41d4-a716-446655440005',
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440003',
    CURRENT_TIMESTAMP - INTERVAL '12 days',
    35,
    'PHONE_OUTBOUND',
    'Vorstellung 4-Zimmer Wohnung Schwabing',
    'Ich habe Herrn Müller die 4-Zimmer Wohnung in der Leopoldstraße vorgestellt. Er zeigt großes Interesse: Die Lage passt perfekt (U-Bahn-Nähe, Schulen), die Größe von 115 qm ist ausreichend, und der Preis von 485.000 Euro liegt in seinem Budget. Der Südbalkon und die Renovierung von 2018 gefallen ihm besonders gut. Er möchte die Wohnung mit seiner Frau besichtigen. Termin vereinbart für übernächsten Samstag, 10:00 Uhr.',
    true,
    CURRENT_DATE - INTERVAL '9 days',
    'Leopoldstraße 123, München-Schwabing',
    'SCHEDULED_VIEWING',
    CURRENT_TIMESTAMP - INTERVAL '12 days',
    CURRENT_TIMESTAMP - INTERVAL '12 days'
)
ON CONFLICT (id) DO NOTHING;

-- Call Note 3: Property viewing - Very positive feedback
INSERT INTO call_notes (id, agent_id, client_id, property_id, call_date, duration_minutes, call_type, subject, notes, follow_up_required, follow_up_date, properties_discussed, outcome, created_at, updated_at)
VALUES (
    'bb0e8400-e29b-41d4-a716-446655440006',
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440003',
    CURRENT_TIMESTAMP - INTERVAL '9 days',
    90,
    'MEETING',
    'Besichtigung 4-Zimmer Wohnung',
    'Besichtigung mit Herrn Müller und seiner Frau durchgeführt. Beide sehr angetan von der Wohnung. Frau Müller lobte besonders den hellen Schnitt, das renovierte Bad und die Küche. Die Kinder waren dabei und waren vom Kinderzimmer und dem Balkon begeistert. Herr Müller prüfte alle technischen Aspekte (Heizung, Fenster, Elektrik) und war zufrieden. Sie möchten die Finanzierung mit ihrer Bank besprechen. Nächster Termin: Telefonat in 3 Tagen für Rückmeldung zur Finanzierung.',
    true,
    CURRENT_DATE - INTERVAL '6 days',
    'Leopoldstraße 123, München-Schwabing',
    'INTERESTED',
    CURRENT_TIMESTAMP - INTERVAL '9 days',
    CURRENT_TIMESTAMP - INTERVAL '9 days'
)
ON CONFLICT (id) DO NOTHING;

-- Call Note 4: Financing confirmed - Ready to make offer
INSERT INTO call_notes (id, agent_id, client_id, property_id, call_date, duration_minutes, call_type, subject, notes, follow_up_required, follow_up_date, properties_discussed, outcome, created_at, updated_at)
VALUES (
    'cc0e8400-e29b-41d4-a716-446655440007',
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440003',
    CURRENT_TIMESTAMP - INTERVAL '6 days',
    30,
    'PHONE_INBOUND',
    'Finanzierungszusage erhalten',
    'Herr Müller ruft an: Die Bank hat die Finanzierung über 485.000 Euro genehmigt. Er und seine Frau sind fest entschlossen, ein Kaufangebot zu machen. Sie bieten den vollen Kaufpreis von 485.000 Euro. Herr Müller fragt nach dem weiteren Ablauf und den benötigten Unterlagen. Ich habe ihm erklärt, dass ich das Angebot dem Verkäufer vorlege. Vereinbart: Ich melde mich innerhalb von 48 Stunden mit der Rückmeldung des Verkäufers.',
    true,
    CURRENT_DATE - INTERVAL '4 days',
    'Leopoldstraße 123, München-Schwabing',
    'OFFER_MADE',
    CURRENT_TIMESTAMP - INTERVAL '6 days',
    CURRENT_TIMESTAMP - INTERVAL '6 days'
)
ON CONFLICT (id) DO NOTHING;

-- Call Note 5: Offer accepted - Deal moving forward
INSERT INTO call_notes (id, agent_id, client_id, property_id, call_date, duration_minutes, call_type, subject, notes, follow_up_required, follow_up_date, properties_discussed, outcome, created_at, updated_at)
VALUES (
    'dd0e8400-e29b-41d4-a716-446655440008',
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440001',
    '880e8400-e29b-41d4-a716-446655440003',
    CURRENT_TIMESTAMP - INTERVAL '4 days',
    20,
    'PHONE_OUTBOUND',
    'Kaufangebot angenommen',
    'Verkäufer hat das Angebot von 485.000 Euro akzeptiert. Herr Müller sehr erfreut über die Zusage. Nächste Schritte besprochen: Notartermin wird koordiniert (voraussichtlich in 3-4 Wochen), alle Unterlagen werden vorbereitet. Herr Müller wird seine Bank informieren und die finale Finanzierungszusage einholen. Vereinbarter Übergabetermin: 1. März 2025. Kontakt zum Notar wird von meiner Seite hergestellt und Terminoptionen werden allen Parteien mitgeteilt.',
    true,
    CURRENT_DATE + INTERVAL '2 days',
    'Leopoldstraße 123, München-Schwabing',
    'DEAL_CLOSED',
    CURRENT_TIMESTAMP - INTERVAL '4 days',
    CURRENT_TIMESTAMP - INTERVAL '4 days'
)
ON CONFLICT (id) DO NOTHING;
