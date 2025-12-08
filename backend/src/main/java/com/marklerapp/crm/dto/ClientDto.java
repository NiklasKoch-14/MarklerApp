package com.marklerapp.crm.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for Client entity operations.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ClientDto {

    private UUID id;

    private UUID agentId;

    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 100, message = "First name must be between 2 and 100 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 100, message = "Last name must be between 2 and 100 characters")
    private String lastName;

    @Email(message = "Email should be valid")
    private String email;

    @Pattern(regexp = "^[+]?[0-9\\s\\-()]*$", message = "Phone number format is invalid")
    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    private String phone;

    @Size(max = 200, message = "Street address must not exceed 200 characters")
    private String addressStreet;

    @Size(max = 100, message = "City must not exceed 100 characters")
    private String addressCity;

    @Pattern(regexp = "^[0-9]{5}$|^$", message = "Postal code must be 5 digits or empty")
    private String addressPostalCode;

    private String addressCountry;

    private boolean gdprConsentGiven;

    private LocalDateTime gdprConsentDate;

    private PropertySearchCriteriaDto searchCriteria;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // Read-only computed fields
    private String fullName;
    private String formattedAddress;

    /**
     * Get full name (computed field)
     */
    public String getFullName() {
        if (firstName != null && lastName != null) {
            return firstName + " " + lastName;
        }
        return fullName;
    }

    /**
     * Get formatted address (computed field)
     */
    public String getFormattedAddress() {
        if (formattedAddress != null) {
            return formattedAddress;
        }

        StringBuilder address = new StringBuilder();

        if (addressStreet != null && !addressStreet.trim().isEmpty()) {
            address.append(addressStreet);
        }

        if (addressPostalCode != null && !addressPostalCode.trim().isEmpty()) {
            if (address.length() > 0) address.append(", ");
            address.append(addressPostalCode);
        }

        if (addressCity != null && !addressCity.trim().isEmpty()) {
            if (address.length() > 0) address.append(" ");
            address.append(addressCity);
        }

        if (addressCountry != null && !addressCountry.trim().isEmpty() && !"Germany".equals(addressCountry)) {
            if (address.length() > 0) address.append(", ");
            address.append(addressCountry);
        }

        return address.toString();
    }
}