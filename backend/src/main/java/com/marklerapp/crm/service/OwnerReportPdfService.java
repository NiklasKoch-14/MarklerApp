package com.marklerapp.crm.service;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.marklerapp.crm.dto.OwnerReportDto;
import com.marklerapp.crm.dto.OwnerReportDto.ActivityEntryDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/**
 * Taetigkeitsnachweis als PDF (Issue #40) -- das Dokument, das an den Eigentuemer geht.
 *
 * <p><b>Datenschutz:</b> Der Empfaenger ist ein Dritter, also darf hier kein
 * Interessentenname und kein Kontaktdatum auftauchen. Durchgesetzt wird das nicht per
 * Konvention, sondern durch {@link OwnerReportDto#anonymized()}: diese Klasse liest
 * ausschliesslich {@code clientLabel} und nie {@code clientName}.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OwnerReportPdfService {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final DateTimeFormatter DATETIME = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    // Beschriftungen liegen hier deutsch fest: das PDF geht an einen deutschen
    // Eigentuemer, nicht in die Oberflaeche des Maklers.
    private static final Map<String, String> FEEDBACK_LABELS = Map.of(
            "LIKED", "Positiv",
            "NEUTRAL", "Neutral",
            "DISLIKED", "Ablehnend");

    /**
     * @param report muss aus {@link OwnerReportDto#anonymized()} stammen
     */
    public byte[] generate(OwnerReportDto report) {
        log.info("Generating owner report PDF for property: {}", report.getPropertyId());

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfDocument pdf = new PdfDocument(new PdfWriter(baos));
            Document document = new Document(pdf);

            addHeader(document, report);
            addKeyFigures(document, report);
            addFeedback(document, report);
            addActivities(document, report);
            addPrivacyNote(document);

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("Error generating owner report PDF", e);
            throw new RuntimeException("Failed to generate owner report PDF", e);
        }
    }

    private void addHeader(Document document, OwnerReportDto report) {
        document.add(new Paragraph("Taetigkeitsnachweis")
                .setFontSize(20).setBold().setTextAlignment(TextAlignment.CENTER));
        document.add(new Paragraph(nullSafe(report.getTitle()))
                .setFontSize(13).setTextAlignment(TextAlignment.CENTER));

        Table meta = new Table(UnitValue.createPercentArray(new float[]{30, 70}))
                .setWidth(UnitValue.createPercentValue(100)).setMarginTop(12);
        addMetaRow(meta, "Ort", report.getAddressCity());
        addMetaRow(meta, "Zeitraum", report.getPeriodFrom() != null && report.getPeriodTo() != null
                ? report.getPeriodFrom().format(DATE) + " – " + report.getPeriodTo().minusDays(1).format(DATE)
                : null);
        if (report.getMandateStart() != null || report.getMandateEnd() != null) {
            addMetaRow(meta, "Auftragslaufzeit",
                    (report.getMandateStart() != null ? report.getMandateStart().format(DATE) : "–")
                            + " – "
                            + (report.getMandateEnd() != null ? report.getMandateEnd().format(DATE) : "–"));
        }
        if (report.getListedPrice() != null) {
            addMetaRow(meta, "Angebotspreis", euro(report.getListedPrice()));
        }
        document.add(meta);
    }

    private void addKeyFigures(Document document, OwnerReportDto report) {
        addSectionTitle(document, "Kennzahlen im Zeitraum");

        Table table = new Table(UnitValue.createPercentArray(new float[]{60, 40}))
                .setWidth(UnitValue.createPercentValue(100));
        addDataRow(table, "Anfragen", count(report.getInquiries()));
        addDataRow(table, "Durchgefuehrte Besichtigungen", count(report.getViewingsCompleted()));
        addDataRow(table, "Abgesagte Besichtigungen", count(report.getViewingsCancelled()));
        addDataRow(table, "Noch offene Termine", count(report.getViewingsScheduled()));
        addDataRow(table, "Tage am Markt", count(report.getDaysOnMarket()));
        document.add(table);
    }

    private void addFeedback(Document document, OwnerReportDto report) {
        if (report.getFeedbackDistribution() == null || report.getFeedbackDistribution().isEmpty()) {
            return;
        }
        addSectionTitle(document, "Rueckmeldungen der Interessenten");

        Table table = new Table(UnitValue.createPercentArray(new float[]{60, 40}))
                .setWidth(UnitValue.createPercentValue(100));
        report.getFeedbackDistribution().forEach((key, value) ->
                addDataRow(table, FEEDBACK_LABELS.getOrDefault(key, key), count(value)));
        if (report.getViewingsWithoutFeedback() != null && report.getViewingsWithoutFeedback() > 0) {
            addDataRow(table, "Ohne Rueckmeldung", count(report.getViewingsWithoutFeedback()));
        }
        document.add(table);
    }

    private void addActivities(Document document, OwnerReportDto report) {
        addSectionTitle(document, "Aktivitaeten");

        if (report.getActivities() == null || report.getActivities().isEmpty()) {
            document.add(new Paragraph("Im gewaehlten Zeitraum wurden keine Aktivitaeten erfasst.")
                    .setFontSize(10));
            return;
        }

        Table table = new Table(UnitValue.createPercentArray(new float[]{22, 20, 22, 36}))
                .setWidth(UnitValue.createPercentValue(100));
        headerCell(table, "Datum");
        headerCell(table, "Art");
        headerCell(table, "Interessent");
        headerCell(table, "Ergebnis / Notiz");

        for (ActivityEntryDto a : report.getActivities()) {
            bodyCell(table, a.getDate() != null ? a.getDate().format(DATETIME) : "–");
            bodyCell(table, "VIEWING".equals(a.getType()) ? "Besichtigung" : "Kontakt");
            // Nur das Pseudonym -- clientName wird hier bewusst nirgends gelesen.
            bodyCell(table, a.getClientLabel() != null ? "Interessent " + a.getClientLabel() : "–");
            bodyCell(table, activityDetail(a));
        }
        document.add(table);
    }

    private String activityDetail(ActivityEntryDto a) {
        String outcome = a.getOutcome() != null
                ? FEEDBACK_LABELS.getOrDefault(a.getOutcome(), a.getOutcome())
                : null;
        if (outcome != null && a.getNotes() != null) return outcome + " — " + a.getNotes();
        if (outcome != null) return outcome;
        if (a.getNotes() != null) return a.getNotes();
        return "–";
    }

    private void addPrivacyNote(Document document) {
        document.add(new Paragraph(
                "Interessenten sind in diesem Nachweis pseudonymisiert. Namen und Kontaktdaten "
                        + "werden nicht weitergegeben (Art. 5 Abs. 1 lit. c DSGVO, Datenminimierung).")
                .setFontSize(8).setItalic().setMarginTop(16));
    }

    // ========================================
    // Formatting helpers
    // ========================================

    private void addSectionTitle(Document document, String title) {
        document.add(new Paragraph(title)
                .setFontSize(14).setBold()
                .setBackgroundColor(ColorConstants.LIGHT_GRAY)
                .setPadding(5).setMarginTop(14).setMarginBottom(8));
    }

    private void addMetaRow(Table table, String label, String value) {
        table.addCell(new Cell().add(new Paragraph(label).setBold())
                .setBorder(Border.NO_BORDER).setWidth(UnitValue.createPercentValue(30)));
        table.addCell(new Cell().add(new Paragraph(nullSafe(value)))
                .setBorder(Border.NO_BORDER));
    }

    private void addDataRow(Table table, String label, String value) {
        table.addCell(new Cell().add(new Paragraph(label).setFontSize(10)).setPadding(3));
        table.addCell(new Cell().add(new Paragraph(value).setFontSize(10))
                .setPadding(3).setTextAlignment(TextAlignment.RIGHT));
    }

    private void headerCell(Table table, String text) {
        table.addCell(new Cell().add(new Paragraph(text).setFontSize(10).setBold())
                .setBackgroundColor(ColorConstants.LIGHT_GRAY).setPadding(3));
    }

    private void bodyCell(Table table, String text) {
        table.addCell(new Cell().add(new Paragraph(nullSafe(text)).setFontSize(9)).setPadding(3));
    }

    private String nullSafe(String value) {
        return value != null && !value.isBlank() ? value : "–";
    }

    private String count(Number value) {
        return value != null ? value.toString() : "0";
    }

    private String euro(BigDecimal value) {
        return String.format("%,.0f €", value);
    }
}
