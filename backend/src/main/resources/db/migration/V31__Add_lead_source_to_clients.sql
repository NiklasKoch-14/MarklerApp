-- Issue #41: Woher kam der Lead. Bewusst nullable und ohne Default -- ein Default waere
-- eine erfundene Angabe, und genau die wuerde die Kanal-Auswertung in /analytics wertlos
-- machen. Bestandskunden bleiben leer und tauchen dort als "ohne Angabe" auf.
ALTER TABLE clients ADD COLUMN lead_source VARCHAR(30);

COMMENT ON COLUMN clients.lead_source IS
    'Akquisekanal des Leads (REFERRAL, PORTAL, WEBSITE, WALK_IN, SOCIAL_MEDIA, SIGNAGE, COLD_OUTREACH, OTHER). NULL = nicht erfasst.';

-- Die Auswertung gruppiert je Makler nach Kanal; ohne diesen Index waere das ein Full Scan
-- ueber alle Kunden des Maklers bei jedem Aufruf von /analytics.
CREATE INDEX idx_clients_agent_lead_source ON clients(agent_id, lead_source);
