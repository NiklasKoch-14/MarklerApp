package com.marklerapp.crm.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity representing a client in the real estate CRM system.
 */
@Entity
@Table(name = "clients")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Client extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private Agent agent;

    @Column(name = "first_name", nullable = false)
    @NotBlank(message = "First name is required")
    @Size(min = 2, max = 100, message = "First name must be between 2 and 100 characters")
    private String firstName;

    @Column(name = "last_name", nullable = false)
    @NotBlank(message = "Last name is required")
    @Size(min = 2, max = 100, message = "Last name must be between 2 and 100 characters")
    private String lastName;

    @Column(name = "email")
    @Email(message = "Email should be valid")
    private String email;

    @Column(name = "phone")
    @Pattern(regexp = "^[+]?[0-9\\s\\-()]+$", message = "Phone number format is invalid")
    @Size(max = 20, message = "Phone number must not exceed 20 characters")
    private String phone;

    @Column(name = "address_street")
    @Size(max = 200, message = "Street address must not exceed 200 characters")
    private String addressStreet;

    @Column(name = "address_city")
    @Size(max = 100, message = "City must not exceed 100 characters")
    private String addressCity;

    @Column(name = "address_postal_code")
    @Pattern(regexp = "^[0-9]{5}$", message = "Postal code must be 5 digits")
    private String addressPostalCode;

    @Column(name = "address_country")
    @Builder.Default
    private String addressCountry = "Germany";

    @Enumerated(EnumType.STRING)
    @Column(name = "client_type", nullable = false)
    @Builder.Default
    private ClientType clientType = ClientType.BUYER;

    @Enumerated(EnumType.STRING)
    @Column(name = "financing_status", nullable = false)
    @Builder.Default
    private FinancingStatus financingStatus = FinancingStatus.UNKNOWN;

    @Enumerated(EnumType.STRING)
    @Column(name = "move_in_timeline", nullable = false)
    @Builder.Default
    private MoveInTimeline moveInTimeline = MoveInTimeline.FLEXIBLE;

    @Enumerated(EnumType.STRING)
    @Column(name = "pipeline_stage", nullable = false)
    @Builder.Default
    private PipelineStage pipelineStage = PipelineStage.PROSPECT;

    @Column(name = "gdpr_consent_given", nullable = false)
    @Builder.Default
    private boolean gdprConsentGiven = false;

    @Column(name = "gdpr_consent_date")
    private LocalDateTime gdprConsentDate;

    @OneToOne(mappedBy = "client", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private PropertySearchCriteria searchCriteria;

    public enum ClientType {
        BUYER,
        RENTER,
        SELLER
    }

    public enum FinancingStatus {
        UNKNOWN,
        SELF_FINANCED,
        BANK_PRE_APPROVED,
        NEEDS_FINANCING
    }

    public enum MoveInTimeline {
        IMMEDIATE,
        THREE_MONTHS,
        SIX_MONTHS,
        ONE_YEAR,
        FLEXIBLE
    }

    public enum PipelineStage {
        PROSPECT,
        ACTIVE_SEARCH,
        VIEWING,
        OFFER,
        CLOSED,
        INACTIVE
    }

    /**
     * Get the full name of the client
     */
    public String getFullName() {
        return firstName + " " + lastName;
    }

    /**
     * Get the full address as a formatted string
     */
    public String getFormattedAddress() {
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

    /**
     * Check if client has given GDPR consent
     */
    public boolean hasValidGdprConsent() {
        return gdprConsentGiven && gdprConsentDate != null;
    }

    @Override
    public String toString() {
        return "Client{" +
                "id=" + getId() +
                ", firstName='" + firstName + '\'' +
                ", lastName='" + lastName + '\'' +
                ", email='" + email + '\'' +
                ", gdprConsentGiven=" + gdprConsentGiven +
                '}';
    }
}