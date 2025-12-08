package com.marklerapp.crm.repository;

import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.PropertySearchCriteria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for PropertySearchCriteria entity operations.
 */
@Repository
public interface PropertySearchCriteriaRepository extends JpaRepository<PropertySearchCriteria, UUID> {

    /**
     * Find search criteria by client
     */
    Optional<PropertySearchCriteria> findByClient(Client client);

    /**
     * Find search criteria by client ID
     */
    Optional<PropertySearchCriteria> findByClientId(UUID clientId);

    /**
     * Find all search criteria for clients of a specific agent
     */
    @Query("SELECT psc FROM PropertySearchCriteria psc JOIN psc.client c WHERE c.agent = :agent")
    List<PropertySearchCriteria> findByClientAgent(@Param("agent") Agent agent);

    /**
     * Find search criteria with budget range overlap
     */
    @Query("SELECT psc FROM PropertySearchCriteria psc WHERE " +
           "(psc.minBudget IS NULL OR psc.minBudget <= :maxBudget) AND " +
           "(psc.maxBudget IS NULL OR psc.maxBudget >= :minBudget)")
    List<PropertySearchCriteria> findWithBudgetOverlap(@Param("minBudget") BigDecimal minBudget,
                                                       @Param("maxBudget") BigDecimal maxBudget);

    /**
     * Find search criteria with room range overlap
     */
    @Query("SELECT psc FROM PropertySearchCriteria psc WHERE " +
           "(psc.minRooms IS NULL OR psc.minRooms <= :maxRooms) AND " +
           "(psc.maxRooms IS NULL OR psc.maxRooms >= :minRooms)")
    List<PropertySearchCriteria> findWithRoomOverlap(@Param("minRooms") Integer minRooms,
                                                     @Param("maxRooms") Integer maxRooms);

    /**
     * Find search criteria with size range overlap
     */
    @Query("SELECT psc FROM PropertySearchCriteria psc WHERE " +
           "(psc.minSquareMeters IS NULL OR psc.minSquareMeters <= :maxSize) AND " +
           "(psc.maxSquareMeters IS NULL OR psc.maxSquareMeters >= :minSize)")
    List<PropertySearchCriteria> findWithSizeOverlap(@Param("minSize") Integer minSize,
                                                     @Param("maxSize") Integer maxSize);

    /**
     * Find search criteria that include a specific location
     */
    @Query("SELECT psc FROM PropertySearchCriteria psc WHERE " +
           "psc.preferredLocations IS NOT NULL AND " +
           "LOWER(psc.preferredLocations) LIKE LOWER(CONCAT('%', :location, '%'))")
    List<PropertySearchCriteria> findByPreferredLocation(@Param("location") String location);

    /**
     * Find search criteria that include a specific property type
     */
    @Query("SELECT psc FROM PropertySearchCriteria psc WHERE " +
           "psc.propertyTypes IS NOT NULL AND " +
           "LOWER(psc.propertyTypes) LIKE LOWER(CONCAT('%', :propertyType, '%'))")
    List<PropertySearchCriteria> findByPropertyType(@Param("propertyType") String propertyType);

    /**
     * Find search criteria with any budget constraints
     */
    @Query("SELECT psc FROM PropertySearchCriteria psc WHERE psc.minBudget IS NOT NULL OR psc.maxBudget IS NOT NULL")
    List<PropertySearchCriteria> findWithBudgetConstraints();

    /**
     * Find search criteria with any size constraints
     */
    @Query("SELECT psc FROM PropertySearchCriteria psc WHERE psc.minSquareMeters IS NOT NULL OR psc.maxSquareMeters IS NOT NULL")
    List<PropertySearchCriteria> findWithSizeConstraints();

    /**
     * Find search criteria with any room constraints
     */
    @Query("SELECT psc FROM PropertySearchCriteria psc WHERE psc.minRooms IS NOT NULL OR psc.maxRooms IS NOT NULL")
    List<PropertySearchCriteria> findWithRoomConstraints();

    /**
     * Count search criteria by agent
     */
    @Query("SELECT COUNT(psc) FROM PropertySearchCriteria psc JOIN psc.client c WHERE c.agent = :agent")
    long countByClientAgent(@Param("agent") Agent agent);

    /**
     * Delete search criteria by client
     */
    void deleteByClient(Client client);

    /**
     * Check if search criteria exists for client
     */
    boolean existsByClient(Client client);
}