package com.marklerapp.crm.mapper;

import com.marklerapp.crm.dto.PropertyNoteDto;
import com.marklerapp.crm.entity.PropertyNote;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface PropertyNoteMapper {

    @Mapping(target = "agentId", expression = "java(note.getAgent().getId())")
    @Mapping(target = "propertyId", expression = "java(note.getProperty().getId())")
    PropertyNoteDto.Response toResponse(PropertyNote note);

    List<PropertyNoteDto.Response> toResponseList(List<PropertyNote> notes);
}
