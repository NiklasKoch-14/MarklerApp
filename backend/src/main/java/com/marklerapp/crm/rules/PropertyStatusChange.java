package com.marklerapp.crm.rules;

import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.entity.Viewing;

import java.util.List;

/**
 * @param property           Objekt im Zustand VOR der Aenderung
 * @param targetStatus       gewuenschter neuer Status
 * @param scheduledViewings  noch offene Termine (Status SCHEDULED) dieses Objekts
 * @param completedViewingCount Anzahl bereits stattgefundener Termine
 */
public record PropertyStatusChange(
        Property property,
        PropertyStatus targetStatus,
        List<Viewing> scheduledViewings,
        long completedViewingCount) implements RuleContext {
}
