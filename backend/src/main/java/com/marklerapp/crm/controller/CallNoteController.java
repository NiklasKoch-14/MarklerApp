package com.marklerapp.crm.controller;

import com.marklerapp.crm.dto.CallNoteDto;
import com.marklerapp.crm.service.CallNoteService;
import com.marklerapp.crm.service.CallNoteSummaryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * REST Controller for managing call notes and communication tracking.
 * Handles CRUD operations and summary generation for client interactions.
 */
@Slf4j
@RestController
@RequestMapping("/call-notes")
@RequiredArgsConstructor
@Tag(name = "Call Notes", description = "Endpoints for managing call notes and communication tracking")
public class CallNoteController {

    private final CallNoteService callNoteService;
    private final CallNoteSummaryService callNoteSummaryService;

    /**
     * Create a new call note
     */
    @PostMapping
    @Operation(summary = "Create a new call note", description = "Creates a new call note for a client")
    public ResponseEntity<CallNoteDto.Response> createCallNote(
            Authentication authentication,
            @Valid @RequestBody CallNoteDto.CreateRequest request) {

        UUID agentId = UUID.fromString(authentication.getName());
        CallNoteDto.Response response = callNoteService.createCallNote(agentId, request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Update an existing call note
     */
    @PutMapping("/{callNoteId}")
    @Operation(summary = "Update a call note", description = "Updates an existing call note")
    public ResponseEntity<CallNoteDto.Response> updateCallNote(
            Authentication authentication,
            @Parameter(description = "Call note ID") @PathVariable UUID callNoteId,
            @Valid @RequestBody CallNoteDto.UpdateRequest request) {

        UUID agentId = UUID.fromString(authentication.getName());
        CallNoteDto.Response response = callNoteService.updateCallNote(agentId, callNoteId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Get a specific call note by ID
     */
    @GetMapping("/{callNoteId}")
    @Operation(summary = "Get call note by ID", description = "Retrieves a specific call note by its ID")
    public ResponseEntity<CallNoteDto.Response> getCallNote(
            Authentication authentication,
            @Parameter(description = "Call note ID") @PathVariable UUID callNoteId) {

        UUID agentId = UUID.fromString(authentication.getName());
        CallNoteDto.Response response = callNoteService.getCallNote(agentId, callNoteId);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete a call note
     */
    @DeleteMapping("/{callNoteId}")
    @Operation(summary = "Delete a call note", description = "Deletes a call note by its ID")
    public ResponseEntity<Void> deleteCallNote(
            Authentication authentication,
            @Parameter(description = "Call note ID") @PathVariable UUID callNoteId) {

        UUID agentId = UUID.fromString(authentication.getName());
        callNoteService.deleteCallNote(agentId, callNoteId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get all call notes for a specific client
     */
    @GetMapping("/client/{clientId}")
    @Operation(summary = "Get call notes by client", description = "Retrieves all call notes for a specific client")
    public ResponseEntity<Page<CallNoteDto.Summary>> getCallNotesByClient(
            Authentication authentication,
            @Parameter(description = "Client ID") @PathVariable UUID clientId,
            @PageableDefault(size = 20) Pageable pageable) {

        UUID agentId = UUID.fromString(authentication.getName());
        Page<CallNoteDto.Summary> callNotes = callNoteService.getCallNotesByClient(agentId, clientId, pageable);
        return ResponseEntity.ok(callNotes);
    }

    /**
     * Get all call notes for the authenticated agent
     */
    @GetMapping
    @Operation(summary = "Get agent's call notes", description = "Retrieves all call notes for the authenticated agent")
    public ResponseEntity<Page<CallNoteDto.Summary>> getCallNotesByAgent(
            Authentication authentication,
            @PageableDefault(size = 20) Pageable pageable) {

        UUID agentId = UUID.fromString(authentication.getName());
        Page<CallNoteDto.Summary> callNotes = callNoteService.getCallNotesByAgent(agentId, pageable);
        return ResponseEntity.ok(callNotes);
    }

    /**
     * Search call notes with filters
     */
    @PostMapping("/search")
    @Operation(summary = "Search call notes", description = "Search call notes with various filters")
    public ResponseEntity<Page<CallNoteDto.Summary>> searchCallNotes(
            Authentication authentication,
            @RequestBody CallNoteDto.SearchFilter filter,
            @PageableDefault(size = 20) Pageable pageable) {

        UUID agentId = UUID.fromString(authentication.getName());
        Page<CallNoteDto.Summary> callNotes = callNoteService.searchCallNotes(agentId, filter, pageable);
        return ResponseEntity.ok(callNotes);
    }

    /**
     * Get follow-up reminders for the agent
     */
    @GetMapping("/follow-ups")
    @Operation(summary = "Get follow-up reminders", description = "Retrieves all follow-up reminders for the authenticated agent")
    public ResponseEntity<List<CallNoteDto.FollowUpReminder>> getFollowUpReminders(
            Authentication authentication) {

        UUID agentId = UUID.fromString(authentication.getName());
        List<CallNoteDto.FollowUpReminder> reminders = callNoteService.getFollowUpReminders(agentId);
        return ResponseEntity.ok(reminders);
    }

    /**
     * Get overdue follow-ups for the agent
     */
    @GetMapping("/follow-ups/overdue")
    @Operation(summary = "Get overdue follow-ups", description = "Retrieves overdue follow-up reminders for the authenticated agent")
    public ResponseEntity<List<CallNoteDto.FollowUpReminder>> getOverdueFollowUps(
            Authentication authentication) {

        UUID agentId = UUID.fromString(authentication.getName());
        List<CallNoteDto.FollowUpReminder> overdue = callNoteService.getOverdueFollowUps(agentId);
        return ResponseEntity.ok(overdue);
    }

    /**
     * Get call notes summary for a specific client
     */
    @GetMapping("/client/{clientId}/summary")
    @Operation(summary = "Get client call notes summary", description = "Retrieves a comprehensive summary of call notes for a client")
    public ResponseEntity<CallNoteDto.BulkSummary> getClientCallNotesSummary(
            Authentication authentication,
            @Parameter(description = "Client ID") @PathVariable UUID clientId) {

        UUID agentId = UUID.fromString(authentication.getName());
        CallNoteDto.BulkSummary summary = callNoteService.getClientCallNotesSummary(agentId, clientId);
        return ResponseEntity.ok(summary);
    }

    // === SUMMARY GENERATION ENDPOINTS ===

    /**
     * Generate comprehensive communication summary for a client
     */
    @GetMapping("/client/{clientId}/summary/detailed")
    @Operation(summary = "Generate detailed client summary", description = "Generates a comprehensive communication summary for a client")
    public ResponseEntity<String> generateClientSummary(
            Authentication authentication,
            @Parameter(description = "Client ID") @PathVariable UUID clientId) {

        UUID agentId = UUID.fromString(authentication.getName());
        String summary = callNoteSummaryService.generateClientSummary(agentId, clientId);
        return ResponseEntity.ok(summary);
    }

    /**
     * Generate quick summary for a client
     */
    @GetMapping("/client/{clientId}/summary/quick")
    @Operation(summary = "Generate quick client summary", description = "Generates a quick summary of client communications")
    public ResponseEntity<String> generateQuickSummary(
            Authentication authentication,
            @Parameter(description = "Client ID") @PathVariable UUID clientId) {

        UUID agentId = UUID.fromString(authentication.getName());
        String summary = callNoteSummaryService.generateQuickSummary(agentId, clientId);
        return ResponseEntity.ok(summary);
    }

    /**
     * Generate timeline summary for a client
     */
    @GetMapping("/client/{clientId}/summary/timeline")
    @Operation(summary = "Generate timeline summary", description = "Generates a timeline view of client communications")
    public ResponseEntity<String> generateTimelineSummary(
            Authentication authentication,
            @Parameter(description = "Client ID") @PathVariable UUID clientId) {

        UUID agentId = UUID.fromString(authentication.getName());
        String summary = callNoteSummaryService.generateTimelineSummary(agentId, clientId);
        return ResponseEntity.ok(summary);
    }

    /**
     * Generate period-specific summary for a client
     */
    @GetMapping("/client/{clientId}/summary/period")
    @Operation(summary = "Generate period summary", description = "Generates a summary for a specific date range")
    public ResponseEntity<String> generatePeriodSummary(
            Authentication authentication,
            @Parameter(description = "Client ID") @PathVariable UUID clientId,
            @Parameter(description = "Start date (ISO format)") @RequestParam LocalDateTime startDate,
            @Parameter(description = "End date (ISO format)") @RequestParam LocalDateTime endDate) {

        UUID agentId = UUID.fromString(authentication.getName());
        String summary = callNoteSummaryService.generatePeriodSummary(agentId, clientId, startDate, endDate);
        return ResponseEntity.ok(summary);
    }
}