package com.marklerapp.crm.entity;

import com.marklerapp.crm.constants.ValidationConstants;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity representing a file attachment associated with a property or client.
 * Supports multiple document types (contracts, floor plans, ID documents, certificates, etc.)
 * Stores file data as Base64 encoded string in database (consistent with PropertyImage pattern).
 *
 * <p>Security: Each attachment belongs to an agent and is validated for ownership
 * before any operations. Supports GDPR compliance through audit logging.</p>
 *
 * @author Claude Sonnet 4.5
 * @since File Attachment Feature
 */
@Entity
@Table(name = "file_attachments", indexes = {
    @Index(name = "idx_file_attachment_property", columnList = "property_id"),
    @Index(name = "idx_file_attachment_client", columnList = "client_id"),
    @Index(name = "idx_file_attachment_agent", columnList = "agent_id"),
    @Index(name = "idx_file_attachment_type", columnList = "file_type"),
    @Index(name = "idx_file_attachment_upload_date", columnList = "upload_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileAttachment extends BaseEntity {

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", foreignKey = @ForeignKey(name = "fk_file_attachment_property"))
    private Property property;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", foreignKey = @ForeignKey(name = "fk_file_attachment_client"))
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agent_id", nullable = false, foreignKey = @ForeignKey(name = "fk_file_attachment_agent"))
    @NotNull(message = "Agent is required")
    private Agent agent;

    // File Information
    @Column(name = "file_name", nullable = false, length = 255)
    @NotBlank(message = "File name is required")
    @Size(min = 1, max = 255, message = "File name must be between 1 and 255 characters")
    private String fileName;

    @Column(name = "original_file_name", length = 255)
    @Size(max = 255, message = "Original file name must not exceed 255 characters")
    private String originalFileName;

    // Base64 File Data (stored directly in database)
    @Lob
    @Column(name = "file_data", columnDefinition = "TEXT", nullable = false)
    @NotBlank(message = "File data is required")
    private String fileData;

    @Column(name = "file_size", nullable = false)
    @NotNull(message = "File size is required")
    @Min(value = 1, message = "File size must be positive")
    @Max(value = ValidationConstants.MAX_ATTACHMENT_SIZE_BYTES,
         message = "File size cannot exceed 10MB")
    private Long fileSize;

    @Column(name = "mime_type", nullable = false, length = 100)
    @NotBlank(message = "MIME type is required")
    @Size(min = 3, max = 100, message = "MIME type must be between 3 and 100 characters")
    private String mimeType;

    // File Categorization
    @Column(name = "file_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    @NotNull(message = "File type is required")
    @Builder.Default
    private FileAttachmentType fileType = FileAttachmentType.OTHER;

    // Optional Metadata
    @Column(name = "description", length = 500)
    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    @Column(name = "upload_date", nullable = false)
    @NotNull(message = "Upload date is required")
    @Builder.Default
    private LocalDateTime uploadDate = LocalDateTime.now();

    /**
     * Get file extension from file name
     */
    public String getFileExtension() {
        if (fileName == null || !fileName.contains(".")) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase();
    }

    /**
     * Check if the file is a PDF document
     */
    public boolean isPdf() {
        return mimeType != null && mimeType.equals("application/pdf");
    }

    /**
     * Check if the file is an image
     */
    public boolean isImage() {
        return mimeType != null && mimeType.startsWith("image/");
    }

    /**
     * Check if the file is a document (Word, Excel)
     */
    public boolean isDocument() {
        return mimeType != null && (
            mimeType.contains("msword") ||
            mimeType.contains("wordprocessingml") ||
            mimeType.contains("excel") ||
            mimeType.contains("spreadsheetml")
        );
    }

    /**
     * Get file size in a human-readable format
     */
    public String getFormattedFileSize() {
        if (fileSize == null) {
            return "0 B";
        }

        double size = fileSize.doubleValue();
        String[] units = {"B", "KB", "MB", "GB"};
        int unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return String.format("%.2f %s", size, units[unitIndex]);
    }

    /**
     * Validate that the attachment is associated with either a property or client
     */
    @PrePersist
    @PreUpdate
    private void validateAttachmentRelationship() {
        if (property == null && client == null) {
            throw new IllegalStateException(
                "File attachment must be associated with either a property or a client"
            );
        }
    }

    @Override
    public String toString() {
        return "FileAttachment{" +
                "id=" + getId() +
                ", fileName='" + fileName + '\'' +
                ", fileType=" + fileType +
                ", fileSize=" + fileSize +
                ", mimeType='" + mimeType + '\'' +
                ", uploadDate=" + uploadDate +
                '}';
    }
}
