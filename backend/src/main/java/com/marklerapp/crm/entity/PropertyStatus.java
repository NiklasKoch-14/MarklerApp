package com.marklerapp.crm.entity;

/**
 * Enumeration for property listing status.
 */
public enum PropertyStatus {

    AVAILABLE("Verfügbar", "Available"),
    RESERVED("Reserviert", "Reserved"),
    SOLD("Verkauft", "Sold"),
    RENTED("Vermietet", "Rented"),
    WITHDRAWN("Zurückgezogen", "Withdrawn"),
    UNDER_CONSTRUCTION("Im Bau", "Under Construction");

    private final String germanName;
    private final String englishName;

    PropertyStatus(String germanName, String englishName) {
        this.germanName = germanName;
        this.englishName = englishName;
    }

    public String getGermanName() {
        return germanName;
    }

    public String getEnglishName() {
        return englishName;
    }

    public String getLocalizedName(String language) {
        return "de".equals(language) ? germanName : englishName;
    }
}