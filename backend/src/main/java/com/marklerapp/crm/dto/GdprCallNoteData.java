package com.marklerapp.crm.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO representing call note data for GDPR export.
 * Includes all communication records between agent and clients.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GdprCallNoteData {

    private UUID id;
    private UUID clientId;
    private String clientFullName;
    private LocalDateTime callDate;
    private Integer durationMinutes;
    private String callType;
    private String subject;
    private String notes;
    private Boolean followUpRequired;
    private LocalDate followUpDate;
    private String propertiesDiscussed;
    private String outcome;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
