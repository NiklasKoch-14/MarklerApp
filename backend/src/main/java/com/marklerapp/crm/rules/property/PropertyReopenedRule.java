package com.marklerapp.crm.rules.property;

import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.rules.*;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Ein abgeschlossenes Objekt wieder in den Verkauf zu nehmen ist legitim — als Korrektur
 * eines Fehlklicks oder wenn ein Kauf platzt. Nur eben selten genug, dass eine Rueckfrage
 * mehr nuetzt als stoert.
 */
@Component
public class PropertyReopenedRule extends TypedWorkflowRule<PropertyStatusChange> {

    public PropertyReopenedRule() {
        super(PropertyStatusChange.class);
    }

    @Override
    public RuleCode code() {
        return RuleCode.PROPERTY_REOPENED;
    }

    @Override
    public Severity severity() {
        return Severity.WARN;
    }

    @Override
    protected Optional<RuleViolation> check(PropertyStatusChange context) {
        PropertyStatus current = context.property().getStatus();
        PropertyStatus target = context.targetStatus();

        boolean wasClosed = current == PropertyStatus.SOLD || current == PropertyStatus.RENTED;
        boolean becomesOpen = target == PropertyStatus.AVAILABLE || target == PropertyStatus.RESERVED;

        return wasClosed && becomesOpen
                ? Optional.of(RuleViolation.of(code(), severity()))
                : Optional.empty();
    }
}
