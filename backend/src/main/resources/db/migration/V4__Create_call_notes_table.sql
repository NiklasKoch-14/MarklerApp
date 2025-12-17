-- Create call_notes table for communication tracking
CREATE TABLE call_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL,
    client_id UUID NOT NULL,
    call_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER,
    call_type VARCHAR(30) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    notes TEXT NOT NULL,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    properties_discussed VARCHAR(1000),
    outcome VARCHAR(30),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Create indexes for call_notes
CREATE INDEX idx_call_notes_agent_id ON call_notes(agent_id);
CREATE INDEX idx_call_notes_client_id ON call_notes(client_id);
CREATE INDEX idx_call_notes_call_date ON call_notes(call_date);
CREATE INDEX idx_call_notes_follow_up ON call_notes(follow_up_required, follow_up_date);
CREATE INDEX idx_call_notes_type ON call_notes(agent_id, call_type);
CREATE INDEX idx_call_notes_outcome ON call_notes(agent_id, outcome);
CREATE INDEX idx_call_notes_created ON call_notes(agent_id, created_at);

-- Compound indexes for common queries
CREATE INDEX idx_call_notes_agent_client ON call_notes(agent_id, client_id, call_date DESC);
CREATE INDEX idx_call_notes_agent_date ON call_notes(agent_id, call_date DESC);

-- Insert sample call notes for the admin agent
INSERT INTO call_notes (id, agent_id, client_id, call_date, duration_minutes, call_type, subject, notes, follow_up_required, follow_up_date, outcome)
VALUES
    ('n1234567-8901-2345-6789-012345678901', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1234567-8901-2345-6789-012345678901',
     '2024-01-10 10:30:00', 25, 'PHONE_INBOUND',
     'Interesse an 3-Zimmer-Wohnung in Berlin',
     'Herr Mueller hat sich nach der 3-Zimmer-Wohnung in Berlin Mitte erkundigt. Er möchte einen Besichtigungstermin vereinbaren. Bevorzugter Zeitraum: nächste Woche.',
     true, '2024-01-15', 'INTERESTED'),

    ('n2345678-9012-3456-7890-123456789012', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c2345678-9012-3456-7890-123456789012',
     '2024-01-12 14:00:00', 40, 'MEETING',
     'Besichtigung Einfamilienhaus München',
     'Frau Schmidt hat das Einfamilienhaus besichtigt. Sie war sehr angetan von der Lage und dem Garten. Weitere Überlegung notwendig, da Finanzierung noch nicht endgültig geklärt.',
     true, '2024-01-20', 'INTERESTED'),

    ('n3456789-0123-4567-8901-234567890123', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c3456789-0123-4567-8901-234567890123',
     '2024-01-15 09:15:00', 15, 'PHONE_OUTBOUND',
     'Folgegespräch Stadthaus Düsseldorf',
     'Herr Weber wurde über das neu verfügbare Stadthaus in Düsseldorf informiert. Er hat großes Interesse gezeigt und möchte weitere Details erhalten. Exposé wird per E-Mail zugesendet.',
     true, '2024-01-18', 'SCHEDULED_VIEWING'),

    ('n4567890-1234-5678-9012-345678901234', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1234567-8901-2345-6789-012345678901',
     '2024-01-16 11:00:00', 30, 'MEETING',
     'Vertragsunterzeichnung Berlin-Wohnung',
     'Herr Mueller hat den Kaufvertrag für die 3-Zimmer-Wohnung in Berlin Mitte unterschrieben. Notartermin wurde für den 15. Februar vereinbart. Anzahlung erfolgt nächste Woche.',
     false, NULL, 'DEAL_CLOSED'),

    ('n5678901-2345-6789-0123-456789012345', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c2345678-9012-3456-7890-123456789012',
     '2024-01-18 16:30:00', 20, 'EMAIL',
     'Zusätzliche Informationen zum Einfamilienhaus',
     'Frau Schmidt hat per E-Mail weitere Fragen zum Einfamilienhaus gestellt. Informationen zu Energieausweis, Grundriss und Nebenkosten wurden bereitgestellt. Wartet auf Rückmeldung bezüglich Finanzierungszusage.',
     true, '2024-01-25', 'INTERESTED');

-- Create view for call note summaries
CREATE VIEW v_call_note_summary AS
SELECT
    agent_id,
    client_id,
    COUNT(*) as total_notes,
    COUNT(CASE WHEN follow_up_required = true THEN 1 END) as pending_followups,
    MAX(call_date) as last_contact,
    SUM(duration_minutes) as total_contact_minutes,
    COUNT(CASE WHEN outcome = 'DEAL_CLOSED' THEN 1 END) as closed_deals,
    COUNT(CASE WHEN outcome = 'INTERESTED' THEN 1 END) as interested_clients
FROM call_notes
GROUP BY agent_id, client_id;
