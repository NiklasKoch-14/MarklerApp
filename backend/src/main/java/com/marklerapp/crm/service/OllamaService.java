package com.marklerapp.crm.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.marklerapp.crm.config.OllamaConfig;
import com.marklerapp.crm.entity.CallNote;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class OllamaService {

    private final RestTemplate restTemplate;
    private final OllamaConfig ollamaConfig;
    private final ObjectMapper objectMapper;

    public OllamaService(OllamaConfig ollamaConfig, RestTemplateBuilder restTemplateBuilder, ObjectMapper objectMapper) {
        this.ollamaConfig = ollamaConfig;
        this.objectMapper = objectMapper;
        this.restTemplate = restTemplateBuilder
                .setConnectTimeout(Duration.ofMillis(ollamaConfig.getTimeout()))
                .setReadTimeout(Duration.ofMillis(ollamaConfig.getTimeout()))
                .build();
    }

    /**
     * Check if Ollama service is available
     */
    public boolean isAvailable() {
        if (!ollamaConfig.isEnabled()) {
            return false;
        }

        try {
            String healthUrl = ollamaConfig.getBaseUrl() + "/api/tags";
            ResponseEntity<String> response = restTemplate.getForEntity(healthUrl, String.class);
            return response.getStatusCode().is2xxSuccessful();
        } catch (Exception e) {
            log.warn("Ollama service is not available: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Generate AI summary for client call notes
     */
    public String generateCallNotesSummary(List<CallNote> callNotes, String clientName) {
        if (!ollamaConfig.isEnabled()) {
            throw new IllegalStateException("Ollama service is not enabled");
        }

        if (callNotes == null || callNotes.isEmpty()) {
            throw new IllegalArgumentException("No call notes provided for summarization");
        }

        // Build prompt with call notes
        String prompt = buildPrompt(callNotes, clientName);

        // Call Ollama API
        try {
            String generateUrl = ollamaConfig.getBaseUrl() + "/api/generate";

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", ollamaConfig.getModel());
            requestBody.put("prompt", prompt);
            requestBody.put("stream", false);
            requestBody.put("options", Map.of(
                "temperature", 0.7,
                "num_predict", ollamaConfig.getMaxTokens()
            ));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            log.info("Calling Ollama API at {} with model {}", generateUrl, ollamaConfig.getModel());
            ResponseEntity<String> response = restTemplate.postForEntity(generateUrl, request, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                // Parse response to extract generated text
                JsonNode jsonResponse = objectMapper.readTree(response.getBody());
                String summary = jsonResponse.get("response").asText();
                log.info("Successfully generated summary ({} chars)", summary.length());
                return summary;
            } else {
                throw new RuntimeException("Failed to generate summary: " + response.getStatusCode());
            }

        } catch (RestClientException e) {
            log.error("Error calling Ollama API", e);
            throw new RuntimeException("Ollama service is currently unavailable", e);
        } catch (Exception e) {
            log.error("Error generating summary", e);
            throw new RuntimeException("Failed to generate AI summary", e);
        }
    }

    /**
     * Build prompt for AI summarization
     */
    private String buildPrompt(List<CallNote> callNotes, String clientName) {
        StringBuilder prompt = new StringBuilder();

        prompt.append("Analysiere die folgenden Gesprächsnotizen für Kunde '").append(clientName)
              .append("' und erstelle eine objektive, faktenbasierte Zusammenfassung auf Deutsch.\n\n");

        prompt.append("WICHTIGE ANFORDERUNGEN:\n");
        prompt.append("- Bleibe strikt bei den dokumentierten Fakten\n");
        prompt.append("- Spekuliere NICHT über Absichten oder Motive\n");
        prompt.append("- Verwende nur Informationen aus den Notizen\n");
        prompt.append("- Gib keine Interpretation oder Bewertung ab\n");
        prompt.append("- Beschreibe nur, was tatsächlich gesagt oder getan wurde\n\n");

        prompt.append("Strukturiere die Zusammenfassung wie folgt:\n");
        prompt.append("1. Dokumentierte Interessen (nur konkret genannte)\n");
        prompt.append("2. Vereinbarte oder angeforderte Follow-up-Aktionen\n");
        prompt.append("3. Chronologischer Verlauf der Gespräche\n");
        prompt.append("4. Nächste konkrete Schritte (falls dokumentiert)\n\n");

        prompt.append("Gesprächsnotizen:\n");
        prompt.append("================\n\n");

        DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");
        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("dd.MM.yyyy");

        for (int i = 0; i < callNotes.size(); i++) {
            CallNote note = callNotes.get(i);
            prompt.append(String.format("Notiz %d (%s):\n", i + 1, note.getCallDate().format(dateTimeFormatter)));
            prompt.append(String.format("Typ: %s\n", note.getCallType()));
            prompt.append(String.format("Ergebnis: %s\n", note.getOutcome() != null ? note.getOutcome() : "Nicht angegeben"));
            prompt.append(String.format("Inhalt: %s\n", note.getNotes()));

            if (note.getProperty() != null && note.getProperty().getTitle() != null) {
                prompt.append(String.format("Bezug zu Immobilie: %s\n", note.getProperty().getTitle()));
            }

            if (note.getFollowUpRequired() && note.getFollowUpDate() != null) {
                prompt.append(String.format("Follow-up bis: %s\n", note.getFollowUpDate().format(dateFormatter)));
            }

            prompt.append("\n---\n\n");
        }

        prompt.append("Erstelle eine prägnante, objektive Zusammenfassung auf Deutsch (maximal 300 Wörter). ");
        prompt.append("Nutze nur die dokumentierten Fakten ohne Interpretation.");

        return prompt.toString();
    }
}
