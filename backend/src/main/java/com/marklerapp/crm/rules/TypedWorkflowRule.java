package com.marklerapp.crm.rules;

import java.util.Optional;

/**
 * Nimmt jeder Regel den Cast ab: die Unterklasse sieht nur ihren eigenen Kontexttyp.
 */
public abstract class TypedWorkflowRule<C extends RuleContext> implements WorkflowRule {

    private final Class<C> contextType;

    protected TypedWorkflowRule(Class<C> contextType) {
        this.contextType = contextType;
    }

    @Override
    public final boolean supports(RuleContext context) {
        return contextType.isInstance(context);
    }

    @Override
    public final Optional<RuleViolation> evaluate(RuleContext context) {
        return check(contextType.cast(context));
    }

    protected abstract Optional<RuleViolation> check(C context);
}
