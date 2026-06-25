package com.marklerapp.crm.dto;

import com.marklerapp.crm.entity.PropertyNote;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

public class PropertyNoteDto {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {

        @NotNull(message = "Property ID is required")
        private UUID propertyId;

        @NotBlank(message = "Content is required")
        @Size(max = 5000, message = "Note must not exceed 5000 characters")
        private String content;

        private PropertyNote.NoteCategory category;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private UUID id;
        private UUID agentId;
        private UUID propertyId;
        private String content;
        private PropertyNote.NoteCategory category;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
