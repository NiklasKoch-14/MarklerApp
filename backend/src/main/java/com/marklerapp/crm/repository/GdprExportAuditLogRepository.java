package com.marklerapp.crm.repository;

import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.GdprExportAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Repository interface for GdprExportAuditLog entity operations.
 */
@Repository
public interface GdprExportAuditLogRepository extends JpaRepository<GdprExportAuditLog, UUID> {

    /**
     * Find all audit logs for a specific agent
     */
    Page<GdprExportAuditLog> findByAgentOrderByExportTimestampDesc(Agent agent, Pageable pageable);

    /**
     * Find audit logs by agent and export type
     */
    List<GdprExportAuditLog> findByAgentAndExportTypeOrderByExportTimestampDesc(
            Agent agent,
            GdprExportAuditLog.ExportType exportType
    );

    /**
     * Find audit logs within a date range
     */
    @Query("SELECT g FROM GdprExportAuditLog g WHERE g.agent = :agent AND " +
           "g.exportTimestamp BETWEEN :startDate AND :endDate " +
           "ORDER BY g.exportTimestamp DESC")
    List<GdprExportAuditLog> findByAgentAndDateRange(
            @Param("agent") Agent agent,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    /**
     * Find failed export attempts
     */
    @Query("SELECT g FROM GdprExportAuditLog g WHERE g.agent = :agent AND g.success = false " +
           "ORDER BY g.exportTimestamp DESC")
    List<GdprExportAuditLog> findFailedExportsByAgent(@Param("agent") Agent agent);

    /**
     * Count total exports by agent
     */
    long countByAgent(Agent agent);

    /**
     * Count exports by agent and type
     */
    long countByAgentAndExportType(Agent agent, GdprExportAuditLog.ExportType exportType);

    /**
     * Find recent exports (last 30 days)
     */
    @Query("SELECT g FROM GdprExportAuditLog g WHERE g.agent = :agent AND " +
           "g.exportTimestamp >= :since ORDER BY g.exportTimestamp DESC")
    List<GdprExportAuditLog> findRecentExportsByAgent(
            @Param("agent") Agent agent,
            @Param("since") LocalDateTime since
    );
}
