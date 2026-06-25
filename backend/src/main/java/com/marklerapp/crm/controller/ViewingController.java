package com.marklerapp.crm.controller;

import com.marklerapp.crm.constants.PaginationConstants;
import com.marklerapp.crm.dto.ViewingDto;
import com.marklerapp.crm.service.ViewingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/viewings")
@RequiredArgsConstructor
@Tag(name = "Viewings", description = "Endpoints for managing property viewings (Besichtigungen)")
public class ViewingController extends BaseController {

    private final ViewingService viewingService;

    @PostMapping
    @Operation(summary = "Record a new viewing")
    public ResponseEntity<ViewingDto.Response> createViewing(
            @Valid @RequestBody ViewingDto.CreateRequest request,
            Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        ViewingDto.Response response = viewingService.createViewing(agentId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{viewingId}")
    @Operation(summary = "Update a viewing")
    public ResponseEntity<ViewingDto.Response> updateViewing(
            @PathVariable UUID viewingId,
            @Valid @RequestBody ViewingDto.UpdateRequest request,
            Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        return ResponseEntity.ok(viewingService.updateViewing(agentId, viewingId, request));
    }

    @DeleteMapping("/{viewingId}")
    @Operation(summary = "Delete a viewing")
    public ResponseEntity<Void> deleteViewing(
            @PathVariable UUID viewingId,
            Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        viewingService.deleteViewing(agentId, viewingId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{viewingId}")
    @Operation(summary = "Get a single viewing")
    public ResponseEntity<ViewingDto.Response> getViewing(
            @PathVariable UUID viewingId,
            Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        return ResponseEntity.ok(viewingService.getViewing(agentId, viewingId));
    }

    @GetMapping
    @Operation(summary = "Get all viewings for the authenticated agent (paginated)")
    public ResponseEntity<Page<ViewingDto.Summary>> getViewingsByAgent(
            @PageableDefault(size = PaginationConstants.DEFAULT_PAGE_SIZE, sort = "viewingDate", direction = Sort.Direction.DESC)
            Pageable pageable,
            Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        return ResponseEntity.ok(viewingService.getViewingsByAgent(agentId, pageable));
    }

    @GetMapping("/client/{clientId}")
    @Operation(summary = "Get all viewings for a specific client")
    public ResponseEntity<List<ViewingDto.Summary>> getViewingsByClient(
            @PathVariable UUID clientId,
            Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        return ResponseEntity.ok(viewingService.getViewingsByClient(agentId, clientId));
    }

    @GetMapping("/property/{propertyId}")
    @Operation(summary = "Get all viewings for a specific property")
    public ResponseEntity<List<ViewingDto.Summary>> getViewingsByProperty(
            @PathVariable UUID propertyId,
            Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        return ResponseEntity.ok(viewingService.getViewingsByProperty(agentId, propertyId));
    }

    @GetMapping("/today")
    @Operation(summary = "Get today's scheduled viewings")
    public ResponseEntity<List<ViewingDto.Summary>> getTodaysViewings(Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        return ResponseEntity.ok(viewingService.getTodaysViewings(agentId));
    }
}
