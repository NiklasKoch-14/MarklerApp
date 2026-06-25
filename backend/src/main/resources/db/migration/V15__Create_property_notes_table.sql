CREATE TABLE property_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    property_id UUID NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE INDEX idx_property_notes_agent_id ON property_notes(agent_id);
CREATE INDEX idx_property_notes_property_id ON property_notes(property_id);
CREATE INDEX idx_property_notes_agent_property ON property_notes(agent_id, property_id);
CREATE INDEX idx_property_notes_created_at ON property_notes(created_at);
