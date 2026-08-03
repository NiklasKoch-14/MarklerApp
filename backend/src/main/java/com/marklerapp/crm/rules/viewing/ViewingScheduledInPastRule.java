package com.marklerapp.crm.rules.viewing;

import com.marklerapp.crm.entity.Viewing;
import com.marklerapp.crm.rules.*;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Nur WARN: einen vergangenen Termin nachzutragen ist legitim. Wer ihn allerdings als
 * SCHEDULED statt COMPLETED nachtraegt, hat sich meist im Datum vertan.
 */
@Component
public class ViewingScheduledInPastRule extends TypedWorkflowRule<ViewingChange> {

    public ViewingScheduledInPastRule() {
        super(ViewingChange.class);
    }

    @Override
    public RuleCode code() {
        return RuleCode.VIEWING_SCHEDULED_IN_PAST;
    }

    @Override
    public Severity severity() {
        return Severity.WARN;
    }

    @Override
    protected Optional<RuleViolation> check(ViewingChange context) {
        if (!context.isNew()
                || context.targetStatus() != Viewing.ViewingStatus.SCHEDULED
                || context.targetDate() == null) {
            return Optional.empty();
        }

        return context.targetDate().isBefore(LocalDateTime.now())
                ? Optional.of(RuleViolation.of(code(), severity()))
                : Optional.empty();
    }
}
