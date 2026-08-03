package com.marklerapp.crm.rules.property;

import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.rules.*;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Eine Reservierung ohne je eine stattgefundene Besichtigung deutet meist darauf hin,
 * dass der Termin nicht erfasst wurde — nicht darauf, dass es ihn nicht gab.
 */
@Component
public class ReservedWithoutViewingRule extends TypedWorkflowRule<PropertyStatusChange> {

    public ReservedWithoutViewingRule() {
        super(PropertyStatusChange.class);
    }

    @Override
    public RuleCode code() {
        return RuleCode.PROPERTY_RESERVED_WITHOUT_VIEWING;
    }

    @Override
    public Severity severity() {
        return Severity.WARN;
    }

    @Override
    protected Optional<RuleViolation> check(PropertyStatusChange context) {
        boolean becomesReserved = context.targetStatus() == PropertyStatus.RESERVED
                && context.property().getStatus() != PropertyStatus.RESERVED;

        return becomesReserved && context.completedViewingCount() == 0
                ? Optional.of(RuleViolation.of(code(), severity()))
                : Optional.empty();
    }
}
