package com.marklerapp.crm.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Entity representing a password reset token for agent authentication.
 * Tokens are one-time use, time-limited (15 minutes), and stored as SHA-256 hashes.
 * Used for secure password reset functionality with rate limiting.
 */
@Entity
@Table(name = "password_reset_tokens")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetToken extends BaseEntity {

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    @NotBlank(message = "Token hash is required")
    @Size(min = 64, max = 64, message = "Token hash must be exactly 64 characters (SHA-256 hex)")
    private String tokenHash;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agent_id", nullable = false)
    @NotNull(message = "Agent is required")
    private Agent agent;

    @Column(name = "expires_at", nullable = false)
    @NotNull(message = "Expiration time is required")
    private LocalDateTime expiresAt;

    @Column(name = "used", nullable = false)
    @Builder.Default
    private boolean used = false;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "ip_address", length = 45)
    @Size(max = 45, message = "IP address must not exceed 45 characters")
    private String ipAddress;

    /**
     * Check if the token is expired
     */
    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    /**
     * Check if the token is valid (not used and not expired)
     */
    public boolean isValid() {
        return !used && !isExpired();
    }

    /**
     * Mark the token as used
     */
    public void markAsUsed() {
        this.used = true;
        this.usedAt = LocalDateTime.now();
    }

    @Override
    public String toString() {
        return "PasswordResetToken{" +
                "id=" + getId() +
                ", agentId=" + (agent != null ? agent.getId() : null) +
                ", expiresAt=" + expiresAt +
                ", used=" + used +
                ", ipAddress='" + ipAddress + '\'' +
                '}';
    }
}
