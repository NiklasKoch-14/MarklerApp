package com.marklerapp.crm.dto;

import lombok.*;

import java.util.List;

/**
 * DTO representing a person-related (single-client) GDPR data export,
 * as opposed to {@link GdprExportResponse} which covers an agent's whole portfolio.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GdprClientExportResponse {

    private GdprExportResponse.ExportMetadata metadata;
    private GdprClientData client;
    private List<GdprCallNoteData> callNotes;
    private List<GdprViewingData> viewings;
    private List<GdprFileAttachmentData> fileAttachments;
}
