package com.marklerapp.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for reset token verification response.
 * Returns whether the token is valid and the masked email address.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VerifyResetTokenResponse {

    /**
     * Whether the token is valid (not used, not expired)
     */
    private boolean valid;

    /**
     * Masked email address (e.g., "ag***@example.com")
     * Null if token is invalid
     */
    private String maskedEmail;
}
