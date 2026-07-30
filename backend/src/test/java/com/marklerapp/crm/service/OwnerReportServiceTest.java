package com.marklerapp.crm.service;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import com.marklerapp.crm.dto.OwnerReportDto;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.CallNote;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.Viewing;
import com.marklerapp.crm.repository.CallNoteRepository;
import com.marklerapp.crm.repository.PropertyRepository;
import com.marklerapp.crm.repository.ViewingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Eigentuemer-Report (Issue #40). Der Report geht an einen Dritten, darum ist die
 * Anonymisierung des Exports hier kein Randfall, sondern der Kern der Tests.
 */
@ExtendWith(MockitoExtension.class)
class OwnerReportServiceTest {

    @Mock private PropertyRepository propertyRepository;
    @Mock private ViewingRepository viewingRepository;
    @Mock private CallNoteRepository callNoteRepository;

    private OwnerReportService service;
    private OwnerReportPdfService pdfService;

    private Agent agent;
    private UUID agentId;
    private Property property;
    private UUID propertyId;
    private Client anna;
    private Client bruno;

    @BeforeEach
    void setUp() {
        agentId = UUID.randomUUID();
        propertyId = UUID.randomUUID();

        agent = Agent.builder().firstName("Max").lastName("Makler").email("max@example.com").build();
        agent.setId(agentId);

        property = Property.builder()
                .agent(agent)
                .title("Reihenhaus am Park")
                .addressCity("Bonn")
                .build();
        property.setId(propertyId);
        property.setCreatedAt(LocalDateTime.now().minusDays(50));

        anna = client("Anna", "Andermatt");
        bruno = client("Bruno", "Baumgartner");

        service = new OwnerReportService(propertyRepository, viewingRepository,
                callNoteRepository, new OwnershipValidator());
        pdfService = new OwnerReportPdfService();
    }

    private Client client(String first, String last) {
        Client c = Client.builder().agent(agent).firstName(first).lastName(last).build();
        c.setId(UUID.randomUUID());
        return c;
    }

    private Viewing viewing(Client c, LocalDateTime date, Viewing.ViewingStatus status,
                            Viewing.ViewingFeedback feedback) {
        Viewing v = Viewing.builder()
                .agent(agent).client(c).property(property)
                .viewingDate(date).status(status).feedback(feedback)
                .build();
        v.setId(UUID.randomUUID());
        return v;
    }

    private CallNote note(Client c, LocalDateTime date, String subject) {
        CallNote n = CallNote.builder()
                .agent(agent).client(c).property(property)
                .callDate(date).subject(subject)
                .build();
        n.setId(UUID.randomUUID());
        return n;
    }

    private void stub(List<Viewing> viewings, List<CallNote> notes) {
        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(property));
        lenient().when(viewingRepository.findByPropertyOrderByViewingDateDesc(property)).thenReturn(viewings);
        lenient().when(callNoteRepository.findByPropertyAndCallDateRange(any(), any(), any())).thenReturn(notes);
    }

    @Test
    void report_AggregatesViewingsAndInquiries() {
        LocalDateTime recent = LocalDateTime.now().minusDays(3);
        stub(List.of(
                viewing(anna, recent, Viewing.ViewingStatus.COMPLETED, Viewing.ViewingFeedback.DISLIKED),
                viewing(bruno, recent.minusDays(1), Viewing.ViewingStatus.COMPLETED, Viewing.ViewingFeedback.DISLIKED),
                viewing(anna, recent.minusDays(2), Viewing.ViewingStatus.CANCELLED, null),
                viewing(bruno, recent.minusDays(4), Viewing.ViewingStatus.COMPLETED, null)),
            List.of(note(anna, recent, "Rueckfrage Grundstueck")));

        OwnerReportDto report = service.generateReport(propertyId, agentId, null, null);

        assertThat(report.getViewingsCompleted()).isEqualTo(3);
        assertThat(report.getViewingsCancelled()).isEqualTo(1);
        assertThat(report.getInquiries()).isEqualTo(1);
        assertThat(report.getViewingsWithoutFeedback()).isEqualTo(1);
        // "2x Preis zu hoch" ist das Argument im Preisgespraech — die Null-Zeilen bleiben,
        // damit sich "kam nicht vor" von "wurde nicht gefragt" unterscheidet.
        assertThat(report.getFeedbackDistribution())
                .containsEntry("DISLIKED", 2L)
                .containsEntry("LIKED", 0L)
                .containsEntry("NEUTRAL", 0L);
        assertThat(report.getDaysOnMarket()).isEqualTo(50);
        assertThat(report.getActivities()).hasSize(5);
    }

    @Test
    void report_ExcludesActivityOutsideThePeriod() {
        LocalDateTime insidePeriod = LocalDateTime.now().minusDays(2);
        LocalDateTime longAgo = LocalDateTime.now().minusDays(200);
        stub(List.of(
                viewing(anna, insidePeriod, Viewing.ViewingStatus.COMPLETED, Viewing.ViewingFeedback.LIKED),
                viewing(bruno, longAgo, Viewing.ViewingStatus.COMPLETED, Viewing.ViewingFeedback.LIKED)),
            List.of());

        OwnerReportDto report = service.generateReport(propertyId, agentId, null, null);

        assertThat(report.getViewingsCompleted()).isEqualTo(1);
        assertThat(report.getActivities()).hasSize(1);
    }

    @Test
    void report_PeriodStartsWithTheMandateWhenItIsMoreRecent() {
        // Ein Nachweis ueber Wochen ohne Auftrag waere irrefuehrend leer.
        property.setMandateStart(LocalDate.now().minusDays(5));
        stub(List.of(), List.of());

        OwnerReportDto report = service.generateReport(propertyId, agentId, null, null);

        assertThat(report.getPeriodFrom()).isEqualTo(LocalDate.now().minusDays(5));
    }

    @Test
    void labels_AreStableForTheSameProspectAcrossViewingsAndNotes() {
        LocalDateTime base = LocalDateTime.now().minusDays(5);
        stub(List.of(
                viewing(anna, base, Viewing.ViewingStatus.COMPLETED, Viewing.ViewingFeedback.NEUTRAL),
                viewing(anna, base.plusDays(1), Viewing.ViewingStatus.COMPLETED, Viewing.ViewingFeedback.LIKED)),
            List.of(note(anna, base.plusDays(2), "Nachfassen")));

        OwnerReportDto report = service.generateReport(propertyId, agentId, null, null);

        // Ein Mensch, ein Pseudonym — sonst liest der Eigentuemer aus drei Eintraegen
        // desselben Interessenten drei Interessenten heraus.
        assertThat(report.getActivities())
                .extracting(OwnerReportDto.ActivityEntryDto::getClientLabel)
                .containsOnly("A");
    }

    @Test
    void anonymized_DropsNamesButKeepsLabelsAndFigures() {
        LocalDateTime recent = LocalDateTime.now().minusDays(2);
        stub(List.of(viewing(anna, recent, Viewing.ViewingStatus.COMPLETED, Viewing.ViewingFeedback.DISLIKED)),
             List.of(note(bruno, recent, "Anfrage per Portal")));

        OwnerReportDto internal = service.generateReport(propertyId, agentId, null, null);
        OwnerReportDto forOwner = internal.anonymized();

        // Die interne Ansicht darf Namen zeigen.
        assertThat(internal.getActivities())
                .extracting(OwnerReportDto.ActivityEntryDto::getClientName)
                .contains("Anna Andermatt", "Bruno Baumgartner");

        assertThat(forOwner.getActivities())
                .extracting(OwnerReportDto.ActivityEntryDto::getClientName)
                .containsOnlyNulls();
        assertThat(forOwner.getActivities())
                .extracting(OwnerReportDto.ActivityEntryDto::getClientLabel)
                .doesNotContainNull();
        assertThat(forOwner.getViewingsCompleted()).isEqualTo(internal.getViewingsCompleted());
        assertThat(forOwner.getFeedbackDistribution()).isEqualTo(internal.getFeedbackDistribution());
    }

    @Test
    void pdf_ContainsNoProspectName() throws Exception {
        LocalDateTime recent = LocalDateTime.now().minusDays(2);
        stub(List.of(viewing(anna, recent, Viewing.ViewingStatus.COMPLETED, Viewing.ViewingFeedback.DISLIKED)),
             List.of(note(bruno, recent, "Anfrage per Portal")));

        OwnerReportDto report = service.generateReport(propertyId, agentId, null, null);
        byte[] pdf = pdfService.generate(report.anonymized());

        String text = extractText(pdf);

        // Kontrolle, dass die Extraktion ueberhaupt Text sieht -- iText komprimiert die
        // Content-Streams, ein Scan ueber die Rohbytes wuerde hier immer bestehen und
        // nichts beweisen.
        assertThat(text).contains("Taetigkeitsnachweis");
        assertThat(text).contains("Interessent A");

        // Der Report geht an einen Dritten: kein Interessentenname darf im Dokument stehen.
        assertThat(text)
                .doesNotContain("Andermatt")
                .doesNotContain("Baumgartner")
                .doesNotContain("Anna")
                .doesNotContain("Bruno");
    }

    /** Extrahiert den sichtbaren Text aller Seiten -- die Rohbytes sind komprimiert. */
    private String extractText(byte[] pdf) throws Exception {
        try (PdfReader reader = new PdfReader(new ByteArrayInputStream(pdf));
             PdfDocument document = new PdfDocument(reader)) {
            StringBuilder sb = new StringBuilder();
            for (int page = 1; page <= document.getNumberOfPages(); page++) {
                sb.append(PdfTextExtractor.getTextFromPage(document.getPage(page))).append('\n');
            }
            return sb.toString();
        }
    }
}
