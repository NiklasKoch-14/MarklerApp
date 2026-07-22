-- Issue #23: Die kategorisierte Notiz-Liste (property_notes) wird durch das bereits
-- vorhandene properties.notes ersetzt. properties.notes war bisher nur im Formular
-- befuellbar und wurde auf der Detailseite nie angezeigt — nach dem Umbau ist es das
-- eine interne Notizfeld, das beide Stellen bedienen.
--
-- Bestehende Notizen werden chronologisch zusammengefuehrt statt verworfen. Ein bereits
-- vorhandener properties.notes-Text bleibt oben stehen, die uebernommenen Eintraege
-- folgen mit ihrem Erstellungsdatum als Zeile davor.
UPDATE properties p
SET notes = NULLIF(
        TRIM(BOTH E'\n' FROM
            COALESCE(NULLIF(TRIM(COALESCE(p.notes, '')), '') || E'\n\n', '') || merged.content
        ),
        ''
    )
FROM (
    SELECT property_id,
           string_agg(
               TO_CHAR(created_at, 'DD.MM.YYYY') || E'\n' || content,
               E'\n\n' ORDER BY created_at
           ) AS content
    FROM property_notes
    GROUP BY property_id
) AS merged
WHERE p.id = merged.property_id;

DROP TABLE property_notes;
