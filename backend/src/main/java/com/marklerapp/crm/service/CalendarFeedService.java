package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.Viewing;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.repository.ViewingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

/**
 * Read-only ICS-Feed der Besichtigungen (Issue #34).
 *
 * <p>Bewusst einseitig: keine Schreibrichtung, kein OAuth, keine Einladungen an Kunden.
 * Eine vollwertige Google-/Outlook-Integration loest dasselbe Problem mit einem
 * Vielfachen des Aufwands.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CalendarFeedService {

    /** UTC-Zeitstempel nach RFC 5545, Form 2 (mit Z-Suffix). */
    private static final DateTimeFormatter ICS_UTC =
            DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");

    /** Die App fuehrt Termine als LocalDateTime ohne Zone; fachlich sind das deutsche Ortszeiten. */
    private static final ZoneId APP_ZONE = ZoneId.of("Europe/Berlin");

    /** Fallback, wenn am Termin keine Dauer gepflegt ist. */
    private static final int DEFAULT_DURATION_MINUTES = 60;

    /** Wie weit zurueck der Feed reicht. Kalender-Clients laden alles, jedes Mal. */
    private static final int HISTORY_DAYS = 90;
    private static final int FUTURE_DAYS = 365;

    private static final SecureRandom RANDOM = new SecureRandom();

    private final AgentRepository agentRepository;
    private final ViewingRepository viewingRepository;

    /**
     * Token des Maklers, beim ersten Aufruf erzeugt. Kein Token auf Vorrat fuer alle
     * Agents -- das waere ein unbenutztes Geheimnis in der Datenbank.
     */
    @Transactional
    public String getOrCreateFeedToken(UUID agentId) {
        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));
        if (agent.getCalendarFeedToken() == null) {
            agent.setCalendarFeedToken(generateToken());
            agentRepository.save(agent);
            log.info("Calendar feed token created for agent {}", agentId);
        }
        return agent.getCalendarFeedToken();
    }

    /** Neu erzeugen ist der Widerruf: der alte Link liefert danach 404. */
    @Transactional
    public String rotateFeedToken(UUID agentId) {
        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));
        agent.setCalendarFeedToken(generateToken());
        agentRepository.save(agent);
        log.info("Calendar feed token rotated for agent {}", agentId);
        return agent.getCalendarFeedToken();
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /**
     * Der Feed zu einem Token. Wirft {@link ResourceNotFoundException}, wenn der Token
     * nicht (mehr) gilt -- bewusst dieselbe Antwort wie fuer einen erfundenen Token,
     * damit sich gueltige Tokens nicht durch Antwortunterschiede finden lassen.
     */
    @Transactional(readOnly = true)
    public String generateFeed(String token) {
        Agent agent = agentRepository.findActiveByCalendarFeedToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Calendar feed not found"));

        LocalDateTime from = LocalDateTime.now().minusDays(HISTORY_DAYS);
        LocalDateTime to = LocalDateTime.now().plusDays(FUTURE_DAYS);
        List<Viewing> viewings = viewingRepository.findByAgentAndViewingDateBetween(agent, from, to);

        StringBuilder ics = new StringBuilder();
        ics.append("BEGIN:VCALENDAR\r\n")
           .append("VERSION:2.0\r\n")
           .append("PRODID:-//MarklerApp//Besichtigungen//DE\r\n")
           .append("CALSCALE:GREGORIAN\r\n")
           .append("METHOD:PUBLISH\r\n");
        // X-WR-CALNAME ist kein Standard, aber der einzige Weg, dem Abo in iOS,
        // Google und Outlook einen lesbaren Namen zu geben.
        appendLine(ics, "X-WR-CALNAME:" + escape("Besichtigungen – MarklerApp"));
        appendLine(ics, "X-WR-TIMEZONE:" + APP_ZONE.getId());

        for (Viewing v : viewings) {
            appendEvent(ics, v);
        }

        ics.append("END:VCALENDAR\r\n");
        return ics.toString();
    }

    private void appendEvent(StringBuilder ics, Viewing v) {
        if (v.getViewingDate() == null) return;

        LocalDateTime start = v.getViewingDate();
        int duration = v.getDurationMinutes() != null && v.getDurationMinutes() > 0
                ? v.getDurationMinutes()
                : DEFAULT_DURATION_MINUTES;

        ics.append("BEGIN:VEVENT\r\n");
        // UID aus der Viewing-ID: der Client erkennt Aenderungen als Update statt
        // bei jedem Abruf einen zweiten Termin anzulegen.
        appendLine(ics, "UID:viewing-" + v.getId() + "@marklerapp");
        appendLine(ics, "DTSTAMP:" + toUtc(LocalDateTime.now()));
        appendLine(ics, "DTSTART:" + toUtc(start));
        appendLine(ics, "DTEND:" + toUtc(start.plusMinutes(duration)));
        appendLine(ics, "SUMMARY:" + escape(buildSummary(v)));

        String location = buildLocation(v.getProperty());
        if (location != null) {
            appendLine(ics, "LOCATION:" + escape(location));
        }

        String description = buildDescription(v);
        if (description != null) {
            appendLine(ics, "DESCRIPTION:" + escape(description));
        }

        // Abgesagte Termine werden als CANCELLED ausgeliefert statt weggelassen --
        // sonst bleiben sie im Kalender des Maklers stehen, weil ein fehlendes
        // VEVENT fuer den Client keine Loeschung ist.
        appendLine(ics, "STATUS:" + switch (v.getStatus()) {
            case CANCELLED -> "CANCELLED";
            case COMPLETED -> "CONFIRMED";
            case SCHEDULED -> "TENTATIVE";
        });

        ics.append("END:VEVENT\r\n");
    }

    private String buildSummary(Viewing v) {
        String property = v.getProperty() != null ? v.getProperty().getTitle() : null;
        String client = v.getClient() != null ? v.getClient().getFullName() : null;
        if (property != null && client != null) return "Besichtigung: " + property + " – " + client;
        if (property != null) return "Besichtigung: " + property;
        if (client != null) return "Besichtigung: " + client;
        return "Besichtigung";
    }

    private String buildLocation(Property p) {
        if (p == null) return null;
        StringBuilder sb = new StringBuilder();
        if (p.getAddressStreet() != null) {
            sb.append(p.getAddressStreet());
            if (p.getAddressHouseNumber() != null) sb.append(' ').append(p.getAddressHouseNumber());
        }
        if (p.getAddressPostalCode() != null || p.getAddressCity() != null) {
            if (sb.length() > 0) sb.append(", ");
            if (p.getAddressPostalCode() != null) sb.append(p.getAddressPostalCode()).append(' ');
            if (p.getAddressCity() != null) sb.append(p.getAddressCity());
        }
        return sb.length() > 0 ? sb.toString().trim() : null;
    }

    private String buildDescription(Viewing v) {
        StringBuilder sb = new StringBuilder();
        if (v.getClient() != null && v.getClient().getPhone() != null) {
            sb.append("Telefon: ").append(v.getClient().getPhone()).append('\n');
        }
        if (v.getClientNotes() != null && !v.getClientNotes().isBlank()) {
            sb.append(v.getClientNotes()).append('\n');
        }
        if (v.getFollowUpAction() != null && !v.getFollowUpAction().isBlank()) {
            sb.append("Nachfassen: ").append(v.getFollowUpAction());
        }
        String out = sb.toString().trim();
        return out.isEmpty() ? null : out;
    }

    private String toUtc(LocalDateTime local) {
        return local.atZone(APP_ZONE).withZoneSameInstant(ZoneOffset.UTC).format(ICS_UTC);
    }

    /**
     * Escaping nach RFC 5545 Abschnitt 3.3.11. Reihenfolge zaehlt: der Backslash
     * zuerst, sonst verdoppelt der Schritt die gerade eingefuegten Escapes wieder.
     */
    private String escape(String value) {
        return value
                .replace("\\", "\\\\")
                .replace(";", "\\;")
                .replace(",", "\\,")
                .replace("\r\n", "\\n")
                .replace("\n", "\\n");
    }

    /**
     * Zeilenfaltung nach RFC 5545 Abschnitt 3.1: Zeilen duerfen 75 Oktetts nicht
     * ueberschreiten. Fortsetzungszeilen beginnen mit einem Leerzeichen. Ohne das
     * verwerfen strenge Clients (Outlook) den ganzen Termin.
     */
    private void appendLine(StringBuilder ics, String line) {
        byte[] bytes = line.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        if (bytes.length <= 75) {
            ics.append(line).append("\r\n");
            return;
        }
        int start = 0;
        boolean first = true;
        while (start < bytes.length) {
            // 75 bzw. 74 Oktetts, aber nie mitten in einem Mehrbyte-Zeichen trennen.
            int budget = first ? 75 : 74;
            int end = Math.min(start + budget, bytes.length);
            while (end > start && (bytes[end - 1] & 0xC0) == 0x80) end--;
            if (end == start) end = Math.min(start + budget, bytes.length);
            String chunk = new String(bytes, start, end - start, java.nio.charset.StandardCharsets.UTF_8);
            ics.append(first ? "" : " ").append(chunk).append("\r\n");
            start = end;
            first = false;
        }
    }
}
