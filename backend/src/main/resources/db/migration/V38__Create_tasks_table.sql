-- Aufgaben als eigenes Objekt (Issue #33). Bis hierher hing die Tagesliste an
-- CallNote.follow_up_required/-date; damit war eine Aufgabe ohne Telefonat nicht
-- erfassbar und ein Objektbezug gar nicht.
CREATE TABLE tasks (
    id                  UUID PRIMARY KEY,
    agent_id            UUID         NOT NULL,
    client_id           UUID,
    property_id         UUID,
    title               VARCHAR(200) NOT NULL,
    description         VARCHAR(2000),
    due_date            DATE         NOT NULL,
    status              VARCHAR(16)  NOT NULL,
    completed_at        TIMESTAMP,
    source_call_note_id UUID,
    created_at          TIMESTAMP    NOT NULL,
    updated_at          TIMESTAMP    NOT NULL,
    FOREIGN KEY (agent_id)            REFERENCES agents(id)     ON DELETE CASCADE,
    FOREIGN KEY (client_id)           REFERENCES clients(id)    ON DELETE CASCADE,
    FOREIGN KEY (property_id)         REFERENCES properties(id) ON DELETE CASCADE,
    -- Die Aufgabe ueberlebt das Loeschen ihrer Quell-Notiz: die Arbeit bleibt zu tun,
    -- auch wenn die Notiz weg ist.
    FOREIGN KEY (source_call_note_id) REFERENCES call_notes(id) ON DELETE SET NULL
);

-- Bedient die einzige heisse Abfrage: was ist fuer diesen Agenten offen und faellig.
CREATE INDEX idx_tasks_agent_due      ON tasks (agent_id, status, due_date);
CREATE INDEX idx_tasks_client_id      ON tasks (client_id);
CREATE INDEX idx_tasks_property_id    ON tasks (property_id);
CREATE INDEX idx_tasks_source_note    ON tasks (source_call_note_id);

-- Die Spiegelung aus einer Gespraechsnotiz erlaubt hoechstens eine offene Aufgabe je Notiz;
-- findOpenBySourceCallNoteId liefert ein Optional und wuerde sonst zur Laufzeit fliegen.
CREATE UNIQUE INDEX idx_tasks_one_open_per_note
    ON tasks (source_call_note_id)
    WHERE status = 'OPEN' AND source_call_note_id IS NOT NULL;

-- Backfill: jedes offene Follow-up wird eine Aufgabe. Ohne diesen Schritt verschwaende
-- die Umstellung die Arbeitsliste, an der Nutzer heute haengen.
INSERT INTO tasks (id, agent_id, client_id, property_id, title, due_date, status,
                   source_call_note_id, created_at, updated_at)
SELECT gen_random_uuid(),
       cn.agent_id,
       cn.client_id,
       cn.property_id,
       COALESCE(NULLIF(TRIM(cn.subject), ''), 'Rückruf'),
       cn.follow_up_date,
       'OPEN',
       cn.id,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM call_notes cn
WHERE cn.follow_up_required = true
  AND cn.follow_up_date IS NOT NULL;

-- Das Loeschprotokoll muss vollstaendig bleiben (DSGVO): eine geloeschte Aufgabe,
-- die nirgends gezaehlt ist, macht den Nachweis unvollstaendig.
-- Tabellenname korrigiert ggue. dem Brief: die tatsaechliche Tabelle (siehe V26) heisst
-- im Plural "client_deletion_audit_logs".
ALTER TABLE client_deletion_audit_logs
    ADD COLUMN deleted_tasks_count INTEGER NOT NULL DEFAULT 0;
