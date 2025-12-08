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
     */
    Page<CallNote> findByClientOrderByCallDateDesc(Client client, Pageable pageable);

    /**
     * Find all call notes for a specific client
     */
    List<CallNote> findByClientOrderByCallDateDesc(Client client);

    /**
     * Find all call notes created by a specific agent
     */
    Page<CallNote> findByAgentOrderByCallDateDesc(Agent agent, Pageable pageable);

    /**
     * Find all call notes for a specific agent and client combination
     */
    List<CallNote> findByAgentAndClientOrderByCallDateDesc(Agent agent, Client client);

    /**
     * Find call notes that require follow-up
     */
    @Query("SELECT cn FROM CallNote cn WHERE cn.followUpRequired = true AND cn.followUpDate IS NOT NULL")
    List<CallNote> findCallNotesRequiringFollowUp();

    /**
     * Find call notes with follow-up date before or equal to a specific date
     */
    @Query("SELECT cn FROM CallNote cn WHERE cn.followUpRequired = true AND cn.followUpDate <= :date")
    List<CallNote> findOverdueFollowUps(@Param("date") LocalDate date);

    /**
     * Find call notes within a date range for a specific client
     */
    @Query("SELECT cn FROM CallNote cn WHERE cn.client = :client AND cn.callDate BETWEEN :startDate AND :endDate ORDER BY cn.callDate DESC")
    List<CallNote> findByClientAndCallDateBetween(
        @Param("client") Client client,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * Find call notes by call type for a specific agent
     */
    List<CallNote> findByAgentAndCallTypeOrderByCallDateDesc(Agent agent, CallNote.CallType callType);

    /**
     * Find call notes containing specific text in subject or notes
     */
    @Query("SELECT cn FROM CallNote cn WHERE cn.agent = :agent AND (LOWER(cn.subject) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR LOWER(cn.notes) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<CallNote> findByAgentAndSearchTerm(
        @Param("agent") Agent agent,
        @Param("searchTerm") String searchTerm,
        Pageable pageable
    );

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
     */
    @Query("SELECT cn FROM CallNote cn WHERE cn.agent = :agent AND cn.callDate >= :sinceDate ORDER BY cn.callDate DESC")
    List<CallNote> findRecentCallNotesByAgent(
        @Param("agent") Agent agent,
        @Param("sinceDate") LocalDateTime sinceDate
    );
}