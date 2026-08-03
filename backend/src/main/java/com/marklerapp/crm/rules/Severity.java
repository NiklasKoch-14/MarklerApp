package com.marklerapp.crm.rules;

public enum Severity {
    /** Fachlich unmoeglich — nicht uebersteuerbar, fuehrt zu HTTP 422. */
    BLOCK,
    /** Unwahrscheinlich, aber legitim — quittierbar, fuehrt zu HTTP 409. */
    WARN
}
