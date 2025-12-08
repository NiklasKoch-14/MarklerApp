package com.marklerapp.crm.repository;

import com.marklerapp.crm.entity.Agent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Agent entity operations.
 */
@Repository
public interface AgentRepository extends JpaRepository<Agent, UUID> {

    /**
     * Find agent by email address
     */
    Optional<Agent> findByEmail(String email);

    /**
     * Check if agent exists by email
     */
    boolean existsByEmail(String email);

    /**
     * Find active agent by email
     */
    @Query("SELECT a FROM Agent a WHERE a.email = :email AND a.isActive = true")
    Optional<Agent> findActiveByEmail(@Param("email") String email);

    /**
     * Count active agents
     */
    @Query("SELECT COUNT(a) FROM Agent a WHERE a.isActive = true")
    long countActiveAgents();
}