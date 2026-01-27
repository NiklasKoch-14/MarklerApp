package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.dto.AiSummaryDto;
import com.marklerapp.crm.dto.CallNoteDto;
import com.marklerapp.crm.entity.CallNote;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyType;
import com.marklerapp.crm.entity.ListingType;
import com.marklerapp.crm.mapper.CallNoteMapper;
import com.marklerapp.crm.repository.CallNoteRepository;
import com.marklerapp.crm.repository.ClientRepository;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
    private final PropertyRepository propertyRepository;
    private final OllamaService ollamaService;
    private final AsyncSummaryService asyncSummaryService;
    private final CallNoteMapper callNoteMapper;

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

        // Fetch property if propertyId is provided
        Property property = null;
        if (request.getPropertyId() != null) {
            property = propertyRepository.findById(request.getPropertyId())
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + request.getPropertyId()));

            // Validate that the property belongs to the agent
            if (!property.getAgent().getId().equals(agentId)) {
                throw new IllegalArgumentException("Property does not belong to the specified agent");
            }
        }

        CallNote callNote = CallNote.builder()
            .agent(agent)
            .client(client)
            .property(property)
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

        // Trigger async AI summary generation
        asyncSummaryService.generateAndPersistSummary(client.getId());

        return callNoteMapper.toResponse(savedCallNote);
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

        // Update property if propertyId is provided
        if (request.getPropertyId() != null) {
            Property property = propertyRepository.findById(request.getPropertyId())
                .orElseThrow(() -> new ResourceNotFoundException("Property not found with id: " + request.getPropertyId()));

            // Validate that the property belongs to the agent
            if (!property.getAgent().getId().equals(agentId)) {
                throw new IllegalArgumentException("Property does not belong to the specified agent");
            }
            existingCallNote.setProperty(property);
        } else {
            existingCallNote.setProperty(null);
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

        // Trigger async AI summary generation
        asyncSummaryService.generateAndPersistSummary(updatedCallNote.getClient().getId());

        return callNoteMapper.toResponse(updatedCallNote);
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

        return callNoteMapper.toResponse(callNote);
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

        UUID clientId = callNote.getClient().getId();
        callNoteRepository.delete(callNote);
        log.info("Successfully deleted call note with id: {}", callNoteId);

        // Trigger async AI summary generation
        asyncSummaryService.generateAndPersistSummary(clientId);
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
        return callNotes.map(callNoteMapper::toSummary);
    }

    /**
     * Get all call notes for an agent
     */
    @Transactional(readOnly = true)
    public Page<CallNoteDto.Summary> getCallNotesByAgent(UUID agentId, Pageable pageable) {
        Agent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new ResourceNotFoundException("Agent not found with id: " + agentId));

        Page<CallNote> callNotes = callNoteRepository.findByAgentOrderByCallDateDesc(agent, pageable);
        return callNotes.map(callNoteMapper::toSummary);
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
            return callNotes.map(callNoteMapper::toSummary);
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
            .map(callNoteMapper::toFollowUpReminder)
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
            .map(callNoteMapper::toFollowUpReminder)
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
     * Get agent's properties for call note form dropdown
     */
    @Transactional(readOnly = true)
    public List<PropertySummaryDto> getAgentProperties(UUID agentId) {
        Agent agent = agentRepository.findById(agentId)
            .orElseThrow(() -> new ResourceNotFoundException("Agent not found with id: " + agentId));

        List<Property> properties = propertyRepository.findByAgentOrderByCreatedAtDesc(agent);

        return properties.stream()
            .map(p -> PropertySummaryDto.builder()
                .id(p.getId())
                .title(p.getTitle())
                .address(p.getAddressCity() + ", " + p.getAddressPostalCode())
                .propertyType(p.getPropertyType())
                .listingType(p.getListingType())
                .build())
            .collect(Collectors.toList());
    }

    /**
     * Get AI summary for client's call notes from database.
     * Summary is automatically generated in background when call notes are created/updated/deleted.
     */
    @Transactional(readOnly = true)
    public AiSummaryDto generateAiSummary(UUID clientId, UUID agentId) {
        // Verify client belongs to agent
        Client client = clientRepository.findById(clientId)
            .orElseThrow(() -> new ResourceNotFoundException("Client not found with id: " + clientId));

        if (!client.getAgent().getId().equals(agentId)) {
            throw new IllegalArgumentException("Not authorized to access this client's call notes");
        }

        // Get all call notes for the client (for count)
        List<CallNote> callNotes = callNoteRepository.findByClientOrderByCallDateDesc(client);

        if (callNotes.isEmpty()) {
            throw new IllegalArgumentException("No call notes found for this client");
        }

        // Return stored summary from database
        if (client.getAiSummary() != null && client.getAiSummaryUpdatedAt() != null) {
            return AiSummaryDto.builder()
                    .summary(client.getAiSummary())
                    .generatedAt(client.getAiSummaryUpdatedAt())
                    .callNotesCount(callNotes.size())
                    .available(true)
                    .build();
        }

        // If no summary exists yet, trigger async generation and return pending message
        asyncSummaryService.generateAndPersistSummary(clientId);

        return AiSummaryDto.builder()
                .summary("AI-Zusammenfassung wird gerade generiert. Bitte aktualisieren Sie die Seite in wenigen Sekunden.")
                .generatedAt(LocalDateTime.now())
                .callNotesCount(callNotes.size())
                .available(false)
                .build();
    }

    /**
     * DTO for property summary in dropdowns
     */
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class PropertySummaryDto {
        private UUID id;
        private String title;
        private String address;
        private PropertyType propertyType;
        private ListingType listingType;
    }
}
