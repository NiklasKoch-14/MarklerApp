package com.marklerapp.crm.mapper;

import com.marklerapp.crm.dto.TaskDto;
import com.marklerapp.crm.entity.Task;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TaskMapper {

    @Mapping(target = "clientId", source = "client.id")
    @Mapping(target = "clientName", source = "client.fullName")
    @Mapping(target = "propertyId", source = "property.id")
    @Mapping(target = "propertyTitle", source = "property.title")
    @Mapping(target = "sourceCallNoteId", source = "sourceCallNote.id")
    TaskDto.Response toResponse(Task task);

    @Mapping(target = "clientId", source = "client.id")
    @Mapping(target = "clientName", source = "client.fullName")
    @Mapping(target = "propertyId", source = "property.id")
    @Mapping(target = "propertyTitle", source = "property.title")
    TaskDto.Summary toSummary(Task task);

    List<TaskDto.Summary> toSummaryList(List<Task> tasks);
}
