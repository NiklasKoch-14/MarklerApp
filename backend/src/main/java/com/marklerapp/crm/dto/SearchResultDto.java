package com.marklerapp.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Result of the global search ({@code GET /search?q=}), grouped by entity type.
 * Every group is capped server-side so the command palette stays scannable.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchResultDto {

    /** The (trimmed) term the result was produced for — lets the client discard stale responses. */
    private String query;

    /** Sum of all returned hits across the groups (already capped per group). */
    private int totalHits;

    private List<Hit> clients;
    private List<Hit> properties;
    private List<Hit> notes;

    public enum Type {
        CLIENT,
        PROPERTY,
        NOTE
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Hit {

        private UUID id;
        private Type type;

        /** Primary line: client name, property title, note subject. */
        private String title;

        /** Secondary line: contact data, address, client name of a note. */
        private String subtitle;

        /** Excerpt around the match — only filled for notes, where the body carries the meaning. */
        private String snippet;

        /** Notes point at their client: the detail page to navigate to is the client's. */
        private UUID clientId;

        /** Notes only: the call date, so the palette can show when it happened. */
        private LocalDateTime date;
    }
}
