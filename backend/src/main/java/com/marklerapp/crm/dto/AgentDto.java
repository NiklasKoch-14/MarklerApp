package com.marklerapp.crm.dto;

import com.marklerapp.crm.entity.LanguagePreference;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for Agent entity.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentDto {

    private UUID id;
    private String email;
    private String firstName;
    private String lastName;
    private String phone;
    private LanguagePreference languagePreference;
    private boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /**
     * Get full name
     */
    public String getFullName() {
        return firstName + " " + lastName;
    }
}