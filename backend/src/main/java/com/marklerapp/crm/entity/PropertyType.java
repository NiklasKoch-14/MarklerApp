package com.marklerapp.crm.entity;

/**
 * Enumeration for property types commonly found in the German real estate market.
 */
public enum PropertyType {

    // Residential properties
    APARTMENT("Wohnung", "Apartment"),
    HOUSE("Haus", "House"),
    TOWNHOUSE("Reihenhaus", "Townhouse"),
    VILLA("Villa", "Villa"),
    PENTHOUSE("Penthouse", "Penthouse"),
    LOFT("Loft", "Loft"),
    DUPLEX("Maisonette", "Duplex"),
    STUDIO("Apartment", "Studio"),

    // Commercial properties
    OFFICE("Büro", "Office"),
    RETAIL("Einzelhandel", "Retail"),
    WAREHOUSE("Lager", "Warehouse"),
    INDUSTRIAL("Industrie", "Industrial"),
    RESTAURANT("Restaurant", "Restaurant"),
    HOTEL("Hotel", "Hotel"),

    // Special properties
    PARKING_SPACE("Stellplatz", "Parking Space"),
    GARAGE("Garage", "Garage"),
    LAND("Grundstück", "Land"),
    FARM("Bauernhof", "Farm"),
    CASTLE("Schloss", "Castle"),
    OTHER("Sonstiges", "Other");

    private final String germanName;
    private final String englishName;

    PropertyType(String germanName, String englishName) {
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