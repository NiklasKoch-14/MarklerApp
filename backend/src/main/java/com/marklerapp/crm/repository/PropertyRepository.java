package com.marklerapp.crm.repository;

import com.marklerapp.crm.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for Property entity operations.
 */
@Repository
public interface PropertyRepository extends JpaRepository<Property, UUID> {

    /**
     * Find properties by agent
     */
    Page<Property> findByAgent(Agent agent, Pageable pageable);

    /**
     * Find properties by agent ID
     */
    Page<Property> findByAgentId(UUID agentId, Pageable pageable);

    /**
     * Find properties by agent and status
     */
    Page<Property> findByAgentAndStatus(Agent agent, PropertyStatus status, Pageable pageable);

    /**
     * Find properties by agent and property type
     */
    Page<Property> findByAgentAndPropertyType(Agent agent, PropertyType propertyType, Pageable pageable);

    /**
     * Find properties by agent and listing type
     */
    Page<Property> findByAgentAndListingType(Agent agent, ListingType listingType, Pageable pageable);

    /**
     * Search properties by text (title, description, address)
     */
    @Query("SELECT p FROM Property p WHERE p.agent = :agent AND " +
           "(LOWER(p.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(p.addressStreet) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "LOWER(p.addressCity) LIKE LOWER(CONCAT('%', :searchTerm, '%')))")
    Page<Property> findByAgentAndSearchTerm(@Param("agent") Agent agent,
                                           @Param("searchTerm") String searchTerm,
                                           Pageable pageable);

    /**
     * Find properties by city
     */
    Page<Property> findByAgentAndAddressCity(Agent agent, String city, Pageable pageable);

    /**
     * Find properties by postal code pattern
     */
    @Query("SELECT p FROM Property p WHERE p.agent = :agent AND p.addressPostalCode LIKE :postalCodePattern")
    Page<Property> findByAgentAndPostalCodePattern(@Param("agent") Agent agent,
                                                   @Param("postalCodePattern") String postalCodePattern,
                                                   Pageable pageable);

    /**
     * Find properties by price range
     */
    @Query("SELECT p FROM Property p WHERE p.agent = :agent AND " +
           "(:minPrice IS NULL OR p.price >= :minPrice) AND " +
           "(:maxPrice IS NULL OR p.price <= :maxPrice)")
    Page<Property> findByAgentAndPriceRange(@Param("agent") Agent agent,
                                           @Param("minPrice") BigDecimal minPrice,
                                           @Param("maxPrice") BigDecimal maxPrice,
                                           Pageable pageable);

    /**
     * Find properties by living area range
     */
    @Query("SELECT p FROM Property p WHERE p.agent = :agent AND " +
           "(:minArea IS NULL OR p.livingAreaSqm >= :minArea) AND " +
           "(:maxArea IS NULL OR p.livingAreaSqm <= :maxArea)")
    Page<Property> findByAgentAndLivingAreaRange(@Param("agent") Agent agent,
                                                @Param("minArea") BigDecimal minArea,
                                                @Param("maxArea") BigDecimal maxArea,
                                                Pageable pageable);

    /**
     * Find properties by room range
     */
    @Query("SELECT p FROM Property p WHERE p.agent = :agent AND " +
           "(:minRooms IS NULL OR p.rooms >= :minRooms) AND " +
           "(:maxRooms IS NULL OR p.rooms <= :maxRooms)")
    Page<Property> findByAgentAndRoomRange(@Param("agent") Agent agent,
                                          @Param("minRooms") BigDecimal minRooms,
                                          @Param("maxRooms") BigDecimal maxRooms,
                                          Pageable pageable);

    /**
     * Advanced property search with multiple criteria
     */
    @Query("SELECT p FROM Property p WHERE p.agent = :agent AND " +
           "(:status IS NULL OR p.status = :status) AND " +
           "(:propertyType IS NULL OR p.propertyType = :propertyType) AND " +
           "(:listingType IS NULL OR p.listingType = :listingType) AND " +
           "(:city IS NULL OR LOWER(p.addressCity) = LOWER(:city)) AND " +
           "(:minPrice IS NULL OR p.price >= :minPrice) AND " +
           "(:maxPrice IS NULL OR p.price <= :maxPrice) AND " +
           "(:minArea IS NULL OR p.livingAreaSqm >= :minArea) AND " +
           "(:maxArea IS NULL OR p.livingAreaSqm <= :maxArea) AND " +
           "(:minRooms IS NULL OR p.rooms >= :minRooms) AND " +
           "(:maxRooms IS NULL OR p.rooms <= :maxRooms)")
    Page<Property> findByAdvancedCriteria(@Param("agent") Agent agent,
                                         @Param("status") PropertyStatus status,
                                         @Param("propertyType") PropertyType propertyType,
                                         @Param("listingType") ListingType listingType,
                                         @Param("city") String city,
                                         @Param("minPrice") BigDecimal minPrice,
                                         @Param("maxPrice") BigDecimal maxPrice,
                                         @Param("minArea") BigDecimal minArea,
                                         @Param("maxArea") BigDecimal maxArea,
                                         @Param("minRooms") BigDecimal minRooms,
                                         @Param("maxRooms") BigDecimal maxRooms,
                                         Pageable pageable);

