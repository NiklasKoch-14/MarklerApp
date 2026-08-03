package com.marklerapp.crm.rules;

import java.util.Optional;

public interface WorkflowRule {

    RuleCode code();

    Severity severity();

    boolean supports(RuleContext context);

    Optional<RuleViolation> evaluate(RuleContext context);
}
