package com.marklerapp.crm.util;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Fuzzy-matching helpers for the soft duplicate-lead check on client creation.
 * Pure functions, no Spring dependency, so the matching rules can be unit-tested directly.
 */
public final class DuplicateMatchUtil {

    private static final Pattern NON_DIGITS = Pattern.compile("[^0-9]");

    private DuplicateMatchUtil() {
    }

    /**
     * Normalizes a phone number to its national significant number (digits only, no country
     * code or trunk prefix) so that "0151 12345678" and "+49 151 12345678" compare equal.
     * Returns an empty string for blank/null input.
     */
    public static String normalizePhone(String phone) {
        if (phone == null) {
            return "";
        }
        String digits = NON_DIGITS.matcher(phone).replaceAll("");
        if (digits.isEmpty()) {
            return "";
        }
        if (digits.startsWith("00")) {
            digits = digits.substring(2); // international dialing prefix, e.g. "0049..."
        }
        if (digits.startsWith("49") && digits.length() > 10) {
            return digits.substring(2);
        }
        if (digits.startsWith("0")) {
            return digits.substring(1);
        }
        return digits;
    }

    /**
     * True if two names are the same or close enough to be a likely spelling variant
     * (umlaut transliteration, one or two typos). Threshold scales with name length so
     * short names (2-3 chars) require a near-exact match, avoiding false positives.
     */
    public static boolean isFuzzyNameMatch(String a, String b) {
        String na = normalizeForCompare(a);
        String nb = normalizeForCompare(b);
        if (na.isEmpty() || nb.isEmpty()) {
            return false;
        }
        if (na.equals(nb)) {
            return true;
        }
        int distance = levenshteinDistance(na, nb);
        int shorterLength = Math.min(na.length(), nb.length());
        int threshold = Math.min(2, Math.max(1, shorterLength / 3));
        return distance <= threshold;
    }

    /**
     * Lowercases, trims, and transliterates German umlauts/ß so "Krüger" and "Krueger"
     * (or "Kroeger") normalize to comparable forms before distance is computed.
     */
    private static String normalizeForCompare(String s) {
        if (s == null) {
            return "";
        }
        return s.trim().toLowerCase(Locale.GERMAN)
                .replace("ä", "ae")
                .replace("ö", "oe")
                .replace("ü", "ue")
                .replace("ß", "ss");
    }

    /**
     * Classic Wagner-Fischer edit distance, O(n*m) time, O(m) space.
     */
    private static int levenshteinDistance(String a, String b) {
        int[] previousRow = new int[b.length() + 1];
        int[] currentRow = new int[b.length() + 1];

        for (int j = 0; j <= b.length(); j++) {
            previousRow[j] = j;
        }

        for (int i = 1; i <= a.length(); i++) {
            currentRow[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int substitutionCost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                currentRow[j] = Math.min(
                        Math.min(currentRow[j - 1] + 1, previousRow[j] + 1),
                        previousRow[j - 1] + substitutionCost
                );
            }
            int[] swap = previousRow;
            previousRow = currentRow;
            currentRow = swap;
        }

        return previousRow[b.length()];
    }
}
