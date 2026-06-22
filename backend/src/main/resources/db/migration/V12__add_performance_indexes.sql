-- V12: Add strategic indexes for performance optimization
-- Supplements the indexes already created in V2-V5 with additional patterns.

-- call_notes: compound and lookup indexes
CREATE INDEX IF NOT EXISTS idx_call_note_agent_id ON call_notes(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_note_client_id ON call_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_call_note_property_id ON call_notes(property_id);
CREATE INDEX IF NOT EXISTS idx_call_note_call_date ON call_notes(call_date);
CREATE INDEX IF NOT EXISTS idx_call_note_follow_up ON call_notes(follow_up_required, follow_up_date);

-- clients: lookup indexes
CREATE INDEX IF NOT EXISTS idx_client_agent_id ON clients(agent_id);
CREATE INDEX IF NOT EXISTS idx_client_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_client_last_name ON clients(last_name);
CREATE INDEX IF NOT EXISTS idx_client_city ON clients(address_city);
CREATE INDEX IF NOT EXISTS idx_client_postal_code ON clients(address_postal_code);
CREATE INDEX IF NOT EXISTS idx_client_gdpr_consent ON clients(agent_id, gdpr_consent_given);

-- properties: status/type/location search indexes
CREATE INDEX IF NOT EXISTS idx_property_agent_id ON properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_property_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_property_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_property_listing_type ON properties(listing_type);
CREATE INDEX IF NOT EXISTS idx_property_city ON properties(address_city);
CREATE INDEX IF NOT EXISTS idx_property_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_property_available_from ON properties(available_from);

-- property_images: lookup indexes
CREATE INDEX IF NOT EXISTS idx_property_image_property_id ON property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_property_image_type ON property_images(image_type);

-- property_search_criteria: client lookup
CREATE INDEX IF NOT EXISTS idx_search_criteria_client_id ON property_search_criteria(client_id);
