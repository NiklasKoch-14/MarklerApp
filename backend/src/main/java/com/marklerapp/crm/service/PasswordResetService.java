package com.marklerapp.crm.service;

import com.marklerapp.crm.constants.ValidationConstants;
import com.marklerapp.crm.dto.VerifyResetTokenResponse;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.PasswordResetToken;
import com.marklerapp.crm.exception.ExpiredTokenException;
import com.marklerapp.crm.exception.InvalidTokenException;
import com.marklerapp.crm.exception.RateLimitExceededException;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.repository.PasswordResetTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

/**
 * Service for handling password reset functionality.
 * Provides secure token generation, validation, and password update operations.
 * Includes rate limiting to prevent abuse and scheduled cleanup of expired tokens.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final PasswordResetTokenRepository tokenRepository;
    private final AgentRepository agentRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${application.mail.reset-token-expiration-minutes}")
    private int expirationMinutes;

    /**
     * Request password reset for an agent by email.
     * Always returns success message to prevent email enumeration attacks.
     * Includes rate limiting to prevent abuse (max 3 requests per hour).
     *
     * @param email The agent's email address
     * @param ipAddress The IP address from which the request originated
     * @return Success message (always same message regardless of email existence)
     */
    @Transactional
    public String requestPasswordReset(String email, String ipAddress) {
        log.info("Password reset requested for email: {} from IP: {}", email, ipAddress);

        // Find agent by email
        Optional<Agent> agentOpt = agentRepository.findByEmail(email);

        // If agent doesn't exist, return success silently (prevent email enumeration)
        if (agentOpt.isEmpty()) {
            log.debug("Agent not found for email: {}. Returning success to prevent enumeration.", email);
            return ValidationConstants.PASSWORD_RESET_EMAIL_SENT_MESSAGE;
        }

        Agent agent = agentOpt.get();

        // Check rate limiting: count requests in last hour
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        int requestCount = tokenRepository.countByAgentAndCreatedAtAfter(agent, oneHourAgo);

        if (requestCount >= ValidationConstants.PASSWORD_RESET_MAX_REQUESTS_PER_HOUR) {
            log.warn("Rate limit exceeded for agent: {} from IP: {}", email, ipAddress);
            throw new RateLimitExceededException(ValidationConstants.PASSWORD_RESET_RATE_LIMIT_MESSAGE);
        }

        // Generate secure random token (32 bytes = 64 hex characters)
        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        String token = HexFormat.of().formatHex(tokenBytes);

        // Hash token with SHA-256 for storage
        String tokenHash = hashToken(token);

        // Create token entity
        PasswordResetToken resetToken = PasswordResetToken.builder()
                .tokenHash(tokenHash)
                .agent(agent)
                .expiresAt(LocalDateTime.now().plusMinutes(expirationMinutes))
                .used(false)
                .ipAddress(ipAddress)
                .build();

        tokenRepository.save(resetToken);

        // Send email with plaintext token
        // Note: EmailService handles its own logging for success/skip/failure
        try {
            emailService.sendPasswordResetEmail(agent, token);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", email, e);
            // Continue anyway to prevent leaking information about email existence
        }

        return ValidationConstants.PASSWORD_RESET_EMAIL_SENT_MESSAGE;
    }

    /**
     * Validate a password reset token.
     * Returns validation result with masked email if valid.
     *
     * @param token The plaintext reset token
     * @return Validation response with validity status and masked email
     */
    @Transactional(readOnly = true)
    public VerifyResetTokenResponse validateResetToken(String token) {
        log.debug("Validating reset token");

        String tokenHash = hashToken(token);
        Optional<PasswordResetToken> resetTokenOpt = tokenRepository.findByTokenHashAndUsedFalse(tokenHash);

        if (resetTokenOpt.isEmpty()) {
            log.debug("Token not found or already used");
            return VerifyResetTokenResponse.builder()
                    .valid(false)
                    .maskedEmail(null)
                    .build();
        }

        PasswordResetToken resetToken = resetTokenOpt.get();

        // Check expiration
        if (resetToken.isExpired()) {
            log.debug("Token expired at: {}", resetToken.getExpiresAt());
            return VerifyResetTokenResponse.builder()
                    .valid(false)
                    .maskedEmail(null)
                    .build();
        }

        // Token is valid
        String maskedEmail = maskEmail(resetToken.getAgent().getEmail());
        log.debug("Token validated successfully for agent: {}", maskedEmail);

        return VerifyResetTokenResponse.builder()
                .valid(true)
                .maskedEmail(maskedEmail)
                .build();
    }

    /**
     * Reset agent password using a valid token.
     * Marks token as used and invalidates all other tokens for the agent.
     *
     * @param token The plaintext reset token
     * @param newPassword The new password (will be encoded)
     * @return Success message
     */
    @Transactional
    public String resetPassword(String token, String newPassword) {
        log.info("Attempting to reset password with token");

        // Validate password strength
        if (!newPassword.matches(ValidationConstants.PASSWORD_STRENGTH_REGEX)) {
            throw new IllegalArgumentException(ValidationConstants.PASSWORD_STRENGTH_MESSAGE);
        }

        String tokenHash = hashToken(token);
        Optional<PasswordResetToken> resetTokenOpt = tokenRepository.findByTokenHashAndUsedFalse(tokenHash);

        if (resetTokenOpt.isEmpty()) {
            log.warn("Invalid or already used token");
            throw new InvalidTokenException(ValidationConstants.PASSWORD_RESET_INVALID_TOKEN_MESSAGE);
        }

        PasswordResetToken resetToken = resetTokenOpt.get();

        // Check expiration
        if (resetToken.isExpired()) {
            log.warn("Token expired at: {}", resetToken.getExpiresAt());
            throw new ExpiredTokenException(ValidationConstants.PASSWORD_RESET_EXPIRED_TOKEN_MESSAGE);
        }

        // Update agent password
        Agent agent = resetToken.getAgent();
        agent.setPasswordHash(passwordEncoder.encode(newPassword));
        agentRepository.save(agent);

        // Mark token as used
        resetToken.markAsUsed();
        tokenRepository.save(resetToken);

        // Invalidate all other unused tokens for this agent
        List<PasswordResetToken> otherTokens = tokenRepository.findByAgentAndUsedFalse(agent);
        otherTokens.forEach(t -> {
            if (!t.getId().equals(resetToken.getId())) {
                t.markAsUsed();
            }
        });
        tokenRepository.saveAll(otherTokens);

        log.info("Password reset successfully for agent: {}", agent.getEmail());

        return ValidationConstants.PASSWORD_RESET_SUCCESS_MESSAGE;
    }

    /**
     * Scheduled job to clean up expired tokens.
     * Runs every hour to remove tokens that expired more than 24 hours ago.
     */
    @Scheduled(cron = "0 0 * * * *") // Run every hour at minute 0
    @Transactional
    public void cleanupExpiredTokens() {
        log.info("Starting cleanup of expired password reset tokens");

        LocalDateTime cutoffTime = LocalDateTime.now().minusHours(24);
        tokenRepository.deleteByExpiresAtBefore(cutoffTime);

        log.info("Completed cleanup of expired password reset tokens (cutoff: {})", cutoffTime);
    }

    /**
     * Hash a token using SHA-256.
     *
     * @param token The plaintext token
     * @return The hashed token as a hex string
     */
    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            log.error("SHA-256 algorithm not available", e);
            throw new RuntimeException("Failed to hash token", e);
        }
    }

    /**
     * Mask email address for privacy.
     * Example: "agent@example.com" -> "ag***@example.com"
     *
     * @param email The email address to mask
     * @return The masked email address
     */
    private String maskEmail(String email) {
        int atIndex = email.indexOf('@');
        if (atIndex <= 2) {
            return "***" + email.substring(atIndex);
        }
        return email.substring(0, 2) + "***" + email.substring(atIndex);
    }
}
