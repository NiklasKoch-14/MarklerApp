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
import com.marklerapp.crm.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

/**
 * Service for generating GDPR export data as PDF documents.
 * Uses iText library to create formatted PDF reports.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GdprPdfService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");

    /**
     * Generate PDF export for all agent data
     */
    public byte[] generatePdfExport(GdprExportResponse exportData) {
        log.info("Generating PDF export for agent: {}", exportData.getAgent().getId());

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            // Add header
            addHeader(document, exportData);

            // Add agent information
            addAgentSection(document, exportData.getAgent());

            // Add statistics
            addStatisticsSection(document, exportData.getStatistics());

            // Add clients
            addClientsSection(document, exportData.getClients());

            // Add properties
            addPropertiesSection(document, exportData.getProperties());

            // Add call notes
            addCallNotesSection(document, exportData.getCallNotes());

            // Add footer with GDPR statement
            addGdprStatement(document, exportData.getMetadata());

            document.close();

            log.info("PDF export generated successfully. Size: {} bytes", baos.size());
            return baos.toByteArray();

        } catch (Exception e) {
            log.error("Error generating PDF export", e);
            throw new RuntimeException("Failed to generate PDF export", e);
        }
    }

    /**
     * Add document header
     */
    private void addHeader(Document document, GdprExportResponse exportData) {
        Paragraph title = new Paragraph("GDPR Data Export Report")
                .setFontSize(20)
                .setBold()
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(10);
        document.add(title);

        Paragraph subtitle = new Paragraph("Personal Data Export - GDPR Article 15")
                .setFontSize(12)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(20);
        document.add(subtitle);

        // Export metadata
        Table metaTable = new Table(2);
        metaTable.setWidth(UnitValue.createPercentValue(100));
        addMetadataRow(metaTable, "Export Date:",
                      exportData.getMetadata().getExportTimestamp().format(DATETIME_FORMATTER));
        addMetadataRow(metaTable, "Export Version:", exportData.getMetadata().getExportVersion());
        addMetadataRow(metaTable, "Data Controller:", exportData.getMetadata().getDataController());
        metaTable.setMarginBottom(20);
        document.add(metaTable);
    }

    /**
     * Add agent information section
     */
    private void addAgentSection(Document document, GdprAgentData agent) {
        addSectionTitle(document, "Agent Information");

        Table table = new Table(2);
        table.setWidth(UnitValue.createPercentValue(100));
        addDataRow(table, "Name:", agent.getFullName());
        addDataRow(table, "Email:", agent.getEmail());
        addDataRow(table, "Phone:", agent.getPhone());
        addDataRow(table, "Language:", agent.getLanguagePreference());
        addDataRow(table, "Account Status:", agent.isActive() ? "Active" : "Inactive");
        addDataRow(table, "Created:", agent.getCreatedAt() != null ? agent.getCreatedAt().format(DATETIME_FORMATTER) : "N/A");
        table.setMarginBottom(20);
        document.add(table);
    }

    /**
     * Add statistics section
     */
    private void addStatisticsSection(Document document, GdprExportResponse.ExportStatistics stats) {
        addSectionTitle(document, "Data Summary");

        Table table = new Table(2);
        table.setWidth(UnitValue.createPercentValue(100));
        addDataRow(table, "Total Clients:", String.valueOf(stats.getTotalClients()));
        addDataRow(table, "Total Properties:", String.valueOf(stats.getTotalProperties()));
        addDataRow(table, "Total Call Notes:", String.valueOf(stats.getTotalCallNotes()));
        addDataRow(table, "Total Search Criteria:", String.valueOf(stats.getTotalSearchCriteria()));
        addDataRow(table, "Total Property Images:", String.valueOf(stats.getTotalPropertyImages()));
        table.setMarginBottom(20);
        document.add(table);
    }

    /**
     * Add clients section
     */
    private void addClientsSection(Document document, java.util.List<GdprClientData> clients) {
        addSectionTitle(document, "Clients (" + clients.size() + ")");

        if (clients.isEmpty()) {
            document.add(new Paragraph("No clients found.").setMarginBottom(20));
            return;
        }

        for (GdprClientData client : clients) {
            // Client header
            Paragraph clientHeader = new Paragraph(client.getFullName())
                    .setFontSize(12)
                    .setBold()
                    .setMarginTop(10)
                    .setMarginBottom(5);
            document.add(clientHeader);

            // Client details
            Table table = new Table(2);
            table.setWidth(UnitValue.createPercentValue(100));
            addDataRow(table, "Email:", client.getEmail());
            addDataRow(table, "Phone:", client.getPhone());
            addDataRow(table, "Address:", client.getFormattedAddress());
            addDataRow(table, "GDPR Consent:", client.isGdprConsentGiven() ? "Yes" : "No");
            if (client.getGdprConsentDate() != null) {
                addDataRow(table, "Consent Date:", client.getGdprConsentDate().format(DATETIME_FORMATTER));
            }

            // Search criteria
            if (client.getSearchCriteria() != null) {
                GdprClientData.GdprSearchCriteriaData criteria = client.getSearchCriteria();
                addDataRow(table, "Budget Range:",
                          formatRange(criteria.getMinBudget(), criteria.getMaxBudget(), " EUR"));
                addDataRow(table, "Area Range:",
                          formatRange(criteria.getMinSquareMeters(), criteria.getMaxSquareMeters(), " sqm"));
                addDataRow(table, "Rooms:",
                          formatRange(criteria.getMinRooms(), criteria.getMaxRooms(), ""));
                if (criteria.getPreferredLocations() != null) {
                    addDataRow(table, "Preferred Locations:", criteria.getPreferredLocations());
                }
            }

            table.setMarginBottom(10);
            document.add(table);
        }

        document.add(new Paragraph("").setMarginBottom(20));
    }

    /**
     * Add properties section
     */
    private void addPropertiesSection(Document document, java.util.List<GdprPropertyData> properties) {
        addSectionTitle(document, "Properties (" + properties.size() + ")");

        if (properties.isEmpty()) {
            document.add(new Paragraph("No properties found.").setMarginBottom(20));
            return;
        }

        for (GdprPropertyData property : properties) {
            // Property header
            Paragraph propertyHeader = new Paragraph(property.getTitle())
                    .setFontSize(12)
                    .setBold()
                    .setMarginTop(10)
                    .setMarginBottom(5);
            document.add(propertyHeader);

            // Property details
            Table table = new Table(2);
            table.setWidth(UnitValue.createPercentValue(100));
            addDataRow(table, "Type:", property.getPropertyType());
            addDataRow(table, "Listing Type:", property.getListingType());
            addDataRow(table, "Status:", property.getStatus());
            addDataRow(table, "Address:", property.getFormattedAddress());
            addDataRow(table, "Price:", property.getPrice() != null ? property.getPrice() + " EUR" : "N/A");
            addDataRow(table, "Living Area:", property.getLivingAreaSqm() != null ? property.getLivingAreaSqm() + " sqm" : "N/A");
            addDataRow(table, "Rooms:", property.getRooms());
            addDataRow(table, "Bedrooms:", property.getBedrooms() != null ? String.valueOf(property.getBedrooms()) : "N/A");
            addDataRow(table, "Images:", property.getImages() != null ? String.valueOf(property.getImages().size()) : "0");
            table.setMarginBottom(10);
            document.add(table);
        }

        document.add(new Paragraph("").setMarginBottom(20));
    }

    /**
     * Add call notes section
     */
    private void addCallNotesSection(Document document, java.util.List<GdprCallNoteData> callNotes) {
        addSectionTitle(document, "Call Notes (" + callNotes.size() + ")");

        if (callNotes.isEmpty()) {
            document.add(new Paragraph("No call notes found.").setMarginBottom(20));
            return;
        }

        for (GdprCallNoteData callNote : callNotes) {
            // Call note header
            Paragraph noteHeader = new Paragraph(callNote.getSubject())
                    .setFontSize(12)
                    .setBold()
                    .setMarginTop(10)
                    .setMarginBottom(5);
            document.add(noteHeader);

            // Call note details
            Table table = new Table(2);
            table.setWidth(UnitValue.createPercentValue(100));
            addDataRow(table, "Client:", callNote.getClientFullName());
            addDataRow(table, "Date:", callNote.getCallDate() != null ? callNote.getCallDate().format(DATETIME_FORMATTER) : "N/A");
            addDataRow(table, "Type:", callNote.getCallType());
            addDataRow(table, "Duration:", callNote.getDurationMinutes() != null ? callNote.getDurationMinutes() + " min" : "N/A");
            addDataRow(table, "Outcome:", callNote.getOutcome());
            if (callNote.getFollowUpRequired() != null && callNote.getFollowUpRequired()) {
                addDataRow(table, "Follow-up Date:",
                          callNote.getFollowUpDate() != null ? callNote.getFollowUpDate().format(DATE_FORMATTER) : "N/A");
            }
            table.setMarginBottom(5);
            document.add(table);

            // Notes content
            if (callNote.getNotes() != null && !callNote.getNotes().isEmpty()) {
                Paragraph notes = new Paragraph("Notes: " + callNote.getNotes())
                        .setFontSize(10)
                        .setMarginLeft(20)
                        .setMarginBottom(10);
                document.add(notes);
            }
        }

        document.add(new Paragraph("").setMarginBottom(20));
    }

    /**
     * Add GDPR statement footer
     */
    private void addGdprStatement(Document document, GdprExportResponse.ExportMetadata metadata) {
        document.add(new Paragraph("").setMarginTop(30));

        Paragraph statementTitle = new Paragraph("GDPR Compliance Statement")
                .setFontSize(14)
                .setBold()
                .setMarginBottom(10);
        document.add(statementTitle);

        Paragraph statement = new Paragraph(metadata.getGdprStatement())
                .setFontSize(9)
                .setMarginBottom(10);
        document.add(statement);

        Paragraph purpose = new Paragraph("Purpose of Processing: " + metadata.getPurposeOfProcessing())
                .setFontSize(9)
                .setItalic();
        document.add(purpose);
    }

    /**
     * Helper methods for table formatting
     */
    private void addSectionTitle(Document document, String title) {
        Paragraph sectionTitle = new Paragraph(title)
                .setFontSize(14)
                .setBold()
                .setBackgroundColor(ColorConstants.LIGHT_GRAY)
                .setPadding(5)
                .setMarginTop(10)
                .setMarginBottom(10);
        document.add(sectionTitle);
    }

    private void addMetadataRow(Table table, String label, String value) {
        Cell labelCell = new Cell()
                .add(new Paragraph(label).setBold())
                .setBorder(Border.NO_BORDER)
                .setWidth(UnitValue.createPercentValue(30));
        Cell valueCell = new Cell()
                .add(new Paragraph(value != null ? value : "N/A"))
                .setBorder(Border.NO_BORDER);
        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private void addDataRow(Table table, String label, String value) {
        Cell labelCell = new Cell()
                .add(new Paragraph(label).setFontSize(10))
                .setWidth(UnitValue.createPercentValue(30))
                .setPadding(3);
        Cell valueCell = new Cell()
                .add(new Paragraph(value != null ? value : "N/A").setFontSize(10))
                .setPadding(3);
        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private String formatRange(Object min, Object max, String unit) {
        if (min == null && max == null) {
            return "Not specified";
        }
        if (min != null && max != null) {
            return min + " - " + max + unit;
        }
        if (min != null) {
            return "From " + min + unit;
        }
        return "Up to " + max + unit;
    }
}
