package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.dto.CallNoteDto;
import com.marklerapp.crm.entity.CallNote;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.repository.CallNoteRepository;
import com.marklerapp.crm.repository.ClientRepository;
import com.marklerapp.crm.repository.AgentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing call note operations.
 * Handles CRUD operations and business logic for client communication tracking.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CallNoteService {

    private final CallNoteRepository callNoteRepository;
    private final ClientRepository clientRepository;
    private final AgentRepository agentRepository;

    /**
     * Create a new call note for a client
     */
    @Transactional
    public CallNoteDto.Response createCallNote(UUID agentId, CallNoteDto.CreateRequest request) {
        log.info("Creating call note for agent {} and client {}", agentId, request.getClientId());

        Agent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new ResourceNotFoundException("Agent not found with id: " + agentId));

        Client client = clientRepository.findById(request.getClientId())
            .orElseThrow(() -> new ResourceNotFoundException("Client not found with id: " + request.getClientId()));

        // Validate that the client belongs to the agent
        if (!client.getAgent().getId().equals(agentId)) {
            throw new IllegalArgumentException("Client does not belong to the specified agent");
        }

        CallNote callNote = CallNote.builder()
            .agent(agent)
            .client(client)
            .callDate(request.getCallDate())
            .durationMinutes(request.getDurationMinutes())
            .callType(request.getCallType())
            .subject(request.getSubject())
            .notes(request.getNotes())
            .followUpRequired(request.getFollowUpRequired() != null ? request.getFollowUpRequired() : false)
            .followUpDate(request.getFollowUpDate())
            .propertiesDiscussed(request.getPropertiesDiscussed())
            .outcome(request.getOutcome())
            .build();

        CallNote savedCallNote = callNoteRepository.save(callNote);
        log.info("Successfully created call note with id: {}", savedCallNote.getId());

        return convertToResponse(savedCallNote);
    }

    /**
     * Update an existing call note
     */
    @Transactional
    public CallNoteDto.Response updateCallNote(UUID agentId, UUID callNoteId, CallNoteDto.UpdateRequest request) {
        log.info("Updating call note {} for agent {}", callNoteId, agentId);

        CallNote existingCallNote = callNoteRepository.findById(callNoteId)
            .orElseThrow(() -> new ResourceNotFoundException("Call note not found with id: " + callNoteId));

        // Validate that the call note belongs to the agent
        if (!existingCallNote.getAgent().getId().equals(agentId)) {
            throw new IllegalArgumentException("Call note does not belong to the specified agent");
        }

        existingCallNote.setCallDate(request.getCallDate());
        existingCallNote.setDurationMinutes(request.getDurationMinutes());
        existingCallNote.setCallType(request.getCallType());
        existingCallNote.setSubject(request.getSubject());
        existingCallNote.setNotes(request.getNotes());
        existingCallNote.setFollowUpRequired(request.getFollowUpRequired() != null ? request.getFollowUpRequired() : false);
        existingCallNote.setFollowUpDate(request.getFollowUpDate());
        existingCallNote.setPropertiesDiscussed(request.getPropertiesDiscussed());
        existingCallNote.setOutcome(request.getOutcome());

        CallNote updatedCallNote = callNoteRepository.save(existingCallNote);
        log.info("Successfully updated call note with id: {}", updatedCallNote.getId());

        return convertToResponse(updatedCallNote);
    }

    /**
     * Get a call note by ID
     */
    @Transactional(readOnly = true)
    public CallNoteDto.Response getCallNote(UUID agentId, UUID callNoteId) {
        CallNote callNote = callNoteRepository.findById(callNoteId)
            .orElseThrow(() -> new ResourceNotFoundException("Call note not found with id: " + callNoteId));

        // Validate that the call note belongs to the agent
        if (!callNote.getAgent().getId().equals(agentId)) {
            throw new IllegalArgumentException("Call note does not belong to the specified agent");
        }

        return convertToResponse(callNote);
    }

    /**
     * Delete a call note
     */
    @Transactional
    public void deleteCallNote(UUID agentId, UUID callNoteId) {
        log.info("Deleting call note {} for agent {}", callNoteId, agentId);

        CallNote callNote = callNoteRepository.findById(callNoteId)
            .orElseThrow(() -> new ResourceNotFoundException("Call note not found with id: " + callNoteId));

        // Validate that the call note belongs to the agent
        if (!callNote.getAgent().getId().equals(agentId)) {
            throw new IllegalArgumentException("Call note does not belong to the specified agent");
        }

        callNoteRepository.delete(callNote);
        log.info("Successfully deleted call note with id: {}", callNoteId);
    }

    /**
     * Get all call notes for a specific client
     */
    @Transactional(readOnly = true)
    public Page<CallNoteDto.Summary> getCallNotesByClient(UUID agentId, UUID clientId, Pageable pageable) {
        Client client = clientRepository.findById(clientId)
            .orElseThrow(() -> new ResourceNotFoundException("Client not found with id: " + clientId));

        // Validate that the client belongs to the agent
        if (!client.getAgent().getId().equals(agentId)) {
            throw new IllegalArgumentException("Client does not belong to the specified agent");
        }

        Page<CallNote> callNotes = callNoteRepository.findByClientOrderByCallDateDesc(client, pageable);
        return callNotes.map(this::convertToSummary);
    }

    /**
     * Get all call notes for an agent
     */
    @Transactional(readOnly = true)
    public Page<CallNoteDto.Summary> getCallNotesByAgent(UUID agentId, Pageable pageable) {
        Agent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new ResourceNotFoundException("Agent not found with id: " + agentId));

        Page<CallNote> callNotes = callNoteRepository.findByAgentOrderByCallDateDesc(agent, pageable);
        return callNotes.map(this::convertToSummary);
    }

    /**
     * Search call notes by various criteria
     */
    @Transactional(readOnly = true)
    public Page<CallNoteDto.Summary> searchCallNotes(UUID agentId, CallNoteDto.SearchFilter filter, Pageable pageable) {
        Agent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new ResourceNotFoundException("Agent not found with id: " + agentId));

        if (filter.getSearchTerm() != null && !filter.getSearchTerm().trim().isEmpty()) {
            Page<CallNote> callNotes = callNoteRepository.findByAgentAndSearchTerm(agent, filter.getSearchTerm().trim(), pageable);
            return callNotes.map(this::convertToSummary);
        }

        // For more complex filtering, we would implement additional repository methods
        // For now, return all call notes for the agent
        return getCallNotesByAgent(agentId, pageable);
    }

    /**
     * Get follow-up reminders for an agent
     */
    @Transactional(readOnly = true)
    public List<CallNoteDto.FollowUpReminder> getFollowUpReminders(UUID agentId) {
        Agent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new ResourceNotFoundException("Agent not found with id: " + agentId));

        List<CallNote> followUpCallNotes = callNoteRepository.findCallNotesRequiringFollowUp()
            .stream()
            .filter(cn -> cn.getAgent().getId().equals(agentId))
            .collect(Collectors.toList());

        return followUpCallNotes.stream()
            .map(this::convertToFollowUpReminder)
            .collect(Collectors.toList());
    }

    /**
     * Get overdue follow-ups for an agent
     */
    @Transactional(readOnly = true)
    public List<CallNoteDto.FollowUpReminder> getOverdueFollowUps(UUID agentId) {
        List<CallNote> overdueCallNotes = callNoteRepository.findOverdueFollowUps(LocalDate.now())
            .stream()
            .filter(cn -> cn.getAgent().getId().equals(agentId))
            .collect(Collectors.toList());

        return overdueCallNotes.stream()
            .map(this::convertToFollowUpReminder)
            .collect(Collectors.toList());
    }

    /**
     * Get call notes summary for a client
     */
    @Transactional(readOnly = true)
    public CallNoteDto.BulkSummary getClientCallNotesSummary(UUID agentId, UUID clientId) {
        Client client = clientRepository.findById(clientId)
            .orElseThrow(() -> new ResourceNotFoundException("Client not found with id: " + clientId));

        // Validate that the client belongs to the agent
        if (!client.getAgent().getId().equals(agentId)) {
            throw new IllegalArgumentException("Client does not belong to the specified agent");
        }

        List<CallNote> allCallNotes = callNoteRepository.findByClientOrderByCallDateDesc(client);
        long totalCallNotes = allCallNotes.size();
        long pendingFollowUps = allCallNotes.stream()
            .filter(cn -> Boolean.TRUE.equals(cn.getFollowUpRequired()) && cn.getFollowUpDate() != null)
            .count();

        CallNote mostRecentCallNote = allCallNotes.isEmpty() ? null : allCallNotes.get(0);

        return CallNoteDto.BulkSummary.builder()
            .clientId(clientId)
            .clientName(client.getFirstName() + " " + client.getLastName())
            .totalCallNotes(totalCallNotes)
            .lastCallDate(mostRecentCallNote != null ? mostRecentCallNote.getCallDate() : null)
            .pendingFollowUps(pendingFollowUps)
            .mostRecentSubject(mostRecentCallNote != null ? mostRecentCallNote.getSubject() : null)
            .lastOutcome(mostRecentCallNote != null ? mostRecentCallNote.getOutcome() : null)
            .build();
    }

    /**
     * Convert CallNote entity to Response DTO
     */
    private CallNoteDto.Response convertToResponse(CallNote callNote) {
        return CallNoteDto.Response.builder()
            .id(callNote.getId())
            .agentId(callNote.getAgent().getId())
            .agentName(callNote.getAgent().getFirstName() + " " + callNote.getAgent().getLastName())
            .clientId(callNote.getClient().getId())
            .clientName(callNote.getClient().getFirstName() + " " + callNote.getClient().getLastName())
            .callDate(callNote.getCallDate())
            .durationMinutes(callNote.getDurationMinutes())
            .callType(callNote.getCallType())
            .subject(callNote.getSubject())
            .notes(callNote.getNotes())
            .followUpRequired(callNote.getFollowUpRequired())
            .followUpDate(callNote.getFollowUpDate())
            .propertiesDiscussed(callNote.getPropertiesDiscussed())
            .outcome(callNote.getOutcome())
            .createdAt(callNote.getCreatedAt())
            .updatedAt(callNote.getUpdatedAt())
            .build();
    }

    /**
     * Convert CallNote entity to Summary DTO
     */
    private CallNoteDto.Summary convertToSummary(CallNote callNote) {
        // Create a preview of the notes (first 150 characters)
        String notesSummary = null;
        if (callNote.getNotes() != null && !callNote.getNotes().isEmpty()) {
            notesSummary = callNote.getNotes().length() > 150
                ? callNote.getNotes().substring(0, 150) + "..."
                : callNote.getNotes();
        }

        return CallNoteDto.Summary.builder()
            .id(callNote.getId())
            .clientId(callNote.getClient().getId())
            .clientName(callNote.getClient().getFirstName() + " " + callNote.getClient().getLastName())
            .callDate(callNote.getCallDate())
            .callType(callNote.getCallType())
            .subject(callNote.getSubject())
            .notesSummary(notesSummary)
            .followUpRequired(callNote.getFollowUpRequired())
            .followUpDate(callNote.getFollowUpDate())
            .outcome(callNote.getOutcome())
            .createdAt(callNote.getCreatedAt())
            .build();
    }

    /**
     * Convert CallNote entity to FollowUpReminder DTO
     */
    private CallNoteDto.FollowUpReminder convertToFollowUpReminder(CallNote callNote) {
        LocalDate today = LocalDate.now();
        LocalDate followUpDate = callNote.getFollowUpDate();
        boolean isOverdue = followUpDate != null && followUpDate.isBefore(today);
        long daysUntilDue = followUpDate != null ? ChronoUnit.DAYS.between(today, followUpDate) : 0;

        return CallNoteDto.FollowUpReminder.builder()
            .id(callNote.getId())
            .clientId(callNote.getClient().getId())
            .clientName(callNote.getClient().getFirstName() + " " + callNote.getClient().getLastName())
            .subject(callNote.getSubject())
            .followUpDate(followUpDate)
            .isOverdue(isOverdue)
            .daysUntilDue(daysUntilDue)
            .build();
    }
}