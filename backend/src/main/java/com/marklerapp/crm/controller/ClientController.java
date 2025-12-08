package com.marklerapp.crm.controller;

import com.marklerapp.crm.dto.ClientDto;
import com.marklerapp.crm.security.CustomUserDetails;
import com.marklerapp.crm.service.ClientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for client management operations.
 */
@Slf4j
@RestController
@RequestMapping("/clients")
@RequiredArgsConstructor
@Tag(name = "Client Management", description = "APIs for managing real estate clients")
public class ClientController {

    private final ClientService clientService;

    /**
     * Get all clients for the authenticated agent
     */
    @GetMapping
    @Operation(summary = "Get all clients", description = "Retrieve all clients for the authenticated agent with pagination")
    public ResponseEntity<Page<ClientDto>> getAllClients(
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "desc") String sortDir,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);

        Sort sort = Sort.by(sortDir.equalsIgnoreCase("desc") ?
                Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<ClientDto> clients = clientService.getClientsByAgent(agentId, pageable);

        return ResponseEntity.ok(clients);
    }

    /**
     * Search clients by term
     */
    @GetMapping("/search")
    @Operation(summary = "Search clients", description = "Search clients by name or email")
    public ResponseEntity<Page<ClientDto>> searchClients(
            @Parameter(description = "Search term") @RequestParam String q,
            @Parameter(description = "Page number (0-based)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort field") @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "desc") String sortDir,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);

        Sort sort = Sort.by(sortDir.equalsIgnoreCase("desc") ?
                Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<ClientDto> clients = clientService.searchClients(agentId, q, pageable);

        return ResponseEntity.ok(clients);
    }

    /**
     * Get client by ID
     */
    @GetMapping("/{clientId}")
    @Operation(summary = "Get client by ID", description = "Retrieve a specific client by ID")
    public ResponseEntity<ClientDto> getClient(
            @Parameter(description = "Client ID") @PathVariable UUID clientId,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        ClientDto client = clientService.getClientById(clientId, agentId);

        return ResponseEntity.ok(client);
    }

    /**
     * Create a new client
     */
    @PostMapping
    @Operation(summary = "Create client", description = "Create a new client")
    public ResponseEntity<ClientDto> createClient(
            @Parameter(description = "Client data") @Valid @RequestBody ClientDto clientDto,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        ClientDto createdClient = clientService.createClient(clientDto, agentId);

        return ResponseEntity.status(HttpStatus.CREATED).body(createdClient);
    }

    /**
     * Update an existing client
     */
    @PutMapping("/{clientId}")
    @Operation(summary = "Update client", description = "Update an existing client")
    public ResponseEntity<ClientDto> updateClient(
            @Parameter(description = "Client ID") @PathVariable UUID clientId,
            @Parameter(description = "Updated client data") @Valid @RequestBody ClientDto clientDto,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        ClientDto updatedClient = clientService.updateClient(clientId, clientDto, agentId);

        return ResponseEntity.ok(updatedClient);
    }

    /**
     * Delete a client
     */
    @DeleteMapping("/{clientId}")
    @Operation(summary = "Delete client", description = "Delete a client by ID")
    public ResponseEntity<Void> deleteClient(
            @Parameter(description = "Client ID") @PathVariable UUID clientId,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        clientService.deleteClient(clientId, agentId);

        return ResponseEntity.noContent().build();
    }

    /**
     * Get recent clients
     */
    @GetMapping("/recent")
    @Operation(summary = "Get recent clients", description = "Get recently created clients")
    public ResponseEntity<List<ClientDto>> getRecentClients(
            @Parameter(description = "Number of days") @RequestParam(defaultValue = "30") int days,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        List<ClientDto> recentClients = clientService.getRecentClients(agentId, days);

        return ResponseEntity.ok(recentClients);
    }

    /**
     * Get client statistics
     */
    @GetMapping("/stats")
    @Operation(summary = "Get client statistics", description = "Get client count and statistics")
    public ResponseEntity<ClientStatsDto> getClientStats(Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        long totalClients = clientService.countClientsByAgent(agentId);

        ClientStatsDto stats = ClientStatsDto.builder()
                .totalClients(totalClients)
                .build();

        return ResponseEntity.ok(stats);
    }

    /**
     * Export client data (GDPR)
     */
    @GetMapping("/{clientId}/export")
    @Operation(summary = "Export client data", description = "Export client data for GDPR compliance")
    public ResponseEntity<ClientDto> exportClientData(
            @Parameter(description = "Client ID") @PathVariable UUID clientId,
            Authentication authentication) {

        UUID agentId = getAgentIdFromAuth(authentication);
        ClientDto clientData = clientService.exportClientData(clientId, agentId);

        return ResponseEntity.ok(clientData);
    }

    /**
     * Extract agent ID from authentication
     */
    private UUID getAgentIdFromAuth(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return userDetails.getAgent().getId();
    }

    /**
     * DTO for client statistics
     */
    public static class ClientStatsDto {
        public long totalClients;

        public static ClientStatsDtoBuilder builder() {
            return new ClientStatsDtoBuilder();
        }

        public static class ClientStatsDtoBuilder {
            private long totalClients;

            public ClientStatsDtoBuilder totalClients(long totalClients) {
                this.totalClients = totalClients;
                return this;
            }

            public ClientStatsDto build() {
                ClientStatsDto dto = new ClientStatsDto();
                dto.totalClients = this.totalClients;
                return dto;
            }
        }
    }
}