-- Issue #34: Besichtigungen als ICS-Feed im Handy-Kalender des Maklers.
--
-- Der Feed braucht eine eigene, langlebige Authentifizierung: Kalender-Clients
-- (iOS, Google, Outlook) koennen keinen Authorization-Header setzen, ein JWT
-- scheidet also aus. Der Token IST die Authentifizierung -- deshalb nullable
-- (wird beim ersten Abruf des Abos erzeugt, nicht auf Vorrat fuer alle Agents),
-- unique, und lang genug, um nicht erratbar zu sein (32 Byte Base64-URL = 43 Zeichen).
ALTER TABLE agents ADD COLUMN calendar_feed_token VARCHAR(64);

ALTER TABLE agents ADD CONSTRAINT uq_agents_calendar_feed_token UNIQUE (calendar_feed_token);

COMMENT ON COLUMN agents.calendar_feed_token IS
    'Langlebiger Token fuer den oeffentlichen ICS-Kalenderfeed. NULL = Abo noch nie erzeugt. Neu erzeugen macht den alten Link ungueltig.';
