package com.marklerapp.crm.rules.property;

import com.marklerapp.crm.entity.ListingType;
import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.rules.*;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Ein Mietobjekt ist nicht "verkauft" und ein Kaufobjekt nicht "vermietet" — das ist
 * kein unwahrscheinlicher Fall, sondern ein widerspruechlicher. Deshalb BLOCK.
 */
@Component
public class RentMarkedSoldRule extends TypedWorkflowRule<PropertyStatusChange> {

    public RentMarkedSoldRule() {
        super(PropertyStatusChange.class);
    }

    @Override
    public RuleCode code() {
        return RuleCode.PROPERTY_RENT_MARKED_SOLD;
    }

    @Override
    public Severity severity() {
        return Severity.BLOCK;
    }

    @Override
    protected Optional<RuleViolation> check(PropertyStatusChange context) {
        ListingType listingType = context.property().getListingType();
        PropertyStatus target = context.targetStatus();
        if (listingType == null || target == null) {
            return Optional.empty();
        }

        boolean contradiction = (listingType == ListingType.RENT && target == PropertyStatus.SOLD)
                || (listingType == ListingType.SALE && target == PropertyStatus.RENTED);

        return contradiction ? Optional.of(RuleViolation.of(code(), severity())) : Optional.empty();
    }
}
