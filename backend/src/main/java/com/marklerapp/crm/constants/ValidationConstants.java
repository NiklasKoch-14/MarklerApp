package com.marklerapp.crm.constants;

/**
 * Centralized validation constants for the application.
 * Eliminates magic numbers and strings scattered throughout the codebase.
 *
 * <p>This class contains all validation rules, limits, and GDPR-related constants
 * used throughout the backend services and controllers.</p>
 *
 * @author Claude Sonnet 4.5
 * @since Phase 7.1 - Code Quality Improvements
 */
public final class ValidationConstants {

    private ValidationConstants() {
        throw new UnsupportedOperationException("This is a utility class and cannot be instantiated");
    }

    // ========================================
    // File Upload Limits
    // ========================================

    /**
     * Maximum size for image uploads (5MB)
     */
    public static final long MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

    /**
     * Maximum size for property expose/brochure PDFs (50MB)
     */
    public static final long MAX_EXPOSE_SIZE_BYTES = 50 * 1024 * 1024;

    /**
     * Maximum size for general document attachments (10MB)
     */
    public static final long MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024;

    // ========================================
    // Text Length Limits
    // ========================================

    /**
     * Maximum length for notes preview text
     */
    public static final int NOTES_PREVIEW_LENGTH = 150;

    /**
     * Maximum length for short description fields
     */
    public static final int SHORT_DESCRIPTION_LENGTH = 200;

    /**
     * Maximum filename length (database column limit)
     */
    public static final int MAX_FILENAME_LENGTH = 255;

    /**
     * Maximum word count for AI-generated summaries
     */
    public static final int MAX_AI_SUMMARY_WORDS = 300;

    // ========================================
    // Image Processing
    // ========================================

    /**
     * Thumbnail size in pixels (width and height)
     */
    public static final int THUMBNAIL_SIZE = 200;

    /**
     * Maximum image width in pixels
     */
    public static final int MAX_IMAGE_WIDTH = 1920;

    /**
     * Maximum image height in pixels
     */
    public static final int MAX_IMAGE_HEIGHT = 1080;

    // ========================================
    // Validation Patterns (Regex)
    // ========================================

    /**
     * Regex pattern for German postal codes (5 digits)
     */
    public static final String GERMAN_POSTAL_CODE_REGEX = "^[0-9]{5}$";

    /**
     * Validation message for German postal codes
     */
    public static final String GERMAN_POSTAL_CODE_MESSAGE = "Postal code must be 5 digits";

    /**
     * Regex pattern for phone numbers (international format)
     */
    public static final String PHONE_NUMBER_REGEX = "^[+]?[0-9\\s\\-()]+$";

    /**
     * Validation message for phone numbers
     */
    public static final String PHONE_NUMBER_MESSAGE = "Phone number format is invalid";

    /**
     * Validation message for email addresses
     */
    public static final String EMAIL_MESSAGE = "Email should be valid";

    /**
     * Regex pattern for supported image formats
     */
    public static final String SUPPORTED_IMAGE_FORMAT_REGEX = "image/(jpeg|jpg|png|gif|webp)";

    /**
     * Validation message for supported image formats
     */
    public static final String UNSUPPORTED_IMAGE_FORMAT_MESSAGE = "Unsupported image format. Supported: JPEG, PNG, GIF, WebP";

    // ========================================
    // File Type Validation
    // ========================================

    /**
     * MIME type for PDF files
     */
    public static final String PDF_MIME_TYPE = "application/pdf";

    /**
     * File extension for PDFs
     */
    public static final String PDF_EXTENSION = ".pdf";

    /**
     * Allowed file extensions for images
     */
    public static final String[] ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"};

    /**
     * Allowed MIME types for image uploads
     */
    public static final String[] ALLOWED_IMAGE_MIME_TYPES = {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp"
    };

    /**
     * Allowed file extensions for document attachments
     */
    public static final String[] ALLOWED_ATTACHMENT_EXTENSIONS = {
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png", ".gif"
    };

