package com.marklerapp.crm.mapper;

import com.marklerapp.crm.constants.ValidationConstants;
import com.marklerapp.crm.dto.CallNoteDto;
import com.marklerapp.crm.entity.CallNote;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * MapStruct mapper for CallNote entity and CallNoteDto conversions.
 *
 * <p>This mapper handles mapping between CallNote entities and various CallNoteDto types:
 * <ul>
 *   <li>Response - Full detailed view with all fields and related entity names</li>
 *   <li>Summary - List view with preview of notes</li>
 *   <li>FollowUpReminder - Simplified view for follow-up management</li>
 * </ul>
 * </p>
 *
 * <p>Usage:
 * <pre>
 * {@code
 * @Autowired
 * private CallNoteMapper callNoteMapper;
 *
 * CallNoteDto.Response response = callNoteMapper.toResponse(callNote);
 * CallNoteDto.Summary summary = callNoteMapper.toSummary(callNote);
 * }
 * </pre>
 * </p>
 *
 * @see CallNote
 * @see CallNoteDto
 */
@Mapper(componentModel = "spring")
public interface CallNoteMapper {

    /**
     * Convert CallNote entity to Response DTO (detailed view).
     * Includes all fields and computes agent name, client name, property title, and property address.
     *
     * @param callNote the call note entity
     * @return the response DTO
     */
    @Mapping(target = "agentId", source = "agent.id")
    @Mapping(target = "agentName", expression = "java(callNote.getAgent().getFullName())")
    @Mapping(target = "clientId", source = "client.id")
    @Mapping(target = "clientName", expression = "java(callNote.getClient().getFullName())")
    @Mapping(target = "propertyId", source = "property.id")
    @Mapping(target = "propertyTitle", source = "property.title")
    @Mapping(target = "propertyAddress", expression = "java(getPropertyAddress(callNote))")
    CallNoteDto.Response toResponse(CallNote callNote);

    /**
     * Convert CallNote entity to Summary DTO (list view).
     * Includes preview of notes and essential fields for list display.
     *
     * @param callNote the call note entity
     * @return the summary DTO
     */
    @Mapping(target = "clientId", source = "client.id")
    @Mapping(target = "clientName", expression = "java(callNote.getClient().getFullName())")
    @Mapping(target = "propertyId", source = "property.id")
    @Mapping(target = "propertyTitle", source = "property.title")
    @Mapping(target = "notesSummary", expression = "java(createNotesSummary(callNote.getNotes()))")
    CallNoteDto.Summary toSummary(CallNote callNote);

    /**
     * Convert CallNote entity to FollowUpReminder DTO.
     * Includes computed fields for overdue status and days until due.
     *
     * @param callNote the call note entity
     * @return the follow-up reminder DTO
     */
    @Mapping(target = "clientId", source = "client.id")
    @Mapping(target = "clientName", expression = "java(callNote.getClient().getFullName())")
    @Mapping(target = "isOverdue", expression = "java(isFollowUpOverdue(callNote.getFollowUpDate()))")
    @Mapping(target = "daysUntilDue", expression = "java(calculateDaysUntilDue(callNote.getFollowUpDate()))")
    CallNoteDto.FollowUpReminder toFollowUpReminder(CallNote callNote);

    /**
     * Convert list of CallNote entities to list of Response DTOs.
     *
     * @param callNotes the list of call note entities
     * @return the list of response DTOs
     */
    List<CallNoteDto.Response> toResponseList(List<CallNote> callNotes);

    /**
     * Convert list of CallNote entities to list of Summary DTOs.
     *
     * @param callNotes the list of call note entities
     * @return the list of summary DTOs
     */
    List<CallNoteDto.Summary> toSummaryList(List<CallNote> callNotes);

    /**
     * Convert list of CallNote entities to list of FollowUpReminder DTOs.
     *
     * @param callNotes the list of call note entities
     * @return the list of follow-up reminder DTOs
     */
    List<CallNoteDto.FollowUpReminder> toFollowUpReminderList(List<CallNote> callNotes);

    /**
     * Helper method to create property address from property entity.
     *
     * @param callNote the call note entity
     * @return formatted property address or null if no property
     */
    default String getPropertyAddress(CallNote callNote) {
        if (callNote.getProperty() == null) {
            return null;
        }
        return callNote.getProperty().getAddressCity() + ", " +
               callNote.getProperty().getAddressPostalCode();
    }

    /**
     * Helper method to create notes summary (preview).
     * Truncates notes to preview length and adds ellipsis if needed.
     *
     * @param notes the full notes text
     * @return truncated notes preview
     */
    default String createNotesSummary(String notes) {
        if (notes == null || notes.isEmpty()) {
            return null;
        }
        if (notes.length() > ValidationConstants.NOTES_PREVIEW_LENGTH) {
            return notes.substring(0, ValidationConstants.NOTES_PREVIEW_LENGTH) + "...";
        }
        return notes;
    }

    /**
     * Helper method to check if follow-up date is overdue.
     *
     * @param followUpDate the follow-up date
     * @return true if overdue, false otherwise
     */
    default boolean isFollowUpOverdue(LocalDate followUpDate) {
        if (followUpDate == null) {
            return false;
        }
        return followUpDate.isBefore(LocalDate.now());
    }

    /**
     * Helper method to calculate days until follow-up is due.
     *
     * @param followUpDate the follow-up date
     * @return number of days until due (negative if overdue)
     */
    default long calculateDaysUntilDue(LocalDate followUpDate) {
        if (followUpDate == null) {
            return 0;
        }
        return ChronoUnit.DAYS.between(LocalDate.now(), followUpDate);
    }
}
