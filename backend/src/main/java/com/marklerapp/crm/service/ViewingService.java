package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.dto.ViewingDto;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.Viewing;
import com.marklerapp.crm.mapper.ViewingMapper;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.repository.ClientRepository;
import com.marklerapp.crm.repository.PropertyRepository;
import com.marklerapp.crm.repository.ViewingRepository;
import com.marklerapp.crm.rules.ViewingChange;
import com.marklerapp.crm.rules.WorkflowGuard;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ViewingService {

    private static final LocalDateTime OPEN_RANGE_START = LocalDateTime.of(1900, 1, 1, 0, 0);
    private static final LocalDateTime OPEN_RANGE_END = LocalDateTime.of(2999, 12, 31, 23, 59);

    private final ViewingRepository viewingRepository;
    private final ClientRepository clientRepository;
    private final AgentRepository agentRepository;
    private final PropertyRepository propertyRepository;
    private final ViewingMapper viewingMapper;
    private final OwnershipValidator ownershipValidator;
    private final WorkflowGuard workflowGuard;

    @Transactional
    public ViewingDto.Response createViewing(UUID agentId, ViewingDto.CreateRequest request) {
        log.info("Creating viewing for agent {} client {} property {}", agentId, request.getClientId(), request.getPropertyId());

        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent not found: " + agentId));

        Client client = clientRepository.findById(request.getClientId())
                .orElseThrow(() -> new ResourceNotFoundException("Client not found: " + request.getClientId()));
        try {
            ownershipValidator.validateClientOwnership(client, agentId);
        } catch (AccessDeniedException e) {
            throw new IllegalArgumentException("Client does not belong to the specified agent");
        }

        Property property = propertyRepository.findById(request.getPropertyId())
                .orElseThrow(() -> new ResourceNotFoundException("Property not found: " + request.getPropertyId()));
        try {
            ownershipValidator.validatePropertyOwnership(property, agentId);
        } catch (AccessDeniedException e) {
            throw new IllegalArgumentException("Property does not belong to the specified agent");
        }

        workflowGuard.check(
                new ViewingChange(null, property, request.getViewingDate(), Viewing.ViewingStatus.SCHEDULED),
                request.getAcknowledgedRules());

        Viewing viewing = Viewing.builder()
                .agent(agent)
                .client(client)
                .property(property)
                .viewingDate(request.getViewingDate())
                .durationMinutes(request.getDurationMinutes())
                .status(Viewing.ViewingStatus.SCHEDULED)
                .feedback(request.getFeedback())
                .clientNotes(request.getClientNotes())
                .followUpAction(request.getFollowUpAction())
                .build();

        Viewing saved = viewingRepository.save(viewing);
        log.info("Viewing {} created successfully", saved.getId());
        return viewingMapper.toResponse(saved);
    }

    @Transactional
    public ViewingDto.Response updateViewing(UUID agentId, UUID viewingId, ViewingDto.UpdateRequest request) {
        Viewing viewing = viewingRepository.findByIdWithDetails(viewingId)
                .orElseThrow(() -> new ResourceNotFoundException("Viewing not found: " + viewingId));
        ownershipValidator.validateViewingOwnership(viewing, agentId);

        Viewing.ViewingStatus targetStatus =
                request.getStatus() != null ? request.getStatus() : viewing.getStatus();
        workflowGuard.check(
                new ViewingChange(viewing, viewing.getProperty(), request.getViewingDate(), targetStatus),
                request.getAcknowledgedRules());

        viewing.setViewingDate(request.getViewingDate());
        if (request.getDurationMinutes() != null) viewing.setDurationMinutes(request.getDurationMinutes());
        if (request.getStatus() != null) viewing.setStatus(request.getStatus());
        viewing.setFeedback(request.getFeedback());
        viewing.setClientNotes(request.getClientNotes());
        viewing.setFollowUpAction(request.getFollowUpAction());

        return viewingMapper.toResponse(viewingRepository.save(viewing));
    }

    @Transactional
    public void deleteViewing(UUID agentId, UUID viewingId) {
        Viewing viewing = viewingRepository.findByIdWithDetails(viewingId)
                .orElseThrow(() -> new ResourceNotFoundException("Viewing not found: " + viewingId));
        ownershipValidator.validateViewingOwnership(viewing, agentId);
        viewingRepository.delete(viewing);
        log.info("Viewing {} deleted by agent {}", viewingId, agentId);
    }

    @Transactional(readOnly = true)
    public ViewingDto.Response getViewing(UUID agentId, UUID viewingId) {
        Viewing viewing = viewingRepository.findByIdWithDetails(viewingId)
                .orElseThrow(() -> new ResourceNotFoundException("Viewing not found: " + viewingId));
        ownershipValidator.validateViewingOwnership(viewing, agentId);
        return viewingMapper.toResponse(viewing);
    }

    @Transactional(readOnly = true)
    public List<ViewingDto.Summary> getViewingsByClient(UUID agentId, UUID clientId) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client not found: " + clientId));
        ownershipValidator.validateClientOwnership(client, agentId);

        List<Viewing> viewings = viewingRepository.findByClientOrderByViewingDateDesc(client);
        return viewingMapper.toSummaryList(viewings);
    }

    @Transactional(readOnly = true)
    public List<ViewingDto.Summary> getViewingsByProperty(UUID agentId, UUID propertyId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found: " + propertyId));
        ownershipValidator.validatePropertyOwnership(property, agentId);

        List<Viewing> viewings = viewingRepository.findByPropertyOrderByViewingDateDesc(property);
        return viewingMapper.toSummaryList(viewings);
    }

    @Transactional(readOnly = true)
    public Page<ViewingDto.Summary> getViewingsByAgent(UUID agentId, Pageable pageable) {
        return getViewingsByAgent(agentId, null, null, pageable);
    }

    @Transactional(readOnly = true)
    public Page<ViewingDto.Summary> getViewingsByAgent(UUID agentId, LocalDateTime from, LocalDateTime to, Pageable pageable) {
        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent not found: " + agentId));

        if (from == null && to == null) {
            return viewingRepository.findByAgentOrderByViewingDateDesc(agent, pageable)
                    .map(viewingMapper::toSummary);
        }

        // Half-open ranges get sentinel bounds instead of nullable parameters: a
        // "(:from IS NULL OR ...)" predicate makes PostgreSQL fail to infer the
        // parameter type for an untyped NULL timestamp.
        LocalDateTime start = from != null ? from : OPEN_RANGE_START;
        LocalDateTime end = to != null ? to : OPEN_RANGE_END;

        return viewingRepository.findByAgentAndViewingDateRange(agent, start, end, pageable)
                .map(viewingMapper::toSummary);
    }

    @Transactional(readOnly = true)
    public List<ViewingDto.Summary> getTodaysViewings(UUID agentId) {
        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent not found: " + agentId));

        // Viewing dates are stored as naive German-local timestamps; the server clock
        // runs UTC (Docker/Railway), so "today" must be resolved in German time
        LocalDateTime startOfDay = LocalDate.now(ZoneId.of("Europe/Berlin")).atStartOfDay();
        LocalDateTime endOfDay = startOfDay.plusDays(1);

        List<Viewing> viewings = viewingRepository.findByAgentAndViewingDateBetween(agent, startOfDay, endOfDay);
        return viewingMapper.toSummaryList(viewings);
    }
}
