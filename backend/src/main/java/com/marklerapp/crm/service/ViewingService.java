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

    private final ViewingRepository viewingRepository;
    private final ClientRepository clientRepository;
    private final AgentRepository agentRepository;
    private final PropertyRepository propertyRepository;
    private final ViewingMapper viewingMapper;
    private final OwnershipValidator ownershipValidator;

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
        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent not found: " + agentId));

        return viewingRepository.findByAgentOrderByViewingDateDesc(agent, pageable)
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
