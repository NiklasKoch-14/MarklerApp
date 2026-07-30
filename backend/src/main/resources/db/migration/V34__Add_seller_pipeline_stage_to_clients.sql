-- Issue #38: Eigene Akquise-Pipeline fuer Verkaeufer. Die Kaeufer-Stufen (PROSPECT,
-- ACTIVE_SEARCH, VIEWING, WON, LOST) beschreiben den Zustand eines Eigentuemers nicht --
-- "Aktive Suche" ergibt fuer jemanden, der sein Haus verkauft, keinen Sinn.
--
-- Bewusst eine zweite Spalte statt gemeinsamer Stufen: die Trennung ist fachlich echt,
-- und ein Enum mit allen Werten wuerde ungueltige Kombinationen technisch erlauben.
-- Fuer Kaeufer/Mieter bleibt die Spalte NULL; pipeline_stage bleibt fuer alle gefuellt,
-- damit die bestehende NOT-NULL-Zusage und die Kaeufer-Auswertungen unberuehrt bleiben.
ALTER TABLE clients ADD COLUMN seller_pipeline_stage VARCHAR(20);

COMMENT ON COLUMN clients.seller_pipeline_stage IS
    'Akquise-Stufe eines Eigentuemers (LEAD, VALUATION, PITCH, MANDATE, SOLD, LOST). NULL fuer BUYER/RENTER.';

-- Bestandsverkaeufer bekommen eine Startstufe, die sich aus der bisherigen Kaeufer-Stufe
-- ableiten laesst. Abgeschlossen bleibt abgeschlossen, verloren bleibt verloren; alles
-- dazwischen startet als LEAD, weil sich VALUATION/PITCH/MANDATE aus den alten Stufen
-- nicht rekonstruieren lassen und ein geratener Fortschritt schlechter waere als keiner.
UPDATE clients
SET seller_pipeline_stage = CASE pipeline_stage
        WHEN 'WON'  THEN 'SOLD'
        WHEN 'LOST' THEN 'LOST'
        ELSE 'LEAD'
    END
WHERE client_type = 'SELLER';

-- Das Verkaeufer-Kanban laedt je Makler nach Stufe -- ohne Index ein Full Scan pro Aufruf.
CREATE INDEX idx_clients_agent_seller_stage ON clients(agent_id, seller_pipeline_stage);
