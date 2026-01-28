package com.marklerapp.crm.dto;

import com.marklerapp.crm.entity.FileAttachmentType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Data Transfer Object for uploading file attachments.
 * Used for multipart file upload requests with metadata.
 *
 * @author Claude Sonnet 4.5
 * @since File Attachment Feature
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileAttachmentUploadDto {

    @NotNull(message = "File type is required")
    private FileAttachmentType fileType;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    // Optional: Allow specifying a custom file name
    @Size(max = 255, message = "File name must not exceed 255 characters")
    private String customFileName;
}
