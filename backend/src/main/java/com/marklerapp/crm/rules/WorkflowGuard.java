package com.marklerapp.crm.rules;

import com.marklerapp.crm.exception.WorkflowRuleBlockedException;
import com.marklerapp.crm.exception.WorkflowRuleWarningException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * Wertet alle fuer eine Aenderung zustaendigen Regeln aus.
 *
 * <p>Spring injiziert jede als {@code @Component} registrierte {@link WorkflowRule} —
 * eine neue Regel wird dadurch allein durch ihre Existenz aktiv, ohne Registrierungsliste,
 * die man zu pflegen vergisst.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowGuard {

    private final List<WorkflowRule> rules;

    /**
     * @return die Kaskaden der quittierten Warnungen, die der Aufrufer in derselben
     *         Transaktion ausfuehren muss
     * @throws WorkflowRuleBlockedException bei fachlich unmoeglicher Aenderung
     * @throws WorkflowRuleWarningException bei nicht quittierter Warnung
     */
    public List<CascadeAction> check(RuleContext context, Set<RuleCode> acknowledged) {
        Set<RuleCode> ack = acknowledged == null ? Set.of() : acknowledged;

        List<RuleViolation> violations = rules.stream()
                .filter(rule -> rule.supports(context))
                .map(rule -> rule.evaluate(context))
                .flatMap(Optional::stream)
                .toList();

        List<RuleViolation> blocking = violations.stream()
                .filter(v -> v.severity() == Severity.BLOCK)
                .toList();
        if (!blocking.isEmpty()) {
            log.debug("Workflow blocked: {}", blocking.stream().map(RuleViolation::code).toList());
            throw new WorkflowRuleBlockedException(blocking);
        }

        List<RuleViolation> unacknowledged = violations.stream()
                .filter(v -> !ack.contains(v.code()))
                .toList();
        if (!unacknowledged.isEmpty()) {
            throw new WorkflowRuleWarningException(unacknowledged);
        }

        return violations.stream()
                .map(RuleViolation::cascade)
                .filter(Objects::nonNull)
                .toList();
    }
}
