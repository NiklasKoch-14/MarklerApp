package com.marklerapp.crm.controller;

import com.marklerapp.crm.dto.PropertyNoteDto;
import com.marklerapp.crm.service.PropertyNoteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/property-notes")
@RequiredArgsConstructor
@Tag(name = "Property Notes", description = "Internal notes for properties")
public class PropertyNoteController extends BaseController {

    private final PropertyNoteService propertyNoteService;

    @PostMapping
    @Operation(summary = "Add an internal note to a property")
    public ResponseEntity<PropertyNoteDto.Response> createNote(
            @Valid @RequestBody PropertyNoteDto.CreateRequest request,
            Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(propertyNoteService.createNote(agentId, request));
    }

    @DeleteMapping("/{noteId}")
    @Operation(summary = "Delete a property note")
    public ResponseEntity<Void> deleteNote(
            @PathVariable UUID noteId,
            Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        propertyNoteService.deleteNote(agentId, noteId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/property/{propertyId}")
    @Operation(summary = "Get all notes for a property")
    public ResponseEntity<List<PropertyNoteDto.Response>> getNotesByProperty(
            @PathVariable UUID propertyId,
            Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        return ResponseEntity.ok(propertyNoteService.getNotesByProperty(agentId, propertyId));
    }
}
