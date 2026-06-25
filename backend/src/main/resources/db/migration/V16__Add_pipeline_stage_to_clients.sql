ALTER TABLE clients ADD COLUMN pipeline_stage VARCHAR(30) NOT NULL DEFAULT 'PROSPECT';
CREATE INDEX idx_clients_pipeline_stage ON clients(pipeline_stage);
CREATE INDEX idx_clients_agent_stage ON clients(agent_id, pipeline_stage);
