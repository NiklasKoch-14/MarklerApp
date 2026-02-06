package com.marklerapp.crm.exception;

/**
 * Exception thrown when a password reset token has expired.
 *
 * <p>Password reset tokens expire after a configured time period
 * (typically 15 minutes) for security reasons.</p>
 */
public class ExpiredTokenException extends RuntimeException {

    /**
     * Constructs a new expired token exception with the specified detail message.
     *
     * @param message the detail message
     */
    public ExpiredTokenException(String message) {
        super(message);
    }

    /**
     * Constructs a new expired token exception with the specified detail message and cause.
     *
     * @param message the detail message
     * @param cause the cause of the exception
     */
    public ExpiredTokenException(String message, Throwable cause) {
        super(message, cause);
    }
}
