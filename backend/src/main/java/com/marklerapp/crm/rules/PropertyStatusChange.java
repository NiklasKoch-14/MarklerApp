package com.marklerapp.crm.rules;

import com.marklerapp.crm.entity.ListingType;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.entity.Viewing;

import java.util.List;

/**
 * @param property           Objekt im Zustand VOR der Aenderung
 * @param targetStatus       gewuenschter neuer Status
 * @param targetListingType  gewuenschter neuer Angebotstyp — der Kontext traegt die
 *                           beabsichtigte Aenderung, das Objekt bleibt im Vorher-Zustand
 *                           (siehe RentMarkedSoldRule: sie darf nicht property.getListingType()
 *                           lesen, sonst sieht sie bei einer kombinierten PUT-Aenderung von
 *                           listingType UND status noch den alten Typ und uebersieht den
 *                           Widerspruch)
 * @param scheduledViewings  noch offene Termine (Status SCHEDULED) dieses Objekts
 * @param completedViewingCount Anzahl bereits stattgefundener Termine
 */
public record PropertyStatusChange(
        Property property,
        PropertyStatus targetStatus,
        ListingType targetListingType,
        List<Viewing> scheduledViewings,
        long completedViewingCount) implements RuleContext {
}
