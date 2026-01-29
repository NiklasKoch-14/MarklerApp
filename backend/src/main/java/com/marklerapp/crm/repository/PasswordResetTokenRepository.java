package com.marklerapp.crm.repository;

import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for PasswordResetToken entity operations.
 * Supports token validation, rate limiting queries, and cleanup operations.
 */
@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    /**
     * Find a valid (unused) token by its hash.
     * Used during password reset to validate the token.
     *
     * @param tokenHash SHA-256 hash of the token
     * @return Optional containing the token if found and not used
     */
    Optional<PasswordResetToken> findByTokenHashAndUsedFalse(String tokenHash);

    /**
     * Find all unused tokens for a specific agent.
     * Used to invalidate existing tokens when password is changed.
     *
     * @param agent The agent entity
     * @return List of unused tokens for the agent
     */
    List<PasswordResetToken> findByAgentAndUsedFalse(Agent agent);

    /**
     * Count password reset requests for an agent within a time window.
     * Used for rate limiting (prevent abuse).
     *
     * @param agent The agent entity
     * @param after Count only tokens created after this time
     * @return Number of reset requests in the time window
     */
    @Query("SELECT COUNT(t) FROM PasswordResetToken t WHERE t.agent = :agent AND t.createdAt > :after")
    int countByAgentAndCreatedAtAfter(@Param("agent") Agent agent, @Param("after") LocalDateTime after);

    /**
     * Delete all tokens that expired before the given time.
     * Used by scheduled cleanup job to remove old tokens.
     *
     * @param expirationTime Delete tokens that expired before this time
     */
    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiresAt < :expirationTime")
    void deleteByExpiresAtBefore(@Param("expirationTime") LocalDateTime expirationTime);

    /**
     * Find all unused tokens for a specific agent by agent ID.
     * Alternative to findByAgentAndUsedFalse when only ID is available.
     *
     * @param agentId The agent's UUID
     * @return List of unused tokens for the agent
     */
    @Query("SELECT t FROM PasswordResetToken t WHERE t.agent.id = :agentId AND t.used = false")
    List<PasswordResetToken> findUnusedTokensByAgentId(@Param("agentId") UUID agentId);

    /**
     * Check if a token hash exists and is valid (not used, not expired).
     * Utility method for quick validation.
     *
     * @param tokenHash SHA-256 hash of the token
     * @param now Current timestamp for expiration check
     * @return true if token exists, is unused, and not expired
     */
    @Query("SELECT CASE WHEN COUNT(t) > 0 THEN true ELSE false END FROM PasswordResetToken t " +
           "WHERE t.tokenHash = :tokenHash AND t.used = false AND t.expiresAt > :now")
    boolean existsValidToken(@Param("tokenHash") String tokenHash, @Param("now") LocalDateTime now);
}
