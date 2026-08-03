package com.marklerapp.crm.rules.viewing;

import com.marklerapp.crm.entity.Viewing;
import com.marklerapp.crm.rules.*;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Optional;

@Component
public class ViewingCompletedInFutureRule extends TypedWorkflowRule<ViewingChange> {

    public ViewingCompletedInFutureRule() {
        super(ViewingChange.class);
    }

    @Override
    public RuleCode code() {
        return RuleCode.VIEWING_COMPLETED_IN_FUTURE;
    }

    @Override
    public Severity severity() {
        return Severity.BLOCK;
    }

    @Override
    protected Optional<RuleViolation> check(ViewingChange context) {
        if (context.targetStatus() != Viewing.ViewingStatus.COMPLETED || context.targetDate() == null) {
            return Optional.empty();
        }

        return context.targetDate().isAfter(LocalDateTime.now())
                ? Optional.of(RuleViolation.of(code(), severity()))
                : Optional.empty();
    }
}
