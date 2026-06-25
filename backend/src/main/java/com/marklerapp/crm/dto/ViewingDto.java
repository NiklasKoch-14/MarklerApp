package com.marklerapp.crm.dto;

import com.marklerapp.crm.entity.Viewing;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

public class ViewingDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {

        @NotNull(message = "Client ID is required")
        private UUID clientId;

        @NotNull(message = "Property ID is required")
        private UUID propertyId;

        @NotNull(message = "Viewing date is required")
        private LocalDateTime viewingDate;

        @Min(value = 0, message = "Duration must be positive")
        private Integer durationMinutes;

        private Viewing.ViewingFeedback feedback;

        @Size(max = 2000, message = "Notes must not exceed 2000 characters")
        private String clientNotes;

        @Size(max = 500, message = "Follow-up action must not exceed 500 characters")
        private String followUpAction;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {

        @NotNull(message = "Viewing date is required")
        private LocalDateTime viewingDate;

        @Min(value = 0, message = "Duration must be positive")
        private Integer durationMinutes;

        private Viewing.ViewingStatus status;
        private Viewing.ViewingFeedback feedback;

        @Size(max = 2000, message = "Notes must not exceed 2000 characters")
        private String clientNotes;

        @Size(max = 500, message = "Follow-up action must not exceed 500 characters")
        private String followUpAction;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private UUID id;
        private UUID agentId;
        private UUID clientId;
        private String clientName;
        private UUID propertyId;
        private String propertyTitle;
        private String propertyAddress;
        private LocalDateTime viewingDate;
        private Integer durationMinutes;
        private Viewing.ViewingStatus status;
        private Viewing.ViewingFeedback feedback;
        private String clientNotes;
        private String followUpAction;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private UUID id;
        private UUID clientId;
        private String clientName;
        private UUID propertyId;
        private String propertyTitle;
        private String propertyAddress;
        private LocalDateTime viewingDate;
        private Viewing.ViewingStatus status;
        private Viewing.ViewingFeedback feedback;
        private LocalDateTime createdAt;
    }
}
