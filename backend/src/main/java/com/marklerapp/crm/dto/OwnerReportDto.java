package com.marklerapp.crm.dto;

import com.marklerapp.crm.entity.MandateType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Taetigkeitsnachweis fuer den Eigentuemer eines Objekts (Issue #40).
 *
 * <p>Im Alleinauftrag schuldet der Makler dem Eigentuemer regelmaessig einen Nachweis:
 * wie viele Anfragen, wie viele Besichtigungen, was die Interessenten gesagt haben.
 * Das ist das Gespraech, das den Auftrag verlaengert oder eine Preisanpassung begruendet.</p>
 *
 * <p><b>Datenschutz:</b> Der Report geht an einen Dritten. Die Bildschirmansicht darf
 * Interessentennamen zeigen, der PDF-Export nicht. Darum traegt jeder Zeitstrahl-Eintrag
 * zwei Felder: {@code clientName} fuer intern und {@code clientLabel} ("Interessent A")
 * fuer den Export. {@link #anonymized()} entfernt die Namen; der PDF-Renderer bekommt
 * ausschliesslich das Ergebnis davon und liest {@code clientName} nie.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OwnerReportDto {

    private String propertyId;
    private String title;
    private String addressCity;
    private BigDecimal listedPrice;
    private BigDecimal ownerPriceExpectation;
    private MandateType mandateType;
    private LocalDate mandateStart;
    private LocalDate mandateEnd;

    /** Ausgewerteter Zeitraum. {@code from} inklusive, {@code to} exklusiv. */
    private LocalDate periodFrom;
    private LocalDate periodTo;

    /** Tage seit Aufnahme des Objekts, unabhaengig vom gewaehlten Zeitraum. */
    private Integer daysOnMarket;

    // Kennzahlen im Zeitraum
    private Long inquiries;           // objektbezogene Gespraechsnotizen
    private Long viewingsCompleted;
    private Long viewingsCancelled;
    private Long viewingsScheduled;   // noch offen

    /**
     * Rueckmeldungen der Interessenten, gezaehlt je Wert von
     * {@code Viewing.ViewingFeedback}. Die Verteilung ist das staerkste Argument im
     * Preisgespraech -- "7 Besichtigungen, 5x zu teuer" sagt mehr als jede Meinung.
     * Uebersetzt wird erst im Frontend (translateEnum).
     */
    private Map<String, Long> feedbackDistribution;

    /** Durchgefuehrte Besichtigungen ohne erfasste Rueckmeldung -- macht Luecken sichtbar. */
    private Long viewingsWithoutFeedback;

    private List<ActivityEntryDto> activities;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActivityEntryDto {
        private LocalDateTime date;
        /** VIEWING oder CALL_NOTE. Uebersetzt wird im Frontend. */
        private String type;
        /** Klarname des Interessenten -- nur fuer die interne Ansicht, im Export null. */
        private String clientName;
        /** Pseudonym fuer den Export, stabil innerhalb eines Reports ("Interessent A"). */
        private String clientLabel;
        /** Enum-Name aus ViewingFeedback bzw. CallOutcome; null wenn nicht erfasst. */
        private String outcome;
        private String status;
        private String notes;
    }

    /**
     * Kopie ohne Interessentennamen, fuer den Export an den Eigentuemer.
     * Bewusst eine eigene Instanz statt eines Flags: so kann der PDF-Renderer
     * gar nicht an einen Klarnamen kommen.
     */
    public OwnerReportDto anonymized() {
        List<ActivityEntryDto> withoutNames = activities == null ? List.of() : activities.stream()
                .map(a -> ActivityEntryDto.builder()
                        .date(a.getDate())
                        .type(a.getType())
                        .clientName(null)
                        .clientLabel(a.getClientLabel())
                        .outcome(a.getOutcome())
                        .status(a.getStatus())
                        .notes(a.getNotes())
                        .build())
                .toList();

        return OwnerReportDto.builder()
                .propertyId(propertyId)
                .title(title)
                .addressCity(addressCity)
                .listedPrice(listedPrice)
                .ownerPriceExpectation(ownerPriceExpectation)
                .mandateType(mandateType)
                .mandateStart(mandateStart)
                .mandateEnd(mandateEnd)
                .periodFrom(periodFrom)
                .periodTo(periodTo)
                .daysOnMarket(daysOnMarket)
                .inquiries(inquiries)
                .viewingsCompleted(viewingsCompleted)
                .viewingsCancelled(viewingsCancelled)
                .viewingsScheduled(viewingsScheduled)
                .feedbackDistribution(feedbackDistribution)
                .viewingsWithoutFeedback(viewingsWithoutFeedback)
                .activities(withoutNames)
                .build();
    }
}
