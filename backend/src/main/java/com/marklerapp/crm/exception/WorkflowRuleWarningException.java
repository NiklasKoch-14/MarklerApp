package com.marklerapp.crm.exception;

import com.marklerapp.crm.rules.RuleViolation;
import lombok.Getter;

import java.util.List;

/** Unwahrscheinliche, aber zulaessige Aenderung — quittierbar via acknowledgedRules. */
@Getter
public class WorkflowRuleWarningException extends RuntimeException {

    private final transient List<RuleViolation> violations;

    public WorkflowRuleWarningException(List<RuleViolation> violations) {
        super("Workflow rule warning: " + violations.size() + " unacknowledged violation(s)");
        this.violations = violations;
    }
}
