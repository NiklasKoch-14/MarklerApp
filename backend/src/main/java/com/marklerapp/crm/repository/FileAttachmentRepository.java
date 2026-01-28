package com.marklerapp.crm.repository;

import com.marklerapp.crm.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Repository interface for FileAttachment entity.
 * Provides data access methods for file attachment operations.
 *
 * @author Claude Sonnet 4.5
 * @since File Attachment Feature
 */
@Repository
public interface FileAttachmentRepository extends JpaRepository<FileAttachment, UUID> {

    /**
     * Find all attachments for a specific property, ordered by upload date descending.
     *
     * @param property the property entity
     * @return list of file attachments
     */
    List<FileAttachment> findByPropertyOrderByUploadDateDesc(Property property);

    /**
     * Find all attachments for a specific client, ordered by upload date descending.
     *
     * @param client the client entity
     * @return list of file attachments
     */
    List<FileAttachment> findByClientOrderByUploadDateDesc(Client client);

    /**
     * Find all attachments for a specific agent, ordered by upload date descending.
     *
     * @param agent the agent entity
     * @return list of file attachments
     */
    List<FileAttachment> findByAgentOrderByUploadDateDesc(Agent agent);

    /**
     * Find attachments by property and file type.
     *
     * @param property the property entity
     * @param fileType the file type
     * @return list of file attachments
     */
    List<FileAttachment> findByPropertyAndFileTypeOrderByUploadDateDesc(
        Property property, FileAttachmentType fileType
    );

    /**
     * Find attachments by client and file type.
     *
     * @param client the client entity
     * @param fileType the file type
     * @return list of file attachments
     */
    List<FileAttachment> findByClientAndFileTypeOrderByUploadDateDesc(
        Client client, FileAttachmentType fileType
    );

    /**
     * Count attachments for a property.
     *
     * @param property the property entity
     * @return count of attachments
     */
    long countByProperty(Property property);

    /**
     * Count attachments for a client.
     *
     * @param client the client entity
     * @return count of attachments
     */
    long countByClient(Client client);

    /**
     * Count attachments by property and file type.
     *
     * @param property the property entity
     * @param fileType the file type
     * @return count of attachments
     */
    long countByPropertyAndFileType(Property property, FileAttachmentType fileType);

    /**
     * Count attachments by client and file type.
     *
     * @param client the client entity
     * @param fileType the file type
     * @return count of attachments
     */
    long countByClientAndFileType(Client client, FileAttachmentType fileType);

    /**
     * Calculate total file size for a property's attachments.
     *
     * @param property the property entity
     * @return total file size in bytes, or 0 if no attachments
     */
    @Query("SELECT COALESCE(SUM(f.fileSize), 0) FROM FileAttachment f WHERE f.property = :property")
    long calculateTotalFileSizeByProperty(@Param("property") Property property);

    /**
     * Calculate total file size for a client's attachments.
     *
     * @param client the client entity
     * @return total file size in bytes, or 0 if no attachments
     */
    @Query("SELECT COALESCE(SUM(f.fileSize), 0) FROM FileAttachment f WHERE f.client = :client")
    long calculateTotalFileSizeByClient(@Param("client") Client client);
}
