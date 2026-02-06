-- V10: Add strategic database indexes for performance optimization
-- Created: 2026-01-27
-- Purpose: Improve query performance by adding indexes on frequently queried columns

-- ============================================
-- CallNote table indexes
-- ============================================
-- Foreign key indexes for join operations
CREATE INDEX IF NOT EXISTS idx_call_note_agent_id ON call_note(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_note_client_id ON call_note(client_id);
CREATE INDEX IF NOT EXISTS idx_call_note_property_id ON call_note(property_id);

-- Date-based queries (ordering, filtering)
CREATE INDEX IF NOT EXISTS idx_call_note_call_date ON call_note(call_date);

-- Follow-up queries (compound index for common query pattern)
CREATE INDEX IF NOT EXISTS idx_call_note_follow_up ON call_note(follow_up_required, follow_up_date);

-- ============================================
-- Client table indexes
-- ============================================
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_client_agent_id ON client(agent_id);

-- Unique identifier index for lookups
CREATE INDEX IF NOT EXISTS idx_client_email ON client(email);

-- Name-based searches
CREATE INDEX IF NOT EXISTS idx_client_last_name ON client(last_name);

-- Location-based searches
CREATE INDEX IF NOT EXISTS idx_client_city ON client(address_city);
CREATE INDEX IF NOT EXISTS idx_client_postal_code ON client(address_postal_code);

-- GDPR compliance queries (compound index)
CREATE INDEX IF NOT EXISTS idx_client_gdpr_consent ON client(agent_id, gdpr_consent_given);

-- ============================================
-- Property table indexes
-- ============================================
-- Foreign key index
CREATE INDEX IF NOT EXISTS idx_property_agent_id ON property(agent_id);

-- Status and type filters (most common query patterns)
CREATE INDEX IF NOT EXISTS idx_property_status ON property(property_status);
CREATE INDEX IF NOT EXISTS idx_property_type ON property(property_type);
CREATE INDEX IF NOT EXISTS idx_property_listing_type ON property(listing_type);

-- Location-based searches
CREATE INDEX IF NOT EXISTS idx_property_city ON property(address_city);

-- Price range queries
CREATE INDEX IF NOT EXISTS idx_property_price ON property(price);

-- Availability date filtering
CREATE INDEX IF NOT EXISTS idx_property_available_from ON property(available_from);

-- ============================================
-- PropertyImage table indexes
-- ============================================
-- Foreign key index for property relationship
CREATE INDEX IF NOT EXISTS idx_property_image_property_id ON property_image(property_id);

-- Image type filtering
CREATE INDEX IF NOT EXISTS idx_property_image_type ON property_image(image_type);

-- ============================================
-- PropertySearchCriteria table indexes
-- ============================================
-- Foreign key index for client relationship
CREATE INDEX IF NOT EXISTS idx_search_criteria_client_id ON property_search_criteria(client_id);
