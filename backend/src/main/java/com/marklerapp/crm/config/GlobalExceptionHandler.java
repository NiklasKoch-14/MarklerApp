package com.marklerapp.crm.config;

import com.marklerapp.crm.exception.FileStorageException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Global exception handler for handling application-wide exceptions.
 */
@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Handle validation errors
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationException(
            MethodArgumentNotValidException ex,
            WebRequest request) {

        Map<String, Object> response = createErrorResponse(
                HttpStatus.BAD_REQUEST,
                "Validation failed. Please check the provided data.",
                request
        );

        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(error -> {
            if (error instanceof FieldError fieldError) {
                fieldErrors.put(fieldError.getField(), error.getDefaultMessage());
            } else {
                fieldErrors.put(error.getObjectName(), error.getDefaultMessage());
            }
        });

        response.put("errorCode", "VALIDATION_ERROR");
        response.put("fieldErrors", fieldErrors);
        response.put("errorCount", fieldErrors.size());

        log.warn("Validation error - {} field(s) failed: {}", fieldErrors.size(), fieldErrors);

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * Handle authentication errors
     */
    @ExceptionHandler({BadCredentialsException.class, UsernameNotFoundException.class})
    public ResponseEntity<Map<String, Object>> handleAuthenticationException(
            Exception ex,
            WebRequest request) {

        Map<String, Object> response = createErrorResponse(
                HttpStatus.UNAUTHORIZED,
                "Invalid email or password",
                request
        );
        response.put("errorCode", "AUTHENTICATION_FAILED");

        log.warn("Authentication error: {}", ex.getMessage());

        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    /**
     * Handle illegal argument exceptions
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(
            IllegalArgumentException ex,
            WebRequest request) {

        Map<String, Object> response = createErrorResponse(
                HttpStatus.BAD_REQUEST,
                ex.getMessage(),
                request
        );
        response.put("errorCode", "INVALID_ARGUMENT");

        log.warn("Illegal argument error: {}", ex.getMessage());

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * Handle resource not found exceptions
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFoundException(
            ResourceNotFoundException ex,
            WebRequest request) {

        Map<String, Object> response = createErrorResponse(
                HttpStatus.NOT_FOUND,
                ex.getMessage(),
                request
        );
        response.put("errorCode", "RESOURCE_NOT_FOUND");

        log.warn("Resource not found: {}", ex.getMessage());

        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    /**
     * Handle access denied exceptions
     */
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDeniedException(
            org.springframework.security.access.AccessDeniedException ex,
            WebRequest request) {

        Map<String, Object> response = createErrorResponse(
                HttpStatus.FORBIDDEN,
                "You do not have permission to perform this action",
                request
        );
        response.put("errorCode", "ACCESS_DENIED");

        log.warn("Access denied: {}", ex.getMessage());

        return new ResponseEntity<>(response, HttpStatus.FORBIDDEN);
    }

    /**
     * Handle file storage exceptions
     */
    @ExceptionHandler(FileStorageException.class)
    public ResponseEntity<Map<String, Object>> handleFileStorageException(
            FileStorageException ex,
            WebRequest request) {

        Map<String, Object> response = createErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                ex.getMessage(),
                request
        );
        response.put("errorCode", "FILE_STORAGE_ERROR");

        log.error("File storage error: {}", ex.getMessage(), ex);

        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * Handle file not found exceptions
     */
    @ExceptionHandler(com.marklerapp.crm.exception.FileNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleFileNotFoundException(
            com.marklerapp.crm.exception.FileNotFoundException ex,
            WebRequest request) {

        Map<String, Object> response = createErrorResponse(
                HttpStatus.NOT_FOUND,
                ex.getMessage(),
                request
        );
        response.put("errorCode", "FILE_NOT_FOUND");

        log.warn("File not found: {}", ex.getMessage());

        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    /**
     * Handle database constraint violations
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(
            DataIntegrityViolationException ex,
            WebRequest request) {

        String message = "Database constraint violation";
        String detailedMessage = ex.getMostSpecificCause().getMessage();

        // Provide user-friendly messages for common constraint violations
        if (detailedMessage != null) {
            if (detailedMessage.contains("UNIQUE") || detailedMessage.contains("duplicate")) {
                message = "A record with this information already exists";
            } else if (detailedMessage.contains("FOREIGN KEY") || detailedMessage.contains("foreign key")) {
                message = "Cannot complete operation due to related records";
            } else if (detailedMessage.contains("NOT NULL") || detailedMessage.contains("null")) {
                message = "Required field is missing";
            }
        }

        Map<String, Object> response = createErrorResponse(
                HttpStatus.CONFLICT,
                message,
                request
        );
        response.put("errorCode", "DATA_INTEGRITY_VIOLATION");
        response.put("details", detailedMessage);

        log.warn("Data integrity violation: {}", detailedMessage);

        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    /**
     * Handle SQL exceptions
     */
    @ExceptionHandler(SQLException.class)
    public ResponseEntity<Map<String, Object>> handleSQLException(
            SQLException ex,
            WebRequest request) {

        Map<String, Object> response = createErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Database error occurred",
                request
        );
        response.put("errorCode", "DATABASE_ERROR");

        log.error("SQL error: {}", ex.getMessage(), ex);

        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * Handle invalid request body (malformed JSON, type mismatches, etc.)
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex,
            WebRequest request) {

        String message = "Invalid request format";
        if (ex.getMessage() != null) {
            if (ex.getMessage().contains("UUID")) {
                message = "Invalid UUID format provided";
            } else if (ex.getMessage().contains("JSON")) {
                message = "Invalid JSON format";
            } else if (ex.getMessage().contains("LocalDate") || ex.getMessage().contains("LocalDateTime")) {
                message = "Invalid date/time format. Expected ISO format (e.g., 2025-12-17 or 2025-12-17T10:30:00)";
            }
        }

        Map<String, Object> response = createErrorResponse(
                HttpStatus.BAD_REQUEST,
                message,
                request
        );
        response.put("errorCode", "INVALID_REQUEST_FORMAT");

        log.warn("Invalid request format: {}", ex.getMessage());

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * Handle method argument type mismatch (e.g., passing string where UUID expected)
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleMethodArgumentTypeMismatch(
            MethodArgumentTypeMismatchException ex,
            WebRequest request) {

        String message = String.format("Invalid value '%s' for parameter '%s'. Expected type: %s",
                ex.getValue(),
                ex.getName(),
                ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown");

        Map<String, Object> response = createErrorResponse(
                HttpStatus.BAD_REQUEST,
                message,
                request
        );
        response.put("errorCode", "TYPE_MISMATCH");
        response.put("parameter", ex.getName());
        response.put("providedValue", ex.getValue());
        response.put("expectedType", ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown");

        log.warn("Type mismatch for parameter '{}': {}", ex.getName(), ex.getMessage());

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * Handle missing required parameters
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingServletRequestParameter(
            MissingServletRequestParameterException ex,
            WebRequest request) {

        String message = String.format("Required parameter '%s' is missing", ex.getParameterName());

        Map<String, Object> response = createErrorResponse(
                HttpStatus.BAD_REQUEST,
                message,
                request
        );
        response.put("errorCode", "MISSING_PARAMETER");
        response.put("parameter", ex.getParameterName());

        log.warn("Missing required parameter: {}", ex.getParameterName());

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * Handle null pointer exceptions
     */
    @ExceptionHandler(NullPointerException.class)
    public ResponseEntity<Map<String, Object>> handleNullPointerException(
            NullPointerException ex,
            WebRequest request) {

        Map<String, Object> response = createErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "An internal error occurred. Required data is missing.",
                request
        );
        response.put("errorCode", "NULL_POINTER");

        log.error("Null pointer exception", ex);

        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * Handle all other exceptions
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneralException(
            Exception ex,
            WebRequest request) {

        Map<String, Object> response = createErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred. Please try again later.",
                request
        );
        response.put("errorCode", "INTERNAL_ERROR");

        log.error("Unexpected error: {}", ex.getMessage(), ex);

        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * Create standardized error response
     */
    private Map<String, Object> createErrorResponse(HttpStatus status, String message, WebRequest request) {
        Map<String, Object> response = new HashMap<>();
        response.put("timestamp", LocalDateTime.now());
        response.put("status", status.value());
        response.put("error", status.getReasonPhrase());
        response.put("message", message);
        response.put("path", request.getDescription(false).replace("uri=", ""));

        return response;
    }

    /**
     * Custom exception for resource not found scenarios
     */
    public static class ResourceNotFoundException extends RuntimeException {
        public ResourceNotFoundException(String message) {
            super(message);
        }

        public ResourceNotFoundException(String resource, String field, Object value) {
            super(String.format("%s not found with %s: %s", resource, field, value));
        }
    }
}