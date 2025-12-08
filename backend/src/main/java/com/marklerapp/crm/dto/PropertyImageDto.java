package com.marklerapp.crm.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.marklerapp.crm.entity.PropertyImageType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for PropertyImage entity operations.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PropertyImageDto {

    private UUID id;
    private UUID propertyId;

    @NotBlank(message = "Filename is required")
    @Size(max = 255, message = "Filename must not exceed 255 characters")
    private String filename;

    @Size(max = 255, message = "Original filename must not exceed 255 characters")
    private String originalFilename;

    @Size(max = 100, message = "Content type must not exceed 100 characters")
    private String contentType;

    private Long fileSize;

    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    private Boolean isPrimary;
    private Integer sortOrder;
    private PropertyImageType imageType;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // URL for accessing the image (computed field)
    private String imageUrl;
    private String thumbnailUrl;
}