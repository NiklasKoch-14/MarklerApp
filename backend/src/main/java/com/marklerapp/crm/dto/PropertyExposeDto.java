package com.marklerapp.crm.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for Property Expose (brochure/PDF document) operations.
 * Used for uploading, downloading, and managing property expose documents.
 *
 * <p>This DTO handles property brochure PDFs with validation for file type and size.</p>
 *
 * @see com.marklerapp.crm.entity.Property
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PropertyExposeDto {

    /**
     * Property to which this expose belongs
     */
    private UUID propertyId;

    /**
     * Original filename as uploaded by user
     */
    @NotBlank(message = "Filename is required")
    @Size(max = 255, message = "Filename must not exceed 255 characters")
    @Pattern(regexp = "^.*\\.pdf$", message = "File must be a PDF", flags = Pattern.Flag.CASE_INSENSITIVE)
    private String fileName;

    /**
     * Base64 encoded PDF data
     * Included in download responses but can be omitted in other responses
     */
    @NotBlank(message = "File data is required", groups = OnCreate.class)
    private String fileData;

    /**
     * File size in bytes
     */
    @NotNull(message = "File size is required")
    @Min(value = 1, message = "File size must be greater than 0")
    @Max(value = 52428800, message = "File size must not exceed 50MB") // 50MB limit
    private Long fileSize;

    /**
     * Timestamp when the expose was uploaded (read-only)
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private LocalDateTime uploadedAt;

    /**
     * Formatted file size (e.g., "2.5 MB") (computed field)
     */
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    private String formattedFileSize;

    /**
     * Get file size in a human-readable format (computed field).
     *
     * @return formatted file size (e.g., "2.5 MB")
     */
    public String getFormattedFileSize() {
        if (formattedFileSize != null) {
            return formattedFileSize;
        }

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

    // ========================================
    // Validation Groups
    // ========================================

    /**
     * Validation group for create operations
     */
    public interface OnCreate {}

    /**
     * Validation group for update operations
     */
    public interface OnUpdate {}
}
