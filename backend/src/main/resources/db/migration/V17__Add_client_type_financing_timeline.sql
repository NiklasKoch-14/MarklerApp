ALTER TABLE clients
    ADD COLUMN client_type       VARCHAR(20)  NOT NULL DEFAULT 'BUYER',
    ADD COLUMN financing_status  VARCHAR(30)  NOT NULL DEFAULT 'UNKNOWN',
    ADD COLUMN move_in_timeline  VARCHAR(20)  NOT NULL DEFAULT 'FLEXIBLE';

CREATE INDEX idx_clients_client_type ON clients(client_type);
CREATE INDEX idx_clients_agent_type  ON clients(agent_id, client_type);
