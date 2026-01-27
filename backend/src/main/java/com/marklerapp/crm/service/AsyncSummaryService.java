package com.marklerapp.crm.service;

import com.marklerapp.crm.entity.CallNote;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.repository.CallNoteRepository;
import com.marklerapp.crm.repository.ClientRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Service for asynchronous AI summary generation.
 * Generates and persists AI summaries in the background when call notes are modified.
 */
@Service
@Slf4j
public class AsyncSummaryService {

    private final OllamaService ollamaService;
    private final CallNoteRepository callNoteRepository;
    private final ClientRepository clientRepository;

    public AsyncSummaryService(
            OllamaService ollamaService,
            CallNoteRepository callNoteRepository,
            ClientRepository clientRepository
    ) {
        this.ollamaService = ollamaService;
        this.callNoteRepository = callNoteRepository;
        this.clientRepository = clientRepository;
    }

    /**
     * Asynchronously generate and persist AI summary for a client.
     * This method runs in the background and updates the client's AI summary field.
     *
     * @param clientId The ID of the client to generate summary for
     */
    @Async("taskExecutor")
    @Transactional
    public void generateAndPersistSummary(UUID clientId) {
        try {
            log.info("Starting async AI summary generation for client {}", clientId);

            // Check if Ollama is available
            if (!ollamaService.isAvailable()) {
                log.warn("Ollama service not available, skipping AI summary generation for client {}", clientId);
                return;
            }

            // Fetch client
            Client client = clientRepository.findById(clientId)
                    .orElseThrow(() -> new RuntimeException("Client not found: " + clientId));

            // Fetch all call notes for this client
            List<CallNote> callNotes = callNoteRepository.findByClientOrderByCallDateDesc(client);

            if (callNotes.isEmpty()) {
                log.info("No call notes found for client {}, clearing AI summary", clientId);
                client.setAiSummary(null);
                client.setAiSummaryUpdatedAt(null);
                clientRepository.save(client);
                return;
            }

            // Generate AI summary
            String clientName = client.getFullName();
            String summary = ollamaService.generateCallNotesSummary(callNotes, clientName);

            // Persist summary
            client.setAiSummary(summary);
            client.setAiSummaryUpdatedAt(LocalDateTime.now());
            clientRepository.save(client);

            log.info("Successfully generated and persisted AI summary for client {} ({} chars)",
                    clientId, summary.length());

        } catch (Exception e) {
            log.error("Failed to generate AI summary for client {}: {}", clientId, e.getMessage(), e);
            // Don't throw - we don't want to fail the call note save operation
        }
    }
}
