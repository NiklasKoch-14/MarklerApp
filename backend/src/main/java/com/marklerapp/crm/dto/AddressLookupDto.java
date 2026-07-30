package com.marklerapp.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Strukturierte Adressbestandteile aus dem Geocoder (Issue #29).
 *
 * <p>Bisher lieferte {@code GeocodingService} nur Koordinaten oder einen flachen
 * {@code display_name}. Ohne den Nominatim-Parameter {@code addressdetails=1} gibt es
 * gar kein {@code address}-Objekt -- die Infrastruktur war da, aber in der falschen
 * Form.</p>
 *
 * <p>Alle Felder nullable: der Geocoder liefert je nach Ort unterschiedlich viel,
 * und ein Stadtteil existiert laengst nicht ueberall.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AddressLookupDto {
    private String road;
    private String houseNumber;
    private String postalCode;
    private String city;
    /** Stadtteil/Ortsteil -- nur in groesseren Staedten vorhanden. */
    private String district;
    private String state;
    private String country;
    private BigDecimal latitude;
    private BigDecimal longitude;
}
