-- Issue #22: Deal-/Provisionswert pro Kanban-Spalte. Der Wert haengt am Client und wird
-- vom Makler gepflegt, nicht aus einer zugeordneten Immobilie abgeleitet -- ein
-- abgeleiteter Wert wuerde springen, sobald sich das Matching aendert, und bliebe leer,
-- solange kein Objekt zugeordnet ist.
--
-- Bewusst ab der ersten Pipeline-Stufe befuellbar (Schaetzung), nicht erst bei WON:
-- sonst stuende in jeder Spalte ausser "Gewonnen" eine Null und die Spaltensumme, um
-- die es in diesem Issue geht, waere wertlos.
ALTER TABLE clients ADD COLUMN expected_commission NUMERIC(12,2);

COMMENT ON COLUMN clients.expected_commission IS
    'Geschaetzte Provision in EUR, vom Makler gepflegt. Ab Interessent-Stufe erlaubt.';
