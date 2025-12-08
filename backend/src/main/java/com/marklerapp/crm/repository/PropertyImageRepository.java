package com.marklerapp.crm.repository;

import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyImage;
import com.marklerapp.crm.entity.PropertyImageType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for PropertyImage entity operations.
 */
@Repository
public interface PropertyImageRepository extends JpaRepository<PropertyImage, UUID> {

    /**
     * Find all images for a property, ordered by sort order
     */
    List<PropertyImage> findByPropertyOrderBySortOrderAsc(Property property);

    /**
     * Find all images for a property by property ID, ordered by sort order
     */
    List<PropertyImage> findByPropertyIdOrderBySortOrderAsc(UUID propertyId);

    /**
     * Find primary image for a property
     */
    Optional<PropertyImage> findByPropertyAndIsPrimaryTrue(Property property);

    /**
     * Find primary image for a property by property ID
     */
    Optional<PropertyImage> findByPropertyIdAndIsPrimaryTrue(UUID propertyId);

    /**
     * Find images by property and type
     */
    List<PropertyImage> findByPropertyAndImageTypeOrderBySortOrderAsc(Property property, PropertyImageType imageType);

    /**
     * Find images by property ID and type
     */
    List<PropertyImage> findByPropertyIdAndImageTypeOrderBySortOrderAsc(UUID propertyId, PropertyImageType imageType);

    /**
     * Count images for a property
     */
    long countByProperty(Property property);

    /**
     * Count images for a property by property ID
     */
    long countByPropertyId(UUID propertyId);

    /**
     * Count images by type for a property
     */
    long countByPropertyAndImageType(Property property, PropertyImageType imageType);

    /**
     * Find images with a specific filename
     */
    List<PropertyImage> findByFilename(String filename);

    /**
     * Find all images for properties owned by a specific agent
     */
    @Query("SELECT pi FROM PropertyImage pi JOIN pi.property p WHERE p.agent.id = :agentId")
    List<PropertyImage> findByPropertyAgentId(@Param("agentId") UUID agentId);

    /**
     * Delete all images for a property
     */
    void deleteByProperty(Property property);

    /**
     * Delete all images for a property by property ID
     */
    void deleteByPropertyId(UUID propertyId);

    /**
     * Find the next sort order for a property
     */
    @Query("SELECT COALESCE(MAX(pi.sortOrder), 0) + 1 FROM PropertyImage pi WHERE pi.property = :property")
    Integer findNextSortOrder(@Param("property") Property property);

    /**
     * Check if there are other primary images for the same property
     */
    @Query("SELECT COUNT(pi) > 0 FROM PropertyImage pi WHERE pi.property = :property AND pi.isPrimary = true AND pi.id != :excludeId")
    boolean existsOtherPrimaryImageForProperty(@Param("property") Property property, @Param("excludeId") UUID excludeId);

    /**
     * Find images larger than a specific file size
     */
    @Query("SELECT pi FROM PropertyImage pi WHERE pi.fileSize > :maxSize")
    List<PropertyImage> findLargeImages(@Param("maxSize") Long maxSize);

    /**
     * Find properties without primary images (for data integrity checks)
     */
    @Query("SELECT p FROM Property p WHERE p.id NOT IN (SELECT pi.property.id FROM PropertyImage pi WHERE pi.isPrimary = true)")
    List<Property> findPropertiesWithoutPrimaryImage();

    /**
     * Find images by content type
     */
    List<PropertyImage> findByContentType(String contentType);

    /**
     * Get image statistics by type for a property
     */
    @Query("SELECT pi.imageType, COUNT(pi) FROM PropertyImage pi WHERE pi.property = :property GROUP BY pi.imageType")
    List<Object[]> getImageStatsByType(@Param("property") Property property);
}