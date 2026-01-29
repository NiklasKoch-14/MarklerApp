package com.marklerapp.crm.dto;

import com.marklerapp.crm.constants.ValidationConstants;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for password reset request containing token and new password.
 * Used to complete password reset flow after email verification.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResetPasswordRequest {

    @NotBlank(message = "Token is required")
    @Size(min = 64, max = 64, message = "Token must be exactly 64 characters")
    private String token;

    @NotBlank(message = "New password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(
        regexp = ValidationConstants.PASSWORD_STRENGTH_REGEX,
        message = ValidationConstants.PASSWORD_STRENGTH_MESSAGE
    )
    private String newPassword;
}
