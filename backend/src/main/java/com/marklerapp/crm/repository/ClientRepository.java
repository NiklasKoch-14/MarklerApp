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
     * Uses JOIN FETCH to prevent N+1 query problem
     */
    @Query("SELECT c FROM Client c " +
           "LEFT JOIN FETCH c.agent " +
           "LEFT JOIN FETCH c.searchCriteria " +
           "WHERE c.agent = :agent")
    Page<Client> findByAgent(@Param("agent") Agent agent, Pageable pageable);

    /**
     * Find all clients by agent (no pagination)
     * Uses JOIN FETCH to prevent N+1 query problem
     */
    @Query("SELECT c FROM Client c " +
           "LEFT JOIN FETCH c.agent " +
           "LEFT JOIN FETCH c.searchCriteria " +
           "WHERE c.agent = :agent")
    List<Client> findByAgent(@Param("agent") Agent agent);

    /**
     * Find clients by agent ID
     */
    Page<Client> findByAgentId(UUID agentId, Pageable pageable);

    /**
     * Find clients by agent and search term (name or email)
     * Uses JOIN FETCH to prevent N+1 query problem
     */
    @Query("SELECT c FROM Client c " +
           "LEFT JOIN FETCH c.agent " +
           "LEFT JOIN FETCH c.searchCriteria " +
           "WHERE c.agent = :agent AND " +
           "(LOWER(c.firstName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(c.lastName) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(c.email) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<Client> findByAgentAndSearchTerm(@Param("agent") Agent agent,
                                         @Param("searchTerm") String searchTerm,
                                         Pageable pageable);

    /**
     * Global search (PostgreSQL): IDs of matching clients, best match first.
     * The agent filter is part of the WHERE clause and must never be dropped —
     * the global search must never be able to surface another agent's clients.
     */
    @Query(value = "SELECT c.id FROM clients c "
            + "WHERE c.agent_id = :agentId "
            + "  AND c.search_vector @@ to_tsquery('german', CAST(:tsQuery AS text)) "
            + "ORDER BY ts_rank(c.search_vector, to_tsquery('german', CAST(:tsQuery AS text))) DESC, "
            + "         c.last_name ASC "
            + "LIMIT :maxResults", nativeQuery = true)
    List<UUID> searchIdsFullText(@Param("agentId") UUID agentId,
                                 @Param("tsQuery") String tsQuery,
                                 @Param("maxResults") int maxResults);

    /**
     * Global search fallback for databases without full-text search (SQLite in dev).
     * The pattern must already be lower-cased and wrapped in %…%.
     */
    @Query("SELECT c.id FROM Client c WHERE c.agent.id = :agentId AND ("
            + "LOWER(c.firstName) LIKE :pattern OR "
            + "LOWER(c.lastName) LIKE :pattern OR "
            + "LOWER(CONCAT(c.firstName, ' ', c.lastName)) LIKE :pattern OR "
            + "LOWER(COALESCE(c.email, '')) LIKE :pattern OR "
            + "LOWER(COALESCE(c.phone, '')) LIKE :pattern) "
            + "ORDER BY c.lastName ASC, c.firstName ASC")
    List<UUID> searchIdsByPattern(@Param("agentId") UUID agentId,
                                  @Param("pattern") String pattern,
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
     * Uses JOIN FETCH to prevent N+1 query problem
     */
    @Query("SELECT c FROM Client c " +
           "LEFT JOIN FETCH c.agent " +
           "LEFT JOIN FETCH c.searchCriteria " +
           "WHERE c.agent = :agent AND c.createdAt >= :thirtyDaysAgo " +
           "ORDER BY c.createdAt DESC")
    List<Client> findRecentClientsByAgent(@Param("agent") Agent agent,
                                         @Param("thirtyDaysAgo") LocalDateTime thirtyDaysAgo);

    /**
     * Find active clients (non-CLOSED) grouped by pipeline stage for Kanban view
     */
    @Query("SELECT c FROM Client c " +
           "LEFT JOIN FETCH c.searchCriteria " +
           "WHERE c.agent = :agent AND c.pipelineStage NOT IN ('WON', 'LOST') " +
           "ORDER BY c.updatedAt DESC")
    List<Client> findActiveClientsByAgent(@Param("agent") Agent agent);

    /**
     * Find clients without recent update (proxy for no-contact — replaced by lastContactDate in service)
     */
    @Query("SELECT c FROM Client c WHERE c.agent = :agent " +
           "AND c.pipelineStage NOT IN ('WON', 'LOST') " +
           "ORDER BY c.updatedAt ASC")
    List<Client> findActiveClientsOrderedByUpdatedAt(@Param("agent") Agent agent);

    /**
     * Find clients by postal code pattern
     * Uses JOIN FETCH to prevent N+1 query problem
     */
    @Query("SELECT c FROM Client c " +
           "LEFT JOIN FETCH c.agent " +
           "LEFT JOIN FETCH c.searchCriteria " +
           "WHERE c.agent = :agent AND c.addressPostalCode LIKE :postalCodePattern")
    List<Client> findByAgentAndPostalCodePattern(@Param("agent") Agent agent,
                                                @Param("postalCodePattern") String postalCodePattern);
}