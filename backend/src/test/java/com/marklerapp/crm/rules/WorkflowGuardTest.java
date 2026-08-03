package com.marklerapp.crm.rules;

import com.marklerapp.crm.exception.WorkflowRuleBlockedException;
import com.marklerapp.crm.exception.WorkflowRuleWarningException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WorkflowGuardTest {

    /** Minimalregel, die immer ausloest — der Guard selbst ist hier der Prueflings. */
    private static WorkflowRule alwaysFiring(RuleCode code, Severity severity, CascadeAction cascade) {
        return new TypedWorkflowRule<PropertyStatusChange>(PropertyStatusChange.class) {
            @Override
            public RuleCode code() {
                return code;
            }

            @Override
            public Severity severity() {
                return severity;
            }

            @Override
            protected Optional<RuleViolation> check(PropertyStatusChange context) {
                RuleViolation v = RuleViolation.of(code, severity);
                return Optional.of(cascade == null ? v : v.withCascade(cascade));
            }
        };
    }

    private static PropertyStatusChange anyContext() {
        return new PropertyStatusChange(null, null, null, List.of(), 0L);
    }

    @Test
    void blocksRegardlessOfAcknowledgement() {
        WorkflowGuard guard = new WorkflowGuard(List.of(
                alwaysFiring(RuleCode.PROPERTY_RENT_MARKED_SOLD, Severity.BLOCK, null)));

        assertThatThrownBy(() -> guard.check(anyContext(), Set.of(RuleCode.PROPERTY_RENT_MARKED_SOLD)))
                .isInstanceOf(WorkflowRuleBlockedException.class);
    }

    @Test
    void throwsWarningWhenNotAcknowledged() {
        WorkflowGuard guard = new WorkflowGuard(List.of(
                alwaysFiring(RuleCode.PROPERTY_REOPENED, Severity.WARN, null)));

        assertThatThrownBy(() -> guard.check(anyContext(), Set.of()))
                .isInstanceOf(WorkflowRuleWarningException.class);
    }

    @Test
    void returnsCascadesWhenAcknowledged() {
        CascadeAction cascade = new CascadeAction(
                CascadeType.CANCEL_VIEWINGS, "workflow.cascade.cancelViewings", List.of());
        WorkflowGuard guard = new WorkflowGuard(List.of(
                alwaysFiring(RuleCode.PROPERTY_SOLD_WITH_OPEN_VIEWINGS, Severity.WARN, cascade)));

        List<CascadeAction> cascades =
                guard.check(anyContext(), Set.of(RuleCode.PROPERTY_SOLD_WITH_OPEN_VIEWINGS));

        assertThat(cascades).containsExactly(cascade);
    }

    @Test
    void ignoresRulesForOtherContextTypes() {
        WorkflowGuard guard = new WorkflowGuard(List.of(
                alwaysFiring(RuleCode.PROPERTY_REOPENED, Severity.WARN, null)));

        ViewingChange otherContext = new ViewingChange(null, null, null, null);

        assertThat(guard.check(otherContext, Set.of())).isEmpty();
    }

    @Test
    void blockWinsOverUnacknowledgedWarning() {
        WorkflowGuard guard = new WorkflowGuard(List.of(
                alwaysFiring(RuleCode.PROPERTY_REOPENED, Severity.WARN, null),
                alwaysFiring(RuleCode.PROPERTY_RENT_MARKED_SOLD, Severity.BLOCK, null)));

        assertThatThrownBy(() -> guard.check(anyContext(), Set.of()))
                .isInstanceOf(WorkflowRuleBlockedException.class);
    }
}
