package com.marklerapp.crm.constants;

/**
 * Centralized validation constants for the application.
 * Eliminates magic numbers and strings scattered throughout the codebase.
 *
 * @author Claude Sonnet 4.5
 * @since Phase 7.1 - Code Quality Improvements
 */
public final class ValidationConstants {

    private ValidationConstants() {
        throw new UnsupportedOperationException("This is a utility class and cannot be instantiated");
    }

    // File upload limits
    public static final long MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
    public static final long MAX_EXPOSE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

    // Text limits
    public static final int NOTES_PREVIEW_LENGTH = 150;
    public static final int SHORT_DESCRIPTION_LENGTH = 200;
    public static final int MAX_FILENAME_LENGTH = 255;

    // Image processing
    public static final int THUMBNAIL_SIZE = 200; // 200x200 pixels
    public static final int MAX_IMAGE_WIDTH = 1920;
    public static final int MAX_IMAGE_HEIGHT = 1080;

    // Postal code validation
    public static final String GERMAN_POSTAL_CODE_REGEX = "^[0-9]{5}$";
    public static final String GERMAN_POSTAL_CODE_MESSAGE = "Postal code must be 5 digits";

    // Phone validation
    public static final String PHONE_NUMBER_REGEX = "^[+]?[0-9\\s\\-()]+$";
    public static final String PHONE_NUMBER_MESSAGE = "Phone number format is invalid";

    // Email validation
    public static final String EMAIL_MESSAGE = "Email should be valid";

    // File type validation
    public static final String PDF_MIME_TYPE = "application/pdf";
    public static final String PDF_EXTENSION = ".pdf";
    public static final String[] ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"};
    public static final String[] ALLOWED_IMAGE_MIME_TYPES = {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp"
    };
}
