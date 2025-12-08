package com.marklerapp.crm.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Entity representing a real estate agent in the system.
 */
@Entity
@Table(name = "agents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Agent extends BaseEntity {

    @Column(name = "email", unique = true, nullable = false)
    @Email(message = "Email should be valid")
    @NotBlank(message = "Email is required")
    private String email;

    @Column(name = "first_name", nullable = false)
    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 100, message = "First name must be between 2 and 100 characters")
    private String firstName;

    @Column(name = "last_name", nullable = false)
    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 100, message = "Last name must be between 2 and 100 characters")
    private String lastName;

    @Column(name = "phone")
    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "language_preference")
    @Builder.Default
    private LanguagePreference languagePreference = LanguagePreference.DE;

    @Column(name = "password_hash", nullable = false)
    @NotBlank(message = "Password hash is required")
    private String passwordHash;

    @Column(name = "is_active")
    @Builder.Default
    private boolean isActive = true;

    /**
     * Get the full name of the agent
     */
    public String getFullName() {
        return firstName + " " + lastName;
    }

    /**
     * Check if agent account is active
     */
    public boolean isActive() {
        return isActive;
    }

    @Override
    public String toString() {
        return "Agent{" +
                "id=" + getId() +
                ", email='" + email + '\'' +
                ", firstName='" + firstName + '\'' +
                ", lastName='" + lastName + '\'' +
                ", isActive=" + isActive +
                '}';
    }
}