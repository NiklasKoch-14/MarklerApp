package com.marklerapp.crm.mapper;

import com.marklerapp.crm.dto.FileAttachmentDto;
import com.marklerapp.crm.entity.FileAttachment;
import org.springframework.stereotype.Component;

/**
 * Mapper for converting FileAttachment entities to DTOs and vice versa.
 * Handles data URL generation and computed field population.
 *
 * @author Claude Sonnet 4.5
 * @since File Attachment Feature
 */
@Component
public class FileAttachmentMapper {

    /**
     * Convert FileAttachment entity to DTO without file data.
     * Used for listing attachments where full file data is not needed.
     *
     * @param attachment the file attachment entity
     * @return the file attachment DTO
     */
    public FileAttachmentDto toDto(FileAttachment attachment) {
        return toDto(attachment, false);
    }

    /**
     * Convert FileAttachment entity to DTO with optional file data.
     *
     * @param attachment the file attachment entity
     * @param includeFileData whether to include Base64 file data in DTO
     * @return the file attachment DTO
     */
    public FileAttachmentDto toDto(FileAttachment attachment, boolean includeFileData) {
        if (attachment == null) {
            return null;
        }

        FileAttachmentDto dto = FileAttachmentDto.builder()
            .id(attachment.getId())
            .propertyId(attachment.getProperty() != null ? attachment.getProperty().getId() : null)
            .clientId(attachment.getClient() != null ? attachment.getClient().getId() : null)
            .agentId(attachment.getAgent() != null ? attachment.getAgent().getId() : null)
            .fileName(attachment.getFileName())
            .originalFileName(attachment.getOriginalFileName())
            .fileSize(attachment.getFileSize())
            .mimeType(attachment.getMimeType())
            .fileType(attachment.getFileType())
            .description(attachment.getDescription())
            .uploadDate(attachment.getUploadDate())
            .createdAt(attachment.getCreatedAt())
            .updatedAt(attachment.getUpdatedAt())
            .build();

        // Set computed fields
        dto.setFileExtension(attachment.getFileExtension());
        dto.setFormattedFileSize(attachment.getFormattedFileSize());
        dto.setPdf(attachment.isPdf());
        dto.setImage(attachment.isImage());
        dto.setDocument(attachment.isDocument());

        // Set download URL (used by frontend to download file)
        dto.setDownloadUrl("/api/v1/attachments/" + attachment.getId() + "/download");

        // Include file data if requested (for direct display)
        if (includeFileData && attachment.getFileData() != null) {
            String dataUrl = "data:" + attachment.getMimeType() + ";base64," + attachment.getFileData();
            dto.setDataUrl(dataUrl);
        }

        return dto;
    }

    /**
     * Convert FileAttachment entity to DTO with file data included.
     * Used for download operations where full file data is needed.
     *
     * @param attachment the file attachment entity
     * @return the file attachment DTO with file data
     */
    public FileAttachmentDto toDtoWithFileData(FileAttachment attachment) {
        return toDto(attachment, true);
    }
}
