package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.dto.OwnerReportDto;
import com.marklerapp.crm.dto.OwnerReportDto.ActivityEntryDto;
import com.marklerapp.crm.entity.CallNote;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.Viewing;
import com.marklerapp.crm.repository.CallNoteRepository;
import com.marklerapp.crm.repository.PropertyRepository;
import com.marklerapp.crm.repository.ViewingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Taetigkeitsnachweis pro Objekt (Issue #40).
 *
 * <p>Die Daten liegen alle in der App -- Besichtigungen mit Feedback, objektbezogene
 * Gespraechsnotizen, Tage am Markt -- aber es gab keine Ansicht, die das pro Objekt
 * zusammenzieht. Der Makler hat sich durch Einzelkarten geklickt und den Bericht
 * in Word getippt.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OwnerReportService {

    private static final String TYPE_VIEWING = "VIEWING";
    private static final String TYPE_CALL_NOTE = "CALL_NOTE";

    /** Standardzeitraum, wenn der Makler keinen waehlt. */
    private static final int DEFAULT_PERIOD_DAYS = 28;

    private final PropertyRepository propertyRepository;
    private final ViewingRepository viewingRepository;
    private final CallNoteRepository callNoteRepository;
    private final OwnershipValidator ownershipValidator;

    /**
     * Report fuer die interne Bildschirmansicht -- mit Interessentennamen.
     *
     * @param from erster Tag des Zeitraums; null bedeutet die letzten
     *             {@value #DEFAULT_PERIOD_DAYS} Tage, bzw. den Auftragsbeginn,
     *             falls dieser spaeter liegt
     * @param to   exklusiver letzter Tag; null bedeutet morgen, damit der heutige
     *             Tag vollstaendig enthalten ist
     */
    @Transactional(readOnly = true)
    public OwnerReportDto generateReport(UUID propertyId, UUID agentId, LocalDate from, LocalDate to) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property", "id", propertyId));
        ownershipValidator.validatePropertyOwnership(property, agentId);

        LocalDate periodTo = to != null ? to : LocalDate.now().plusDays(1);
        LocalDate periodFrom = from != null ? from : defaultPeriodStart(property, periodTo);

        LocalDateTime fromTs = periodFrom.atStartOfDay();
        LocalDateTime toTs = periodTo.atStartOfDay();

        List<Viewing> viewings = viewingRepository.findByPropertyOrderByViewingDateDesc(property).stream()
                .filter(v -> v.getViewingDate() != null)
                .filter(v -> !v.getViewingDate().isBefore(fromTs) && v.getViewingDate().isBefore(toTs))
                .toList();

        List<CallNote> notes = callNoteRepository.findByPropertyAndCallDateRange(propertyId, fromTs, toTs);

        // Pseudonyme werden ueber Besichtigungen UND Notizen hinweg vergeben, damit derselbe
        // Interessent im Report durchgaengig "Interessent A" heisst -- sonst liest der
        // Eigentuemer aus zwei Eintraegen desselben Menschen zwei Interessenten heraus.
        Map<UUID, String> labels = assignLabels(viewings, notes);

        return OwnerReportDto.builder()
                .propertyId(property.getId().toString())
                .title(property.getTitle())
                .addressCity(property.getAddressCity())
                .listedPrice(property.getPrice())
                .ownerPriceExpectation(property.getOwnerPriceExpectation())
                .mandateType(property.getMandateType())
                .mandateStart(property.getMandateStart())
                .mandateEnd(property.getMandateEnd())
                .periodFrom(periodFrom)
                .periodTo(periodTo)
                .daysOnMarket(daysOnMarket(property))
                .inquiries((long) notes.size())
                .viewingsCompleted(countStatus(viewings, Viewing.ViewingStatus.COMPLETED))
                .viewingsCancelled(countStatus(viewings, Viewing.ViewingStatus.CANCELLED))
                .viewingsScheduled(countStatus(viewings, Viewing.ViewingStatus.SCHEDULED))
                .feedbackDistribution(feedbackDistribution(viewings))
                .viewingsWithoutFeedback(viewings.stream()
                        .filter(v -> v.getStatus() == Viewing.ViewingStatus.COMPLETED)
                        .filter(v -> v.getFeedback() == null)
                        .count())
                .activities(buildActivities(viewings, notes, labels))
                .build();
    }

    /**
     * Der Zeitraum beginnt mit dem Auftrag, wenn dieser innerhalb der letzten
     * {@value #DEFAULT_PERIOD_DAYS} Tage liegt: ein Nachweis ueber Wochen, in denen
     * es noch keinen Auftrag gab, waere irrefuehrend leer.
     */
    private LocalDate defaultPeriodStart(Property property, LocalDate periodTo) {
        LocalDate fourWeeksBack = periodTo.minusDays(DEFAULT_PERIOD_DAYS);
        LocalDate mandateStart = property.getMandateStart();
        return (mandateStart != null && mandateStart.isAfter(fourWeeksBack)) ? mandateStart : fourWeeksBack;
    }

    private Integer daysOnMarket(Property property) {
        if (property.getCreatedAt() == null) return null;
        return (int) ChronoUnit.DAYS.between(property.getCreatedAt(), LocalDateTime.now());
    }

    private long countStatus(List<Viewing> viewings, Viewing.ViewingStatus status) {
        return viewings.stream().filter(v -> v.getStatus() == status).count();
    }

    /**
     * Alle Feedback-Werte bleiben enthalten, auch die mit Zahl 0 -- eine fehlende Zeile
     * liest sich als "danach wurde nicht gefragt", eine Null als "kam nicht vor".
     */
    private Map<String, Long> feedbackDistribution(List<Viewing> viewings) {
        Map<String, Long> distribution = new LinkedHashMap<>();
        for (Viewing.ViewingFeedback feedback : Viewing.ViewingFeedback.values()) {
            distribution.put(feedback.name(), viewings.stream()
                    .filter(v -> v.getFeedback() == feedback)
                    .count());
        }
        return distribution;
    }

    /**
     * Vergibt "Interessent A", "Interessent B", ... in der Reihenfolge des ersten
     * Auftretens. Bewusst nur ein Buchstabe pro Person und kein Kuerzel aus dem Namen:
     * "Interessent K.M." waere in einem kleinen Ort eine Identifikation.
     */
    private Map<UUID, String> assignLabels(List<Viewing> viewings, List<CallNote> notes) {
        List<Client> inOrder = new ArrayList<>();
        viewings.stream()
                .sorted(Comparator.comparing(Viewing::getViewingDate))
                .map(Viewing::getClient)
                .filter(java.util.Objects::nonNull)
                .forEach(inOrder::add);
        notes.stream()
                .sorted(Comparator.comparing(CallNote::getCallDate))
                .map(CallNote::getClient)
                .filter(java.util.Objects::nonNull)
                .forEach(inOrder::add);

        Map<UUID, String> labels = new LinkedHashMap<>();
        int next = 0;
        for (Client client : inOrder) {
            if (!labels.containsKey(client.getId())) {
                labels.put(client.getId(), label(next++));
            }
        }
        return labels;
    }

    /** 0 -> "A", 25 -> "Z", 26 -> "AA". */
    private String label(int index) {
        StringBuilder sb = new StringBuilder();
        int i = index;
        do {
            sb.insert(0, (char) ('A' + (i % 26)));
            i = i / 26 - 1;
        } while (i >= 0);
        return sb.toString();
    }

    private List<ActivityEntryDto> buildActivities(List<Viewing> viewings,
                                                   List<CallNote> notes,
                                                   Map<UUID, String> labels) {
        List<ActivityEntryDto> activities = new ArrayList<>();

        for (Viewing v : viewings) {
            activities.add(ActivityEntryDto.builder()
                    .date(v.getViewingDate())
                    .type(TYPE_VIEWING)
                    .clientName(v.getClient() != null ? v.getClient().getFullName() : null)
                    .clientLabel(labelFor(v.getClient(), labels))
                    .outcome(v.getFeedback() != null ? v.getFeedback().name() : null)
                    .status(v.getStatus() != null ? v.getStatus().name() : null)
                    .notes(v.getClientNotes())
                    .build());
        }

        for (CallNote n : notes) {
            activities.add(ActivityEntryDto.builder()
                    .date(n.getCallDate())
                    .type(TYPE_CALL_NOTE)
                    .clientName(n.getClient() != null ? n.getClient().getFullName() : null)
                    .clientLabel(labelFor(n.getClient(), labels))
                    .outcome(n.getOutcome() != null ? n.getOutcome().name() : null)
                    .notes(n.getSubject())
                    .build());
        }

        activities.sort(Comparator.comparing(ActivityEntryDto::getDate,
                Comparator.nullsLast(Comparator.reverseOrder())));
        return activities;
    }

    private String labelFor(Client client, Map<UUID, String> labels) {
        return client != null ? labels.get(client.getId()) : null;
    }
}
