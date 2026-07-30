-- Issue #39: Auftragsdaten pro Objekt. Sie gehoeren fachlich an die Beziehung
-- Eigentuemer<->Objekt und nicht an den Kunden -- ein Eigentuemer kann mehrere Objekte
-- mit unterschiedlichen Auftraegen haben.
--
-- Alle Spalten nullable und ohne Default: ein Objekt steht oft im CRM, bevor ein Auftrag
-- existiert, und ein vorbelegtes mandate_type waere eine erfundene Vertragsangabe.
ALTER TABLE properties ADD COLUMN mandate_type VARCHAR(25);
ALTER TABLE properties ADD COLUMN mandate_start DATE;
ALTER TABLE properties ADD COLUMN mandate_end DATE;
ALTER TABLE properties ADD COLUMN owner_price_expectation NUMERIC(12,2);
ALTER TABLE properties ADD COLUMN commission_seller_percent NUMERIC(5,2);
ALTER TABLE properties ADD COLUMN commission_buyer_percent NUMERIC(5,2);

COMMENT ON COLUMN properties.mandate_type IS
    'Auftragsart (EXCLUSIVE_QUALIFIED, EXCLUSIVE, SIMPLE, NONE). NULL = nicht erfasst.';
COMMENT ON COLUMN properties.owner_price_expectation IS
    'Wunschpreis des Eigentuemers in EUR. Differenz zu price ist die Grundlage des Preisgespraechs.';
COMMENT ON COLUMN properties.commission_seller_percent IS
    'Innenprovision in Prozent (zahlt der Eigentuemer). Nicht zu verwechseln mit properties.commission, das einen Eurobetrag fuers Expose fuehrt.';
COMMENT ON COLUMN properties.commission_buyer_percent IS
    'Aussenprovision in Prozent (zahlt der Kaeufer).';

-- Auslaufende Alleinauftraege sind der klassische stille Umsatzverlust; die Warnung
-- fragt je Makler nach dem Enddatum. Partiell, weil nur mandatierte Objekte ein
-- Enddatum haben und der Index sonst fast nur NULLs traegt.
CREATE INDEX idx_properties_agent_mandate_end
    ON properties(agent_id, mandate_end)
    WHERE mandate_end IS NOT NULL;
