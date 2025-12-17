package com.marklerapp.crm.exception;

/**
 * Exception thrown when a file storage operation fails.
 *
 * <p>This exception is used for general file storage errors such as:
 * <ul>
 *   <li>File system access errors</li>
 *   <li>Disk full errors</li>
 *   <li>Permission denied errors</li>
 *   <li>Invalid file paths</li>
 *   <li>File creation/deletion failures</li>
 * </ul>
 * </p>
 *
 * @see FileNotFoundException
 */
public class FileStorageException extends RuntimeException {

    /**
     * Constructs a new file storage exception with the specified detail message.
     *
     * @param message the detail message
     */
    public FileStorageException(String message) {
        super(message);
    }

    /**
     * Constructs a new file storage exception with the specified detail message and cause.
     *
     * @param message the detail message
     * @param cause the cause of the exception
     */
    public FileStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
