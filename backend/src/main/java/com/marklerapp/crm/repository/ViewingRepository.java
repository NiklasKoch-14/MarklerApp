package com.marklerapp.crm.repository;

import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.Viewing;
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

@Repository
public interface ViewingRepository extends JpaRepository<Viewing, UUID> {

    @Query("SELECT v FROM Viewing v JOIN FETCH v.agent JOIN FETCH v.client JOIN FETCH v.property WHERE v.id = :id")
    Optional<Viewing> findByIdWithDetails(@Param("id") UUID id);

    @Query("SELECT v FROM Viewing v JOIN FETCH v.agent JOIN FETCH v.client JOIN FETCH v.property WHERE v.client = :client ORDER BY v.viewingDate DESC")
    List<Viewing> findByClientOrderByViewingDateDesc(@Param("client") Client client);

    @Query("SELECT v FROM Viewing v JOIN FETCH v.agent JOIN FETCH v.client JOIN FETCH v.property WHERE v.property = :property ORDER BY v.viewingDate DESC")
    List<Viewing> findByPropertyOrderByViewingDateDesc(@Param("property") Property property);

    @Query("SELECT v FROM Viewing v JOIN FETCH v.agent JOIN FETCH v.client JOIN FETCH v.property WHERE v.agent = :agent ORDER BY v.viewingDate DESC")
    Page<Viewing> findByAgentOrderByViewingDateDesc(@Param("agent") Agent agent, Pageable pageable);

    @Query("SELECT v FROM Viewing v JOIN FETCH v.agent JOIN FETCH v.client JOIN FETCH v.property WHERE v.agent = :agent AND v.viewingDate >= :startDate AND v.viewingDate < :endDate ORDER BY v.viewingDate ASC")
    List<Viewing> findByAgentAndViewingDateBetween(
            @Param("agent") Agent agent,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    @Query("SELECT COUNT(v) FROM Viewing v WHERE v.client = :client")
    long countByClient(@Param("client") Client client);

    /**
     * Lightweight lookup (no JOIN FETCH) for cross-referencing matching results against
     * existing viewings, to flag clients/properties that were already proposed to each other.
     */
    List<Viewing> findByProperty_Id(UUID propertyId);

    List<Viewing> findByClient_Id(UUID clientId);
}
