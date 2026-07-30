package com.marklerapp.crm.repository;

import com.marklerapp.crm.entity.CallNote;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.Agent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Repository interface for CallNote entity operations.
 * Provides methods for querying call notes by various criteria.
 */
@Repository
public interface CallNoteRepository extends JpaRepository<CallNote, UUID> {

    /**
     * Find all call notes for a specific client, ordered by call date descending
     * Uses JOIN FETCH to prevent N+1 query problem
     */
    @Query("SELECT cn FROM CallNote cn " +
           "LEFT JOIN FETCH cn.agent " +
           "LEFT JOIN FETCH cn.client " +
           "LEFT JOIN FETCH cn.property " +
           "WHERE cn.client = :client " +
           "ORDER BY cn.callDate DESC")
    Page<CallNote> findByClientOrderByCallDateDesc(@Param("client") Client client, Pageable pageable);

    /**
     * Find all call notes for a specific client
     * Uses JOIN FETCH to prevent N+1 query problem
     */
    @Query("SELECT cn FROM CallNote cn " +
           "LEFT JOIN FETCH cn.agent " +
           "LEFT JOIN FETCH cn.client " +
           "LEFT JOIN FETCH cn.property " +
           "WHERE cn.client = :client " +
           "ORDER BY cn.callDate DESC")
    List<CallNote> findByClientOrderByCallDateDesc(@Param("client") Client client);

    /**
     * Find all call notes created by a specific agent
     * Uses JOIN FETCH to prevent N+1 query problem
     */
    @Query("SELECT cn FROM CallNote cn " +
           "LEFT JOIN FETCH cn.agent " +
           "LEFT JOIN FETCH cn.client " +
           "LEFT JOIN FETCH cn.property " +
           "WHERE cn.agent = :agent " +
           "ORDER BY cn.callDate DESC")
    Page<CallNote> findByAgentOrderByCallDateDesc(@Param("agent") Agent agent, Pageable pageable);

    /**
     * Find all call notes for a specific agent and client combination
     * Uses JOIN FETCH to prevent N+1 query problem
     */
    @Query("SELECT cn FROM CallNote cn " +
           "LEFT JOIN FETCH cn.agent " +
           "LEFT JOIN FETCH cn.client " +
           "LEFT JOIN FETCH cn.property " +
           "WHERE cn.agent = :agent AND cn.client = :client " +
           "ORDER BY cn.callDate DESC")
    List<CallNote> findByAgentAndClientOrderByCallDateDesc(@Param("agent") Agent agent, @Param("client") Client client);

    /**
     * Find call notes that require follow-up
     * Uses JOIN FETCH to prevent N+1 query problem
     */
    @Query("SELECT cn FROM CallNote cn " +
           "LEFT JOIN FETCH cn.agent " +
           "LEFT JOIN FETCH cn.client " +
           "LEFT JOIN FETCH cn.property " +
           "WHERE cn.followUpRequired = true AND cn.followUpDate IS NOT NULL")
    List<CallNote> findCallNotesRequiringFollowUp();

    /**
     * Find call notes with follow-up date before or equal to a specific date
     * Uses JOIN FETCH to prevent N+1 query problem
     */
    @Query("SELECT cn FROM CallNote cn " +
           "LEFT JOIN FETCH cn.agent " +
           "LEFT JOIN FETCH cn.client " +
           "LEFT JOIN FETCH cn.property " +
           "WHERE cn.followUpRequired = true AND cn.followUpDate <= :date")
    List<CallNote> findOverdueFollowUps(@Param("date") LocalDate date);

