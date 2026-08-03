package com.marklerapp.crm.rules;

import java.util.UUID;

/** Ein vom Verstoss betroffener Datensatz, wie ihn der Dialog auflistet. */
public record AffectedRecord(String type, UUID id, String label) {
}