    /**
     * Find properties matching client search criteria
     */
    @Query("SELECT p FROM Property p WHERE p.agent = :agent AND " +
           "p.status = 'AVAILABLE' AND " +
           "(:minPrice IS NULL OR p.price >= :minPrice) AND " +
           "(:maxPrice IS NULL OR p.price <= :maxPrice) AND " +
           "(:minArea IS NULL OR p.livingAreaSqm >= :minArea) AND " +
           "(:maxArea IS NULL OR p.livingAreaSqm <= :maxArea) AND " +
           "(:minRooms IS NULL OR p.rooms >= :minRooms) AND " +
           "(:maxRooms IS NULL OR p.rooms <= :maxRooms) AND " +
           "(:propertyTypes IS NULL OR p.propertyType IN :propertyTypes)")
    Page<Property> findMatchingProperties(@Param("agent") Agent agent,
                                         @Param("minPrice") BigDecimal minPrice,
                                         @Param("maxPrice") BigDecimal maxPrice,
                                         @Param("minArea") BigDecimal minArea,
                                         @Param("maxArea") BigDecimal maxArea,
                                         @Param("minRooms") BigDecimal minRooms,
                                         @Param("maxRooms") BigDecimal maxRooms,
                                         @Param("propertyTypes") List<PropertyType> propertyTypes,
                                         Pageable pageable);

    /**
     * Find properties with images
     */
    @Query("SELECT DISTINCT p FROM Property p LEFT JOIN FETCH p.images WHERE p.agent = :agent")
    List<Property> findByAgentWithImages(@Param("agent") Agent agent);

    /**
     * Find recently added properties
     */
    @Query("SELECT p FROM Property p WHERE p.agent = :agent AND p.createdAt >= :since ORDER BY p.createdAt DESC")
    List<Property> findRecentPropertiesByAgent(@Param("agent") Agent agent,
                                              @Param("since") LocalDateTime since);

    /**
     * Find properties available from a specific date
     */
    @Query("SELECT p FROM Property p WHERE p.agent = :agent AND " +
           "p.status = 'AVAILABLE' AND " +
           "(:availableFrom IS NULL OR p.availableFrom IS NULL OR p.availableFrom <= :availableFrom)")
    Page<Property> findAvailableProperties(@Param("agent") Agent agent,
                                          @Param("availableFrom") LocalDate availableFrom,
                                          Pageable pageable);

    /**
     * Count properties by agent
     */
    long countByAgent(Agent agent);

    /**
     * Count properties by agent ID
     */
    long countByAgentId(UUID agentId);

    /**
     * Count properties by agent and status
     */
    long countByAgentAndStatus(Agent agent, PropertyStatus status);

    /**
     * Count properties by agent and listing type
     */
    long countByAgentAndListingType(Agent agent, ListingType listingType);

    /**
     * Find properties by construction year range
     */
    @Query("SELECT p FROM Property p WHERE p.agent = :agent AND " +
           "(:minYear IS NULL OR p.constructionYear >= :minYear) AND " +
           "(:maxYear IS NULL OR p.constructionYear <= :maxYear)")
    Page<Property> findByConstructionYearRange(@Param("agent") Agent agent,
                                              @Param("minYear") Integer minYear,
                                              @Param("maxYear") Integer maxYear,
                                              Pageable pageable);

    /**
     * Find properties with specific features
     */
    @Query("SELECT p FROM Property p WHERE p.agent = :agent AND " +
           "(:hasElevator IS NULL OR p.hasElevator = :hasElevator) AND " +
           "(:hasBalcony IS NULL OR p.hasBalcony = :hasBalcony) AND " +
           "(:hasGarden IS NULL OR p.hasGarden = :hasGarden) AND " +
           "(:hasGarage IS NULL OR p.hasGarage = :hasGarage) AND " +
           "(:isBarrierFree IS NULL OR p.isBarrierFree = :isBarrierFree) AND " +
           "(:petsAllowed IS NULL OR p.petsAllowed = :petsAllowed)")
    Page<Property> findByFeatures(@Param("agent") Agent agent,
                                  @Param("hasElevator") Boolean hasElevator,
                                  @Param("hasBalcony") Boolean hasBalcony,
                                  @Param("hasGarden") Boolean hasGarden,
                                  @Param("hasGarage") Boolean hasGarage,
                                  @Param("isBarrierFree") Boolean isBarrierFree,
                                  @Param("petsAllowed") Boolean petsAllowed,
                                  Pageable pageable);

    /**
     * Find top cities by property count for an agent
     */
    @Query("SELECT p.addressCity, COUNT(p) FROM Property p WHERE p.agent = :agent " +
           "GROUP BY p.addressCity ORDER BY COUNT(p) DESC")
    List<Object[]> findTopCitiesByPropertyCount(@Param("agent") Agent agent, Pageable pageable);
}