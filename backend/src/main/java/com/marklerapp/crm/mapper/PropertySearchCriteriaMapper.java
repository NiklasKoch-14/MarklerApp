package com.marklerapp.crm.mapper;

import com.marklerapp.crm.dto.PropertySearchCriteriaDto;
import com.marklerapp.crm.entity.PropertySearchCriteria;
import org.mapstruct.BeanMapping;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.util.Arrays;
import java.util.List;

/**
 * MapStruct mapper for PropertySearchCriteria entity and PropertySearchCriteriaDto conversions.
 *
 * <p>This mapper handles bidirectional mapping between PropertySearchCriteria entities and DTOs,
 * including array-to-list conversions for preferredLocations and propertyTypes.</p>
 *
 * <p>Usage:
 * <pre>
 * {@code
 * @Autowired
 * private PropertySearchCriteriaMapper searchCriteriaMapper;
 *
 * PropertySearchCriteriaDto dto = searchCriteriaMapper.toDto(criteria);
 * PropertySearchCriteria entity = searchCriteriaMapper.toEntity(dto);
 * }
 * </pre>
 * </p>
 *
 * @see PropertySearchCriteria
 * @see PropertySearchCriteriaDto
 */
@Mapper(componentModel = "spring")
public interface PropertySearchCriteriaMapper {

    /**
     * Convert PropertySearchCriteria entity to DTO.
     * Converts comma-separated strings to lists.
     *
     * @param criteria the search criteria entity
     * @return the search criteria DTO
     */
    @Mapping(target = "clientId", source = "client.id")
    @Mapping(target = "preferredLocations", expression = "java(arrayToList(criteria.getPreferredLocationsArray()))")
    @Mapping(target = "propertyTypes", expression = "java(arrayToList(criteria.getPropertyTypesArray()))")
    @Mapping(target = "hasBudgetConstraints", expression = "java(criteria.hasBudgetConstraints())")
    @Mapping(target = "hasSizeConstraints", expression = "java(criteria.hasSizeConstraints())")
    @Mapping(target = "hasRoomConstraints", expression = "java(criteria.hasRoomConstraints())")
    PropertySearchCriteriaDto toDto(PropertySearchCriteria criteria);

    /**
     * Convert PropertySearchCriteriaDto to entity.
     * Converts lists to comma-separated strings.
     *
     * @param dto the search criteria DTO
     * @return the search criteria entity
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "client", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "preferredLocations", expression = "java(listToString(dto.getPreferredLocations()))")
    @Mapping(target = "propertyTypes", expression = "java(listToString(dto.getPropertyTypes()))")
    @Mapping(target = "preferredLocationsArray", ignore = true)
    @Mapping(target = "propertyTypesArray", ignore = true)
    @BeanMapping(builder = @Builder(disableBuilder = true))
    PropertySearchCriteria toEntity(PropertySearchCriteriaDto dto);

    /**
     * Helper method to convert array to list.
     *
     * @param array the string array
     * @return the list of strings
     */
    default List<String> arrayToList(String[] array) {
        if (array == null || array.length == 0) {
            return null;
        }
        return Arrays.asList(array);
    }

    /**
     * Helper method to convert list to comma-separated string.
     *
     * @param list the list of strings
     * @return comma-separated string
     */
    default String listToString(List<String> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        return String.join(", ", list);
    }
}
