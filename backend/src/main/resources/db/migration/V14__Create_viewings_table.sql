CREATE TABLE viewings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    client_id UUID NOT NULL,
    property_id UUID NOT NULL,
    viewing_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    feedback VARCHAR(20),
    client_notes TEXT,
    follow_up_action VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE INDEX idx_viewings_agent_id ON viewings(agent_id);
CREATE INDEX idx_viewings_client_id ON viewings(client_id);
CREATE INDEX idx_viewings_property_id ON viewings(property_id);
CREATE INDEX idx_viewings_viewing_date ON viewings(viewing_date);
CREATE INDEX idx_viewings_agent_date ON viewings(agent_id, viewing_date);
CREATE INDEX idx_viewings_agent_client ON viewings(agent_id, client_id);
CREATE INDEX idx_viewings_agent_property ON viewings(agent_id, property_id);
