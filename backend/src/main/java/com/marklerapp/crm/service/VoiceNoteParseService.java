package com.marklerapp.crm.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marklerapp.crm.config.AnthropicProperties;
import com.marklerapp.crm.entity.CallNote;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.marklerapp.crm.dto.CallNoteDto;

import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.Locale;
import java.util.Map;

/**
 * Turns a free-form dictated German transcript into a structured call note draft
 * using the Claude API. Speech-to-text happens on the device (Web Speech API);
 * only the text transcript reaches this service — no audio is stored or sent.
 *
 * Disabled unless ANTHROPIC_API_KEY is set — the frontend hides the mic flow
 * gracefully when the parse endpoint responds 503.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VoiceNoteParseService {

    private static final String ANTHROPIC_API_URL = "https://api.anthropic.com";
    private static final String ANTHROPIC_VERSION = "2023-06-01";

    private final AnthropicProperties props;
    private final ObjectMapper objectMapper;

    public boolean isEnabled() {
        return props.isConfigured();
    }

    public CallNoteDto.VoiceDraft parseTranscript(String transcript) {
        if (!isEnabled()) {
            throw new IllegalStateException("Voice note parsing is not configured (ANTHROPIC_API_KEY missing)");
        }

        String responseText = callClaude(transcript);
        return toDraft(responseText, transcript);
    }

    private String callClaude(String transcript) {
        RestClient client = RestClient.builder()
            .baseUrl(ANTHROPIC_API_URL)
            .defaultHeader("x-api-key", props.getApiKey())
            .defaultHeader("anthropic-version", ANTHROPIC_VERSION)
            .build();

        Map<String, Object> body = Map.of(
            "model", props.getModel(),
            "max_tokens", props.getMaxTokens(),
            "system", buildSystemPrompt(),
            "messages", new Object[]{ Map.of("role", "user", "content", transcript) }
        );

        JsonNode response = client.post()
            .uri("/v1/messages")
            .contentType(MediaType.APPLICATION_JSON)
            .body(body)
            .retrieve()
            .body(JsonNode.class);

        if (response == null || !response.has("content") || response.get("content").isEmpty()) {
            throw new IllegalStateException("Claude API returned an empty response");
        }
        return response.get("content").get(0).path("text").asText();
    }

    private String buildSystemPrompt() {
        LocalDate today = LocalDate.now();
        String weekday = today.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.GERMAN);
        return """
            Du strukturierst diktierte Gesprächsnotizen eines deutschen Immobilienmaklers.
            Heute ist %s, der %s.

            Antworte AUSSCHLIESSLICH mit einem JSON-Objekt (kein Markdown, keine Erklärung):
            {
              "subject": "Kurzer Betreff, 5-200 Zeichen, z.B. 'Besichtigungstermin Wohnung Schwabing vereinbart'",
              "notes": "Aufgeräumte Zusammenfassung des Diktats in ganzen Sätzen, 10-5000 Zeichen. Alle Fakten behalten (Namen, Objekte, Preise, Termine), Füllwörter entfernen.",
              "callType": "PHONE_OUTBOUND|PHONE_INBOUND|EMAIL|MEETING|OTHER",
              "outcome": "INTERESTED|NOT_INTERESTED|SCHEDULED_VIEWING|OFFER_MADE|DEAL_CLOSED oder null wenn unklar",
              "followUpRequired": true/false,
              "followUpDate": "YYYY-MM-DD oder null — relative Angaben wie 'Freitag' oder 'nächste Woche' anhand des heutigen Datums auflösen, immer in der Zukunft",
              "durationMinutes": Zahl oder null wenn nicht erwähnt
            }

            Regeln:
            - Sprache der notes: Deutsch.
            - callType: 'hat angerufen' → PHONE_INBOUND; 'habe angerufen' oder unklar → PHONE_OUTBOUND; Treffen/Besichtigung als Gesprächskanal → MEETING.
            - outcome SCHEDULED_VIEWING nur wenn ein Besichtigungstermin vereinbart wurde.
            - followUpRequired true wenn der Makler etwas erledigen oder sich melden soll (Exposé schicken, zurückrufen, ...).
            """.formatted(weekday, today);
    }

    private CallNoteDto.VoiceDraft toDraft(String responseText, String transcript) {
        try {
            String json = stripCodeFences(responseText);
            JsonNode node = objectMapper.readTree(json);

            CallNoteDto.VoiceDraft draft = CallNoteDto.VoiceDraft.builder()
                .subject(textOrNull(node, "subject"))
                .notes(textOrNull(node, "notes"))
                .callType(enumOrDefault(node, "callType", CallNote.CallType.class, CallNote.CallType.PHONE_OUTBOUND))
                .outcome(enumOrDefault(node, "outcome", CallNote.CallOutcome.class, null))
                .followUpRequired(node.path("followUpRequired").asBoolean(false))
                .followUpDate(dateOrNull(node, "followUpDate"))
                .durationMinutes(node.hasNonNull("durationMinutes") ? node.get("durationMinutes").asInt() : null)
                .build();

            // Entity validation demands subject >= 5 and notes >= 10 chars — pad defensively
            if (draft.getSubject() == null || draft.getSubject().length() < 5) {
                draft.setSubject("Gesprächsnotiz");
            }
            if (draft.getNotes() == null || draft.getNotes().length() < 10) {
                draft.setNotes(transcript);
            }
            // A follow-up date in the past would be rejected by the entity — drop it
            if (draft.getFollowUpDate() != null && draft.getFollowUpDate().isBefore(LocalDate.now())) {
                draft.setFollowUpDate(null);
            }
            return draft;
        } catch (Exception e) {
            log.warn("Could not parse Claude response into a call note draft, falling back to raw transcript", e);
            return CallNoteDto.VoiceDraft.builder()
                .subject("Gesprächsnotiz")
                .notes(transcript)
                .callType(CallNote.CallType.PHONE_OUTBOUND)
                .followUpRequired(false)
                .build();
        }
    }

    private String stripCodeFences(String text) {
        String trimmed = text.trim();
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            int lastFence = trimmed.lastIndexOf("```");
            if (firstNewline >= 0 && lastFence > firstNewline) {
                return trimmed.substring(firstNewline + 1, lastFence).trim();
            }
        }
        return trimmed;
    }

    private String textOrNull(JsonNode node, String field) {
        return node.hasNonNull(field) ? node.get(field).asText() : null;
    }

    private LocalDate dateOrNull(JsonNode node, String field) {
        if (!node.hasNonNull(field)) return null;
        try {
            return LocalDate.parse(node.get(field).asText());
        } catch (Exception e) {
            return null;
        }
    }

    private <E extends Enum<E>> E enumOrDefault(JsonNode node, String field, Class<E> type, E fallback) {
        if (!node.hasNonNull(field)) return fallback;
        try {
            return Enum.valueOf(type, node.get(field).asText().trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return fallback;
        }
    }
}
