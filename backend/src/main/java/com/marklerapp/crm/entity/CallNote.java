package com.marklerapp.crm.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;
import java.time.LocalDate;

/**
 * Entity representing documented interactions between agents and clients.
 * Stores call notes, meeting notes, and other communication records.
 */
@Entity
@Table(name = "call_notes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CallNote extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    @NotNull(message = "Agent is required")
    private Agent agent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    @NotNull(message = "Client is required")
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id")
    private Property property;

    @Column(name = "call_date", nullable = false)
    @NotNull(message = "Call date is required")
    private LocalDateTime callDate;

    @Column(name = "duration_minutes")
    @Min(value = 0, message = "Duration must be positive")
    private Integer durationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "call_type", nullable = false)
    @NotNull(message = "Call type is required")
    private CallType callType;

    @Column(name = "subject", nullable = false, length = 200)
    @NotBlank(message = "Subject is required")
    @Size(min = 5, max = 200, message = "Subject must be between 5 and 200 characters")
    private String subject;

    @Column(name = "notes", nullable = false, length = 5000)
    @NotBlank(message = "Notes are required")
    @Size(min = 10, max = 5000, message = "Notes must be between 10 and 5000 characters")
    private String notes;

    @Column(name = "follow_up_required")
    @Builder.Default
    private Boolean followUpRequired = false;

    @Column(name = "follow_up_date")
    private LocalDate followUpDate;

    @Column(name = "properties_discussed", length = 1000)
    private String propertiesDiscussed; // JSON array of property IDs

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome")
    private CallOutcome outcome;

    /**
     * Enum for different types of client interactions
     */
    public enum CallType {
        PHONE_INBOUND,
        PHONE_OUTBOUND,
        EMAIL,
        MEETING,
        OTHER
    }

    /**
     * Enum for call outcomes
     */
    public enum CallOutcome {
        INTERESTED,
        NOT_INTERESTED,
        SCHEDULED_VIEWING,
        OFFER_MADE,
        DEAL_CLOSED
    }

    /**
     * Validation method to ensure follow-up date is in the future
     */
    @PrePersist
    @PreUpdate
    private void validateFollowUpDate() {
        if (followUpRequired != null && followUpRequired && followUpDate != null) {
            if (followUpDate.isBefore(LocalDate.now())) {
                throw new IllegalArgumentException("Follow-up date must be in the future");
            }
        }

        if (callDate != null && callDate.isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException("Call date cannot be in the future");
        }
    }
}