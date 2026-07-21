package com.marklerapp.crm.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

/**
 * Tests for the fuzzy duplicate-lead matching rules (phone normalization, name similarity).
 */
class DuplicateMatchUtilTest {

    @Test
    void normalizePhone_StripsCountryCodeAndTrunkPrefix_ToSameCanonicalForm() {
        assertThat(DuplicateMatchUtil.normalizePhone("0151 12345678"))
                .isEqualTo(DuplicateMatchUtil.normalizePhone("+49 151 12345678"));
        assertThat(DuplicateMatchUtil.normalizePhone("0151-12345678"))
                .isEqualTo(DuplicateMatchUtil.normalizePhone("0049 151 123 456 78"));
    }

    @Test
    void normalizePhone_DifferentNumbers_DoNotNormalizeToSameValue() {
        assertThat(DuplicateMatchUtil.normalizePhone("0151 12345678"))
                .isNotEqualTo(DuplicateMatchUtil.normalizePhone("0160 87654321"));
    }

    @Test
    void normalizePhone_BlankOrNull_ReturnsEmptyString() {
        assertThat(DuplicateMatchUtil.normalizePhone(null)).isEmpty();
        assertThat(DuplicateMatchUtil.normalizePhone("")).isEmpty();
        assertThat(DuplicateMatchUtil.normalizePhone("   ")).isEmpty();
    }

    @Test
    void isFuzzyNameMatch_UmlautSpellingVariant_Matches() {
        assertThat(DuplicateMatchUtil.isFuzzyNameMatch("Krüger", "Kroeger")).isTrue();
        assertThat(DuplicateMatchUtil.isFuzzyNameMatch("Müller", "Mueller")).isTrue();
    }

    @Test
    void isFuzzyNameMatch_OneOrTwoTypos_Matches() {
        assertThat(DuplicateMatchUtil.isFuzzyNameMatch("Schmidt", "Schmid")).isTrue();
        assertThat(DuplicateMatchUtil.isFuzzyNameMatch("Niklas", "Niklaas")).isTrue();
    }

    @Test
    void isFuzzyNameMatch_ExactMatch_IsCaseInsensitive() {
        assertThat(DuplicateMatchUtil.isFuzzyNameMatch("ANNA", "anna")).isTrue();
    }

    @Test
    void isFuzzyNameMatch_UnrelatedNames_DoesNotMatch() {
        assertThat(DuplicateMatchUtil.isFuzzyNameMatch("Schmidt", "Meyer")).isFalse();
    }

    @Test
    void isFuzzyNameMatch_ShortUnrelatedNames_DoesNotMatch() {
        // Short names need a near-exact match — otherwise almost any 2-letter name would collide.
        assertThat(DuplicateMatchUtil.isFuzzyNameMatch("Al", "Ed")).isFalse();
    }

    @Test
    void isFuzzyNameMatch_BlankInput_DoesNotMatch() {
        assertThat(DuplicateMatchUtil.isFuzzyNameMatch("", "Schmidt")).isFalse();
        assertThat(DuplicateMatchUtil.isFuzzyNameMatch(null, "Schmidt")).isFalse();
    }
}
