package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.dto.ClientDto;
import com.marklerapp.crm.dto.PropertySearchCriteriaDto;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.PropertySearchCriteria;
import com.marklerapp.crm.mapper.ClientMapper;
import com.marklerapp.crm.mapper.PropertySearchCriteriaMapper;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.repository.ClientRepository;
import com.marklerapp.crm.repository.PropertySearchCriteriaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
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
    private final ClientMapper clientMapper;
    private final PropertySearchCriteriaMapper searchCriteriaMapper;

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
        if (!client.getAgent().getId().equals(agentId)) {
            throw new ResourceNotFoundException("Client", "id", clientId);
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
            throw new IllegalArgumentException("Unable to create client: Invalid agent session. Please log out and log in again.");
        }

        // Check if client with email already exists for this agent
        if (clientDto.getEmail() != null && !clientDto.getEmail().trim().isEmpty()) {
            if (clientRepository.existsByAgentAndEmail(agent, clientDto.getEmail())) {
                log.warn("Attempted to create client with duplicate email: {} for agent: {}", clientDto.getEmail(), agentId);
                throw new IllegalArgumentException("A client with this email already exists for your account");
            }
        }

        // Validate GDPR consent
        if (clientDto.isGdprConsentGiven() && clientDto.getGdprConsentDate() == null) {
            clientDto.setGdprConsentDate(LocalDateTime.now());
        }

        Client client = convertToEntity(clientDto);
        client.setAgent(agent);

        if (clientDto.getAddressCountry() == null || clientDto.getAddressCountry().trim().isEmpty()) {
            client.setAddressCountry("Germany");
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
     * Update an existing client
     */
    @Transactional
    public ClientDto updateClient(UUID clientId, ClientDto clientDto, UUID agentId) {
        log.debug("Updating client: {} for agent: {}", clientId, agentId);

        Client existingClient = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client", "id", clientId));

        // Verify client belongs to the agent
        if (!existingClient.getAgent().getId().equals(agentId)) {
            throw new ResourceNotFoundException("Client", "id", clientId);
        }

        // Check email uniqueness if email is being changed
        if (clientDto.getEmail() != null && !clientDto.getEmail().equals(existingClient.getEmail())) {
            if (clientRepository.existsByAgentAndEmail(existingClient.getAgent(), clientDto.getEmail())) {
                throw new IllegalArgumentException("A client with this email already exists");
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
     * Delete a client
     */
    @Transactional
    public void deleteClient(UUID clientId, UUID agentId) {
        log.debug("Deleting client: {} for agent: {}", clientId, agentId);

        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client", "id", clientId));

        // Verify client belongs to the agent
        if (!client.getAgent().getId().equals(agentId)) {
            throw new ResourceNotFoundException("Client", "id", clientId);
        }

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
        if (!client.getAgent().getId().equals(agentId)) {
            throw new ResourceNotFoundException("Client", "id", clientId);
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