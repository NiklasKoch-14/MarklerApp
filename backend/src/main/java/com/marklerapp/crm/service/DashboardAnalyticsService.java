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

        // Fetch the Agent entity
        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new IllegalArgumentException("Agent not found: " + agentId));

        return DashboardAnalyticsDto.builder()
                .conversionFunnel(calculateConversionFunnel(agent))
                .pipelineHealth(calculatePipelineHealth(agent))
                .propertyPortfolio(calculatePropertyPortfolio(agent))
                .activityTrends(calculateActivityTrends(agent))
                .clientsNeedingAttention(identifyClientsNeedingAttention(agent))
                .suggestedActions(generateSuggestedActions(agent))
                .build();
    }

    // ========================================
    // Conversion Funnel Calculation
    // ========================================

    private ConversionFunnelDto calculateConversionFunnel(Agent agent) {
        List<Client> allClients = clientRepository.findByAgent(agent);
        long totalClients = allClients.size();

        // Get all call notes to analyze outcomes
        List<CallNote> allCallNotes = callNoteRepository.findByAgentOrderByCallDateDesc(agent, Pageable.unpaged()).getContent();

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
                .interestedRate(Math.round(interestedRate * ValidationConstants.PERCENTAGE_ROUNDING_PRECISION) / ValidationConstants.PERCENTAGE_ROUNDING_PRECISION)
                .viewingRate(Math.round(viewingRate * ValidationConstants.PERCENTAGE_ROUNDING_PRECISION) / ValidationConstants.PERCENTAGE_ROUNDING_PRECISION)
                .offerRate(Math.round(offerRate * ValidationConstants.PERCENTAGE_ROUNDING_PRECISION) / ValidationConstants.PERCENTAGE_ROUNDING_PRECISION)
                .closingRate(Math.round(closingRate * ValidationConstants.PERCENTAGE_ROUNDING_PRECISION) / ValidationConstants.PERCENTAGE_ROUNDING_PRECISION)
                .overallConversionRate(Math.round(overallConversionRate * ValidationConstants.PERCENTAGE_ROUNDING_PRECISION) / ValidationConstants.PERCENTAGE_ROUNDING_PRECISION)
                .build();
    }

    // ========================================
    // Pipeline Health Calculation
    // ========================================

    private PipelineHealthDto calculatePipelineHealth(Agent agent) {
        List<CallNote> allCallNotes = callNoteRepository.findByAgentOrderByCallDateDesc(agent, Pageable.unpaged()).getContent();

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
        LocalDate today = LocalDate.now();
        LocalDateTime oneWeekFromNow = now.plusWeeks(1);
        LocalDateTime twoWeeksFromNow = now.plusWeeks(2);

        // Get all overdue follow-ups for this agent
        List<CallNote> allOverdue = callNoteRepository.findOverdueFollowUps(today);
        long overdueFollowUps = allOverdue.stream()
                .filter(note -> note.getAgent().getId().equals(agent.getId()))
                .count();

        // Get all follow-ups requiring action and filter by agent and date ranges
        List<CallNote> allFollowUps = callNoteRepository.findCallNotesRequiringFollowUp();
        long followUpsDueThisWeek = allFollowUps.stream()
                .filter(note -> note.getAgent().getId().equals(agent.getId()))
                .filter(note -> note.getFollowUpDate() != null)
                .filter(note -> !note.getFollowUpDate().isBefore(today) && note.getFollowUpDate().isBefore(today.plusWeeks(1)))
                .count();
        long followUpsDueNextWeek = allFollowUps.stream()
                .filter(note -> note.getAgent().getId().equals(agent.getId()))
                .filter(note -> note.getFollowUpDate() != null)
                .filter(note -> !note.getFollowUpDate().isBefore(today.plusWeeks(1)) && note.getFollowUpDate().isBefore(today.plusWeeks(2)))
                .count();

        // Clients without recent contact (30+ days)
        LocalDateTime thirtyDaysAgo = now.minusDays(ValidationConstants.DAYS_WITHOUT_CONTACT_THRESHOLD);
        List<Client> allClients = clientRepository.findByAgent(agent);
        long clientsWithoutRecentContact = allClients.stream()
                .filter(client -> {
                    List<CallNote> clientNotes = callNoteRepository.findByClientOrderByCallDateDesc(client, Pageable.unpaged()).getContent();
                    return clientNotes.isEmpty() || clientNotes.get(0).getCallDate().isBefore(thirtyDaysAgo);
                })
                .count();

        // Average days since last contact
        int totalDays = 0;
        int clientCount = 0;
        for (Client client : allClients) {
            List<CallNote> clientNotes = callNoteRepository.findByClientOrderByCallDateDesc(client, Pageable.unpaged()).getContent();
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

    private PropertyPortfolioDto calculatePropertyPortfolio(Agent agent) {
        List<Property> allProperties = propertyRepository.findByAgent(agent, Pageable.unpaged()).getContent();

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

    private ActivityTrendsDto calculateActivityTrends(Agent agent) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfThisMonth = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0);
        LocalDateTime startOfLastMonth = startOfThisMonth.minusMonths(1);

        // Call notes this month vs last month
        List<CallNote> thisMonthNotes = callNoteRepository.findRecentCallNotesByAgent(agent, startOfThisMonth);
        long callNotesThisMonth = thisMonthNotes.stream()
                .filter(n -> n.getCallDate().isBefore(now))
                .count();

        List<CallNote> lastMonthNotes = callNoteRepository.findRecentCallNotesByAgent(agent, startOfLastMonth);
        long callNotesLastMonth = lastMonthNotes.stream()
                .filter(n -> n.getCallDate().isBefore(startOfThisMonth))
                .count();

        int callNotesGrowth = callNotesLastMonth > 0 ?
                (int) (((callNotesThisMonth - callNotesLastMonth) * 100.0) / callNotesLastMonth) : 0;

        // New clients this month vs last month
        List<Client> recentClients = clientRepository.findRecentClientsByAgent(agent, startOfLastMonth);
        long newClientsThisMonth = recentClients.stream()
                .filter(c -> c.getCreatedAt().isAfter(startOfThisMonth) && c.getCreatedAt().isBefore(now))
                .count();
        long newClientsLastMonth = recentClients.stream()
                .filter(c -> c.getCreatedAt().isAfter(startOfLastMonth) && c.getCreatedAt().isBefore(startOfThisMonth))
                .count();

        // Deals closed this month vs last month
        long dealsClosedThisMonth = thisMonthNotes.stream()
                .filter(n -> n.getOutcome() == CallOutcome.DEAL_CLOSED)
                .filter(n -> n.getCallDate().isBefore(now))
                .count();

        long dealsClosedLastMonth = lastMonthNotes.stream()
                .filter(n -> n.getOutcome() == CallOutcome.DEAL_CLOSED)
                .filter(n -> n.getCallDate().isBefore(startOfThisMonth))
                .count();

        // New properties this month vs last month
        List<Property> recentProperties = propertyRepository.findRecentPropertiesByAgent(agent, startOfLastMonth);
        long newPropertiesThisMonth = recentProperties.stream()
                .filter(p -> p.getCreatedAt().isAfter(startOfThisMonth) && p.getCreatedAt().isBefore(now))
                .count();
        long newPropertiesLastMonth = recentProperties.stream()
                .filter(p -> p.getCreatedAt().isAfter(startOfLastMonth) && p.getCreatedAt().isBefore(startOfThisMonth))
                .count();

        // Last 30 days daily activity (for charts)
        LocalDateTime thirtyDaysAgo = now.minusDays(ValidationConstants.ACTIVITY_TRENDS_DAYS);
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

    private List<ClientInsightDto> identifyClientsNeedingAttention(Agent agent) {
        List<ClientInsightDto> insights = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        LocalDate today = LocalDate.now();

        // 1. Clients with overdue follow-ups (HIGHEST PRIORITY)
        List<CallNote> allOverdue = callNoteRepository.findOverdueFollowUps(today);
        List<CallNote> overdueNotes = allOverdue.stream()
                .filter(note -> note.getAgent().getId().equals(agent.getId()))
                .toList();
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
        List<Client> allClients = clientRepository.findByAgent(agent);
        LocalDateTime sevenDaysAgo = now.minusDays(ValidationConstants.HOT_LEAD_DAYS_THRESHOLD);

        for (Client client : allClients) {
            List<CallNote> clientNotes = callNoteRepository.findByClientOrderByCallDateDesc(client, Pageable.unpaged()).getContent();
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

        // Limit to top N most urgent
        return insights.stream()
                .sorted((a, b) -> {
                    int urgencyCompare = b.getUrgency().compareTo(a.getUrgency());
                    if (urgencyCompare != 0) return urgencyCompare;
                    return b.getDaysSinceContact().compareTo(a.getDaysSinceContact());
                })
                .limit(ValidationConstants.MAX_URGENT_CLIENT_INSIGHTS)
                .collect(Collectors.toList());
    }

    private List<String> generateSuggestedActions(Agent agent) {
        List<String> actions = new ArrayList<>();

        // Check pipeline health
        PipelineHealthDto health = calculatePipelineHealth(agent);

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
        PropertyPortfolioDto portfolio = calculatePropertyPortfolio(agent);
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
                actions.stream().limit(ValidationConstants.MAX_SUGGESTED_ACTIONS).collect(Collectors.toList());
    }
}
