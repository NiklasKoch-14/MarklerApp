package com.marklerapp.crm.mapper;

import com.marklerapp.crm.dto.ViewingDto;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.Viewing;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ViewingMapper {

    @Mapping(target = "agentId", expression = "java(viewing.getAgent().getId())")
    @Mapping(target = "clientId", expression = "java(viewing.getClient().getId())")
    @Mapping(target = "clientName", expression = "java(viewing.getClient().getFullName())")
    @Mapping(target = "propertyId", expression = "java(viewing.getProperty().getId())")
    @Mapping(target = "propertyTitle", expression = "java(viewing.getProperty().getTitle())")
    @Mapping(target = "propertyAddress", expression = "java(buildPropertyAddress(viewing.getProperty()))")
    ViewingDto.Response toResponse(Viewing viewing);

    @Mapping(target = "clientId", expression = "java(viewing.getClient().getId())")
    @Mapping(target = "clientName", expression = "java(viewing.getClient().getFullName())")
    @Mapping(target = "propertyId", expression = "java(viewing.getProperty().getId())")
    @Mapping(target = "propertyTitle", expression = "java(viewing.getProperty().getTitle())")
    @Mapping(target = "propertyAddress", expression = "java(buildPropertyAddress(viewing.getProperty()))")
    ViewingDto.Summary toSummary(Viewing viewing);

    List<ViewingDto.Response> toResponseList(List<Viewing> viewings);

    List<ViewingDto.Summary> toSummaryList(List<Viewing> viewings);

    default String buildPropertyAddress(Property property) {
        if (property.getAddressCity() != null) {
            return property.getAddressCity() + ", " + property.getAddressPostalCode();
        }
        return property.getAddressStreet();
    }
}
