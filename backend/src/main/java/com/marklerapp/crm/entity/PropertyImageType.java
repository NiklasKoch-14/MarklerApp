package com.marklerapp.crm.entity;

/**
 * Enumeration for different types of property images.
 */
public enum PropertyImageType {

    GENERAL("Allgemein", "General"),
    EXTERIOR("Außenansicht", "Exterior"),
    INTERIOR("Innenansicht", "Interior"),
    KITCHEN("Küche", "Kitchen"),
    BATHROOM("Badezimmer", "Bathroom"),
    BEDROOM("Schlafzimmer", "Bedroom"),
    LIVING_ROOM("Wohnzimmer", "Living Room"),
    BALCONY_TERRACE("Balkon/Terrasse", "Balcony/Terrace"),
    GARDEN("Garten", "Garden"),
    GARAGE_PARKING("Garage/Stellplatz", "Garage/Parking"),
    BASEMENT("Keller", "Basement"),
    ATTIC("Dachboden", "Attic"),
    FLOOR_PLAN("Grundriss", "Floor Plan"),
    ENERGY_CERTIFICATE("Energieausweis", "Energy Certificate"),
    LOCATION_MAP("Lageplan", "Location Map");

    private final String germanName;
    private final String englishName;

    PropertyImageType(String germanName, String englishName) {
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