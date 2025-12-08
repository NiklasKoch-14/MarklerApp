-- Create properties table
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    property_type VARCHAR(50) NOT NULL,
    listing_type VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',

    -- Address fields
    address_street VARCHAR(200) NOT NULL,
    address_house_number VARCHAR(20),
    address_city VARCHAR(100) NOT NULL,
    address_postal_code VARCHAR(5) NOT NULL,
    address_state VARCHAR(100),
    address_country VARCHAR(100) DEFAULT 'Germany',
    address_district VARCHAR(100),

    -- Property specifications
    living_area_sqm DECIMAL(10,2),
    total_area_sqm DECIMAL(10,2),
    plot_area_sqm DECIMAL(12,2),
    rooms DECIMAL(4,1),
    bedrooms INTEGER,
    bathrooms INTEGER,
    floors INTEGER,
    floor_number INTEGER,
    construction_year INTEGER,
    last_renovation_year INTEGER,

    -- Financial information
    price DECIMAL(12,2),
    price_per_sqm DECIMAL(8,2),
    additional_costs DECIMAL(10,2),
    heating_costs DECIMAL(8,2),
    commission DECIMAL(8,2),

    -- Features and amenities
    has_elevator BOOLEAN DEFAULT false,
    has_balcony BOOLEAN DEFAULT false,
    has_terrace BOOLEAN DEFAULT false,
    has_garden BOOLEAN DEFAULT false,
    has_garage BOOLEAN DEFAULT false,
    has_parking BOOLEAN DEFAULT false,
    has_basement BOOLEAN DEFAULT false,
    has_attic BOOLEAN DEFAULT false,
    is_barrier_free BOOLEAN DEFAULT false,
    pets_allowed BOOLEAN DEFAULT false,
    furnished BOOLEAN DEFAULT false,

    -- Energy efficiency
    energy_efficiency_class VARCHAR(10),
    energy_consumption_kwh DECIMAL(6,2),
    heating_type VARCHAR(30),

    -- Additional fields
    available_from DATE,
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    virtual_tour_url VARCHAR(500),
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Create property images table
CREATE TABLE property_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    content_type VARCHAR(100),
    file_size BIGINT,
    title VARCHAR(200),
    description VARCHAR(500),
    is_primary BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    image_type VARCHAR(30) DEFAULT 'GENERAL',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Create indexes for better performance
-- Properties indexes
CREATE INDEX idx_properties_agent_id ON properties(agent_id);
CREATE INDEX idx_properties_status ON properties(agent_id, status);
CREATE INDEX idx_properties_type ON properties(agent_id, property_type);
CREATE INDEX idx_properties_listing_type ON properties(agent_id, listing_type);
CREATE INDEX idx_properties_city ON properties(agent_id, address_city);
CREATE INDEX idx_properties_postal_code ON properties(agent_id, address_postal_code);
CREATE INDEX idx_properties_price ON properties(agent_id, price);
CREATE INDEX idx_properties_area ON properties(agent_id, living_area_sqm);
CREATE INDEX idx_properties_rooms ON properties(agent_id, rooms);
CREATE INDEX idx_properties_created ON properties(agent_id, created_at);
CREATE INDEX idx_properties_available_from ON properties(agent_id, available_from);
CREATE INDEX idx_properties_construction_year ON properties(agent_id, construction_year);

-- Compound indexes for common queries
CREATE INDEX idx_properties_search ON properties(agent_id, status, property_type, listing_type);
CREATE INDEX idx_properties_location ON properties(agent_id, address_city, address_postal_code);
CREATE INDEX idx_properties_specs ON properties(agent_id, rooms, living_area_sqm, price);

-- Property images indexes
CREATE INDEX idx_property_images_property_id ON property_images(property_id);
CREATE INDEX idx_property_images_sort ON property_images(property_id, sort_order);
CREATE INDEX idx_property_images_primary ON property_images(property_id, is_primary);
CREATE INDEX idx_property_images_type ON property_images(property_id, image_type);
CREATE INDEX idx_property_images_filename ON property_images(filename);

-- Full-text search indexes for PostgreSQL (will be ignored by SQLite)
-- These are for future PostgreSQL deployment
-- CREATE INDEX idx_properties_text_search ON properties USING gin(to_tsvector('german', title || ' ' || COALESCE(description, '')));

-- Insert sample properties for the admin agent
INSERT INTO properties (id, agent_id, title, description, property_type, listing_type, status,
                       address_street, address_house_number, address_city, address_postal_code,
                       address_state, living_area_sqm, rooms, bedrooms, bathrooms, construction_year,
                       price, has_elevator, has_balcony, has_parking, energy_efficiency_class, available_from)
