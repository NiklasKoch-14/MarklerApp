package com.marklerapp.crm.service;

import com.marklerapp.crm.constants.ValidationConstants;
import com.marklerapp.crm.dto.DashboardAnalyticsDto;
import com.marklerapp.crm.dto.DashboardAnalyticsDto.*;
import com.marklerapp.crm.entity.CallNote;
import com.marklerapp.crm.entity.CallNote.CallOutcome;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.repository.CallNoteRepository;
import com.marklerapp.crm.repository.ClientRepository;
import com.marklerapp.crm.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for generating comprehensive dashboard analytics.
 * Provides actionable insights for real estate managers.
 *
 * @author Claude Sonnet 4.5
 * @since Dashboard Analytics Feature
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardAnalyticsService {

    private final AgentRepository agentRepository;
    private final ClientRepository clientRepository;
    private final PropertyRepository propertyRepository;
    private final CallNoteRepository callNoteRepository;

    /**
     * Generate complete dashboard analytics for an agent.
     *
     * @param agentId The agent's UUID
     * @return Comprehensive analytics DTO
     */
    @Transactional(readOnly = true)
    public DashboardAnalyticsDto generateAnalytics(UUID agentId) {
        log.info("Generating dashboard analytics for agent: {}", agentId);

        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new IllegalArgumentException("Agent not found: " + agentId));

        // Die drei Datensätze des Maklers einmal laden und an alle Auswertungen
        // durchreichen — vorher hat jede Kennzahl ihre eigenen Queries abgesetzt,
        // inklusive einer Abfrage pro Kunde für den letzten Kontakt.
        List<Client> clients = clientRepository.findByAgent(agent);
        List<CallNote> callNotes = callNoteRepository
                .findByAgentOrderByCallDateDesc(agent, Pageable.unpaged()).getContent();
        List<Property> properties = propertyRepository
                .findByAgent(agent, Pageable.unpaged()).getContent();

        return DashboardAnalyticsDto.builder()
                .conversionFunnel(calculateConversionFunnel(clients, callNotes))
                .pipelineHealth(calculatePipelineHealth(clients, callNotes))
                .propertyPortfolio(calculatePropertyPortfolio(properties))
                .activityTrends(calculateActivityTrends(clients, callNotes, properties))
                .revenue(calculateRevenue(properties))
                .leadSourcePerformance(calculateLeadSourcePerformance(clients))
                .build();
    }

    // ========================================
    // Conversion Funnel Calculation
    // ========================================

    /**
     * Rang einer Gesprächs-Stufe im Trichter. NOT_INTERESTED ist kein Fortschritt,
     * sondern ein Ausstieg, und bekommt darum keinen Rang.
     */
    private static int funnelRank(CallOutcome outcome) {
        if (outcome == null) return 0;
        return switch (outcome) {
            case INTERESTED -> 1;
            case SCHEDULED_VIEWING -> 2;
            case OFFER_MADE -> 3;
            case DEAL_CLOSED -> 4;
            case NOT_INTERESTED -> 0;
        };
    }

    private ConversionFunnelDto calculateConversionFunnel(List<Client> clients, List<CallNote> callNotes) {
        long totalClients = clients.size();

        // Ein Trichter zählt kumulativ: wer ein Angebot bekommen hat, war vorher
        // zwangsläufig Interessent. Darum zählt pro Kunde die am weitesten
        // fortgeschrittene Stufe, die er je erreicht hat — nicht sein letztes
        // Gesprächsergebnis. Sonst rutscht ein Kunde beim Fortschritt aus der
        // vorherigen Stufe heraus und die Quoten übersteigen 100 %.
        Map<UUID, Integer> furthestRank = new HashMap<>();
        for (CallNote note : callNotes) {
            int rank = funnelRank(note.getOutcome());
            if (rank == 0) continue;
            furthestRank.merge(note.getClient().getId(), rank, Math::max);
        }

        long interested = countAtLeast(furthestRank, 1);
        long scheduledViewings = countAtLeast(furthestRank, 2);
        long offersMade = countAtLeast(furthestRank, 3);
        long dealsClosed = countAtLeast(furthestRank, 4);

        long lostClients = latestOutcomeByClient(callNotes).values().stream()
                .filter(o -> o == CallOutcome.NOT_INTERESTED)
                .count();

        return ConversionFunnelDto.builder()
                .totalClients(totalClients)
                .interestedClients(interested)
                .scheduledViewings(scheduledViewings)
                .offersMade(offersMade)
                .dealsClosed(dealsClosed)
                .lostClients(lostClients)
                .interestedRate(percentage(interested, totalClients))
                .viewingRate(percentage(scheduledViewings, interested))
                .offerRate(percentage(offersMade, scheduledViewings))
                .closingRate(percentage(dealsClosed, offersMade))
                .overallConversionRate(percentage(dealsClosed, totalClients))
                .build();
    }

    private long countAtLeast(Map<UUID, Integer> furthestRank, int rank) {
        return furthestRank.values().stream().filter(r -> r >= rank).count();
    }

    private double percentage(long part, long whole) {
        if (whole <= 0) return 0.0;
        double raw = part * 100.0 / whole;
        return Math.round(raw * ValidationConstants.PERCENTAGE_ROUNDING_PRECISION)
                / ValidationConstants.PERCENTAGE_ROUNDING_PRECISION;
    }

    /** Letztes bewertetes Gesprächsergebnis je Kunde. Erwartet die Notizen nach callDate absteigend. */
    private Map<UUID, CallOutcome> latestOutcomeByClient(List<CallNote> callNotes) {
        Map<UUID, CallOutcome> latest = new HashMap<>();
        for (CallNote note : callNotes) {
            if (note.getOutcome() == null) continue;
            latest.putIfAbsent(note.getClient().getId(), note.getOutcome());
        }
        return latest;
    }

    // ========================================
    // Pipeline Health Calculation
    // ========================================

    private PipelineHealthDto calculatePipelineHealth(List<Client> clients, List<CallNote> callNotes) {
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = LocalDate.now();

        Map<String, Long> clientsByOutcome = latestOutcomeByClient(callNotes).values().stream()
                .collect(Collectors.groupingBy(Enum::name, Collectors.counting()));

        List<CallNote> openFollowUps = callNotes.stream()
                .filter(n -> Boolean.TRUE.equals(n.getFollowUpRequired()))
                .filter(n -> n.getFollowUpDate() != null)
                .toList();

        // "Überfällig" schließt heute mit ein — konsistent mit CallNoteService.
        // Die Wochen-Buckets starten deshalb erst morgen, sonst zählt heute doppelt.
        long overdueFollowUps = openFollowUps.stream()
                .filter(n -> !n.getFollowUpDate().isAfter(today))
                .count();
        long followUpsDueThisWeek = countFollowUpsBetween(openFollowUps, today.plusDays(1), today.plusWeeks(1));
        long followUpsDueNextWeek = countFollowUpsBetween(openFollowUps, today.plusWeeks(1), today.plusWeeks(2));

        Map<UUID, LocalDateTime> lastContact = new HashMap<>();
        for (CallNote note : callNotes) {
            if (note.getCallDate() == null) continue;
            lastContact.merge(note.getClient().getId(), note.getCallDate(),
                    (a, b) -> a.isAfter(b) ? a : b);
        }

        LocalDateTime staleThreshold = now.minusDays(ValidationConstants.DAYS_WITHOUT_CONTACT_THRESHOLD);
        long clientsWithoutRecentContact = clients.stream()
                .map(c -> lastContact.get(c.getId()))
                .filter(contacted -> contacted == null || contacted.isBefore(staleThreshold))
                .count();

        // Nur Kunden mit mindestens einem Gespräch — bei nie kontaktierten Kunden
        // gibt es kein "seit". Die Bezugsgröße wandert mit ins DTO, damit die
        // Oberfläche den Durchschnitt nicht ohne Basis zeigt.
        List<Long> daysSinceContact = clients.stream()
                .map(c -> lastContact.get(c.getId()))
                .filter(Objects::nonNull)
                .map(contacted -> ChronoUnit.DAYS.between(contacted, now))
                .toList();
        int averageDays = daysSinceContact.isEmpty() ? 0
                : (int) (daysSinceContact.stream().mapToLong(Long::longValue).sum() / daysSinceContact.size());

        return PipelineHealthDto.builder()
                .clientsByOutcome(clientsByOutcome)
                .overdueFollowUps(overdueFollowUps)
                .followUpsDueThisWeek(followUpsDueThisWeek)
                .followUpsDueNextWeek(followUpsDueNextWeek)
                .clientsWithoutRecentContact(clientsWithoutRecentContact)
                .averageDaysSinceLastContact(averageDays)
                .clientsWithContact((long) daysSinceContact.size())
                .build();
    }

    private long countFollowUpsBetween(List<CallNote> followUps, LocalDate fromInclusive, LocalDate toExclusive) {
        return followUps.stream()
                .filter(n -> !n.getFollowUpDate().isBefore(fromInclusive))
                .filter(n -> n.getFollowUpDate().isBefore(toExclusive))
                .count();
    }

    // ========================================
    // Property Portfolio Calculation
    // ========================================

    private PropertyPortfolioDto calculatePropertyPortfolio(List<Property> allProperties) {
        long totalProperties = allProperties.size();

        Map<String, Long> propertiesByStatus = allProperties.stream()
                .collect(Collectors.groupingBy(p -> p.getStatus().name(), Collectors.counting()));

        Map<String, Long> propertiesByType = allProperties.stream()
                .collect(Collectors.groupingBy(p -> p.getPropertyType().name(), Collectors.counting()));

        LocalDateTime now = LocalDateTime.now();
        List<Property> availableProperties = allProperties.stream()
                .filter(p -> p.getStatus() == PropertyStatus.AVAILABLE)
                .toList();

        int totalDaysOnMarket = 0;
        for (Property property : availableProperties) {
            totalDaysOnMarket += (int) ChronoUnit.DAYS.between(property.getCreatedAt(), now);
        }
        int averageDaysOnMarket = availableProperties.isEmpty() ? 0 : totalDaysOnMarket / availableProperties.size();

        // Objekte die am längsten hängen — Grundlage fürs Preisreduktions-Gespräch mit dem Eigentümer
        List<PropertyOnMarketDto> longestOnMarket = availableProperties.stream()
                .map(p -> PropertyOnMarketDto.builder()
                        .propertyId(p.getId().toString())
                        .title(p.getTitle())
                        .city(p.getAddressCity())
                        .daysOnMarket((int) ChronoUnit.DAYS.between(p.getCreatedAt(), now))
                        .price(p.getPrice())
                        .build())
                .sorted(Comparator.comparing(PropertyOnMarketDto::getDaysOnMarket).reversed())
                .limit(5)
                .collect(Collectors.toList());

        long propertiesWithImages = allProperties.stream()
                .filter(p -> p.getImages() != null && !p.getImages().isEmpty())
                .count();

        long propertiesWithExpose = allProperties.stream()
                .filter(p -> p.getExposeFileName() != null && !p.getExposeFileName().isEmpty())
                .count();

        BigDecimal totalValue = allProperties.stream()
                .map(Property::getPrice)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return PropertyPortfolioDto.builder()
                .totalProperties(totalProperties)
                .propertiesByStatus(propertiesByStatus)
                .propertiesByType(propertiesByType)
                .averageDaysOnMarket(averageDaysOnMarket)
                .propertiesWithImages(propertiesWithImages)
                .propertiesWithExpose(propertiesWithExpose)
                .totalPortfolioValue(totalValue)
                .longestOnMarket(longestOnMarket)
                .build();
    }

    // ========================================
    // Revenue / Commission Calculation
    // ========================================

    private RevenueDto calculateRevenue(List<Property> allProperties) {
        int currentYear = LocalDate.now().getYear();

        // Abgeschlossene Objekte dieses Jahr (Status SOLD/RENTED, in diesem Jahr aktualisiert)
        List<Property> closedThisYear = allProperties.stream()
                .filter(p -> p.getStatus() == PropertyStatus.SOLD || p.getStatus() == PropertyStatus.RENTED)
                .filter(p -> p.getUpdatedAt() != null && p.getUpdatedAt().getYear() == currentYear)
                .toList();

        BigDecimal realizedCommission = closedThisYear.stream()
                .map(Property::getCommission)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long dealsClosedYtd = closedThisYear.size();

        // Provision die noch im Bestand steckt (verfügbar/reserviert)
        BigDecimal pipelineCommission = allProperties.stream()
                .filter(p -> p.getStatus() == PropertyStatus.AVAILABLE || p.getStatus() == PropertyStatus.RESERVED)
                .map(Property::getCommission)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal avgCommission = dealsClosedYtd > 0
                ? realizedCommission.divide(BigDecimal.valueOf(dealsClosedYtd), 2, java.math.RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return RevenueDto.builder()
                .realizedCommissionYtd(realizedCommission)
                .pipelineCommission(pipelineCommission)
                .dealsClosedYtd(dealsClosedYtd)
                .avgCommissionPerDeal(avgCommission)
                .build();
    }

    // ========================================
    // Akquisekanäle (Issue #41)
    // ========================================

    /** Platzhalter-Schlüssel für Kunden ohne erfasste Quelle — groupingBy verträgt keine null-Keys. */
    private static final String LEAD_SOURCE_UNASSIGNED = "";

    /**
     * Abschlüsse und Provision je Akquisekanal.
     *
     * <p>Bezugsgröße ist bewusst der Kunde, nicht das Objekt: die Quelle hängt am Lead, und
     * nur so lässt sich "welcher Kanal bringt Abschlüsse" überhaupt beantworten. Als Abschluss
     * zählt die Pipeline-Phase WON, als Provision der am Kunden gepflegte Wert (V30).</p>
     *
     * <p>Kunden ohne Quelle bleiben als eigene Zeile erhalten (source == null) und stehen immer
     * am Ende — sonst würden Bestandsdaten die eigentlichen Kanäle verdrängen und die Summen
     * würden nicht mehr zur Kundenliste passen.</p>
     */
    private List<LeadSourcePerformanceDto> calculateLeadSourcePerformance(List<Client> allClients) {
        Map<String, List<Client>> bySource = allClients.stream()
                .collect(Collectors.groupingBy(
                        c -> c.getLeadSource() != null ? c.getLeadSource().name() : LEAD_SOURCE_UNASSIGNED));

        List<LeadSourcePerformanceDto> rows = new ArrayList<>();
        for (Map.Entry<String, List<Client>> entry : bySource.entrySet()) {
            List<Client> clients = entry.getValue();

            List<Client> won = clients.stream()
                    .filter(c -> c.getPipelineStage() == Client.PipelineStage.WON)
                    .toList();

            BigDecimal wonCommission = sumCommission(won);
            BigDecimal openCommission = sumCommission(clients.stream()
                    .filter(c -> c.getPipelineStage() != Client.PipelineStage.WON
                            && c.getPipelineStage() != Client.PipelineStage.LOST)
                    .toList());

            double winRate = clients.isEmpty() ? 0.0 : (won.size() * 100.0 / clients.size());

            rows.add(LeadSourcePerformanceDto.builder()
                    .source(LEAD_SOURCE_UNASSIGNED.equals(entry.getKey()) ? null : entry.getKey())
                    .totalClients((long) clients.size())
                    .wonClients((long) won.size())
                    .wonCommission(wonCommission)
                    .openCommission(openCommission)
                    .winRate(Math.round(winRate * ValidationConstants.PERCENTAGE_ROUNDING_PRECISION)
                            / ValidationConstants.PERCENTAGE_ROUNDING_PRECISION)
                    .build());
        }

        rows.sort(Comparator
                .comparing((LeadSourcePerformanceDto r) -> r.getSource() == null)   // "ohne Angabe" ans Ende
                .thenComparing(LeadSourcePerformanceDto::getWonCommission, Comparator.reverseOrder())
                .thenComparing(LeadSourcePerformanceDto::getWonClients, Comparator.reverseOrder())
                .thenComparing(LeadSourcePerformanceDto::getTotalClients, Comparator.reverseOrder()));

        return rows;
    }

    private BigDecimal sumCommission(List<Client> clients) {
        return clients.stream()
                .map(Client::getExpectedCommission)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // ========================================
    // Activity Trends Calculation
    // ========================================

    private ActivityTrendsDto calculateActivityTrends(List<Client> clients,
                                                      List<CallNote> callNotes,
                                                      List<Property> properties) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfThisMonth = now.withDayOfMonth(1).toLocalDate().atStartOfDay();
        LocalDateTime startOfLastMonth = startOfThisMonth.minusMonths(1);

        List<CallNote> datedNotes = callNotes.stream()
                .filter(n -> n.getCallDate() != null && !n.getCallDate().isAfter(now))
                .toList();

        long callNotesThisMonth = countBetween(datedNotes, CallNote::getCallDate, startOfThisMonth, now);
        long callNotesLastMonth = countBetween(datedNotes, CallNote::getCallDate, startOfLastMonth, startOfThisMonth);
        int callNotesGrowth = callNotesLastMonth > 0
                ? (int) (((callNotesThisMonth - callNotesLastMonth) * 100.0) / callNotesLastMonth)
                : 0;

        List<CallNote> closedNotes = datedNotes.stream()
                .filter(n -> n.getOutcome() == CallOutcome.DEAL_CLOSED)
                .toList();
        long dealsClosedThisMonth = countBetween(closedNotes, CallNote::getCallDate, startOfThisMonth, now);
        long dealsClosedLastMonth = countBetween(closedNotes, CallNote::getCallDate, startOfLastMonth, startOfThisMonth);

        List<Client> datedClients = clients.stream().filter(c -> c.getCreatedAt() != null).toList();
        long newClientsThisMonth = countBetween(datedClients, Client::getCreatedAt, startOfThisMonth, now);
        long newClientsLastMonth = countBetween(datedClients, Client::getCreatedAt, startOfLastMonth, startOfThisMonth);

        List<Property> datedProperties = properties.stream().filter(p -> p.getCreatedAt() != null).toList();
        long newPropertiesThisMonth = countBetween(datedProperties, Property::getCreatedAt, startOfThisMonth, now);
        long newPropertiesLastMonth = countBetween(datedProperties, Property::getCreatedAt, startOfLastMonth, startOfThisMonth);

        // Tagesreihe der letzten 30 Tage, Lücken mit 0 gefüllt
        LocalDate startDay = LocalDate.now().minusDays(ValidationConstants.ACTIVITY_TRENDS_DAYS - 1L);
        LocalDateTime windowStart = startDay.atStartOfDay();

        Map<LocalDate, Long> callsByDay = datedNotes.stream()
                .filter(n -> !n.getCallDate().isBefore(windowStart))
                .collect(Collectors.groupingBy(n -> n.getCallDate().toLocalDate(), Collectors.counting()));
        Map<LocalDate, Long> dealsByDay = closedNotes.stream()
                .filter(n -> !n.getCallDate().isBefore(windowStart))
                .collect(Collectors.groupingBy(n -> n.getCallDate().toLocalDate(), Collectors.counting()));
        Map<LocalDate, Long> newClientsByDay = datedClients.stream()
                .filter(c -> !c.getCreatedAt().isBefore(windowStart) && !c.getCreatedAt().isAfter(now))
                .collect(Collectors.groupingBy(c -> c.getCreatedAt().toLocalDate(), Collectors.counting()));

        List<DailyActivityDto> dailyActivity = new ArrayList<>();
        for (int i = 0; i < ValidationConstants.ACTIVITY_TRENDS_DAYS; i++) {
            LocalDate day = startDay.plusDays(i);
            dailyActivity.add(DailyActivityDto.builder()
                    .date(day.atStartOfDay())
                    .callNotes(callsByDay.getOrDefault(day, 0L))
                    .newClients(newClientsByDay.getOrDefault(day, 0L))
                    .dealsClosed(dealsByDay.getOrDefault(day, 0L))
                    .build());
        }

        return ActivityTrendsDto.builder()
                .callNotesThisMonth(callNotesThisMonth)
                .callNotesLastMonth(callNotesLastMonth)
                .callNotesGrowthPercent(callNotesGrowth)
                .newClientsThisMonth(newClientsThisMonth)
                .newClientsLastMonth(newClientsLastMonth)
                .dealsClosedThisMonth(dealsClosedThisMonth)
                .dealsClosedLastMonth(dealsClosedLastMonth)
                .newPropertiesThisMonth(newPropertiesThisMonth)
                .newPropertiesLastMonth(newPropertiesLastMonth)
                .last30DaysActivity(dailyActivity)
                .build();
    }

    private <T> long countBetween(List<T> items,
                                  java.util.function.Function<T, LocalDateTime> timestamp,
                                  LocalDateTime fromInclusive,
                                  LocalDateTime toExclusive) {
        return items.stream()
                .map(timestamp)
                .filter(t -> !t.isBefore(fromInclusive) && t.isBefore(toExclusive))
                .count();
    }
}
