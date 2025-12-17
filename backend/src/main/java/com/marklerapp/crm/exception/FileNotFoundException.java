package com.marklerapp.crm.exception;

/**
 * Exception thrown when a requested file cannot be found.
 *
 * <p>This exception is used when attempting to retrieve, download,
 * or serve a file that doesn't exist in the storage system.</p>
 *
 * @see FileStorageException
 */
public class FileNotFoundException extends RuntimeException {

    /**
     * Constructs a new file not found exception with the specified detail message.
     *
     * @param message the detail message
     */
    public FileNotFoundException(String message) {
        super(message);
    }

    /**
     * Constructs a new file not found exception with the specified detail message and cause.
     *
     * @param message the detail message
     * @param cause the cause of the exception
     */
    public FileNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}