VALUES
    ('p1234567-8901-2345-6789-012345678901', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Moderne 3-Zimmer-Wohnung in Berlin Mitte',
     'Stilvolle und moderne 3-Zimmer-Wohnung im Herzen von Berlin. Die Wohnung besticht durch helle Räume, eine moderne Ausstattung und eine perfekte Lage. Ideal für Berufstätige oder kleine Familien.',
     'APARTMENT', 'SALE', 'AVAILABLE',
     'Friedrichstraße', '123', 'Berlin', '10117',
     'Berlin', 95.50, 3.0, 2, 1, 2015,
     450000.00, true, true, false, 'B', '2024-01-15'),

    ('p2345678-9012-3456-7890-123456789012', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Charmantes Einfamilienhaus mit Garten',
     'Wunderschönes Einfamilienhaus in ruhiger Wohnlage mit gepflegtem Garten. Das Haus verfügt über 5 Zimmer, 2 Bäder und einen Keller. Perfekt für Familien mit Kindern.',
     'HOUSE', 'SALE', 'AVAILABLE',
     'Goethestraße', '45', 'Munich', '80336',
     'Bayern', 140.00, 5.0, 3, 2, 1995,
     680000.00, false, false, true, 'C', '2024-02-01'),

    ('p3456789-0123-4567-8901-234567890123', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Luxus-Penthouse mit Dachterrasse',
     'Exklusives Penthouse in erstklassiger Lage mit großer Dachterrasse und herrlichem Blick über die Stadt. Hochwertige Ausstattung und modernste Technik.',
     'PENTHOUSE', 'RENT', 'AVAILABLE',
     'Hafencity', '88', 'Hamburg', '20457',
     'Hamburg', 180.00, 4.0, 3, 2, 2020,
     3500.00, true, false, true, 'A+', '2024-03-01'),

    ('p4567890-1234-5678-9012-345678901234', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Gemütliche 2-Zimmer-Wohnung für Studenten',
     'Kleine aber feine 2-Zimmer-Wohnung in Universitätsnähe. Ideal für Studenten oder Singles. Gute Verkehrsanbindung und Einkaufsmöglichkeiten in der Nähe.',
     'APARTMENT', 'RENT', 'AVAILABLE',
     'Universitätsstraße', '12', 'Heidelberg', '69120',
     'Baden-Württemberg', 52.00, 2.0, 1, 1, 1980,
     850.00, false, true, false, 'D', '2024-01-01'),

    ('p5678901-2345-6789-0123-456789012345', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Renoviertes Stadthaus im Zentrum',
     'Vollständig renoviertes Stadthaus in zentraler Lage. Kombination aus historischem Charme und modernem Komfort. 3 Etagen mit viel Platz für die ganze Familie.',
     'TOWNHOUSE', 'SALE', 'RESERVED',
     'Altstadt', '7', 'Düsseldorf', '40213',
     'Nordrhein-Westfalen', 160.00, 6.0, 4, 3, 1920,
     750000.00, false, true, true, 'C+', '2024-04-01');

-- Insert sample property images
INSERT INTO property_images (id, property_id, filename, original_filename, content_type, title, is_primary, sort_order, image_type)
VALUES
    ('i1234567-8901-2345-6789-012345678901', 'p1234567-8901-2345-6789-012345678901',
     'berlin_apartment_main.jpg', 'IMG_001.jpg', 'image/jpeg', 'Hauptansicht Wohnzimmer', true, 1, 'INTERIOR'),

    ('i2345678-9012-3456-7890-123456789012', 'p1234567-8901-2345-6789-012345678901',
     'berlin_apartment_kitchen.jpg', 'IMG_002.jpg', 'image/jpeg', 'Moderne Küche', false, 2, 'KITCHEN'),

    ('i3456789-0123-4567-8901-234567890123', 'p2345678-9012-3456-7890-123456789012',
     'munich_house_exterior.jpg', 'IMG_003.jpg', 'image/jpeg', 'Hausansicht mit Garten', true, 1, 'EXTERIOR'),

    ('i4567890-1234-5678-9012-345678901234', 'p3456789-0123-4567-8901-234567890123',
     'hamburg_penthouse_terrace.jpg', 'IMG_004.jpg', 'image/jpeg', 'Dachterrasse mit Blick', true, 1, 'BALCONY_TERRACE'),

    ('i5678901-2345-6789-0123-456789012345', 'p4567890-1234-5678-9012-345678901234',
     'heidelberg_apartment_main.jpg', 'IMG_005.jpg', 'image/jpeg', 'Wohnbereich', true, 1, 'INTERIOR');

-- Create constraints and checks
-- Ensure only one primary image per property
CREATE UNIQUE INDEX idx_one_primary_image_per_property
ON property_images(property_id)
WHERE is_primary = true;

-- Add check constraints (PostgreSQL specific - SQLite will ignore these)
-- ALTER TABLE properties ADD CONSTRAINT chk_price_positive CHECK (price IS NULL OR price >= 0);
-- ALTER TABLE properties ADD CONSTRAINT chk_area_positive CHECK (living_area_sqm IS NULL OR living_area_sqm >= 0);
-- ALTER TABLE properties ADD CONSTRAINT chk_rooms_positive CHECK (rooms IS NULL OR rooms >= 0);
-- ALTER TABLE property_images ADD CONSTRAINT chk_sort_order_positive CHECK (sort_order >= 0);

-- Create views for common queries (optional)
CREATE VIEW v_available_properties AS
SELECT p.*,
       (SELECT pi.filename FROM property_images pi
        WHERE pi.property_id = p.id AND pi.is_primary = true LIMIT 1) as primary_image
FROM properties p
WHERE p.status = 'AVAILABLE';

-- Statistics view for agents
CREATE VIEW v_property_stats AS
SELECT
    agent_id,
    COUNT(*) as total_properties,
    COUNT(CASE WHEN status = 'AVAILABLE' THEN 1 END) as available_properties,
    COUNT(CASE WHEN status = 'SOLD' THEN 1 END) as sold_properties,
    COUNT(CASE WHEN status = 'RENTED' THEN 1 END) as rented_properties,
    COUNT(CASE WHEN listing_type = 'SALE' THEN 1 END) as sale_properties,
    COUNT(CASE WHEN listing_type = 'RENT' THEN 1 END) as rental_properties,
    AVG(price) as average_price,
    AVG(living_area_sqm) as average_area,
    AVG(rooms) as average_rooms
FROM properties
GROUP BY agent_id;