package com.marklerapp.crm.rules.property;

import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.entity.Viewing;
import com.marklerapp.crm.rules.*;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class SoldWithOpenViewingsRule extends TypedWorkflowRule<PropertyStatusChange> {

    private static final DateTimeFormatter LABEL_FORMAT = DateTimeFormatter.ofPattern("dd.MM. HH:mm");

    public SoldWithOpenViewingsRule() {
        super(PropertyStatusChange.class);
    }

    @Override
    public RuleCode code() {
        return RuleCode.PROPERTY_SOLD_WITH_OPEN_VIEWINGS;
    }

    @Override
    public Severity severity() {
        return Severity.WARN;
    }

    @Override
    protected Optional<RuleViolation> check(PropertyStatusChange context) {
        PropertyStatus target = context.targetStatus();
        boolean closing = target == PropertyStatus.SOLD || target == PropertyStatus.RENTED;
        List<Viewing> open = context.scheduledViewings();

        if (!closing || open.isEmpty()) {
            return Optional.empty();
        }

        List<AffectedRecord> affected = open.stream()
                .map(v -> new AffectedRecord("VIEWING", v.getId(), label(v)))
                .toList();

        return Optional.of(RuleViolation.of(code(), severity())
                .withParams(Map.of("count", open.size()))
                .withAffected(affected)
                .withCascade(new CascadeAction(
                        CascadeType.CANCEL_VIEWINGS,
                        "workflow.cascade.cancelViewings",
                        open.stream().map(Viewing::getId).toList())));
    }

    private String label(Viewing viewing) {
        String when = viewing.getViewingDate() == null ? "?" : viewing.getViewingDate().format(LABEL_FORMAT);
        String who = viewing.getClient() == null ? "?" : viewing.getClient().getFullName();
        return when + " - " + who;
    }
}
