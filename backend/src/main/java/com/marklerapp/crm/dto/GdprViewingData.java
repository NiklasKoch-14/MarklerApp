package com.marklerapp.crm.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO representing a property viewing for GDPR export.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GdprViewingData {

    private UUID id;
    private UUID propertyId;
    private String propertyTitle;
    private String propertyAddress;
    private LocalDateTime viewingDate;
    private Integer durationMinutes;
    private String status;
    private String feedback;
    private String clientNotes;
    private String followUpAction;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
