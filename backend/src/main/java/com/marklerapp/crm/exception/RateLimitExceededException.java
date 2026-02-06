package com.marklerapp.crm.exception;

/**
 * Exception thrown when rate limit is exceeded for password reset requests.
 *
 * <p>Used to prevent abuse by limiting the number of password reset requests
 * an agent can make within a specific time window (e.g., 3 requests per hour).</p>
 */
public class RateLimitExceededException extends RuntimeException {

    /**
     * Constructs a new rate limit exceeded exception with the specified detail message.
     *
     * @param message the detail message
     */
    public RateLimitExceededException(String message) {
        super(message);
    }

    /**
     * Constructs a new rate limit exceeded exception with the specified detail message and cause.
     *
     * @param message the detail message
     * @param cause the cause of the exception
     */
    public RateLimitExceededException(String message, Throwable cause) {
        super(message, cause);
    }
}
