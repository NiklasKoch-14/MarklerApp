package com.marklerapp.crm.dto;

import com.marklerapp.crm.entity.FileAttachmentType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Data Transfer Object for FileAttachment entity.
 * Used for API responses containing file attachment information.
 *
 * @author Claude Sonnet 4.5
 * @since File Attachment Feature
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileAttachmentDto {

    private UUID id;

    private UUID propertyId;

    private UUID clientId;

    private UUID agentId;

    private String fileName;

    private String originalFileName;

    private Long fileSize;

    private String formattedFileSize;

    private String mimeType;

    private FileAttachmentType fileType;

    private String description;

    private LocalDateTime uploadDate;

    private String fileExtension;

    // Download URL (for frontend to download file)
    private String downloadUrl;

    // Data URL for direct display (only for images, not included by default for large files)
    private String dataUrl;

    // Computed flags
    private boolean isPdf;

    private boolean isImage;

    private boolean isDocument;

    // Audit fields
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
