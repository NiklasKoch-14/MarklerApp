package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.constants.ValidationConstants;
import com.marklerapp.crm.dto.FileAttachmentDto;
import com.marklerapp.crm.dto.FileAttachmentUploadDto;
import com.marklerapp.crm.entity.*;
import com.marklerapp.crm.mapper.FileAttachmentMapper;
import com.marklerapp.crm.repository.ClientRepository;
import com.marklerapp.crm.repository.FileAttachmentRepository;
import com.marklerapp.crm.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for managing file attachment operations with comprehensive business logic.
 *
 * <p>This service provides:
 * <ul>
 *   <li>File upload with validation (size, type, format)</li>
 *   <li>File download with Base64 decoding</li>
 *   <li>File metadata management</li>
 *   <li>Agent ownership validation</li>
 *   <li>CRUD operations for attachments</li>
 * </ul>
 * </p>
 *
 * <p>Security: All operations validate that the agent owns the property or client
 * associated with the attachment before allowing modifications.</p>
 *
 * @see FileAttachment
 * @see FileAttachmentDto
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileAttachmentService {

    private final FileAttachmentRepository fileAttachmentRepository;
    private final PropertyRepository propertyRepository;
    private final ClientRepository clientRepository;
    private final FileAttachmentMapper fileAttachmentMapper;

    /**
     * Upload a file attachment for a property.
     *
     * @param propertyId the ID of the property
     * @param file the file to upload
     * @param uploadDto metadata for the attachment
     * @param agentId the ID of the agent uploading the file
     * @return the created file attachment DTO
     * @throws ResourceNotFoundException if property is not found or access denied
     * @throws IllegalArgumentException if file validation fails
     * @throws IOException if file operations fail
     */
    @Transactional
    public FileAttachmentDto uploadPropertyAttachment(
            UUID propertyId,
            MultipartFile file,
            FileAttachmentUploadDto uploadDto,
            UUID agentId) throws IOException {

        log.debug("Uploading attachment for property: {} by agent: {}", propertyId, agentId);

        // Validate property exists and agent has access
        Property property = getPropertyByIdAndValidateOwnership(propertyId, agentId);

        // Validate file
        validateAttachmentFile(file);

        // Convert file to Base64
        String base64Data = convertToBase64(file);

        // Determine file name
        String fileName = uploadDto.getCustomFileName() != null ?
            uploadDto.getCustomFileName() : generateUniqueFilename(file.getOriginalFilename());

        // Create file attachment entity
        FileAttachment attachment = FileAttachment.builder()
            .property(property)
            .agent(property.getAgent())
            .fileName(fileName)
            .originalFileName(file.getOriginalFilename())
            .fileData(base64Data)
            .fileSize(file.getSize())
            .mimeType(file.getContentType())
            .fileType(uploadDto.getFileType())
            .description(uploadDto.getDescription())
            .uploadDate(LocalDateTime.now())
            .build();

        // Save to database
        FileAttachment savedAttachment = fileAttachmentRepository.save(attachment);
        log.info("Uploaded attachment: {} for property: {}", savedAttachment.getId(), propertyId);

        return fileAttachmentMapper.toDto(savedAttachment);
    }

    /**
     * Upload a file attachment for a client.
     *
     * @param clientId the ID of the client
     * @param file the file to upload
     * @param uploadDto metadata for the attachment
     * @param agentId the ID of the agent uploading the file
     * @return the created file attachment DTO
     * @throws ResourceNotFoundException if client is not found or access denied
     * @throws IllegalArgumentException if file validation fails
     * @throws IOException if file operations fail
     */
    @Transactional
    public FileAttachmentDto uploadClientAttachment(
            UUID clientId,
            MultipartFile file,
            FileAttachmentUploadDto uploadDto,
            UUID agentId) throws IOException {

        log.debug("Uploading attachment for client: {} by agent: {}", clientId, agentId);

        // Validate client exists and agent has access
        Client client = getClientByIdAndValidateOwnership(clientId, agentId);

        // Validate file
        validateAttachmentFile(file);

        // Convert file to Base64
        String base64Data = convertToBase64(file);

        // Determine file name
        String fileName = uploadDto.getCustomFileName() != null ?
            uploadDto.getCustomFileName() : generateUniqueFilename(file.getOriginalFilename());

        // Create file attachment entity
        FileAttachment attachment = FileAttachment.builder()
            .client(client)
            .agent(client.getAgent())
            .fileName(fileName)
            .originalFileName(file.getOriginalFilename())
            .fileData(base64Data)
            .fileSize(file.getSize())
            .mimeType(file.getContentType())
            .fileType(uploadDto.getFileType())
            .description(uploadDto.getDescription())
            .uploadDate(LocalDateTime.now())
            .build();

        // Save to database
        FileAttachment savedAttachment = fileAttachmentRepository.save(attachment);
        log.info("Uploaded attachment: {} for client: {}", savedAttachment.getId(), clientId);

        return fileAttachmentMapper.toDto(savedAttachment);
    }

    /**
     * Get all attachments for a property.
     *
     * @param propertyId the ID of the property
     * @param agentId the ID of the agent requesting the attachments
     * @return list of file attachment DTOs
     * @throws ResourceNotFoundException if property is not found or access denied
     */
    @Transactional(readOnly = true)
    public List<FileAttachmentDto> getPropertyAttachments(UUID propertyId, UUID agentId) {
        log.debug("Getting attachments for property: {} by agent: {}", propertyId, agentId);

        // Validate property exists and agent has access
        Property property = getPropertyByIdAndValidateOwnership(propertyId, agentId);

        // Fetch attachments
        List<FileAttachment> attachments = fileAttachmentRepository
            .findByPropertyOrderByUploadDateDesc(property);

        return attachments.stream()
            .map(fileAttachmentMapper::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Get all attachments for a client.
     *
     * @param clientId the ID of the client
     * @param agentId the ID of the agent requesting the attachments
     * @return list of file attachment DTOs
     * @throws ResourceNotFoundException if client is not found or access denied
     */
    @Transactional(readOnly = true)
    public List<FileAttachmentDto> getClientAttachments(UUID clientId, UUID agentId) {
        log.debug("Getting attachments for client: {} by agent: {}", clientId, agentId);

        // Validate client exists and agent has access
        Client client = getClientByIdAndValidateOwnership(clientId, agentId);

        // Fetch attachments
        List<FileAttachment> attachments = fileAttachmentRepository
            .findByClientOrderByUploadDateDesc(client);

        return attachments.stream()
            .map(fileAttachmentMapper::toDto)
            .collect(Collectors.toList());
    }

    /**
     * Download a file attachment (returns DTO with file data).
     *
     * @param attachmentId the ID of the attachment
     * @param agentId the ID of the agent downloading the file
     * @return the file attachment DTO with file data
     * @throws ResourceNotFoundException if attachment is not found or access denied
     */
    @Transactional(readOnly = true)
    public FileAttachmentDto downloadAttachment(UUID attachmentId, UUID agentId) {
        log.debug("Downloading attachment: {} by agent: {}", attachmentId, agentId);

        // Fetch attachment and validate ownership
        FileAttachment attachment = getAttachmentByIdAndValidateOwnership(attachmentId, agentId);

        // Return DTO with file data included
        return fileAttachmentMapper.toDtoWithFileData(attachment);
    }

    /**
     * Delete a file attachment.
     *
     * @param attachmentId the ID of the attachment to delete
     * @param agentId the ID of the agent deleting the attachment
     * @throws ResourceNotFoundException if attachment is not found or access denied
     */
    @Transactional
    public void deleteAttachment(UUID attachmentId, UUID agentId) {
        log.debug("Deleting attachment: {} by agent: {}", attachmentId, agentId);

        // Fetch attachment and validate ownership
        FileAttachment attachment = getAttachmentByIdAndValidateOwnership(attachmentId, agentId);

        // Delete from database
        fileAttachmentRepository.delete(attachment);
        log.info("Deleted attachment: {}", attachmentId);
    }

    /**
     * Update attachment metadata (not the file itself).
     *
     * @param attachmentId the ID of the attachment
     * @param uploadDto the updated metadata
     * @param agentId the ID of the agent updating the attachment
     * @return the updated file attachment DTO
     * @throws ResourceNotFoundException if attachment is not found or access denied
     */
    @Transactional
    public FileAttachmentDto updateAttachmentMetadata(
            UUID attachmentId,
            FileAttachmentUploadDto uploadDto,
            UUID agentId) {

        log.debug("Updating attachment metadata: {} by agent: {}", attachmentId, agentId);

        // Fetch attachment and validate ownership
        FileAttachment attachment = getAttachmentByIdAndValidateOwnership(attachmentId, agentId);

        // Update metadata fields
        if (uploadDto.getFileType() != null) {
            attachment.setFileType(uploadDto.getFileType());
        }
        if (uploadDto.getDescription() != null) {
            attachment.setDescription(uploadDto.getDescription());
        }
        if (uploadDto.getCustomFileName() != null) {
            attachment.setFileName(uploadDto.getCustomFileName());
        }

        // Save updated attachment
        FileAttachment updatedAttachment = fileAttachmentRepository.save(attachment);
        log.info("Updated attachment metadata: {}", attachmentId);

        return fileAttachmentMapper.toDto(updatedAttachment);
    }

    // ========================================
    // Private Helper Methods
    // ========================================

    /**
     * Convert MultipartFile to Base64 string
     */
    private String convertToBase64(MultipartFile file) throws IOException {
        byte[] bytes = file.getBytes();
        return Base64.getEncoder().encodeToString(bytes);
    }

    /**
     * Generate unique filename with UUID prefix
     */
    private String generateUniqueFilename(String originalFilename) {
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        return UUID.randomUUID().toString() + extension;
    }

    /**
     * Validate attachment file
     */
    private void validateAttachmentFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        // Check file size (max 10MB)
        if (file.getSize() > ValidationConstants.MAX_ATTACHMENT_SIZE_BYTES) {
            throw new IllegalArgumentException(
                String.format("File size exceeds maximum limit of %d MB",
                    ValidationConstants.MAX_ATTACHMENT_SIZE_BYTES / (1024 * 1024))
            );
        }

        // Check content type
        String contentType = file.getContentType();
        if (contentType == null) {
            throw new IllegalArgumentException("File content type is missing");
        }

        // Check supported formats
        boolean isValidMimeType = Arrays.stream(ValidationConstants.ALLOWED_ATTACHMENT_MIME_TYPES)
            .anyMatch(contentType::equals);

        if (!isValidMimeType) {
            throw new IllegalArgumentException(
                "Unsupported file format. Supported: PDF, Word, Excel, JPEG, PNG, GIF"
            );
        }
    }

    /**
     * Get property by ID and validate agent ownership.
     */
    private Property getPropertyByIdAndValidateOwnership(UUID propertyId, UUID agentId) {
        Property property = propertyRepository.findById(propertyId)
            .orElseThrow(() -> new ResourceNotFoundException("Property", "id", propertyId));

        // Validate ownership
        if (!property.getAgent().getId().equals(agentId)) {
            log.warn("Agent {} attempted to access property {} owned by agent {}",
                agentId, propertyId, property.getAgent().getId());
            throw new ResourceNotFoundException("Property not found or access denied");
        }

        return property;
    }

    /**
     * Get client by ID and validate agent ownership.
     */
    private Client getClientByIdAndValidateOwnership(UUID clientId, UUID agentId) {
        Client client = clientRepository.findById(clientId)
            .orElseThrow(() -> new ResourceNotFoundException("Client", "id", clientId));

        // Validate ownership
        if (!client.getAgent().getId().equals(agentId)) {
            log.warn("Agent {} attempted to access client {} owned by agent {}",
                agentId, clientId, client.getAgent().getId());
            throw new ResourceNotFoundException("Client not found or access denied");
        }

        return client;
    }

    /**
     * Get attachment by ID and validate agent ownership.
     */
    private FileAttachment getAttachmentByIdAndValidateOwnership(UUID attachmentId, UUID agentId) {
        FileAttachment attachment = fileAttachmentRepository.findById(attachmentId)
            .orElseThrow(() -> new ResourceNotFoundException("FileAttachment", "id", attachmentId));

        // Validate ownership
        if (!attachment.getAgent().getId().equals(agentId)) {
            log.warn("Agent {} attempted to access attachment {} owned by agent {}",
                agentId, attachmentId, attachment.getAgent().getId());
            throw new ResourceNotFoundException("Attachment not found or access denied");
        }

        return attachment;
    }
}
