package com.marklerapp.crm.exception;

import com.marklerapp.crm.rules.RuleViolation;
import lombok.Getter;

import java.util.List;

/** Fachlich unmoegliche Aenderung — nicht uebersteuerbar. */
@Getter
public class WorkflowRuleBlockedException extends RuntimeException {

    private final transient List<RuleViolation> violations;

    public WorkflowRuleBlockedException(List<RuleViolation> violations) {
        super("Workflow rule blocked the change: " + violations.size() + " violation(s)");
        this.violations = violations;
    }
}
