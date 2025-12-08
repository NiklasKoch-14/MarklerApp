package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.entity.CallNote;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.repository.CallNoteRepository;
import com.marklerapp.crm.repository.ClientRepository;
import com.marklerapp.crm.repository.AgentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for generating automated summaries of call notes.
 * Provides functionality to create comprehensive communication summaries.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CallNoteSummaryService {

    private final CallNoteRepository callNoteRepository;
    private final ClientRepository clientRepository;
    private final AgentRepository agentRepository;

    /**
     * Generate a comprehensive summary of all call notes for a specific client
     */
    @Transactional(readOnly = true)
    public String generateClientSummary(UUID agentId, UUID clientId) {
        log.info("Generating call notes summary for agent {} and client {}", agentId, clientId);

        // Validate agent and client
        Agent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new ResourceNotFoundException("Agent not found with id: " + agentId));

        Client client = clientRepository.findById(clientId)
            .orElseThrow(() -> new ResourceNotFoundException("Client not found with id: " + clientId));

        // Validate that the client belongs to the agent
        if (!client.getAgent().getId().equals(agentId)) {
            throw new IllegalArgumentException("Client does not belong to the specified agent");
        }

        List<CallNote> callNotes = callNoteRepository.findByClientOrderByCallDateDesc(client);

        if (callNotes.isEmpty()) {
            return generateEmptySummary(client);
        }

        return generateDetailedSummary(client, callNotes);
    }

    /**
     * Generate a summary for a specific date range
     */
    @Transactional(readOnly = true)
    public String generatePeriodSummary(UUID agentId, UUID clientId, LocalDateTime startDate, LocalDateTime endDate) {
        log.info("Generating period summary for client {} from {} to {}", clientId, startDate, endDate);

        // Validate agent and client
        Agent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new ResourceNotFoundException("Agent not found with id: " + agentId));

        Client client = clientRepository.findById(clientId)
            .orElseThrow(() -> new ResourceNotFoundException("Client not found with id: " + clientId));

        // Validate that the client belongs to the agent
        if (!client.getAgent().getId().equals(agentId)) {
            throw new IllegalArgumentException("Client does not belong to the specified agent");
        }

        List<CallNote> callNotes = callNoteRepository.findByClientAndCallDateBetween(client, startDate, endDate);

        if (callNotes.isEmpty()) {
            return generateEmptyPeriodSummary(client, startDate, endDate);
        }

        return generatePeriodDetailedSummary(client, callNotes, startDate, endDate);
    }

    /**
     * Generate a quick summary (key highlights only)
     */
    @Transactional(readOnly = true)
    public String generateQuickSummary(UUID agentId, UUID clientId) {
        log.info("Generating quick summary for agent {} and client {}", agentId, clientId);

        // Validate agent and client
        Agent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new ResourceNotFoundException("Agent not found with id: " + agentId));

        Client client = clientRepository.findById(clientId)
            .orElseThrow(() -> new ResourceNotFoundException("Client not found with id: " + clientId));

        // Validate that the client belongs to the agent
        if (!client.getAgent().getId().equals(agentId)) {
            throw new IllegalArgumentException("Client does not belong to the specified agent");
        }

        List<CallNote> callNotes = callNoteRepository.findByClientOrderByCallDateDesc(client);

        if (callNotes.isEmpty()) {
            return generateEmptyQuickSummary(client);
        }

        return generateCondensedSummary(client, callNotes);
    }

    /**
     * Generate activity timeline summary
     */
    @Transactional(readOnly = true)
    public String generateTimelineSummary(UUID agentId, UUID clientId) {
        log.info("Generating timeline summary for agent {} and client {}", agentId, clientId);

        // Validate agent and client
        Agent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new ResourceNotFoundException("Agent not found with id: " + agentId));

        Client client = clientRepository.findById(clientId)
            .orElseThrow(() -> new ResourceNotFoundException("Client not found with id: " + clientId));

        // Validate that the client belongs to the agent
        if (!client.getAgent().getId().equals(agentId)) {
            throw new IllegalArgumentException("Client does not belong to the specified agent");
        }

        List<CallNote> callNotes = callNoteRepository.findByClientOrderByCallDateDesc(client);

        return generateTimelineFormat(client, callNotes);
    }

    /**
     * Generate summary when no call notes exist
     */
    private String generateEmptySummary(Client client) {
        return String.format("""
            === COMMUNICATION SUMMARY ===
            Client: %s %s
            Email: %s
            Phone: %s

            === OVERVIEW ===
            No communication records found for this client.

            === RECOMMENDATIONS ===
            • Schedule initial consultation call
            • Send welcome information package
            • Gather property search preferences
            """,
            client.getFirstName(), client.getLastName(),
            client.getEmail() != null ? client.getEmail() : "Not provided",
            client.getPhone() != null ? client.getPhone() : "Not provided");
    }

    /**
     * Generate comprehensive detailed summary
     */
    private String generateDetailedSummary(Client client, List<CallNote> callNotes) {
        StringBuilder summary = new StringBuilder();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

        // Header
        summary.append("=== COMMUNICATION SUMMARY ===\n");
        summary.append(String.format("Client: %s %s\n", client.getFirstName(), client.getLastName()));
        summary.append(String.format("Email: %s\n", client.getEmail() != null ? client.getEmail() : "Not provided"));
        summary.append(String.format("Phone: %s\n", client.getPhone() != null ? client.getPhone() : "Not provided"));
        summary.append(String.format("Generated: %s\n\n", LocalDateTime.now().format(formatter)));

        // Statistics
        Map<CallNote.CallType, Long> typeStats = callNotes.stream()
            .collect(Collectors.groupingBy(CallNote::getCallType, Collectors.counting()));

        Map<CallNote.CallOutcome, Long> outcomeStats = callNotes.stream()
            .filter(cn -> cn.getOutcome() != null)
            .collect(Collectors.groupingBy(CallNote::getOutcome, Collectors.counting()));

        long totalFollowUps = callNotes.stream()
            .filter(cn -> Boolean.TRUE.equals(cn.getFollowUpRequired()))
            .count();

        OptionalDouble avgDuration = callNotes.stream()
            .filter(cn -> cn.getDurationMinutes() != null)
            .mapToInt(CallNote::getDurationMinutes)
            .average();

        summary.append("=== STATISTICS ===\n");
        summary.append(String.format("Total Communications: %d\n", callNotes.size()));
        summary.append(String.format("Follow-ups Required: %d\n", totalFollowUps));
        summary.append(String.format("Average Duration: %.1f minutes\n", avgDuration.orElse(0.0)));
        summary.append(String.format("First Contact: %s\n", callNotes.get(callNotes.size() - 1).getCallDate().format(formatter)));
        summary.append(String.format("Last Contact: %s\n\n", callNotes.get(0).getCallDate().format(formatter)));

        // Communication Types Breakdown
        summary.append("=== COMMUNICATION TYPES ===\n");
        typeStats.forEach((type, count) ->
            summary.append(String.format("• %s: %d\n", formatCallType(type), count)));
        summary.append("\n");

        // Outcomes Breakdown
        if (!outcomeStats.isEmpty()) {
            summary.append("=== OUTCOMES ===\n");
            outcomeStats.forEach((outcome, count) ->
                summary.append(String.format("• %s: %d\n", formatOutcome(outcome), count)));
            summary.append("\n");
        }

        // Recent Activity (last 5 call notes)
        summary.append("=== RECENT ACTIVITY ===\n");
        callNotes.stream()
            .limit(5)
            .forEach(callNote -> {
                summary.append(String.format("📅 %s (%s)\n",
                    callNote.getCallDate().format(formatter),
                    formatCallType(callNote.getCallType())));
                summary.append(String.format("📋 %s\n", callNote.getSubject()));
                summary.append(String.format("📝 %s\n",
                    callNote.getNotes().length() > 100 ?
                    callNote.getNotes().substring(0, 100) + "..." :
                    callNote.getNotes()));
                if (callNote.getOutcome() != null) {
                    summary.append(String.format("🎯 Outcome: %s\n", formatOutcome(callNote.getOutcome())));
                }
                summary.append("\n");
            });

        // Follow-up Actions
        List<CallNote> pendingFollowUps = callNotes.stream()
            .filter(cn -> Boolean.TRUE.equals(cn.getFollowUpRequired()) && cn.getFollowUpDate() != null)
            .collect(Collectors.toList());

        if (!pendingFollowUps.isEmpty()) {
            summary.append("=== PENDING FOLLOW-UPS ===\n");
            pendingFollowUps.forEach(callNote -> {
                summary.append(String.format("⏰ Due: %s\n", callNote.getFollowUpDate()));
                summary.append(String.format("📋 %s\n", callNote.getSubject()));
                summary.append("\n");
            });
        }

        // Recommendations
        summary.append("=== RECOMMENDATIONS ===\n");
        if (pendingFollowUps.isEmpty()) {
            summary.append("• Schedule regular follow-up communication\n");
        }

        if (outcomeStats.containsKey(CallNote.CallOutcome.INTERESTED)) {
            summary.append("• Client shows interest - prioritize property matching\n");
        }

        if (!outcomeStats.containsKey(CallNote.CallOutcome.SCHEDULED_VIEWING)) {
            summary.append("• Consider scheduling property viewings\n");
        }

        summary.append("• Maintain regular communication schedule\n");

        return summary.toString();
    }

    /**
     * Generate period-specific detailed summary
     */
    private String generatePeriodDetailedSummary(Client client, List<CallNote> callNotes, LocalDateTime startDate, LocalDateTime endDate) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd.MM.yyyy");

        StringBuilder summary = new StringBuilder();
        summary.append(String.format("=== COMMUNICATION SUMMARY (%s - %s) ===\n",
            startDate.format(formatter), endDate.format(formatter)));
        summary.append(String.format("Client: %s %s\n", client.getFirstName(), client.getLastName()));
        summary.append(String.format("Period Activity: %d communications\n\n", callNotes.size()));

        // Activity details
        callNotes.forEach(callNote -> {
            summary.append(String.format("📅 %s (%s)\n",
                callNote.getCallDate().format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm")),
                formatCallType(callNote.getCallType())));
            summary.append(String.format("📋 %s\n", callNote.getSubject()));
            if (callNote.getOutcome() != null) {
                summary.append(String.format("🎯 Outcome: %s\n", formatOutcome(callNote.getOutcome())));
            }
            summary.append("\n");
        });

        return summary.toString();
    }

    /**
     * Generate empty period summary
     */
    private String generateEmptyPeriodSummary(Client client, LocalDateTime startDate, LocalDateTime endDate) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd.MM.yyyy");

        return String.format("""
            === COMMUNICATION SUMMARY (%s - %s) ===
            Client: %s %s

            No communication records found for this period.

            === RECOMMENDATIONS ===
            • Schedule client check-in call
            • Send market update information
            • Follow up on previous inquiries
            """,
            startDate.format(formatter), endDate.format(formatter),
            client.getFirstName(), client.getLastName());
    }

    /**
     * Generate empty quick summary
     */
    private String generateEmptyQuickSummary(Client client) {
        return String.format("No communication history for %s %s. Schedule initial consultation.",
            client.getFirstName(), client.getLastName());
    }

    /**
     * Generate condensed summary
     */
    private String generateCondensedSummary(Client client, List<CallNote> callNotes) {
        CallNote latestCall = callNotes.get(0);
        long totalCalls = callNotes.size();
        long pendingFollowUps = callNotes.stream()
            .filter(cn -> Boolean.TRUE.equals(cn.getFollowUpRequired()))
            .count();

        return String.format("""
            %s %s - %d total communications
            Latest: %s (%s)
            Subject: %s
            Pending follow-ups: %d
            """,
            client.getFirstName(), client.getLastName(), totalCalls,
            latestCall.getCallDate().format(DateTimeFormatter.ofPattern("dd.MM.yyyy")),
            formatCallType(latestCall.getCallType()),
            latestCall.getSubject(),
            pendingFollowUps);
    }

    /**
     * Generate timeline format summary
     */
    private String generateTimelineFormat(Client client, List<CallNote> callNotes) {
        if (callNotes.isEmpty()) {
            return String.format("No communication timeline available for %s %s",
                client.getFirstName(), client.getLastName());
        }

        StringBuilder timeline = new StringBuilder();
        timeline.append(String.format("=== COMMUNICATION TIMELINE: %s %s ===\n\n",
            client.getFirstName(), client.getLastName()));

        callNotes.stream()
            .sorted(Comparator.comparing(CallNote::getCallDate))
            .forEach(callNote -> {
                timeline.append(String.format("│ %s\n",
                    callNote.getCallDate().format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"))));
                timeline.append(String.format("├─ %s: %s\n",
                    formatCallType(callNote.getCallType()), callNote.getSubject()));
                if (callNote.getOutcome() != null) {
                    timeline.append(String.format("└─ Result: %s\n", formatOutcome(callNote.getOutcome())));
                }
                timeline.append("│\n");
            });

        return timeline.toString();
    }

    /**
     * Format call type for display
     */
    private String formatCallType(CallNote.CallType type) {
        return switch (type) {
            case PHONE_INBOUND -> "Incoming Call";
            case PHONE_OUTBOUND -> "Outgoing Call";
            case EMAIL -> "Email";
            case MEETING -> "Meeting";
            case OTHER -> "Other";
        };
    }

    /**
     * Format outcome for display
     */
    private String formatOutcome(CallNote.CallOutcome outcome) {
        return switch (outcome) {
            case INTERESTED -> "Interested";
            case NOT_INTERESTED -> "Not Interested";
            case SCHEDULED_VIEWING -> "Viewing Scheduled";
            case OFFER_MADE -> "Offer Made";
            case DEAL_CLOSED -> "Deal Closed";
        };
    }
}