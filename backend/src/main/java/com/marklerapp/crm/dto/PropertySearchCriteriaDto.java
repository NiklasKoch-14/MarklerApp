package com.marklerapp.crm.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * DTO for PropertySearchCriteria entity operations.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PropertySearchCriteriaDto {

    private UUID id;

    private UUID clientId;

    @Min(value = 10, message = "Minimum square meters must be at least 10")
    private Integer minSquareMeters;

    @Max(value = 10000, message = "Maximum square meters cannot exceed 10000")
    private Integer maxSquareMeters;

    @Min(value = 1, message = "Minimum rooms must be at least 1")
    @Max(value = 20, message = "Minimum rooms cannot exceed 20")
    private Integer minRooms;

    @Min(value = 1, message = "Maximum rooms must be at least 1")
    @Max(value = 20, message = "Maximum rooms cannot exceed 20")
    private Integer maxRooms;

    @DecimalMin(value = "0.0", inclusive = false, message = "Minimum budget must be positive")
    private BigDecimal minBudget;

    @DecimalMin(value = "0.0", inclusive = false, message = "Maximum budget must be positive")
    private BigDecimal maxBudget;

    private List<String> preferredLocations;

    private List<String> propertyTypes;

    private String additionalRequirements;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // Validation flags
    private boolean hasBudgetConstraints;
    private boolean hasSizeConstraints;
    private boolean hasRoomConstraints;

    /**
     * Check if criteria has budget constraints
     */
    public boolean getHasBudgetConstraints() {
        return minBudget != null || maxBudget != null;
    }

    /**
     * Check if criteria has size constraints
     */
    public boolean getHasSizeConstraints() {
        return minSquareMeters != null || maxSquareMeters != null;
    }

    /**
     * Check if criteria has room constraints
     */
    public boolean getHasRoomConstraints() {
        return minRooms != null || maxRooms != null;
    }
}