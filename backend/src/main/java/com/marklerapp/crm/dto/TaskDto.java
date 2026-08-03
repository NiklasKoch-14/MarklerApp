package com.marklerapp.crm.dto;

import com.marklerapp.crm.entity.Task;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class TaskDto {

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateRequest {
        private UUID clientId;
        private UUID propertyId;
        @NotBlank(message = "Title is required")
        @Size(max = 200)
        private String title;
        @Size(max = 2000)
        private String description;
        @NotNull(message = "Due date is required")
        private LocalDate dueDate;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateRequest {
        private UUID clientId;
        private UUID propertyId;
        @Size(max = 200)
        private String title;
        @Size(max = 2000)
        private String description;
        private LocalDate dueDate;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PostponeRequest {
        @NotNull(message = "Due date is required")
        private LocalDate dueDate;
    }

    /** Ohne outcome/note wird nur abgehakt; mit beidem entsteht zusaetzlich eine Notiz. */
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CompleteRequest {
        private com.marklerapp.crm.entity.CallNote.CallOutcome outcome;
        @Size(max = 5000)
        private String note;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private UUID id;
        private UUID clientId;
        private String clientName;
        private UUID propertyId;
        private String propertyTitle;
        private String title;
        private String description;
        private LocalDate dueDate;
        private Task.TaskStatus status;
        private LocalDateTime completedAt;
        private UUID sourceCallNoteId;
        private LocalDateTime createdAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Summary {
        private UUID id;
        private UUID clientId;
        private String clientName;
        private UUID propertyId;
        private String propertyTitle;
        private String title;
        private String description;
        private LocalDate dueDate;
        private Task.TaskStatus status;
    }
}
