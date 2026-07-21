package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.constants.ValidationConstants;
import com.marklerapp.crm.dto.ClientDto;
import com.marklerapp.crm.dto.PropertySearchCriteriaDto;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.PropertySearchCriteria;
import com.marklerapp.crm.mapper.ClientMapper;
import com.marklerapp.crm.mapper.PropertySearchCriteriaMapper;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.repository.CallNoteRepository;
import com.marklerapp.crm.repository.ClientRepository;
import com.marklerapp.crm.repository.FileAttachmentRepository;
import com.marklerapp.crm.repository.PropertySearchCriteriaRepository;
import com.marklerapp.crm.repository.ViewingRepository;
import com.marklerapp.crm.util.DuplicateMatchUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing client operations.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ClientService {

    private final ClientRepository clientRepository;
    private final AgentRepository agentRepository;
    private final PropertySearchCriteriaRepository searchCriteriaRepository;
    private final CallNoteRepository callNoteRepository;
    private final ClientMapper clientMapper;
    private final PropertySearchCriteriaMapper searchCriteriaMapper;
    private final OwnershipValidator ownershipValidator;
    private final ViewingRepository viewingRepository;
    private final FileAttachmentRepository fileAttachmentRepository;
    private final ClientDeletionAuditService clientDeletionAuditService;

    /**
     * Get all clients for an agent with pagination
     */
    @Transactional(readOnly = true)
    public Page<ClientDto> getClientsByAgent(UUID agentId, Pageable pageable) {
        log.debug("Getting clients for agent: {}", agentId);

        Agent agent = getAgentById(agentId);
        Page<Client> clients = clientRepository.findByAgent(agent, pageable);

        return clients.map(clientMapper::toDto);
    }

    /**
     * Search clients by term for an agent
     */
    @Transactional(readOnly = true)
    public Page<ClientDto> searchClients(UUID agentId, String searchTerm, Pageable pageable) {
        log.debug("Searching clients for agent: {} with term: {}", agentId, searchTerm);

        Agent agent = getAgentById(agentId);
        Page<Client> clients = clientRepository.findByAgentAndSearchTerm(agent, searchTerm, pageable);

        return clients.map(clientMapper::toDto);
    }

    /**
     * Get client by ID
     */
    @Transactional(readOnly = true)
    public ClientDto getClientById(UUID clientId, UUID agentId) {
        log.debug("Getting client: {} for agent: {}", clientId, agentId);

        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client", "id", clientId));

        // Verify client belongs to the agent
        try {
            ownershipValidator.validateClientOwnership(client, agentId);
        } catch (AccessDeniedException e) {
            throw new ResourceNotFoundException("Client not found or access denied");
        }

        return clientMapper.toDto(client);
    }

    /**
     * Create a new client
     */
    @Transactional
    public ClientDto createClient(ClientDto clientDto, UUID agentId) {
        log.debug("Creating client for agent: {}", agentId);

        Agent agent;
        try {
            agent = getAgentById(agentId);
        } catch (ResourceNotFoundException e) {
            log.error("Agent not found when creating client. AgentId: {}, Error: {}", agentId, e.getMessage());
            throw new IllegalArgumentException(ValidationConstants.INVALID_AGENT_SESSION_MESSAGE);
        }

        // Check if client with email already exists for this agent
        if (clientDto.getEmail() != null && !clientDto.getEmail().trim().isEmpty()) {
            if (clientRepository.existsByAgentAndEmail(agent, clientDto.getEmail())) {
                log.warn("Attempted to create client with duplicate email: {} for agent: {}", clientDto.getEmail(), agentId);
                throw new IllegalArgumentException(ValidationConstants.DUPLICATE_EMAIL_MESSAGE);
            }
        }

        // Validate GDPR consent
        if (clientDto.isGdprConsentGiven() && clientDto.getGdprConsentDate() == null) {
            clientDto.setGdprConsentDate(LocalDateTime.now());
        }

        Client client = convertToEntity(clientDto);
        client.setAgent(agent);

        if (clientDto.getAddressCountry() == null || clientDto.getAddressCountry().trim().isEmpty()) {
            client.setAddressCountry(ValidationConstants.DEFAULT_ADDRESS_COUNTRY);
        }

        // Client's NOT NULL enum columns (pipelineStage/financingStatus/moveInTimeline)
        // carry @Builder.Default values, but those only apply when constructed via
        // Client.builder() — ClientMapper builds via `new Client()` + setters (MapStruct
        // disableBuilder), which Lombok leaves at null for @Builder.Default fields. The
        // client-form only ever sends clientType, so without this, creating a client
        // fails on a NOT NULL violation for a field the form never shows the agent.
        if (client.getPipelineStage() == null) {
            client.setPipelineStage(Client.PipelineStage.PROSPECT);
        }
        if (client.getFinancingStatus() == null) {
            client.setFinancingStatus(Client.FinancingStatus.UNKNOWN);
        }
        if (client.getMoveInTimeline() == null) {
            client.setMoveInTimeline(Client.MoveInTimeline.FLEXIBLE);
        }
        if (client.getClientType() == null) {
            client.setClientType(Client.ClientType.BUYER);
        }
        if (client.getLegalBasis() == null) {
            client.setLegalBasis(Client.LegalBasis.CONTRACT_INITIATION);
        }

        Client savedClient = clientRepository.save(client);

        // Create search criteria if provided
        if (clientDto.getSearchCriteria() != null) {
            createSearchCriteria(savedClient, clientDto.getSearchCriteria());
        }

        log.info("Client created with ID: {} for agent: {}", savedClient.getId(), agentId);
        return clientMapper.toDto(savedClient);
    }

    /**
     * Find existing clients of this agent that look like the same lead — a fuzzy name match
     * (tolerates umlaut spelling variants and typos, e.g. "Krüger" vs "Kroeger") or the same
     * phone number once country code/trunk prefix/formatting are normalized (e.g. "0151 123"
     * vs "+49 151 123"). Used as a soft, non-blocking duplicate warning while a client is
     * being entered (the hard block is the existing e-mail check in {@link #createClient},
     * which only fires when an e-mail was actually given).
     */
    @Transactional(readOnly = true)
    public List<ClientDto> findPotentialDuplicateClients(UUID agentId, String firstName, String lastName, String phone) {
        Agent agent = getAgentById(agentId);

        boolean hasName = firstName != null && !firstName.trim().isEmpty()
                && lastName != null && !lastName.trim().isEmpty();
        String normalizedPhone = DuplicateMatchUtil.normalizePhone(phone);
        boolean hasPhone = !normalizedPhone.isEmpty();

        if (!hasName && !hasPhone) {
            return List.of();
        }

        Map<UUID, Client> matches = new java.util.LinkedHashMap<>();
        for (Client c : clientRepository.findByAgent(agent)) {
            boolean nameMatch = hasName
                    && DuplicateMatchUtil.isFuzzyNameMatch(firstName, c.getFirstName())
                    && DuplicateMatchUtil.isFuzzyNameMatch(lastName, c.getLastName());
            boolean phoneMatch = hasPhone && normalizedPhone.equals(DuplicateMatchUtil.normalizePhone(c.getPhone()));
            if (nameMatch || phoneMatch) {
                matches.put(c.getId(), c);
            }
        }

        return matches.values().stream().map(clientMapper::toDto).collect(Collectors.toList());
    }

    /**
     * Update an existing client
     */
    @Transactional
    public ClientDto updateClient(UUID clientId, ClientDto clientDto, UUID agentId) {
        log.debug("Updating client: {} for agent: {}", clientId, agentId);

        Client existingClient = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client", "id", clientId));

        // Verify client belongs to the agent
        try {
            ownershipValidator.validateClientOwnership(existingClient, agentId);
        } catch (AccessDeniedException e) {
            throw new ResourceNotFoundException("Client not found or access denied");
        }

        // Check email uniqueness if email is being changed
        if (clientDto.getEmail() != null && !clientDto.getEmail().equals(existingClient.getEmail())) {
            if (clientRepository.existsByAgentAndEmail(existingClient.getAgent(), clientDto.getEmail())) {
                throw new IllegalArgumentException(ValidationConstants.DUPLICATE_EMAIL_MESSAGE);
            }
        }

        // Update fields
        existingClient.setFirstName(clientDto.getFirstName());
        existingClient.setLastName(clientDto.getLastName());
        existingClient.setEmail(clientDto.getEmail());
        existingClient.setPhone(clientDto.getPhone());
        existingClient.setAddressStreet(clientDto.getAddressStreet());
        existingClient.setAddressCity(clientDto.getAddressCity());
        existingClient.setAddressPostalCode(clientDto.getAddressPostalCode());
        existingClient.setAddressCountry(clientDto.getAddressCountry());
        if (clientDto.getClientType() != null) {
            existingClient.setClientType(clientDto.getClientType());
        }
        if (clientDto.getFinancingStatus() != null) {
            existingClient.setFinancingStatus(clientDto.getFinancingStatus());
        }
        if (clientDto.getMoveInTimeline() != null) {
            existingClient.setMoveInTimeline(clientDto.getMoveInTimeline());
        }
        if (clientDto.getPipelineStage() != null) {
            existingClient.setPipelineStage(clientDto.getPipelineStage());
        }
        if (clientDto.getLegalBasis() != null) {
            existingClient.setLegalBasis(clientDto.getLegalBasis());
        }

        // Handle GDPR consent updates
        if (clientDto.isGdprConsentGiven() && !existingClient.isGdprConsentGiven()) {
            existingClient.setGdprConsentGiven(true);
            existingClient.setGdprConsentDate(LocalDateTime.now());
        } else if (!clientDto.isGdprConsentGiven() && existingClient.isGdprConsentGiven()) {
            existingClient.setGdprConsentGiven(false);
            existingClient.setGdprConsentDate(null);
        }

        Client savedClient = clientRepository.save(existingClient);

        // Update search criteria if provided
        if (clientDto.getSearchCriteria() != null) {
            updateSearchCriteria(savedClient, clientDto.getSearchCriteria());
        }

        log.info("Client updated: {} for agent: {}", clientId, agentId);
        return clientMapper.toDto(savedClient);
    }

    /**
     * Update just the pipeline stage of a client (quick dropdown action)
     */
    @Transactional
    public ClientDto updatePipelineStage(UUID clientId, UUID agentId, Client.PipelineStage stage) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client", "id", clientId));
        try {
            ownershipValidator.validateClientOwnership(client, agentId);
        } catch (AccessDeniedException e) {
            throw new ResourceNotFoundException("Client not found or access denied");
        }
        client.setPipelineStage(stage);
        Client saved = clientRepository.save(client);
        log.info("Pipeline stage for client {} set to {} by agent {}", clientId, stage, agentId);
        return clientMapper.toDto(saved);
    }

    /**
     * Delete a client
     */
    @Transactional
    public void deleteClient(UUID clientId, UUID agentId) {
        log.debug("Deleting client: {} for agent: {}", clientId, agentId);

        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client", "id", clientId));

        // Verify client belongs to the agent
        try {
            ownershipValidator.validateClientOwnership(client, agentId);
        } catch (AccessDeniedException e) {
            throw new ResourceNotFoundException("Client not found or access denied");
        }

        // Snapshot the scope of cascade-deleted data before it's gone, for the audit trail.
        // If this fails, deleteClient() throws and the whole transaction rolls back —
        // a client must never be deleted without a corresponding audit record.
        int callNotesCount = (int) callNoteRepository.countByClient(client);
        int viewingsCount = (int) viewingRepository.countByClient(client);
        int fileAttachmentsCount = (int) fileAttachmentRepository.countByClient(client);
        boolean hadSearchCriteria = client.getSearchCriteria() != null;

        clientDeletionAuditService.logDeletion(
            client, client.getAgent(), callNotesCount, viewingsCount, fileAttachmentsCount, hadSearchCriteria
        );

        // Delete associated search criteria
        if (client.getSearchCriteria() != null) {
            searchCriteriaRepository.delete(client.getSearchCriteria());
        }

        clientRepository.delete(client);

        log.info("Client deleted: {} for agent: {}", clientId, agentId);
    }

    /**
     * Get recent clients for an agent
     */
    @Transactional(readOnly = true)
    public List<ClientDto> getRecentClients(UUID agentId, int days) {
        log.debug("Getting recent clients for agent: {} (last {} days)", agentId, days);

        Agent agent = getAgentById(agentId);
        LocalDateTime cutoffDate = LocalDateTime.now().minusDays(days);

        List<Client> recentClients = clientRepository.findRecentClientsByAgent(agent, cutoffDate);

        return recentClients.stream()
                .map(clientMapper::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Get clients grouped by pipeline stage for Kanban dashboard view. Includes WON/LOST
     * buckets — the frontend decides whether to render them as optional, collapsible columns.
     */
    @Transactional(readOnly = true)
    public Map<Client.PipelineStage, List<ClientDto>> getClientsByStage(UUID agentId) {
        Agent agent = getAgentById(agentId);
        List<Client> clients = clientRepository.findByAgent(agent);
        Map<Client.PipelineStage, List<ClientDto>> result = new java.util.LinkedHashMap<>();
        for (Client.PipelineStage stage : Client.PipelineStage.values()) {
            result.put(stage, new java.util.ArrayList<>());
        }
        for (Client c : clients) {
            List<ClientDto> bucket = result.get(c.getPipelineStage());
            if (bucket != null) bucket.add(clientMapper.toDto(c));
        }
        return result;
    }

    /**
     * Get all active clients sorted by last call note date ascending (oldest contact first, never-contacted first).
     * Used as the primary client list view so Thomas always sees who needs attention.
     */
    @Transactional(readOnly = true)
    public List<ClientDto> getClientsSortedByLastContact(UUID agentId) {
        Agent agent = getAgentById(agentId);
        List<Client> clients = clientRepository.findActiveClientsByAgent(agent);
        List<ClientDto> dtos = clientMapper.toDtoList(clients);
        Map<UUID, LocalDateTime> lastContactMap = buildLastContactMap(clients);
        dtos.forEach(dto -> dto.setLastContactDate(lastContactMap.get(dto.getId())));
        dtos.sort(Comparator.comparing(ClientDto::getLastContactDate,
                Comparator.nullsFirst(Comparator.naturalOrder())));
        return dtos;
    }

    /**
     * Get clients without recent contact based on actual call note dates.
     */
    @Transactional(readOnly = true)
    public List<ClientDto> getClientsWithoutRecentContact(UUID agentId, int days) {
        Agent agent = getAgentById(agentId);
        List<Client> clients = clientRepository.findActiveClientsOrderedByUpdatedAt(agent);
        Map<UUID, LocalDateTime> lastContactMap = buildLastContactMap(clients);
        LocalDateTime cutoff = LocalDateTime.now().minusDays(days);
        return clients.stream()
                .filter(c -> {
                    LocalDateTime last = lastContactMap.get(c.getId());
                    return last == null || last.isBefore(cutoff);
                })
                .map(c -> {
                    ClientDto dto = clientMapper.toDto(c);
                    dto.setLastContactDate(lastContactMap.get(c.getId()));
                    return dto;
                })
                .sorted(Comparator.comparing(ClientDto::getLastContactDate,
                        Comparator.nullsFirst(Comparator.naturalOrder())))
                .collect(Collectors.toList());
    }

    private Map<UUID, LocalDateTime> buildLastContactMap(List<Client> clients) {
        if (clients.isEmpty()) return new HashMap<>();
        List<UUID> ids = clients.stream().map(Client::getId).collect(Collectors.toList());
        List<Object[]> rows = callNoteRepository.findLastContactDateForClients(ids);
        Map<UUID, LocalDateTime> map = new HashMap<>();
        for (Object[] row : rows) {
            map.put((UUID) row[0], (LocalDateTime) row[1]);
        }
        return map;
    }

    /**
     * Count total clients for an agent
     */
    @Transactional(readOnly = true)
    public long countClientsByAgent(UUID agentId) {
        return clientRepository.countByAgentId(agentId);
    }

    /**
     * Export client data for GDPR compliance
     */
    @Transactional(readOnly = true)
    public ClientDto exportClientData(UUID clientId, UUID agentId) {
        log.debug("Exporting client data: {} for agent: {}", clientId, agentId);

        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client", "id", clientId));

        // Verify client belongs to the agent
        try {
            ownershipValidator.validateClientOwnership(client, agentId);
        } catch (AccessDeniedException e) {
            throw new ResourceNotFoundException("Client not found or access denied");
        }

        return clientMapper.toDto(client);
    }

    /**
     * Create search criteria for a client
     */
    private void createSearchCriteria(Client client, PropertySearchCriteriaDto criteriaDto) {
        PropertySearchCriteria criteria = searchCriteriaMapper.toEntity(criteriaDto);
        criteria.setClient(client);
        searchCriteriaRepository.save(criteria);
    }

    /**
     * Update search criteria for a client
     */
    private void updateSearchCriteria(Client client, PropertySearchCriteriaDto criteriaDto) {
        PropertySearchCriteria existingCriteria = searchCriteriaRepository.findByClient(client)
                .orElse(searchCriteriaMapper.toEntity(criteriaDto));

        if (existingCriteria.getId() != null) {
            // Update existing criteria
            existingCriteria.setMinSquareMeters(criteriaDto.getMinSquareMeters());
            existingCriteria.setMaxSquareMeters(criteriaDto.getMaxSquareMeters());
            existingCriteria.setMinRooms(criteriaDto.getMinRooms());
            existingCriteria.setMaxRooms(criteriaDto.getMaxRooms());
            existingCriteria.setMinBudget(criteriaDto.getMinBudget());
            existingCriteria.setMaxBudget(criteriaDto.getMaxBudget());
            existingCriteria.setAdditionalRequirements(criteriaDto.getAdditionalRequirements());

            if (criteriaDto.getPreferredLocations() != null) {
                existingCriteria.setPreferredLocationsArray(criteriaDto.getPreferredLocations().toArray(new String[0]));
            }

            if (criteriaDto.getPropertyTypes() != null) {
                existingCriteria.setPropertyTypesArray(criteriaDto.getPropertyTypes().toArray(new String[0]));
            }
        }

        existingCriteria.setClient(client);
        searchCriteriaRepository.save(existingCriteria);
    }

    /**
     * Get agent by ID with validation
     */
    private Agent getAgentById(UUID agentId) {
        return agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));
    }

    /**
     * Convert ClientDto to Client entity
     */
    private Client convertToEntity(ClientDto dto) {
        return clientMapper.toEntity(dto);
    }
}