package com.marklerapp.crm.controller;

import com.marklerapp.crm.dto.AgentDto;
import com.marklerapp.crm.entity.LanguagePreference;
import com.marklerapp.crm.security.CustomUserDetails;
import com.marklerapp.crm.service.AgentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for agent profile management operations.
 */
@Slf4j
@RestController
@RequestMapping("/agents")
@RequiredArgsConstructor
@Tag(name = "Agent Management", description = "APIs for managing agent profiles and settings")
public class AgentController {

    private final AgentService agentService;

    /**
     * Get current agent profile
     */
    @GetMapping("/me")
    @Operation(summary = "Get current agent profile", description = "Retrieve the authenticated agent's profile")
    public ResponseEntity<AgentDto> getCurrentAgent(Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        AgentDto agent = agentService.getAgentById(agentId);
        return ResponseEntity.ok(agent);
    }

    /**
     * Update current agent profile
     */
    @PutMapping("/me")
    @Operation(summary = "Update agent profile", description = "Update the authenticated agent's profile")
    public ResponseEntity<AgentDto> updateCurrentAgent(
            @Parameter(description = "Updated agent data") @Valid @RequestBody UpdateAgentRequest request,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);

        AgentDto agentDto = AgentDto.builder()
                .email(request.getEmail())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .phone(request.getPhone())
                .languagePreference(request.getLanguagePreference())
                .build();

        AgentDto updatedAgent = agentService.updateAgent(agentId, agentDto);
        return ResponseEntity.ok(updatedAgent);
    }

    /**
     * Update agent password
     */
    @PutMapping("/me/password")
    @Operation(summary = "Update password", description = "Update the authenticated agent's password")
    public ResponseEntity<Void> updatePassword(
            @Parameter(description = "Password update data") @Valid @RequestBody UpdatePasswordRequest request,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        agentService.updatePassword(agentId, request.getCurrentPassword(), request.getNewPassword());

        return ResponseEntity.noContent().build();
    }

    /**
     * Update agent language preference
     */
    @PutMapping("/me/language")
    @Operation(summary = "Update language preference", description = "Update the authenticated agent's language preference")
    public ResponseEntity<AgentDto> updateLanguagePreference(
            @Parameter(description = "Language preference") @Valid @RequestBody UpdateLanguageRequest request,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        AgentDto updatedAgent = agentService.updateLanguagePreference(agentId, request.getLanguagePreference());

        return ResponseEntity.ok(updatedAgent);
    }

    /**
     * Deactivate current agent account
     */
    @PutMapping("/me/deactivate")
    @Operation(summary = "Deactivate account", description = "Deactivate the authenticated agent's account")
    public ResponseEntity<Void> deactivateAccount(Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        agentService.deactivateAgent(agentId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get agent statistics
     */
    @GetMapping("/me/stats")
    @Operation(summary = "Get agent statistics", description = "Get statistics for the authenticated agent")
    public ResponseEntity<AgentStatsDto> getAgentStats(Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);

        // This could be expanded to include more statistics from various services
        AgentStatsDto stats = AgentStatsDto.builder()
                .agentId(agentId)
                .isActive(true)
                .build();

        return ResponseEntity.ok(stats);
    }

    /**
     * Extract agent ID from authentication
     */
    private UUID getAgentIdFromAuth(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return userDetails.getAgent().getId();
    }

    /**
     * Request DTO for updating agent profile
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateAgentRequest {
        @NotBlank(message = "Email is required")
        private String email;

        @NotBlank(message = "First name is required")
        @Size(min = 2, max = 100, message = "First name must be between 2 and 100 characters")
        private String firstName;

        @NotBlank(message = "Last name is required")
        @Size(min = 2, max = 100, message = "Last name must be between 2 and 100 characters")
        private String lastName;

        @Size(max = 20, message = "Phone number must not exceed 20 characters")
        private String phone;

        private LanguagePreference languagePreference;
    }

    /**
     * Request DTO for updating password
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdatePasswordRequest {
        @NotBlank(message = "Current password is required")
        private String currentPassword;

        @NotBlank(message = "New password is required")
        @Size(min = 8, message = "Password must be at least 8 characters long")
        private String newPassword;
    }

    /**
     * Request DTO for updating language preference
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateLanguageRequest {
        private LanguagePreference languagePreference;
    }

    /**
     * DTO for agent statistics
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AgentStatsDto {
        private UUID agentId;
        private boolean isActive;
        private long totalClients;
        private long totalProperties;
        private long totalCallNotes;

        public static AgentStatsDtoBuilder builder() {
            return new AgentStatsDtoBuilder();
        }

        public static class AgentStatsDtoBuilder {
            private UUID agentId;
            private boolean isActive;
            private long totalClients;
            private long totalProperties;
            private long totalCallNotes;

            public AgentStatsDtoBuilder agentId(UUID agentId) {
                this.agentId = agentId;
                return this;
            }

            public AgentStatsDtoBuilder isActive(boolean isActive) {
                this.isActive = isActive;
                return this;
            }

            public AgentStatsDtoBuilder totalClients(long totalClients) {
                this.totalClients = totalClients;
                return this;
            }

            public AgentStatsDtoBuilder totalProperties(long totalProperties) {
                this.totalProperties = totalProperties;
                return this;
            }

            public AgentStatsDtoBuilder totalCallNotes(long totalCallNotes) {
                this.totalCallNotes = totalCallNotes;
                return this;
            }

            public AgentStatsDto build() {
                return new AgentStatsDto(agentId, isActive, totalClients, totalProperties, totalCallNotes);
            }
        }
    }
}