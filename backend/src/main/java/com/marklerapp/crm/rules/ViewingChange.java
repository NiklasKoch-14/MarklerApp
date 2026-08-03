package com.marklerapp.crm.rules;

import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.Viewing;

import java.time.LocalDateTime;

/**
 * @param existing     bestehender Termin, oder null bei Neuanlage
 * @param property     das Objekt, auf das sich der Termin bezieht
 * @param targetDate   gewuenschter Termin
 * @param targetStatus gewuenschter Status
 */
public record ViewingChange(
        Viewing existing,
        Property property,
        LocalDateTime targetDate,
        Viewing.ViewingStatus targetStatus) implements RuleContext {

    public boolean isNew() {
        return existing == null;
    }
}
