package com.marklerapp.crm.mapper;

import com.marklerapp.crm.dto.PropertyDto;
import com.marklerapp.crm.entity.Property;
import org.mapstruct.BeanMapping;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/**
 * MapStruct mapper for Property entity and PropertyDto conversions.
 *
 * <p>This mapper handles bidirectional mapping between Property entities and DTOs,
 * including nested PropertyImage collections and computed fields like formattedAddress
 * and calculatedPricePerSqm.</p>
 *
 * <p>Usage:
 * <pre>
 * {@code
 * @Autowired
 * private PropertyMapper propertyMapper;
 *
 * PropertyDto dto = propertyMapper.toDto(property);
 * Property entity = propertyMapper.toEntity(dto);
 * }
 * </pre>
 * </p>
 *
 * @see Property
 * @see PropertyDto
 * @see PropertyImageMapper
 */
@Mapper(componentModel = "spring", uses = {PropertyImageMapper.class})
public interface PropertyMapper {

    /**
     * Convert Property entity to DTO.
     * Maps all fields including nested images and computes formattedAddress and calculatedPricePerSqm.
     *
     * @param property the property entity
     * @return the property DTO
     */
    @Mapping(target = "agentId", source = "agent.id")
    @Mapping(target = "formattedAddress", expression = "java(property.getFormattedAddress())")
    @Mapping(target = "calculatedPricePerSqm", expression = "java(property.calculatePricePerSqm())")
    @Mapping(target = "mainImageUrl", expression = "java(getMainImageUrl(property))")
    @Mapping(target = "imageCount", expression = "java(getImageCount(property))")
    PropertyDto toDto(Property property);

    /**
     * Convert PropertyDto to entity.
     * Ignores computed fields, relationships, and audit timestamps.
     * The agent must be set separately after mapping.
     *
     * @param dto the property DTO
     * @return the property entity
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "agent", ignore = true)
    @Mapping(target = "images", ignore = true)
    @Mapping(target = "exposeFileData", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @BeanMapping(builder = @Builder(disableBuilder = true))
    Property toEntity(PropertyDto dto);

    /**
     * Convert list of Property entities to list of DTOs.
     *
     * @param properties the list of property entities
     * @return the list of property DTOs
     */
    List<PropertyDto> toDtoList(List<Property> properties);

    /**
     * Helper method to get main/primary image URL.
     *
     * @param property the property entity
     * @return URL of primary image or null if no images
     */
    default String getMainImageUrl(Property property) {
        if (property.getImages() == null || property.getImages().isEmpty()) {
            return null;
        }

        // Find primary image
        return property.getImages().stream()
            .filter(img -> Boolean.TRUE.equals(img.getIsPrimary()))
            .findFirst()
            .map(img -> {
                if (img.getImageData() != null) {
                    return "data:" + img.getContentType() + ";base64," + img.getImageData();
                }
                return null;
            })
            .orElseGet(() -> {
                // If no primary, return first image
                var firstImage = property.getImages().get(0);
                if (firstImage.getImageData() != null) {
                    return "data:" + firstImage.getContentType() + ";base64," + firstImage.getImageData();
                }
                return null;
            });
    }

    /**
     * Helper method to get image count.
     *
     * @param property the property entity
     * @return number of images or 0 if none
     */
    default Integer getImageCount(Property property) {
        if (property.getImages() == null) {
            return 0;
        }
        return property.getImages().size();
    }
}
