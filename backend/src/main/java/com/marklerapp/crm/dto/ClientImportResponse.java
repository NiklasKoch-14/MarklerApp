package com.marklerapp.crm.dto;

import lombok.*;

import java.util.List;

/**
 * Summary of a client CSV bulk import — how many rows were imported, skipped as
 * duplicates, or failed, plus a per-row breakdown for the agent to review.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientImportResponse {

    private int totalRows;
    private int importedCount;
    private int skippedCount;
    private int failedCount;
    private List<ClientImportRowResult> rows;
}
