package com.marklerapp.crm.repository;

import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Client;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Client entity operations.
 */
@Repository
public interface ClientRepository extends JpaRepository<Client, UUID> {

    /**
     * Find clients by agent
     */
    Page<Client> findByAgent(Agent agent, Pageable pageable);

    /**
     * Find all clients by agent (no pagination)
     */
    List<Client> findByAgent(Agent agent);

    /**
     * Find clients by agent ID
     */
    Page<Client> findByAgentId(UUID agentId, Pageable pageable);

    /**
     * Find clients by agent and search term (name or email)
     */
    @Query("SELECT c FROM Client c WHERE c.agent = :agent AND " +
           "(LOWER(c.firstName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(c.lastName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(c.email) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<Client> findByAgentAndSearchTerm(@Param("agent") Agent agent,
                                         @Param("searchTerm") String searchTerm,
                                         Pageable pageable);

    /**
     * Find client by email within agent's clients
     */
    Optional<Client> findByAgentAndEmail(Agent agent, String email);

    /**
     * Find clients by city within agent's clients
     */
    List<Client> findByAgentAndAddressCity(Agent agent, String city);

    /**
     * Find clients with GDPR consent
     */
    @Query("SELECT c FROM Client c WHERE c.agent = :agent AND c.gdprConsentGiven = true")
    List<Client> findByAgentWithGdprConsent(@Param("agent") Agent agent);

    /**
     * Find clients without GDPR consent
     */
    @Query("SELECT c FROM Client c WHERE c.agent = :agent AND c.gdprConsentGiven = false")
    List<Client> findByAgentWithoutGdprConsent(@Param("agent") Agent agent);

    /**
     * Find clients created after a specific date
     */
    List<Client> findByAgentAndCreatedAtAfter(Agent agent, LocalDateTime date);

    /**
     * Count clients by agent
     */
    long countByAgent(Agent agent);

    /**
     * Count clients by agent ID
     */
    long countByAgentId(UUID agentId);

    /**
     * Find clients with search criteria
     */
    @Query("SELECT c FROM Client c LEFT JOIN FETCH c.searchCriteria WHERE c.agent = :agent")
    List<Client> findByAgentWithSearchCriteria(@Param("agent") Agent agent);

    /**
     * Check if client exists by email within agent's clients
     */
    boolean existsByAgentAndEmail(Agent agent, String email);

    /**
     * Find recent clients (last 30 days)
     */
    @Query("SELECT c FROM Client c WHERE c.agent = :agent AND c.createdAt >= :thirtyDaysAgo ORDER BY c.createdAt DESC")
    List<Client> findRecentClientsByAgent(@Param("agent") Agent agent,
                                         @Param("thirtyDaysAgo") LocalDateTime thirtyDaysAgo);

    /**
     * Find clients by postal code pattern
     */
    @Query("SELECT c FROM Client c WHERE c.agent = :agent AND c.addressPostalCode LIKE :postalCodePattern")
    List<Client> findByAgentAndPostalCodePattern(@Param("agent") Agent agent,
                                                @Param("postalCodePattern") String postalCodePattern);
}