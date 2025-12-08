package com.marklerapp.crm.entity;

/**
 * Enumeration for listing types (sale vs rental).
 */
public enum ListingType {

    SALE("Kauf", "For Sale"),
    RENT("Miete", "For Rent"),
    LEASE("Pacht", "For Lease");

    private final String germanName;
    private final String englishName;

    ListingType(String germanName, String englishName) {
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