package com.marklerapp.crm.service;

import com.marklerapp.crm.entity.CallNote;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.Property;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Centralized component for validating entity ownership by agents.
 * Ensures consistent ownership checks across all services and provides clear,
 * uniform security enforcement throughout the application.
 *
 * <p>This validator is used by service layers to verify that an agent has
 * permission to access or modify a specific entity. It throws
 * {@link AccessDeniedException} when ownership validation fails.</p>
 *
 * <h2>Usage Example:</h2>
 * <pre>
 * {@code
 * @Service
 * public class ClientService {
 *     private final OwnershipValidator ownershipValidator;
 *
 *     public ClientDto updateClient(UUID clientId, ClientDto dto, UUID agentId) {
 *         Client client = clientRepository.findById(clientId)
 *             .orElseThrow(() -> new ResourceNotFoundException(...));
 *         ownershipValidator.validateClientOwnership(client, agentId);
 *         // ... proceed with update
 *     }
 * }
 * }
 * </pre>
 *
 * @see Client
 * @see Property
 * @see CallNote
 */
@Slf4j
@Component
public class OwnershipValidator {

    /**
     * Validates that a client belongs to the specified agent.
     *
     * @param client the client entity to validate
     * @param agentId the ID of the agent attempting to access the client
     * @throws AccessDeniedException if the client does not belong to the agent
     * @throws IllegalArgumentException if client or agentId is null
     */
    public void validateClientOwnership(Client client, UUID agentId) {
        if (client == null) {
            throw new IllegalArgumentException("Client cannot be null");
        }
        if (agentId == null) {
            throw new IllegalArgumentException("Agent ID cannot be null");
        }

        if (!client.getAgent().getId().equals(agentId)) {
            log.warn("Access denied: Agent {} attempted to access client {} owned by agent {}",
                    agentId, client.getId(), client.getAgent().getId());
            throw new AccessDeniedException(
                    String.format("You don't have permission to access this client (ID: %s)", client.getId())
            );
        }

        log.debug("Ownership validated: Client {} belongs to agent {}", client.getId(), agentId);
    }

    /**
     * Validates that a property belongs to the specified agent.
     *
     * @param property the property entity to validate
     * @param agentId the ID of the agent attempting to access the property
     * @throws AccessDeniedException if the property does not belong to the agent
     * @throws IllegalArgumentException if property or agentId is null
     */
    public void validatePropertyOwnership(Property property, UUID agentId) {
        if (property == null) {
            throw new IllegalArgumentException("Property cannot be null");
        }
        if (agentId == null) {
            throw new IllegalArgumentException("Agent ID cannot be null");
        }

        if (!property.getAgent().getId().equals(agentId)) {
            log.warn("Access denied: Agent {} attempted to access property {} owned by agent {}",
                    agentId, property.getId(), property.getAgent().getId());
            throw new AccessDeniedException(
                    String.format("You don't have permission to access this property (ID: %s)", property.getId())
            );
        }

        log.debug("Ownership validated: Property {} belongs to agent {}", property.getId(), agentId);
    }

    /**
     * Validates that a call note belongs to the specified agent.
     *
     * @param callNote the call note entity to validate
     * @param agentId the ID of the agent attempting to access the call note
     * @throws AccessDeniedException if the call note does not belong to the agent
     * @throws IllegalArgumentException if callNote or agentId is null
     */
    public void validateCallNoteOwnership(CallNote callNote, UUID agentId) {
        if (callNote == null) {
            throw new IllegalArgumentException("Call note cannot be null");
        }
        if (agentId == null) {
            throw new IllegalArgumentException("Agent ID cannot be null");
        }

        if (!callNote.getAgent().getId().equals(agentId)) {
            log.warn("Access denied: Agent {} attempted to access call note {} owned by agent {}",
                    agentId, callNote.getId(), callNote.getAgent().getId());
            throw new AccessDeniedException(
                    String.format("You don't have permission to access this call note (ID: %s)", callNote.getId())
            );
        }

        log.debug("Ownership validated: Call note {} belongs to agent {}", callNote.getId(), agentId);
    }
}
