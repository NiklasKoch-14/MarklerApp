package com.marklerapp.crm.dto;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * A single reason contributing to a match score.
 *
 * <p>Reasons travel as a translatable {@code code} plus raw {@code params} rather than a
 * rendered sentence, so the frontend owns the wording in de/en and formats numbers in the
 * user's locale. Building sentences here would hard-code English into the API.</p>
 *
 * <p>{@code category} names the score dimension the reason belongs to, which lets the UI
 * file each reason under its own score bar instead of one undifferentiated list.</p>
 */
public record MatchReasonDto(String code, String category, Map<String, Object> params) {

    public static final String CATEGORY_PRICE = "PRICE";
    public static final String CATEGORY_LOCATION = "LOCATION";
    public static final String CATEGORY_AREA = "AREA";
    public static final String CATEGORY_ROOM = "ROOM";
    public static final String CATEGORY_TYPE = "TYPE";

    /**
     * Build a reason from alternating key/value pairs.
     *
     * @param category one of the {@code CATEGORY_*} constants
     * @param code     i18n key suffix, resolved under {@code properties.matching.reasons}
     * @param keyValues alternating param names and values; may be empty
     */
    public static MatchReasonDto of(String category, String code, Object... keyValues) {
        if (keyValues.length % 2 != 0) {
            throw new IllegalArgumentException("Reason params must be key/value pairs, got " + keyValues.length);
        }

        if (keyValues.length == 0) {
            return new MatchReasonDto(code, category, Collections.emptyMap());
        }

        Map<String, Object> params = new LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            params.put(String.valueOf(keyValues[i]), keyValues[i + 1]);
        }
        return new MatchReasonDto(code, category, params);
    }
}
