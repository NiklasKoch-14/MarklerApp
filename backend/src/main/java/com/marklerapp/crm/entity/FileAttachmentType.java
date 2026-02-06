package com.marklerapp.crm.entity;

/**
 * Enum representing different types of file attachments.
 * Used to categorize documents for better organization and filtering.
 *
 * @author Claude Sonnet 4.5
 * @since File Attachment Feature
 */
public enum FileAttachmentType {
    /**
     * Contract documents (purchase agreements, rental contracts, etc.)
     */
    CONTRACT,

    /**
     * Floor plans and architectural drawings
     */
    FLOOR_PLAN,

    /**
     * Identity documents (passport, ID card copies, etc.)
     */
    ID_DOCUMENT,

    /**
     * Certificates (energy certificate, building permit, etc.)
     */
    CERTIFICATE,

    /**
     * Financial documents (bank statements, income proof, etc.)
     */
    FINANCIAL,

    /**
     * Property inspection reports
     */
    INSPECTION_REPORT,

    /**
     * Other miscellaneous documents
     */
    OTHER
}
