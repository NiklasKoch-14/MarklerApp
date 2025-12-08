package com.marklerapp.crm.entity;

/**
 * Enumeration for heating types commonly found in German properties.
 */
public enum HeatingType {

    GAS("Gas", "Gas Heating"),
    OIL("Öl", "Oil Heating"),
    ELECTRIC("Elektro", "Electric Heating"),
    DISTRICT_HEATING("Fernwärme", "District Heating"),
    HEAT_PUMP("Wärmepumpe", "Heat Pump"),
    SOLAR("Solar", "Solar Heating"),
    WOOD_PELLETS("Holzpellets", "Wood Pellets"),
    GEOTHERMAL("Erdwärme", "Geothermal"),
    COAL("Kohle", "Coal Heating"),
    OTHER("Sonstiges", "Other");

    private final String germanName;
    private final String englishName;

    HeatingType(String germanName, String englishName) {
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