package com.marklerapp.crm.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "viewings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Viewing extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    @NotNull(message = "Agent is required")
    private Agent agent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    @NotNull(message = "Client is required")
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    @NotNull(message = "Property is required")
    private Property property;

    @Column(name = "viewing_date", nullable = false)
    @NotNull(message = "Viewing date is required")
    private LocalDateTime viewingDate;

    @Column(name = "duration_minutes")
    @Min(value = 0, message = "Duration must be positive")
    private Integer durationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private ViewingStatus status = ViewingStatus.SCHEDULED;

    @Enumerated(EnumType.STRING)
    @Column(name = "feedback")
    private ViewingFeedback feedback;

    @Column(name = "client_notes", length = 2000)
    @Size(max = 2000, message = "Notes must not exceed 2000 characters")
    private String clientNotes;

    @Column(name = "follow_up_action", length = 500)
    @Size(max = 500, message = "Follow-up action must not exceed 500 characters")
    private String followUpAction;

    public enum ViewingStatus {
        SCHEDULED,
        COMPLETED,
        CANCELLED
    }

    public enum ViewingFeedback {
        LIKED,
        NEUTRAL,
        DISLIKED
    }
}
