package com.marklerapp.crm.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.marklerapp.crm.entity.Client;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Schlanke Sicht auf den verknuepften Eigentuemer eines Objekts (Issue #37).
 *
 * <p>Bewusst nicht {@link ClientDto}: die Objektansicht braucht Name und Kontaktweg, nicht
 * Suchprofil, Pipeline-Stufe oder DSGVO-Historie des Kunden. Wer die volle Kundensicht
 * will, folgt der Verknuepfung auf die Kundendetailseite.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PropertyOwnerDto {

    private UUID id;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String phone;
    private Client.ClientType clientType;
}
