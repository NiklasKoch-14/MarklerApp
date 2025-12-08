package com.marklerapp.crm.entity;

/**
 * Enumeration for supported language preferences in the system.
 */
public enum LanguagePreference {
    DE("German"),
    EN("English");

    private final String displayName;

    LanguagePreference(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}