    /**
     * Allowed MIME types for document attachments
     */
    public static final String[] ALLOWED_ATTACHMENT_MIME_TYPES = {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/jpeg",
        "image/png",
        "image/gif"
    };

    // ========================================
    // Default Values
    // ========================================

    /**
     * Default country for addresses (German real estate market)
     */
    public static final String DEFAULT_ADDRESS_COUNTRY = "Germany";

    // ========================================
    // GDPR Compliance
    // ========================================

    /**
     * Error message when GDPR consent is required but not given
     */
    public static final String GDPR_CONSENT_REQUIRED_MESSAGE = "Data processing consent is required";

    /**
     * Error message when client email already exists
     */
    public static final String DUPLICATE_EMAIL_MESSAGE = "A client with this email already exists";

    /**
     * Error message when agent session is invalid
     */
    public static final String INVALID_AGENT_SESSION_MESSAGE = "Unable to create client: Invalid agent session. Please log out and log in again.";

    // ========================================
    // Error Messages
    // ========================================

    /**
     * Error message for empty files
     */
    public static final String FILE_EMPTY_MESSAGE = "File is empty";

    /**
     * Error message when file exceeds size limit (template with placeholder)
     */
    public static final String FILE_SIZE_EXCEEDED_MESSAGE_TEMPLATE = "File size exceeds maximum limit of %d MB";

    /**
     * Error message when content type is missing
     */
    public static final String MISSING_CONTENT_TYPE_MESSAGE = "File content type is missing";

    /**
     * Error message for unsupported attachment formats
     */
    public static final String UNSUPPORTED_ATTACHMENT_FORMAT_MESSAGE = "Unsupported file format. Supported: PDF, Word, Excel, JPEG, PNG, GIF";

    /**
     * Error message for invalid PDF format
     */
    public static final String INVALID_PDF_MESSAGE = "File must be a PDF";

    /**
     * Error message for PDF size limit
     */
    public static final String PDF_SIZE_LIMIT_MESSAGE = "File size must not exceed 50MB";

    /**
     * Error message for missing file data
     */
    public static final String FILE_DATA_REQUIRED_MESSAGE = "File data is required";

    /**
     * Error message for invalid Base64 format
     */
    public static final String INVALID_BASE64_FORMAT_MESSAGE = "Invalid file data format. Must be Base64 encoded.";

    /**
     * Error message for invalid PDF file structure
     */
    public static final String INVALID_PDF_FILE_MESSAGE = "Invalid PDF file";

    /**
     * Error message for invalid PDF file format
     */
    public static final String INVALID_PDF_FORMAT_MESSAGE = "Invalid PDF file format";

    /**
     * Error message when file must be an image
     */
    public static final String FILE_MUST_BE_IMAGE_MESSAGE = "File must be an image";

    /**
     * Error message for image size limit
     */
    public static final String IMAGE_SIZE_LIMIT_MESSAGE = "File size exceeds maximum limit of 10MB";

    // ========================================
    // Dashboard Analytics Constants
    // ========================================

    /**
     * Number of days without contact to consider client needing attention
     */
    public static final int DAYS_WITHOUT_CONTACT_THRESHOLD = 30;

    /**
     * Number of days since last contact to consider lead hot (requires follow-up)
     */
    public static final int HOT_LEAD_DAYS_THRESHOLD = 7;

    /**
     * Number of days for activity trends calculation
     */
    public static final int ACTIVITY_TRENDS_DAYS = 30;

    /**
     * Maximum number of urgent client insights to return
     */
    public static final int MAX_URGENT_CLIENT_INSIGHTS = 10;

    /**
     * Maximum number of suggested actions to return
     */
    public static final int MAX_SUGGESTED_ACTIONS = 5;

    /**
     * Decimal precision for percentage calculations (multiplier for rounding)
     */
    public static final double PERCENTAGE_ROUNDING_PRECISION = 10.0;
}
