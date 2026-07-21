package com.marklerapp.crm.util;

import java.util.ArrayList;
import java.util.List;

/**
 * Minimal RFC 4180 CSV parser: quoted fields (commas/newlines inside quotes), "" as an
 * escaped quote, and \n/\r\n line endings. No external dependency for a format this
 * contained — see the client-import use case in {@code ClientService}.
 */
public final class CsvParseUtil {

    private CsvParseUtil() {
    }

    /**
     * Parses raw CSV text into rows of cell values. Fully blank rows (e.g. a trailing
     * newline at end of file) are dropped. Does not treat the first row specially —
     * the caller decides whether it's a header.
     */
    public static List<List<String>> parse(String content) {
        List<List<String>> rows = new ArrayList<>();
        List<String> currentRow = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < content.length(); i++) {
            char c = content.charAt(i);
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < content.length() && content.charAt(i + 1) == '"') {
                        field.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field.append(c);
                }
            } else if (c == '"') {
                inQuotes = true;
            } else if (c == ',') {
                currentRow.add(field.toString());
                field.setLength(0);
            } else if (c == '\n') {
                currentRow.add(field.toString());
                field.setLength(0);
                rows.add(currentRow);
                currentRow = new ArrayList<>();
            } else if (c == '\r') {
                // line break is handled on the following \n; a bare \r is ignored
            } else {
                field.append(c);
            }
        }

        if (field.length() > 0 || !currentRow.isEmpty()) {
            currentRow.add(field.toString());
            rows.add(currentRow);
        }

        rows.removeIf(row -> row.stream().allMatch(s -> s == null || s.isBlank()));
        return rows;
    }

    /**
     * Strips a leading UTF-8 byte-order mark, which spreadsheet tools (Excel) commonly
     * write when exporting CSV — without this the first header cell would read "﻿firstName".
     */
    public static String stripBom(String content) {
        if (!content.isEmpty() && content.charAt(0) == '﻿') {
            return content.substring(1);
        }
        return content;
    }
}
