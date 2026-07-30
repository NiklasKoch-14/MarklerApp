package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.Viewing;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.repository.ViewingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * ICS-Feed (Issue #34). Formatfehler faellt sonst erst im Kalender-Client des
 * Maklers auf -- und dort als "Abo funktioniert nicht", ohne Fehlermeldung.
 */
@ExtendWith(MockitoExtension.class)
class CalendarFeedServiceTest {

    @Mock private AgentRepository agentRepository;
    @Mock private ViewingRepository viewingRepository;

    private CalendarFeedService service;
    private Agent agent;
    private static final String TOKEN = "test-token-abc";

    @BeforeEach
    void setUp() {
        service = new CalendarFeedService(agentRepository, viewingRepository);
        agent = Agent.builder().firstName("Max").lastName("Makler").email("max@example.com").build();
        agent.setId(UUID.randomUUID());
        agent.setCalendarFeedToken(TOKEN);
    }

    private Property property(String title) {
        Property p = Property.builder()
                .agent(agent).title(title)
                .addressStreet("Hauptstraße").addressHouseNumber("12")
                .addressPostalCode("53111").addressCity("Bonn")
                .build();
        p.setId(UUID.randomUUID());
        return p;
    }

    private Viewing viewing(LocalDateTime date, Viewing.ViewingStatus status,
                            Property property, String notes) {
        Client c = Client.builder().agent(agent).firstName("Anna").lastName("Andermatt").phone("0151 1").build();
        c.setId(UUID.randomUUID());
        Viewing v = Viewing.builder()
                .agent(agent).client(c).property(property)
                .viewingDate(date).durationMinutes(45).status(status).clientNotes(notes)
                .build();
        v.setId(UUID.randomUUID());
        return v;
    }

    private String feed(List<Viewing> viewings) {
        when(agentRepository.findActiveByCalendarFeedToken(TOKEN)).thenReturn(Optional.of(agent));
        lenient().when(viewingRepository.findByAgentAndViewingDateBetween(any(), any(), any()))
                .thenReturn(viewings);
        return service.generateFeed(TOKEN);
    }

    @Test
    void feed_HasValidEnvelopeAndCrlfLineEndings() {
        String ics = feed(List.of());

        assertThat(ics).startsWith("BEGIN:VCALENDAR\r\n");
        assertThat(ics).endsWith("END:VCALENDAR\r\n");
        assertThat(ics).contains("VERSION:2.0\r\n");
        // RFC 5545 verlangt CRLF. Ein blankes \n laesst strenge Clients das Abo verwerfen.
        assertThat(ics.replace("\r\n", "")).doesNotContain("\n");
    }

    @Test
    void event_CarriesTimesLocationAndStableUid() {
        Viewing v = viewing(LocalDateTime.of(2026, 3, 10, 14, 0),
                Viewing.ViewingStatus.SCHEDULED, property("Reihenhaus"), null);

        String ics = feed(List.of(v));

        // 14:00 Berliner Zeit im Maerz (MEZ, UTC+1) -> 13:00 UTC
        assertThat(ics).contains("DTSTART:20260310T130000Z");
        // 45 Minuten Dauer
        assertThat(ics).contains("DTEND:20260310T134500Z");
        assertThat(ics).contains("LOCATION:Hauptstraße 12\\, 53111 Bonn");
        // UID aus der Viewing-ID: der Client erkennt Updates statt zu duplizieren
        assertThat(ics).contains("UID:viewing-" + v.getId() + "@marklerapp");
    }

    @Test
    void summerTime_ShiftsByTwoHours() {
        // Ohne echte Zonenumrechnung waeren alle Sommertermine eine Stunde daneben.
        Viewing v = viewing(LocalDateTime.of(2026, 7, 10, 14, 0),
                Viewing.ViewingStatus.SCHEDULED, property("Villa"), null);

        assertThat(feed(List.of(v))).contains("DTSTART:20260710T120000Z");
    }

    @Test
    void cancelledViewing_IsDeliveredAsCancelledNotOmitted() {
        Viewing v = viewing(LocalDateTime.of(2026, 3, 10, 9, 0),
                Viewing.ViewingStatus.CANCELLED, property("Wohnung"), null);

        String ics = feed(List.of(v));

        // Weglassen wuerde den Termin im Kalender stehen lassen -- ein fehlendes
        // VEVENT ist fuer den Client keine Loeschung.
        assertThat(ics).contains("BEGIN:VEVENT");
        assertThat(ics).contains("STATUS:CANCELLED");
    }

    @Test
    void specialCharacters_AreEscapedPerRfc5545() {
        Viewing v = viewing(LocalDateTime.of(2026, 3, 10, 9, 0),
                Viewing.ViewingStatus.SCHEDULED,
                property("Haus; mit, Zeichen"),
                "Zeile eins\nZeile zwei");

        String ics = feed(List.of(v));

        assertThat(ics).contains("Haus\\; mit\\, Zeichen");
        assertThat(ics).contains("Zeile eins\\nZeile zwei");
    }

    @Test
    void longLines_AreFoldedToSeventyFiveOctets() {
        Viewing v = viewing(LocalDateTime.of(2026, 3, 10, 9, 0),
                Viewing.ViewingStatus.SCHEDULED,
                property("Sehr langer Objekttitel ".repeat(8)), null);

        String ics = feed(List.of(v));

        for (String line : ics.split("\r\n")) {
            assertThat(line.getBytes(StandardCharsets.UTF_8).length)
                    .as("Zeile ueberschreitet 75 Oktetts: %s", line)
                    .isLessThanOrEqualTo(75);
        }
        // Fortsetzungszeilen beginnen mit einem Leerzeichen
        assertThat(ics).contains("\r\n ");
    }

    @Test
    void unknownToken_IsNotFound() {
        when(agentRepository.findActiveByCalendarFeedToken("falsch")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.generateFeed("falsch"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void rotateToken_ProducesADifferentUnguessableToken() {
        when(agentRepository.findById(agent.getId())).thenReturn(Optional.of(agent));
        when(agentRepository.save(any(Agent.class))).thenReturn(agent);

        String rotated = service.rotateFeedToken(agent.getId());

        assertThat(rotated).isNotEqualTo(TOKEN);
        // 32 Byte Base64-URL ohne Padding = 43 Zeichen
        assertThat(rotated).hasSize(43);
        assertThat(rotated).matches("[A-Za-z0-9_-]+");
    }
}
