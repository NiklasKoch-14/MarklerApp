package com.marklerapp.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Abo-Daten des ICS-Kalenderfeeds (Issue #34).
 *
 * <p>Bewusst nur der relative {@code feedPath}: die absolute URL setzt das Frontend
 * aus seiner API-Basis zusammen, weil der Server hinter Railways Proxy seine
 * oeffentliche Adresse nicht zuverlaessig kennt.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarSubscriptionDto {
    private String token;
    private String feedPath;
}