    /**
     * Find call notes within a date range for a specific client
     * Uses JOIN FETCH to prevent N+1 query problem
     */
    @Query("SELECT cn FROM CallNote cn " +
           "LEFT JOIN FETCH cn.agent " +
           "LEFT JOIN FETCH cn.client " +
           "LEFT JOIN FETCH cn.property " +
           "WHERE cn.client = :client AND cn.callDate BETWEEN :startDate AND :endDate " +
           "ORDER BY cn.callDate DESC")
    List<CallNote> findByClientAndCallDateBetween(
        @Param("client") Client client,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Find call notes by call type for a specific agent
     * Uses JOIN FETCH to prevent N+1 query problem
     */
    @Query("SELECT cn FROM CallNote cn " +
           "LEFT JOIN FETCH cn.agent " +
           "LEFT JOIN FETCH cn.client " +
           "LEFT JOIN FETCH cn.property " +
           "WHERE cn.agent = :agent AND cn.callType = :callType " +
           "ORDER BY cn.callDate DESC")
    List<CallNote> findByAgentAndCallTypeOrderByCallDateDesc(@Param("agent") Agent agent, @Param("callType") CallNote.CallType callType);

    /**
     * Find call notes containing specific text in subject or notes
     * Uses JOIN FETCH to prevent N+1 query problem
     */
    @Query("SELECT cn FROM CallNote cn " +
           "LEFT JOIN FETCH cn.agent " +
           "LEFT JOIN FETCH cn.client " +
           "LEFT JOIN FETCH cn.property " +
           "WHERE cn.agent = :agent AND " +
           "(LOWER(cn.subject) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(cn.notes) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<CallNote> findByAgentAndSearchTerm(
        @Param("agent") Agent agent,
        @Param("searchTerm") String searchTerm,
        Pageable pageable
    );

    /**
     * Global search (PostgreSQL): IDs of matching call notes, best match first.
     * The agent filter is part of the WHERE clause and must never be dropped —
     * the global search must never be able to surface another agent's notes.
     */
    @Query(value = "SELECT cn.id FROM call_notes cn "
            + "WHERE cn.agent_id = :agentId "
            + "  AND cn.search_vector @@ to_tsquery('german', CAST(:tsQuery AS text)) "
            + "ORDER BY ts_rank(cn.search_vector, to_tsquery('german', CAST(:tsQuery AS text))) DESC, "
            + "         cn.call_date DESC "
            + "LIMIT :maxResults", nativeQuery = true)
    List<UUID> searchIdsFullText(@Param("agentId") UUID agentId,
                                 @Param("tsQuery") String tsQuery,
                                 @Param("maxResults") int maxResults);

    /**
     * Global search fallback for databases without full-text search (SQLite in dev).
     * The pattern must already be lower-cased and wrapped in %…%.
     */
    @Query("SELECT cn.id FROM CallNote cn WHERE cn.agent.id = :agentId AND ("
            + "LOWER(cn.subject) LIKE :pattern OR "
            + "LOWER(cn.notes) LIKE :pattern) "
            + "ORDER BY cn.callDate DESC")
    List<UUID> searchIdsByPattern(@Param("agentId") UUID agentId,
                                  @Param("pattern") String pattern,
                                  Pageable pageable);

    /**
     * Load call notes by ID with their client eagerly attached (global search result mapping).
     */
    @Query("SELECT cn FROM CallNote cn LEFT JOIN FETCH cn.client WHERE cn.id IN :ids")
    List<CallNote> findByIdInWithClient(@Param("ids") List<UUID> ids);

    /**
     * Batch-fetch last call date per client for a set of client IDs.
     * Returns Object[] pairs: [clientId (UUID), maxCallDate (LocalDateTime)]
     */
    @Query("SELECT cn.client.id, MAX(cn.callDate) FROM CallNote cn WHERE cn.client.id IN :clientIds GROUP BY cn.client.id")
    List<Object[]> findLastContactDateForClients(@Param("clientIds") List<UUID> clientIds);

    /**
     * Count total call notes for a specific client
     */
    long countByClient(Client client);

    /**
     * Count call notes by outcome for a specific agent
     */
    long countByAgentAndOutcome(Agent agent, CallNote.CallOutcome outcome);

    /**
     * Find recent call notes for a specific agent (last N days)
     * Uses JOIN FETCH to prevent N+1 query problem
     */
    @Query("SELECT cn FROM CallNote cn " +
           "LEFT JOIN FETCH cn.agent " +
           "LEFT JOIN FETCH cn.client " +
           "LEFT JOIN FETCH cn.property " +
           "WHERE cn.agent = :agent AND cn.callDate >= :sinceDate " +
           "ORDER BY cn.callDate DESC")
    List<CallNote> findRecentCallNotesByAgent(
        @Param("agent") Agent agent,
        @Param("sinceDate") LocalDateTime sinceDate
    );

    /**
     * Objektbezogene Notizen in einem Zeitraum — Grundlage des Eigentuemer-Reports
     * (Issue #40). JOIN FETCH auf client, weil der Report je Eintrag den Interessenten
     * braucht; ohne das eine Query pro Notiz.
     */
    @Query("SELECT cn FROM CallNote cn " +
           "LEFT JOIN FETCH cn.client " +
           "WHERE cn.property.id = :propertyId " +
           "AND cn.callDate >= :from AND cn.callDate < :to " +
           "ORDER BY cn.callDate DESC")
    List<CallNote> findByPropertyAndCallDateRange(
        @Param("propertyId") UUID propertyId,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );
}