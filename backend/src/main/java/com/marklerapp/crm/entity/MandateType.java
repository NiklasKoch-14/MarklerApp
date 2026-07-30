package com.marklerapp.crm.entity;

/**
 * Auftragsart, mit der ein Objekt vermarktet wird (Issue #39).
 *
 * <p>Bewusst ohne mitgelieferte Beschriftungen: uebersetzt wird im Frontend ueber
 * {@code enums.mandateType} (translateEnum-Pipe), nicht im Backend.</p>
 */
public enum MandateType {

    /** Qualifizierter Alleinauftrag -- Eigentuemer muss Interessenten an den Makler verweisen. */
    EXCLUSIVE_QUALIFIED,

    /** Alleinauftrag -- nur dieser Makler vermarktet, Eigentuemer darf selbst verkaufen. */
    EXCLUSIVE,

    /** Einfacher Auftrag -- weitere Makler duerfen parallel vermarkten. */
    SIMPLE,

    /** Kein Auftrag -- Objekt im CRM erfasst, aber nicht mandatiert. */
    NONE
}
