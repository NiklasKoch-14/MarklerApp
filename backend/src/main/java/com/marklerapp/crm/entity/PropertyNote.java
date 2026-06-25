package com.marklerapp.crm.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "property_notes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PropertyNote extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    @NotNull(message = "Agent is required")
    private Agent agent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    @NotNull(message = "Property is required")
    private Property property;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    @NotBlank(message = "Note content is required")
    @Size(max = 5000, message = "Note must not exceed 5000 characters")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    @Builder.Default
    private NoteCategory category = NoteCategory.GENERAL;

    public enum NoteCategory {
        GENERAL,
        SELLER_INFO,
        PRICE_NOTE,
        VIEWING_NOTE,
        LEGAL_NOTE
    }
}
