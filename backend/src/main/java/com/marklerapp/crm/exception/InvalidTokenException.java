package com.marklerapp.crm.exception;

/**
 * Exception thrown when a password reset token is invalid.
 *
 * <p>A token is considered invalid if:
 * <ul>
 *   <li>Token hash doesn't exist in database</li>
 *   <li>Token format is incorrect</li>
 *   <li>Token has already been used</li>
 * </ul>
 * </p>
 */
public class InvalidTokenException extends RuntimeException {

    /**
     * Constructs a new invalid token exception with the specified detail message.
     *
     * @param message the detail message
     */
    public InvalidTokenException(String message) {
        super(message);
    }

    /**
     * Constructs a new invalid token exception with the specified detail message and cause.
     *
     * @param message the detail message
     * @param cause the cause of the exception
     */
    public InvalidTokenException(String message, Throwable cause) {
        super(message, cause);
    }
}
