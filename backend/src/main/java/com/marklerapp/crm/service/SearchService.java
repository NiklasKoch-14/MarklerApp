package com.marklerapp.crm.service;

import com.marklerapp.crm.dto.SearchResultDto;
import com.marklerapp.crm.entity.CallNote;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.repository.CallNoteRepository;
import com.marklerapp.crm.repository.ClientRepository;
import com.marklerapp.crm.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Global search across clients, properties and call notes (Issue #42).
 *
 * <p><strong>Tenant safety:</strong> every sub-query filters on {@code agent_id}. The search
 * only ever returns rows the authenticated agent owns; hydration afterwards happens purely
 * by IDs that were already authorised by those filters.</p>
 *
 * <p><strong>Two query paths:</strong> on PostgreSQL the tsvector columns from V33 are used
 * (prefix-aware {@code to_tsquery}, ranked by {@code ts_rank}). SQLite — the local dev
 * database — has no full-text support, so a portable JPQL LIKE query on the same, narrow
 * set of columns is used instead. {@link FullTextSearchSupport} picks the path from the live
 * connection, not from a profile.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SearchService {

    /** Per group — the palette is a jump target, not a result list. */
    static final int MAX_HITS_PER_TYPE = 5;

    /** Below this, every query would match half the database. */
    static final int MIN_QUERY_LENGTH = 2;

    private static final int SNIPPET_RADIUS = 70;
    private static final int SUBTITLE_MAX_LENGTH = 120;

    private final ClientRepository clientRepository;
    private final PropertyRepository propertyRepository;
    private final CallNoteRepository callNoteRepository;
    private final FullTextSearchSupport fullTextSearchSupport;

    @Transactional(readOnly = true)
    public SearchResultDto search(UUID agentId, String rawQuery) {
        if (agentId == null) {
            throw new IllegalArgumentException("Agent ID cannot be null");
        }

        String term = rawQuery == null ? "" : rawQuery.trim();
        List<String> tokens = tokenize(term);
        if (term.length() < MIN_QUERY_LENGTH || tokens.isEmpty()) {
            return emptyResult(term);
        }

        String tsQuery = toTsQuery(tokens);
        boolean useFullText = fullTextSearchSupport.isAvailable() && !tsQuery.isEmpty();
        String pattern = "%" + term.toLowerCase(Locale.ROOT) + "%";
        PageRequest limit = PageRequest.of(0, MAX_HITS_PER_TYPE);

        List<UUID> clientIds = useFullText
                ? clientRepository.searchIdsFullText(agentId, tsQuery, MAX_HITS_PER_TYPE)
                : clientRepository.searchIdsByPattern(agentId, pattern, limit);
        List<UUID> propertyIds = useFullText
                ? propertyRepository.searchIdsFullText(agentId, tsQuery, MAX_HITS_PER_TYPE)
                : propertyRepository.searchIdsByPattern(agentId, pattern, limit);
        List<UUID> noteIds = useFullText
                ? callNoteRepository.searchIdsFullText(agentId, tsQuery, MAX_HITS_PER_TYPE)
                : callNoteRepository.searchIdsByPattern(agentId, pattern, limit);

        List<Client> clientEntities = clientIds.isEmpty()
                ? List.of() : clientRepository.findAllById(clientIds);
        List<Property> propertyEntities = propertyIds.isEmpty()
                ? List.of() : propertyRepository.findAllById(propertyIds);
        List<CallNote> noteEntities = noteIds.isEmpty()
                ? List.of() : callNoteRepository.findByIdInWithClient(noteIds);

        List<SearchResultDto.Hit> clients = inQueryOrder(clientIds, clientEntities, Client::getId)
                .stream().map(this::toClientHit).toList();
        List<SearchResultDto.Hit> properties = inQueryOrder(propertyIds, propertyEntities, Property::getId)
                .stream().map(this::toPropertyHit).toList();
        List<SearchResultDto.Hit> notes = inQueryOrder(noteIds, noteEntities, CallNote::getId)
                .stream().map(note -> toNoteHit(note, tokens)).toList();

        return SearchResultDto.builder()
                .query(term)
                .totalHits(clients.size() + properties.size() + notes.size())
                .clients(clients)
                .properties(properties)
                .notes(notes)
                .build();
    }

    // ── Query building ───────────────────────────────────────────────────────

    /**
     * Splits the raw input into search words, dropping everything that is not a letter or
     * digit. That also makes {@link #toTsQuery} injection-proof: no tsquery operator
     * character can survive this.
     */
    static List<String> tokenize(String term) {
        if (term == null || term.isBlank()) {
            return List.of();
        }
        return Arrays.stream(term.trim().split("\\s+"))
                .map(token -> token.replaceAll("[^\\p{L}\\p{N}]", ""))
                .filter(token -> !token.isEmpty())
                .limit(8)
                .toList();
    }

    /**
     * Builds a prefix tsquery ({@code bornh:* & reihenh:*}) so the palette matches while the
     * user is still typing — plainto_tsquery would only match whole words.
     */
    static String toTsQuery(List<String> tokens) {
        return tokens.stream()
                .map(token -> token.toLowerCase(Locale.ROOT) + ":*")
                .collect(Collectors.joining(" & "));
    }

    // ── Mapping ──────────────────────────────────────────────────────────────

    private SearchResultDto.Hit toClientHit(Client client) {
        String contact = joinNonBlank(" · ", client.getEmail(), client.getPhone());
        return SearchResultDto.Hit.builder()
                .id(client.getId())
                .type(SearchResultDto.Type.CLIENT)
                .title(joinNonBlank(" ", client.getFirstName(), client.getLastName()))
                .subtitle(contact)
                .build();
    }

    private SearchResultDto.Hit toPropertyHit(Property property) {
        String street = joinNonBlank(" ", property.getAddressStreet(), property.getAddressHouseNumber());
        String city = joinNonBlank(" ", property.getAddressPostalCode(), property.getAddressCity());
        return SearchResultDto.Hit.builder()
                .id(property.getId())
                .type(SearchResultDto.Type.PROPERTY)
                .title(property.getTitle())
                .subtitle(joinNonBlank(", ", street, city))
                .build();
    }

    private SearchResultDto.Hit toNoteHit(CallNote note, List<String> tokens) {
        Client client = note.getClient();
        return SearchResultDto.Hit.builder()
                .id(note.getId())
                .type(SearchResultDto.Type.NOTE)
                .title(note.getSubject())
                .subtitle(client == null ? null : joinNonBlank(" ", client.getFirstName(), client.getLastName()))
                .snippet(excerpt(note.getNotes(), tokens))
                .clientId(client == null ? null : client.getId())
                .date(note.getCallDate())
                .build();
    }

    /**
     * Cuts a window around the first matching token so the user sees <em>why</em> the note
     * matched, instead of the first two lines of an unrelated paragraph.
     */
    static String excerpt(String text, List<String> tokens) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String normalized = text.replaceAll("\\s+", " ").trim();
        String haystack = normalized.toLowerCase(Locale.ROOT);

        int match = -1;
        for (String token : tokens) {
            int index = haystack.indexOf(token.toLowerCase(Locale.ROOT));
            if (index >= 0 && (match < 0 || index < match)) {
                match = index;
            }
        }
        if (match < 0 || normalized.length() <= SUBTITLE_MAX_LENGTH) {
            return normalized.length() <= SUBTITLE_MAX_LENGTH
                    ? normalized
                    : normalized.substring(0, SUBTITLE_MAX_LENGTH).trim() + "…";
        }

        int start = Math.max(0, match - SNIPPET_RADIUS);
        int end = Math.min(normalized.length(), start + SUBTITLE_MAX_LENGTH);
        String window = normalized.substring(start, end).trim();
        return (start > 0 ? "…" : "") + window + (end < normalized.length() ? "…" : "");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * findAllById returns rows in arbitrary order — the relevance ranking lives in the ID
     * list, so it is re-applied here.
     */
    private <T> List<T> inQueryOrder(List<UUID> orderedIds, List<T> entities, Function<T, UUID> idOf) {
        Map<UUID, T> byId = new LinkedHashMap<>();
        entities.forEach(entity -> byId.put(idOf.apply(entity), entity));
        List<T> ordered = new ArrayList<>(orderedIds.size());
        orderedIds.stream().map(byId::get).filter(Objects::nonNull).forEach(ordered::add);
        return ordered;
    }

    private static String joinNonBlank(String separator, String... parts) {
        String joined = Arrays.stream(parts)
                .filter(part -> part != null && !part.isBlank())
                .map(String::trim)
                .collect(Collectors.joining(separator));
        return joined.isEmpty() ? null : joined;
    }

    private SearchResultDto emptyResult(String term) {
        return SearchResultDto.builder()
                .query(term)
                .totalHits(0)
                .clients(List.of())
                .properties(List.of())
                .notes(List.of())
                .build();
    }
}
