package com.marklerapp.crm.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Entity representing images associated with properties.
 * Supports multiple images per property with metadata.
 */
@Entity
@Table(name = "property_images")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyImage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @Column(name = "filename", nullable = false)
    @NotBlank(message = "Filename is required")
    @Size(max = 255, message = "Filename must not exceed 255 characters")
    private String filename;

    @Column(name = "original_filename")
    @Size(max = 255, message = "Original filename must not exceed 255 characters")
    private String originalFilename;

    @Column(name = "content_type")
    @Size(max = 100, message = "Content type must not exceed 100 characters")
    private String contentType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "title")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    @Column(name = "description")
    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    @Column(name = "is_primary")
    @Builder.Default
    private Boolean isPrimary = false;

    @Column(name = "sort_order")
    @Builder.Default
    private Integer sortOrder = 0;

    @Column(name = "image_type")
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private PropertyImageType imageType = PropertyImageType.GENERAL;

    @Override
    public String toString() {
        return "PropertyImage{" +
                "id=" + getId() +
                ", filename='" + filename + '\'' +
                ", title='" + title + '\'' +
                ", isPrimary=" + isPrimary +
                ", imageType=" + imageType +
                '}';
    }
}