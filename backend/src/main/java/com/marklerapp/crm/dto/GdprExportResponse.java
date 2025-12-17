package com.marklerapp.crm.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO representing a complete GDPR data export for an agent.
 * Contains all personal data stored in the system for GDPR "Right to Access" compliance.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GdprExportResponse {

    /**
     * Export metadata
     */
    private ExportMetadata metadata;

    /**
     * Agent information
     */
    private GdprAgentData agent;

    /**
     * All clients managed by the agent
     */
    private List<GdprClientData> clients;

    /**
     * All properties managed by the agent
     */
    private List<GdprPropertyData> properties;

    /**
     * All call notes created by the agent
     */
    private List<GdprCallNoteData> callNotes;

    /**
     * Statistics summary
     */
    private ExportStatistics statistics;

    /**
     * Export metadata information
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExportMetadata {
        private LocalDateTime exportTimestamp;
        private String exportVersion;
        private String dataController;
        private String gdprStatement;
        private String purposeOfProcessing;
    }

    /**
     * Export statistics
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExportStatistics {
        private long totalClients;
        private long totalProperties;
        private long totalCallNotes;
        private long totalSearchCriteria;
        private long totalPropertyImages;
    }
}
