package com.marklerapp.crm.rules;

import java.util.List;
import java.util.Map;

/**
 * Ein Regelverstoss. Traegt bewusst nur messageKey und params statt eines fertigen
 * Satzes — der Text entsteht im Frontend, sonst waeren die Meldungen am i18n-System
 * vorbei hartcodiert.
 */
public record RuleViolation(
        RuleCode code,
        Severity severity,
        String messageKey,
        Map<String, Object> params,
        List<AffectedRecord> affected,
        CascadeAction cascade) {

    public static RuleViolation of(RuleCode code, Severity severity) {
        return new RuleViolation(code, severity, code.getMessageKey(), Map.of(), List.of(), null);
    }

    public RuleViolation withParams(Map<String, Object> params) {
        return new RuleViolation(code, severity, messageKey, params, affected, cascade);
    }

    public RuleViolation withAffected(List<AffectedRecord> affected) {
        return new RuleViolation(code, severity, messageKey, params, affected, cascade);
    }

    public RuleViolation withCascade(CascadeAction cascade) {
        return new RuleViolation(code, severity, messageKey, params, affected, cascade);
    }
}
