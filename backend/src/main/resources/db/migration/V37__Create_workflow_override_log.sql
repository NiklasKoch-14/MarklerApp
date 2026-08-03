-- Protokoll uebersteuerter Workflow-Warnungen (Issue #46).
-- Zweck ist nicht Revision, sondern Regelpflege: wird eine Warnung von fast allen
-- Nutzern weggeklickt, ist die Regel falsch gewaehlt und nicht der Nutzer.
CREATE TABLE workflow_override_log (
    id          UUID PRIMARY KEY,
    rule_code   VARCHAR(64)  NOT NULL,
    entity_type VARCHAR(32)  NOT NULL,
    entity_id   UUID         NOT NULL,
    agent_id    UUID         NOT NULL,
    created_at  TIMESTAMP    NOT NULL
);

CREATE INDEX idx_workflow_override_rule_code ON workflow_override_log (rule_code);
CREATE INDEX idx_workflow_override_agent ON workflow_override_log (agent_id, created_at);
