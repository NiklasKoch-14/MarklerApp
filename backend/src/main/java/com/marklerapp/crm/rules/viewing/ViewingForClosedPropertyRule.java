package com.marklerapp.crm.rules.viewing;

import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.rules.*;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Greift bewusst nur bei Neuanlage. Bestehende Termine eines verkauften Objekts muessen
 * aenderbar bleiben — sonst blockierte diese Regel die Kaskade aus
 * {@code SoldWithOpenViewingsRule}, die genau diese Termine auf CANCELLED setzt.
 */
@Component
public class ViewingForClosedPropertyRule extends TypedWorkflowRule<ViewingChange> {

    public ViewingForClosedPropertyRule() {
        super(ViewingChange.class);
    }

    @Override
    public RuleCode code() {
        return RuleCode.VIEWING_FOR_CLOSED_PROPERTY;
    }

    @Override
    public Severity severity() {
        return Severity.BLOCK;
    }

    @Override
    protected Optional<RuleViolation> check(ViewingChange context) {
        if (!context.isNew()) {
            return Optional.empty();
        }

        Property property = context.property();
        PropertyStatus status = property.getStatus();
        boolean closed = status == PropertyStatus.SOLD
                || status == PropertyStatus.RENTED
                || status == PropertyStatus.WITHDRAWN;

        if (!closed) {
            return Optional.empty();
        }

        return Optional.of(RuleViolation.of(code(), severity())
                .withAffected(List.of(new AffectedRecord(
                        "PROPERTY", property.getId(), property.getTitle()))));
    }
}
