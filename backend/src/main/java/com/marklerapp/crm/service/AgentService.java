package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.dto.AgentDto;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.LanguagePreference;
import com.marklerapp.crm.repository.AgentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Service for managing agent operations.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AgentService {

    private final AgentRepository agentRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Get agent by ID
     */
    @Transactional(readOnly = true)
    public AgentDto getAgentById(UUID agentId) {
        log.debug("Getting agent by ID: {}", agentId);

        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));

        return convertToDto(agent);
    }

    /**
     * Get agent by email
     */
    @Transactional(readOnly = true)
    public AgentDto getAgentByEmail(String email) {
        log.debug("Getting agent by email: {}", email);

        Agent agent = agentRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "email", email));

        return convertToDto(agent);
    }

    /**
     * Update agent profile
     */
    @Transactional
    public AgentDto updateAgent(UUID agentId, AgentDto agentDto) {
        log.debug("Updating agent: {}", agentId);

        Agent existingAgent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));

        // Check if email is being changed and is unique
        if (!existingAgent.getEmail().equals(agentDto.getEmail())) {
            if (agentRepository.existsByEmail(agentDto.getEmail())) {
                throw new IllegalArgumentException("Email is already in use by another agent");
            }
            existingAgent.setEmail(agentDto.getEmail());
        }

        // Update other fields
        existingAgent.setFirstName(agentDto.getFirstName());
        existingAgent.setLastName(agentDto.getLastName());
        existingAgent.setPhone(agentDto.getPhone());
        existingAgent.setLanguagePreference(agentDto.getLanguagePreference());

        Agent savedAgent = agentRepository.save(existingAgent);

        log.info("Agent updated: {}", agentId);
        return convertToDto(savedAgent);
    }

    /**
     * Update agent password
     */
    @Transactional
    public void updatePassword(UUID agentId, String currentPassword, String newPassword) {
        log.debug("Updating password for agent: {}", agentId);

        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));

        // Verify current password
        if (!passwordEncoder.matches(currentPassword, agent.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }

        // Update password
        agent.setPasswordHash(passwordEncoder.encode(newPassword));
        agentRepository.save(agent);

        log.info("Password updated for agent: {}", agentId);
    }

    /**
     * Update agent language preference
     */
    @Transactional
    public AgentDto updateLanguagePreference(UUID agentId, LanguagePreference languagePreference) {
        log.debug("Updating language preference for agent: {} to: {}", agentId, languagePreference);

        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));

        agent.setLanguagePreference(languagePreference);
        Agent savedAgent = agentRepository.save(agent);

        log.info("Language preference updated for agent: {} to: {}", agentId, languagePreference);
        return convertToDto(savedAgent);
    }

    /**
     * Deactivate agent account
     */
    @Transactional
    public void deactivateAgent(UUID agentId) {
        log.debug("Deactivating agent: {}", agentId);

        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));

        agent.setActive(false);
        agentRepository.save(agent);

        log.info("Agent deactivated: {}", agentId);
    }

    /**
     * Reactivate agent account
     */
    @Transactional
    public void reactivateAgent(UUID agentId) {
        log.debug("Reactivating agent: {}", agentId);

        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));

        agent.setActive(true);
        agentRepository.save(agent);

        log.info("Agent reactivated: {}", agentId);
    }

    /**
     * Get total count of active agents
     */
    @Transactional(readOnly = true)
    public long getActiveAgentCount() {
        return agentRepository.countActiveAgents();
    }

    /**
     * Check if agent exists by email
     */
    @Transactional(readOnly = true)
    public boolean existsByEmail(String email) {
        return agentRepository.existsByEmail(email);
    }

    /**
     * Convert Agent entity to DTO
     */
    private AgentDto convertToDto(Agent agent) {
        return AgentDto.builder()
                .id(agent.getId())
                .email(agent.getEmail())
                .firstName(agent.getFirstName())
                .lastName(agent.getLastName())
                .phone(agent.getPhone())
                .languagePreference(agent.getLanguagePreference())
                .isActive(agent.isActive())
                .createdAt(agent.getCreatedAt())
                .updatedAt(agent.getUpdatedAt())
                .build();
    }
}