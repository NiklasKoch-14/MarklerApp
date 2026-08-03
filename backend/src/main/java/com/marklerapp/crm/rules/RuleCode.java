package com.marklerapp.crm.rules;

public enum RuleCode {

    PROPERTY_RENT_MARKED_SOLD("workflow.rule.propertyRentMarkedSold"),
    VIEWING_FOR_CLOSED_PROPERTY("workflow.rule.viewingForClosedProperty"),
    VIEWING_COMPLETED_IN_FUTURE("workflow.rule.viewingCompletedInFuture"),
    VIEWING_SCHEDULED_IN_PAST("workflow.rule.viewingScheduledInPast"),
    PROPERTY_SOLD_WITH_OPEN_VIEWINGS("workflow.rule.propertySoldWithOpenViewings"),
    PROPERTY_REOPENED("workflow.rule.propertyReopened"),
    PROPERTY_RESERVED_WITHOUT_VIEWING("workflow.rule.propertyReservedWithoutViewing");

    private final String messageKey;

    RuleCode(String messageKey) {
        this.messageKey = messageKey;
    }

    public String getMessageKey() {
        return messageKey;
    }
}
