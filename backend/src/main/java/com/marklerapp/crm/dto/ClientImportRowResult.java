package com.marklerapp.crm.dto;

import lombok.*;

import java.util.UUID;

/**
 * Outcome of importing a single row of a client CSV import.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientImportRowResult {

    private int rowNumber;
    private String firstName;
    private String lastName;
    private ClientImportStatus status;
    private String message;
    private UUID clientId;

    public enum ClientImportStatus {
        IMPORTED,
        SKIPPED_DUPLICATE,
        FAILED
    }
}
