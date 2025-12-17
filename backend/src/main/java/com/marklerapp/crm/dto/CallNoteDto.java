package com.marklerapp.crm.dto;

import com.marklerapp.crm.entity.CallNote;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Data Transfer Objects for CallNote entity.
 * Contains request and response DTOs for different use cases.
 */
public class CallNoteDto {

    /**
     * DTO for creating a new call note
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotNull(message = "Client ID is required")
        private UUID clientId;

        @NotNull(message = "Call date is required")
        private LocalDateTime callDate;

        @Min(value = 0, message = "Duration must be positive")
        private Integer durationMinutes;

        @NotNull(message = "Call type is required")
        private CallNote.CallType callType;

        @NotBlank(message = "Subject is required")
        @Size(min = 5, max = 200, message = "Subject must be between 5 and 200 characters")
        private String subject;

        @NotBlank(message = "Notes are required")
        @Size(min = 10, max = 5000, message = "Notes must be between 10 and 5000 characters")
        private String notes;

        @Builder.Default
        private Boolean followUpRequired = false;

        private LocalDate followUpDate;

        @Size(max = 1000, message = "Properties discussed field too long")
        private String propertiesDiscussed;

        private CallNote.CallOutcome outcome;
    }

    /**
     * DTO for updating an existing call note
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        @NotNull(message = "Call date is required")
        private LocalDateTime callDate;

        @Min(value = 0, message = "Duration must be positive")
        private Integer durationMinutes;

        @NotNull(message = "Call type is required")
        private CallNote.CallType callType;

        @NotBlank(message = "Subject is required")
        @Size(min = 5, max = 200, message = "Subject must be between 5 and 200 characters")
        private String subject;

        @NotBlank(message = "Notes are required")
        @Size(min = 10, max = 5000, message = "Notes must be between 10 and 5000 characters")
        private String notes;

        @Builder.Default
        private Boolean followUpRequired = false;

        private LocalDate followUpDate;

        @Size(max = 1000, message = "Properties discussed field too long")
        private String propertiesDiscussed;

        private CallNote.CallOutcome outcome;
    }

    /**
     * DTO for call note responses (detailed view)
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private UUID id;
        private UUID agentId;
        private String agentName;
        private UUID clientId;
        private String clientName;
        private LocalDateTime callDate;
        private Integer durationMinutes;
        private CallNote.CallType callType;
        private String subject;
        private String notes;
        private Boolean followUpRequired;
        private LocalDate followUpDate;
        private String propertiesDiscussed;
        private CallNote.CallOutcome outcome;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    /**
     * DTO for call note summary (list view)
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private UUID id;
        private UUID clientId;
        private String clientName;
        private LocalDateTime callDate;
        private CallNote.CallType callType;
        private String subject;
        private String notesSummary;  // Preview of notes for list view
        private Boolean followUpRequired;
        private LocalDate followUpDate;
        private CallNote.CallOutcome outcome;
        private LocalDateTime createdAt;
    }

    /**
     * DTO for call note search filters
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchFilter {
        private UUID clientId;
        private CallNote.CallType callType;
        private CallNote.CallOutcome outcome;
        private LocalDateTime callDateFrom;
        private LocalDateTime callDateTo;
        private Boolean followUpRequired;
        private String searchTerm;
    }

    /**
     * DTO for bulk call notes summary
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BulkSummary {
        private UUID clientId;
        private String clientName;
        private long totalCallNotes;
        private LocalDateTime lastCallDate;
        private long pendingFollowUps;
        private String mostRecentSubject;
        private CallNote.CallOutcome lastOutcome;
    }

    /**
     * DTO for follow-up reminders
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FollowUpReminder {
        private UUID id;
        private UUID clientId;
        private String clientName;
        private String subject;
        private LocalDate followUpDate;
        private boolean isOverdue;
        private long daysUntilDue;
    }
}