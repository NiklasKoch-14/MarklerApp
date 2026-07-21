package com.marklerapp.crm.repository;

import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.ClientDeletionAuditLog;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for the client-deletion audit trail.
 * Deliberately extends the plain {@link Repository} marker (not JpaRepository/CrudRepository)
 * so no delete method is available anywhere in the codebase — the audit trail is append-only.
 */
@org.springframework.stereotype.Repository
public interface ClientDeletionAuditLogRepository extends Repository<ClientDeletionAuditLog, UUID> {

    ClientDeletionAuditLog save(ClientDeletionAuditLog entity);

    Optional<ClientDeletionAuditLog> findById(UUID id);

    List<ClientDeletionAuditLog> findByAgentOrderByDeletionTimestampDesc(Agent agent);

    List<ClientDeletionAuditLog> findByDeletedClientIdOrderByDeletionTimestampDesc(UUID deletedClientId);
}
