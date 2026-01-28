package com.marklerapp.crm.service;

import com.marklerapp.crm.dto.DashboardAnalyticsDto;
import com.marklerapp.crm.dto.DashboardAnalyticsDto.*;
import com.marklerapp.crm.entity.CallNote;
import com.marklerapp.crm.entity.CallNote.CallOutcome;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.repository.CallNoteRepository;
import com.marklerapp.crm.repository.ClientRepository;
import com.marklerapp.crm.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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

    private final ClientRepository clientRepository;
    private final PropertyRepository propertyRepository;
    private final CallNoteRepository callNoteRepository;
    private final OllamaService ollamaService;

    /**
     * Generate complete dashboard analytics for an agent.
     *
     * @param agentId The agent's UUID
     * @return Comprehensive analytics DTO
     */
    @Transactional(readOnly = true)
    public DashboardAnalyticsDto generateAnalytics(UUID agentId) {
        log.info("Generating dashboard analytics for agent: {}", agentId);

        return DashboardAnalyticsDto.builder()
                .conversionFunnel(calculateConversionFunnel(agentId))
                .pipelineHealth(calculatePipelineHealth(agentId))
                .propertyPortfolio(calculatePropertyPortfolio(agentId))
                .activityTrends(calculateActivityTrends(agentId))
                .clientsNeedingAttention(identifyClientsNeedingAttention(agentId))
                .suggestedActions(generateSuggestedActions(agentId))
                .build();
    }

    // ========================================
    // Conversion Funnel Calculation
    // ========================================

    private ConversionFunnelDto calculateConversionFunnel(UUID agentId) {
        List<Client> allClients = clientRepository.findByAgent(agentId);
        long totalClients = allClients.size();

        // Get all call notes to analyze outcomes
        List<CallNote> allCallNotes = callNoteRepository.findByAgentOrderByCallDateDesc(agentId);

        // Count unique clients by their latest outcome
        Map<UUID, CallOutcome> latestOutcomeByClient = new HashMap<>();
        for (CallNote note : allCallNotes) {
            if (note.getOutcome() != null && !latestOutcomeByClient.containsKey(note.getClient().getId())) {
                latestOutcomeByClient.put(note.getClient().getId(), note.getOutcome());
            }
        }

        long interested = latestOutcomeByClient.values().stream()
                .filter(o -> o == CallOutcome.INTERESTED)
                .count();

        long scheduledViewings = latestOutcomeByClient.values().stream()
                .filter(o -> o == CallOutcome.SCHEDULED_VIEWING)
                .count();

        long offersMade = latestOutcomeByClient.values().stream()
                .filter(o -> o == CallOutcome.OFFER_MADE)
                .count();

        long dealsClosed = latestOutcomeByClient.values().stream()
                .filter(o -> o == CallOutcome.DEAL_CLOSED)
                .count();

        // Calculate conversion rates
        double interestedRate = totalClients > 0 ? (interested * 100.0 / totalClients) : 0.0;
        double viewingRate = interested > 0 ? (scheduledViewings * 100.0 / interested) : 0.0;
        double offerRate = scheduledViewings > 0 ? (offersMade * 100.0 / scheduledViewings) : 0.0;
        double closingRate = offersMade > 0 ? (dealsClosed * 100.0 / offersMade) : 0.0;
        double overallConversionRate = totalClients > 0 ? (dealsClosed * 100.0 / totalClients) : 0.0;

        return ConversionFunnelDto.builder()
                .totalClients(totalClients)
                .interestedClients(interested)
                .scheduledViewings(scheduledViewings)
                .offersMade(offersMade)
                .dealsClosed(dealsClosed)
                .interestedRate(Math.round(interestedRate * 10) / 10.0)
                .viewingRate(Math.round(viewingRate * 10) / 10.0)
                .offerRate(Math.round(offerRate * 10) / 10.0)
                .closingRate(Math.round(closingRate * 10) / 10.0)
                .overallConversionRate(Math.round(overallConversionRate * 10) / 10.0)
                .build();
    }

    // ========================================
    // Pipeline Health Calculation
    // ========================================

    private PipelineHealthDto calculatePipelineHealth(UUID agentId) {
        List<CallNote> allCallNotes = callNoteRepository.findByAgentOrderByCallDateDesc(agentId);

        // Latest outcome per client
        Map<UUID, CallOutcome> latestOutcomeByClient = new HashMap<>();
        for (CallNote note : allCallNotes) {
            if (note.getOutcome() != null && !latestOutcomeByClient.containsKey(note.getClient().getId())) {
                latestOutcomeByClient.put(note.getClient().getId(), note.getOutcome());
            }
        }

        // Count by outcome
        Map<String, Long> clientsByOutcome = latestOutcomeByClient.values().stream()
                .collect(Collectors.groupingBy(Enum::name, Collectors.counting()));

        // Follow-ups
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oneWeekFromNow = now.plusWeeks(1);
        LocalDateTime twoWeeksFromNow = now.plusWeeks(2);

        long overdueFollowUps = callNoteRepository.findOverdueFollowUps(agentId).size();
        long followUpsDueThisWeek = callNoteRepository.findCallNotesRequiringFollowUp(agentId, now, oneWeekFromNow).size();
        long followUpsDueNextWeek = callNoteRepository.findCallNotesRequiringFollowUp(agentId, oneWeekFromNow, twoWeeksFromNow).size();

        // Clients without recent contact (30+ days)
        LocalDateTime thirtyDaysAgo = now.minusDays(30);
        List<Client> allClients = clientRepository.findByAgent(agentId);
        long clientsWithoutRecentContact = allClients.stream()
                .filter(client -> {
                    List<CallNote> clientNotes = callNoteRepository.findByClientOrderByCallDateDesc(client.getId(), null).getContent();
                    return clientNotes.isEmpty() || clientNotes.get(0).getCallDate().isBefore(thirtyDaysAgo);
                })
                .count();

        // Average days since last contact
        int totalDays = 0;
        int clientCount = 0;
        for (Client client : allClients) {
            List<CallNote> clientNotes = callNoteRepository.findByClientOrderByCallDateDesc(client.getId(), null).getContent();
            if (!clientNotes.isEmpty()) {
                long daysSince = ChronoUnit.DAYS.between(clientNotes.get(0).getCallDate(), now);
                totalDays += daysSince;
                clientCount++;
            }
        }
        int averageDays = clientCount > 0 ? totalDays / clientCount : 0;

        return PipelineHealthDto.builder()
                .clientsByOutcome(clientsByOutcome)
                .overdueFollowUps(overdueFollowUps)
                .followUpsDueThisWeek(followUpsDueThisWeek)
                .followUpsDueNextWeek(followUpsDueNextWeek)
                .clientsWithoutRecentContact(clientsWithoutRecentContact)
                .averageDaysSinceLastContact(averageDays)
                .build();
    }

    // ========================================
    // Property Portfolio Calculation
    // ========================================

    private PropertyPortfolioDto calculatePropertyPortfolio(UUID agentId) {
        List<Property> allProperties = propertyRepository.findByAgent(agentId, null).getContent();

        long totalProperties = allProperties.size();

        // Properties by status
        Map<String, Long> propertiesByStatus = allProperties.stream()
                .collect(Collectors.groupingBy(p -> p.getStatus().name(), Collectors.counting()));

        // Properties by type
        Map<String, Long> propertiesByType = allProperties.stream()
                .collect(Collectors.groupingBy(p -> p.getPropertyType().name(), Collectors.counting()));

        // Average days on market (for AVAILABLE properties)
        LocalDateTime now = LocalDateTime.now();
        List<Property> availableProperties = allProperties.stream()
                .filter(p -> p.getStatus() == PropertyStatus.AVAILABLE)
                .toList();

        int totalDaysOnMarket = 0;
        for (Property property : availableProperties) {
            long daysOnMarket = ChronoUnit.DAYS.between(property.getCreatedAt(), now);
            totalDaysOnMarket += daysOnMarket;
        }
        int averageDaysOnMarket = availableProperties.isEmpty() ? 0 : totalDaysOnMarket / availableProperties.size();

        // Properties with images and expose
        long propertiesWithImages = allProperties.stream()
                .filter(p -> p.getImages() != null && !p.getImages().isEmpty())
                .count();

        long propertiesWithExpose = allProperties.stream()
                .filter(p -> p.getExposeFileName() != null && !p.getExposeFileName().isEmpty())
                .count();

        // Total portfolio value
        BigDecimal totalValue = allProperties.stream()
                .filter(p -> p.getPrice() != null)
                .map(Property::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return PropertyPortfolioDto.builder()
                .totalProperties(totalProperties)
                .propertiesByStatus(propertiesByStatus)
                .propertiesByType(propertiesByType)
                .averageDaysOnMarket(averageDaysOnMarket)
                .propertiesWithImages(propertiesWithImages)
                .propertiesWithExpose(propertiesWithExpose)
                .totalPortfolioValue(totalValue)
                .build();
    }

    // ========================================
    // Activity Trends Calculation
    // ========================================

    private ActivityTrendsDto calculateActivityTrends(UUID agentId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfThisMonth = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime startOfLastMonth = startOfThisMonth.minusMonths(1);

        // Call notes this month vs last month
        long callNotesThisMonth = callNoteRepository.findRecentCallNotesByAgent(agentId, startOfThisMonth, now).size();
        long callNotesLastMonth = callNoteRepository.findRecentCallNotesByAgent(agentId, startOfLastMonth, startOfThisMonth).size();
        int callNotesGrowth = callNotesLastMonth > 0 ?
                (int) (((callNotesThisMonth - callNotesLastMonth) * 100.0) / callNotesLastMonth) : 0;

        // New clients this month vs last month
        long newClientsThisMonth = clientRepository.findRecentClientsByAgent(agentId, startOfThisMonth, now).size();
        long newClientsLastMonth = clientRepository.findRecentClientsByAgent(agentId, startOfLastMonth, startOfThisMonth).size();

        // Deals closed this month vs last month
        List<CallNote> thisMonthNotes = callNoteRepository.findRecentCallNotesByAgent(agentId, startOfThisMonth, now);
        long dealsClosedThisMonth = thisMonthNotes.stream()
                .filter(n -> n.getOutcome() == CallOutcome.DEAL_CLOSED)
                .count();

        List<CallNote> lastMonthNotes = callNoteRepository.findRecentCallNotesByAgent(agentId, startOfLastMonth, startOfThisMonth);
        long dealsClosedLastMonth = lastMonthNotes.stream()
                .filter(n -> n.getOutcome() == CallOutcome.DEAL_CLOSED)
                .count();

        // New properties this month vs last month
        long newPropertiesThisMonth = propertyRepository.findRecentPropertiesByAgent(agentId, startOfThisMonth, now).size();
        long newPropertiesLastMonth = propertyRepository.findRecentPropertiesByAgent(agentId, startOfLastMonth, startOfThisMonth).size();

        // Last 30 days daily activity (for charts)
        LocalDateTime thirtyDaysAgo = now.minusDays(30);
        List<DailyActivityDto> dailyActivity = new ArrayList<>();
        // Simplified - in production, group by day
        // For now, just return empty list to keep response fast
        // TODO: Implement daily grouping for charts

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

    // ========================================
    // AI-Powered Insights
    // ========================================

    private List<ClientInsightDto> identifyClientsNeedingAttention(UUID agentId) {
        List<ClientInsightDto> insights = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        // 1. Clients with overdue follow-ups (HIGHEST PRIORITY)
        List<CallNote> overdueNotes = callNoteRepository.findOverdueFollowUps(agentId);
        for (CallNote note : overdueNotes) {
            long daysSince = ChronoUnit.DAYS.between(note.getFollowUpDate(), now);
            insights.add(ClientInsightDto.builder()
                    .clientId(note.getClient().getId().toString())
                    .clientName(note.getClient().getFullName())
                    .urgency("HIGH")
                    .reason(String.format("Follow-up overdue by %d days", daysSince))
                    .lastContactDate(note.getCallDate())
                    .daysSinceContact((int) ChronoUnit.DAYS.between(note.getCallDate(), now))
                    .recommendedAction("Contact client immediately to reschedule follow-up")
                    .build());
        }

        // 2. Hot leads (INTERESTED clients not contacted in 7+ days)
        List<Client> allClients = clientRepository.findByAgent(agentId);
        LocalDateTime sevenDaysAgo = now.minusDays(7);

        for (Client client : allClients) {
            List<CallNote> clientNotes = callNoteRepository.findByClientOrderByCallDateDesc(client.getId(), null).getContent();
            if (!clientNotes.isEmpty()) {
                CallNote lastNote = clientNotes.get(0);
                if (lastNote.getOutcome() == CallOutcome.INTERESTED &&
                        lastNote.getCallDate().isBefore(sevenDaysAgo) &&
                        overdueNotes.stream().noneMatch(n -> n.getClient().getId().equals(client.getId()))) {

                    long daysSince = ChronoUnit.DAYS.between(lastNote.getCallDate(), now);
                    insights.add(ClientInsightDto.builder()
                            .clientId(client.getId().toString())
                            .clientName(client.getFullName())
                            .urgency("MEDIUM")
                            .reason(String.format("Interested client - no contact in %d days", daysSince))
                            .lastContactDate(lastNote.getCallDate())
                            .daysSinceContact((int) daysSince)
                            .recommendedAction("Send property matches or schedule viewing")
                            .build());
                }
            }
        }

        // Limit to top 10 most urgent
        return insights.stream()
                .sorted((a, b) -> {
                    int urgencyCompare = b.getUrgency().compareTo(a.getUrgency());
                    if (urgencyCompare != 0) return urgencyCompare;
                    return b.getDaysSinceContact().compareTo(a.getDaysSinceContact());
                })
                .limit(10)
                .collect(Collectors.toList());
    }

    private List<String> generateSuggestedActions(UUID agentId) {
        List<String> actions = new ArrayList<>();

        // Check pipeline health
        PipelineHealthDto health = calculatePipelineHealth(agentId);

        if (health.getOverdueFollowUps() > 0) {
            actions.add(String.format("🚨 Contact %d clients with overdue follow-ups", health.getOverdueFollowUps()));
        }

        if (health.getFollowUpsDueThisWeek() > 0) {
            actions.add(String.format("📅 Schedule %d follow-ups for this week", health.getFollowUpsDueThisWeek()));
        }

        if (health.getClientsWithoutRecentContact() > 3) {
            actions.add(String.format("📧 Re-engage %d clients without recent contact", health.getClientsWithoutRecentContact()));
        }

        // Check property portfolio
        PropertyPortfolioDto portfolio = calculatePropertyPortfolio(agentId);
        long propertiesWithoutImages = portfolio.getTotalProperties() - portfolio.getPropertiesWithImages();
        if (propertiesWithoutImages > 0) {
            actions.add(String.format("📸 Add images to %d properties", propertiesWithoutImages));
        }

        long propertiesWithoutExpose = portfolio.getTotalProperties() - portfolio.getPropertiesWithExpose();
        if (propertiesWithoutExpose > 0) {
            actions.add(String.format("📄 Upload exposés for %d properties", propertiesWithoutExpose));
        }

        return actions.isEmpty() ?
                List.of("✅ All caught up! Great work!") :
                actions.stream().limit(5).collect(Collectors.toList());
    }
}
