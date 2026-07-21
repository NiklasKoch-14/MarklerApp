package com.marklerapp.crm.util;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.*;

class CsvParseUtilTest {

    @Test
    void parse_SimpleRows_SplitsOnCommaAndNewline() {
        List<List<String>> rows = CsvParseUtil.parse("firstName,lastName\nMax,Mustermann\nAnna,Schmidt\n");
        assertThat(rows).containsExactly(
                List.of("firstName", "lastName"),
                List.of("Max", "Mustermann"),
                List.of("Anna", "Schmidt")
        );
    }

    @Test
    void parse_QuotedFieldWithComma_KeepsCommaInsideField() {
        List<List<String>> rows = CsvParseUtil.parse("name,address\nMax,\"Musterstraße 1, 10115 Berlin\"\n");
        assertThat(rows.get(1)).containsExactly("Max", "Musterstraße 1, 10115 Berlin");
    }

    @Test
    void parse_EscapedQuoteInsideQuotedField_UnescapesToSingleQuote() {
        List<List<String>> rows = CsvParseUtil.parse("note\n\"He said \"\"hi\"\"\"\n");
        assertThat(rows.get(1)).containsExactly("He said \"hi\"");
    }

    @Test
    void parse_QuotedFieldWithEmbeddedNewline_StaysOneField() {
        List<List<String>> rows = CsvParseUtil.parse("note\n\"line one\nline two\"\nnext,row\n");
        assertThat(rows).hasSize(3);
        assertThat(rows.get(1)).containsExactly("line one\nline two");
        assertThat(rows.get(2)).containsExactly("next", "row");
    }

    @Test
    void parse_CrlfLineEndings_HandledLikePlainNewlines() {
        List<List<String>> rows = CsvParseUtil.parse("a,b\r\n1,2\r\n");
        assertThat(rows).containsExactly(List.of("a", "b"), List.of("1", "2"));
    }

    @Test
    void parse_TrailingBlankLine_IsDropped() {
        List<List<String>> rows = CsvParseUtil.parse("a,b\n1,2\n\n");
        assertThat(rows).hasSize(2);
    }

    @Test
    void parse_NoTrailingNewline_StillReadsLastRow() {
        List<List<String>> rows = CsvParseUtil.parse("a,b\n1,2");
        assertThat(rows).containsExactly(List.of("a", "b"), List.of("1", "2"));
    }

    @Test
    void stripBom_LeadingBom_IsRemoved() {
        String withBom = "﻿firstName,lastName";
        assertThat(CsvParseUtil.stripBom(withBom)).isEqualTo("firstName,lastName");
    }

    @Test
    void stripBom_NoBom_IsUnchanged() {
        assertThat(CsvParseUtil.stripBom("firstName,lastName")).isEqualTo("firstName,lastName");
    }
}
