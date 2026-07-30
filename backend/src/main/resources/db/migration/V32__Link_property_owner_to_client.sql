-- Issue #37: Der Eigentümer einer Immobilie war bisher Freitext (owner_name/owner_phone/
-- owner_email) und damit kein Kontakt: keine Gesprächshistorie, keine Follow-ups und --
-- der eigentliche Punkt -- kein DSGVO-Pfad, weil Freitextfelder weder im Auskunftsexport
-- noch im Löschprotokoll auftauchen. Ab hier zeigt properties.owner_client_id auf einen
-- echten Client mit client_type = 'SELLER'.
--
-- Die drei alten Spalten bleiben absichtlich erhalten (Sicherheitsnetz für den Backfill)
-- und werden von der Anwendung nicht mehr geschrieben. Ein späteres DROP ist eine eigene,
-- bewusst getrennte Migration.

ALTER TABLE properties ADD COLUMN IF NOT EXISTS owner_client_id UUID;

-- ON DELETE SET NULL: das Löschen eines Kunden ist ein DSGVO-Vorgang und darf niemals an
-- einer verknüpften Immobilie scheitern. Die Anwendung löst die Verknüpfung zusätzlich
-- explizit (ClientService.deleteClient), damit der Persistenzkontext konsistent bleibt --
-- die FK-Regel ist die Absicherung auf DB-Ebene.
ALTER TABLE properties
    ADD CONSTRAINT fk_properties_owner_client
    FOREIGN KEY (owner_client_id) REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_properties_owner_client ON properties(owner_client_id);

COMMENT ON COLUMN properties.owner_client_id IS
    'Verknüpfter Eigentümer (Client, client_type=SELLER). Ersetzt owner_name/owner_phone/owner_email.';

-- ────────────────────────────────────────────────────────────────────────────────────
-- Backfill: pro Objekt mit gesetztem owner_name einen SELLER-Client anlegen und
-- verknüpfen. Zusammengeführt wird über E-Mail bzw. normalisierte Telefonnummer -- aber
-- immer nur innerhalb desselben agent_id, sonst würde die Mandantentrennung brechen.
--
-- Die Schleife läuft bewusst zeilenweise statt als Mengen-UPDATE: jeder neu angelegte
-- Client ist sofort Kandidat für die Zusammenführung des nächsten Objekts, sodass drei
-- Objekte desselben Eigentümers am Ende einen einzigen Kontakt haben.
--
-- Ein bereits bestehender Kontakt behält seinen client_type. Ein Käufer, der zusätzlich
-- verkauft, würde sonst sein Suchprofil-Matching verlieren -- die Verknüpfung als
-- Eigentümer hängt am Objekt, nicht am Typ.
DO $$
DECLARE
    r           RECORD;
    v_client_id UUID;
    v_name      TEXT;
    v_first     TEXT;
    v_last      TEXT;
    v_email     TEXT;
    v_phone     TEXT;
    v_cut       INT;
BEGIN
    FOR r IN
        SELECT id, agent_id, owner_name, owner_email, owner_phone
        FROM properties
        WHERE owner_client_id IS NULL
          AND owner_name IS NOT NULL
          AND btrim(owner_name) <> ''
        ORDER BY created_at, id
    LOOP
        v_name  := btrim(r.owner_name);
        v_email := NULLIF(lower(btrim(COALESCE(r.owner_email, ''))), '');

        -- Telefon-Normalisierung: nur Ziffern, dann Länderkennung/Verkehrsausscheidungs-
        -- ziffer abschneiden, damit "+49 89 12345", "0049 89 12345" und "089 12345"
        -- als dieselbe Nummer erkannt werden.
        v_phone := NULLIF(regexp_replace(COALESCE(r.owner_phone, ''), '[^0-9]', '', 'g'), '');
        IF v_phone IS NOT NULL THEN
            v_phone := NULLIF(regexp_replace(v_phone, '^(0049|49|0)', ''), '');
        END IF;

        v_client_id := NULL;

        IF v_email IS NOT NULL THEN
            SELECT c.id INTO v_client_id
            FROM clients c
            WHERE c.agent_id = r.agent_id
              AND lower(btrim(COALESCE(c.email, ''))) = v_email
            ORDER BY c.created_at, c.id
            LIMIT 1;
        END IF;

        IF v_client_id IS NULL AND v_phone IS NOT NULL THEN
            SELECT c.id INTO v_client_id
            FROM clients c
            WHERE c.agent_id = r.agent_id
              AND NULLIF(
                    regexp_replace(
                        regexp_replace(COALESCE(c.phone, ''), '[^0-9]', '', 'g'),
                        '^(0049|49|0)', ''),
                    '') = v_phone
            ORDER BY c.created_at, c.id
            LIMIT 1;
        END IF;

        IF v_client_id IS NULL THEN
            -- Namensaufteilung am letzten Leerzeichen: "Hans Peter Müller" -> "Hans Peter"
            -- + "Müller". Ohne Leerzeichen (Firmenname, nur Nachname) wandert der ganze
            -- Wert in last_name; first_name ist NOT NULL, also steht dort "k.A.". Der
            -- Originalwert bleibt zusätzlich in properties.owner_name erhalten.
            v_cut := position(' ' in reverse(v_name));
            IF v_cut > 0 THEN
                v_first := btrim(substring(v_name from 1 for length(v_name) - v_cut));
                v_last  := btrim(substring(v_name from length(v_name) - v_cut + 2));
            ELSE
                v_first := 'k.A.';
                v_last  := v_name;
            END IF;

            IF v_first = '' THEN v_first := 'k.A.'; END IF;
            IF v_last  = '' THEN v_last  := v_name; END IF;

            INSERT INTO clients (
                id, agent_id, first_name, last_name, email, phone,
                address_country, client_type, financing_status, move_in_timeline,
                pipeline_stage, gdpr_consent_given, legal_basis, created_at, updated_at
            )
            VALUES (
                gen_random_uuid(), r.agent_id,
                left(v_first, 100), left(v_last, 100),
                NULLIF(btrim(COALESCE(r.owner_email, '')), ''),
                NULLIF(btrim(COALESCE(r.owner_phone, '')), ''),
                'Deutschland', 'SELLER', 'UNKNOWN', 'FLEXIBLE',
                -- PROSPECT statt WON: ob der Auftrag zustande kam, weiß die Migration
                -- nicht. Die Akquise-Pipeline (#38) setzt hier später auf.
                'PROSPECT', false,
                -- Rechtsgrundlage Art. 6(1)(b) DSGVO -- die Eigentümerdaten wurden zur
                -- Anbahnung des Maklervertrags erhoben, eine Einwilligung lag nie vor.
                'CONTRACT_INITIATION',
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            )
            RETURNING id INTO v_client_id;
        END IF;

        UPDATE properties SET owner_client_id = v_client_id WHERE id = r.id;
    END LOOP;
END $$;
