package com.marklerapp.crm.mapper;

import com.marklerapp.crm.dto.PropertyImageDto;
import com.marklerapp.crm.entity.PropertyImage;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/**
 * MapStruct mapper for PropertyImage entity and PropertyImageDto conversions.
 *
 * <p>This mapper handles bidirectional mapping between PropertyImage entities and DTOs,
 * including computed fields like imageUrl, thumbnailUrl, formattedFileSize, fileExtension,
 * and aspectRatio.</p>
 *
 * <p>Usage:
 * <pre>
 * {@code
 * @Autowired
 * private PropertyImageMapper propertyImageMapper;
 *
 * PropertyImageDto dto = propertyImageMapper.toDto(propertyImage);
 * PropertyImage entity = propertyImageMapper.toEntity(dto);
 * }
 * </pre>
 * </p>
 *
 * @see PropertyImage
 * @see PropertyImageDto
 */
@Mapper(componentModel = "spring")
public interface PropertyImageMapper {

    /**
     * Convert PropertyImage entity to DTO.
     * Maps all fields and computes imageUrl, thumbnailUrl, formattedFileSize, fileExtension, and aspectRatio.
     *
     * @param image the property image entity
     * @return the property image DTO
     */
    @Mapping(target = "propertyId", source = "property.id")
    @Mapping(target = "fileExtension", expression = "java(image.getFileExtension())")
    @Mapping(target = "formattedFileSize", expression = "java(image.getFormattedFileSize())")
    @Mapping(target = "aspectRatio", expression = "java(image.getAspectRatio())")
    @Mapping(target = "imageUrl", expression = "java(createImageUrl(image))")
    @Mapping(target = "thumbnailUrl", expression = "java(createThumbnailUrl(image))")
    PropertyImageDto toDto(PropertyImage image);

    /**
     * Convert PropertyImageDto to entity.
     * Ignores computed fields and relationships.
     *
     * @param dto the property image DTO
     * @return the property image entity
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "property", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "imageData", ignore = true)
    @Mapping(target = "thumbnailData", ignore = true)
    PropertyImage toEntity(PropertyImageDto dto);

    /**
     * Convert list of PropertyImage entities to list of DTOs.
     *
     * @param images the list of property image entities
     * @return the list of property image DTOs
     */
    List<PropertyImageDto> toDtoList(List<PropertyImage> images);

    /**
     * Helper method to create Base64 data URL for full-size image.
     *
     * @param image the property image entity
     * @return Base64 data URL or null if no image data
     */
    default String createImageUrl(PropertyImage image) {
        if (image.getImageData() == null) {
            return null;
        }
        return "data:" + image.getContentType() + ";base64," + image.getImageData();
    }

    /**
     * Helper method to create Base64 data URL for thumbnail.
     *
     * @param image the property image entity
     * @return Base64 data URL or null if no thumbnail data
     */
    default String createThumbnailUrl(PropertyImage image) {
        if (image.getThumbnailData() == null) {
            return null;
        }
        return "data:" + image.getContentType() + ";base64," + image.getThumbnailData();
    }
}
