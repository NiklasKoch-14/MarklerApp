package com.marklerapp.crm.controller;

import com.marklerapp.crm.dto.FileAttachmentDto;
import com.marklerapp.crm.dto.FileAttachmentUploadDto;
import com.marklerapp.crm.service.FileAttachmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * REST Controller for managing file attachments.
 * Provides endpoints for uploading, downloading, and managing documents
 * associated with properties and clients.
 *
 * <p>All endpoints require JWT authentication and validate agent ownership
 * before allowing operations.</p>
 *
 * @author Claude Sonnet 4.5
 * @since File Attachment Feature
 */
@Slf4j
@RestController
@RequestMapping("/attachments")
@RequiredArgsConstructor
@Tag(name = "File Attachments", description = "APIs for managing property and client document attachments")
@SecurityRequirement(name = "bearerAuth")
public class FileAttachmentController extends BaseController {

    private final FileAttachmentService fileAttachmentService;

    // ========================================
    // Property Attachment Endpoints
    // ========================================

    @PostMapping(value = "/properties/{propertyId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
        summary = "Upload file attachment for property",
        description = "Upload a document (contract, floor plan, certificate, etc.) and associate it with a property"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "File uploaded successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid file or validation error"),
        @ApiResponse(responseCode = "404", description = "Property not found or access denied"),
        @ApiResponse(responseCode = "413", description = "File size exceeds limit")
    })
    public ResponseEntity<FileAttachmentDto> uploadPropertyAttachment(
            @Parameter(description = "Property ID") @PathVariable UUID propertyId,
            @Parameter(description = "File to upload") @RequestParam("file") MultipartFile file,
            @Parameter(description = "File type") @RequestParam("fileType") String fileType,
            @Parameter(description = "File description (optional)") @RequestParam(required = false) String description,
            @Parameter(description = "Custom file name (optional)") @RequestParam(required = false) String customFileName,
            Authentication authentication) throws IOException {

        log.info("Request to upload attachment for property: {}", propertyId);

        UUID agentId = getAgentIdFromAuth(authentication);

        // Build upload DTO
        FileAttachmentUploadDto uploadDto = FileAttachmentUploadDto.builder()
            .fileType(com.marklerapp.crm.entity.FileAttachmentType.valueOf(fileType))
            .description(description)
            .customFileName(customFileName)
            .build();

        FileAttachmentDto result = fileAttachmentService.uploadPropertyAttachment(
            propertyId, file, uploadDto, agentId
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/properties/{propertyId}")
    @Operation(
        summary = "Get all attachments for property",
        description = "Retrieve list of all file attachments associated with a property"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Attachments retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Property not found or access denied")
    })
    public ResponseEntity<List<FileAttachmentDto>> getPropertyAttachments(
            @Parameter(description = "Property ID") @PathVariable UUID propertyId,
            Authentication authentication) {

        log.info("Request to get attachments for property: {}", propertyId);

        UUID agentId = getAgentIdFromAuth(authentication);
        List<FileAttachmentDto> attachments = fileAttachmentService.getPropertyAttachments(
            propertyId, agentId
        );

        return ResponseEntity.ok(attachments);
    }

    // ========================================
    // Client Attachment Endpoints
    // ========================================

    @PostMapping(value = "/clients/{clientId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
        summary = "Upload file attachment for client",
        description = "Upload a document (ID document, financial document, etc.) and associate it with a client"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "File uploaded successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid file or validation error"),
        @ApiResponse(responseCode = "404", description = "Client not found or access denied"),
        @ApiResponse(responseCode = "413", description = "File size exceeds limit")
    })
    public ResponseEntity<FileAttachmentDto> uploadClientAttachment(
            @Parameter(description = "Client ID") @PathVariable UUID clientId,
            @Parameter(description = "File to upload") @RequestParam("file") MultipartFile file,
            @Parameter(description = "File type") @RequestParam("fileType") String fileType,
            @Parameter(description = "File description (optional)") @RequestParam(required = false) String description,
            @Parameter(description = "Custom file name (optional)") @RequestParam(required = false) String customFileName,
            Authentication authentication) throws IOException {

        log.info("Request to upload attachment for client: {}", clientId);

        UUID agentId = getAgentIdFromAuth(authentication);

        // Build upload DTO
        FileAttachmentUploadDto uploadDto = FileAttachmentUploadDto.builder()
            .fileType(com.marklerapp.crm.entity.FileAttachmentType.valueOf(fileType))
            .description(description)
            .customFileName(customFileName)
            .build();

        FileAttachmentDto result = fileAttachmentService.uploadClientAttachment(
            clientId, file, uploadDto, agentId
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/clients/{clientId}")
    @Operation(
        summary = "Get all attachments for client",
        description = "Retrieve list of all file attachments associated with a client"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Attachments retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Client not found or access denied")
    })
    public ResponseEntity<List<FileAttachmentDto>> getClientAttachments(
            @Parameter(description = "Client ID") @PathVariable UUID clientId,
            Authentication authentication) {

        log.info("Request to get attachments for client: {}", clientId);

        UUID agentId = getAgentIdFromAuth(authentication);
        List<FileAttachmentDto> attachments = fileAttachmentService.getClientAttachments(
            clientId, agentId
        );

        return ResponseEntity.ok(attachments);
    }

    // ========================================
    // General Attachment Endpoints
    // ========================================

    @GetMapping("/{attachmentId}/download")
    @Operation(
        summary = "Download file attachment",
        description = "Download a file attachment by ID. Returns the file data as Base64 in the response."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "File downloaded successfully"),
        @ApiResponse(responseCode = "404", description = "Attachment not found or access denied")
    })
    public ResponseEntity<FileAttachmentDto> downloadAttachment(
            @Parameter(description = "Attachment ID") @PathVariable UUID attachmentId,
            Authentication authentication) {

        log.info("Request to download attachment: {}", attachmentId);

        UUID agentId = getAgentIdFromAuth(authentication);
        FileAttachmentDto attachment = fileAttachmentService.downloadAttachment(
            attachmentId, agentId
        );

        return ResponseEntity.ok(attachment);
    }

    @DeleteMapping("/{attachmentId}")
    @Operation(
        summary = "Delete file attachment",
        description = "Permanently delete a file attachment"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "File deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Attachment not found or access denied")
    })
    public ResponseEntity<Void> deleteAttachment(
            @Parameter(description = "Attachment ID") @PathVariable UUID attachmentId,
            Authentication authentication) {

        log.info("Request to delete attachment: {}", attachmentId);

        UUID agentId = getAgentIdFromAuth(authentication);
        fileAttachmentService.deleteAttachment(attachmentId, agentId);

        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{attachmentId}/metadata")
    @Operation(
        summary = "Update attachment metadata",
        description = "Update the file type, description, or name of an existing attachment (does not modify the file itself)"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Metadata updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid metadata"),
        @ApiResponse(responseCode = "404", description = "Attachment not found or access denied")
    })
    public ResponseEntity<FileAttachmentDto> updateAttachmentMetadata(
            @Parameter(description = "Attachment ID") @PathVariable UUID attachmentId,
            @Valid @RequestBody FileAttachmentUploadDto uploadDto,
            Authentication authentication) {

        log.info("Request to update metadata for attachment: {}", attachmentId);

        UUID agentId = getAgentIdFromAuth(authentication);
        FileAttachmentDto result = fileAttachmentService.updateAttachmentMetadata(
            attachmentId, uploadDto, agentId
        );

        return ResponseEntity.ok(result);
    }
}
