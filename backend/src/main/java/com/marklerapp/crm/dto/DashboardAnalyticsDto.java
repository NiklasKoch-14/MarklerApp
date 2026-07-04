package com.marklerapp.crm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Dashboard analytics DTO providing comprehensive insights for real estate managers.
 * Focuses on actionable metrics that drive business decisions.
 *
 * @author Claude Sonnet 4.5
 * @since Dashboard Analytics Feature
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardAnalyticsDto {

    // ========================================
    // Conversion Funnel (Most Important!)
    // ========================================

    private ConversionFunnelDto conversionFunnel;

    // ========================================
    // Pipeline Health
    // ========================================

    private PipelineHealthDto pipelineHealth;

    // ========================================
    // Property Portfolio
    // ========================================

    private PropertyPortfolioDto propertyPortfolio;

    // ========================================
    // Activity Trends
    // ========================================

    private ActivityTrendsDto activityTrends;

    // ========================================
    // Revenue / Commission (was Thomas wirklich sehen will)
    // ========================================

    private RevenueDto revenue;

    // ========================================
    // AI-Powered Insights
    // ========================================

    private List<ClientInsightDto> clientsNeedingAttention;
    private List<String> suggestedActions;

    // ========================================
    // Nested DTOs
    // ========================================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConversionFunnelDto {
        private Long totalClients;
        private Long interestedClients;
        private Long scheduledViewings;
        private Long offersMade;
        private Long dealsClosed;

        // Conversion rates (%)
        private Double interestedRate;
        private Double viewingRate;
        private Double offerRate;
        private Double closingRate;
        private Double overallConversionRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PipelineHealthDto {
        private Map<String, Long> clientsByOutcome; // INTERESTED: 12, SCHEDULED_VIEWING: 5, etc.
        private Long overdueFollowUps; // 🚨 Urgent!
        private Long followUpsDueThisWeek; // ⏰ Action needed
        private Long followUpsDueNextWeek;
        private Long clientsWithoutRecentContact; // No contact in 30+ days
        private Integer averageDaysSinceLastContact;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PropertyPortfolioDto {
        private Long totalProperties;
        private Map<String, Long> propertiesByStatus; // AVAILABLE: 15, SOLD: 3, etc.
        private Map<String, Long> propertiesByType; // APARTMENT: 10, HOUSE: 5, etc.
        private Integer averageDaysOnMarket;
        private Long propertiesWithImages;
        private Long propertiesWithExpose;
        private BigDecimal totalPortfolioValue;
        private List<PropertyOnMarketDto> longestOnMarket; // Objekte die am längsten hängen — Preisdruck-Gespräch
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PropertyOnMarketDto {
        private String propertyId;
        private String title;
        private String city;
        private Integer daysOnMarket;
        private BigDecimal price;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevenueDto {
        private BigDecimal realizedCommissionYtd;   // Provision aus verkauften/vermieteten Objekten (dieses Jahr)
        private BigDecimal pipelineCommission;      // Provision die noch im Bestand steckt (verfügbar/reserviert)
        private Long dealsClosedYtd;                // Anzahl abgeschlossener Objekte dieses Jahr
        private BigDecimal avgCommissionPerDeal;    // Durchschnittliche Provision je Abschluss (dieses Jahr)
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ActivityTrendsDto {
        private Long callNotesThisMonth;
        private Long callNotesLastMonth;
        private Integer callNotesGrowthPercent;

        private Long newClientsThisMonth;
        private Long newClientsLastMonth;

        private Long dealsClosedThisMonth;
        private Long dealsClosedLastMonth;

        private Long newPropertiesThisMonth;
        private Long newPropertiesLastMonth;

        private List<DailyActivityDto> last30DaysActivity; // For charts
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyActivityDto {
        private LocalDateTime date;
        private Long callNotes;
        private Long newClients;
        private Long dealsClosed;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClientInsightDto {
        private String clientId;
        private String clientName;
        private String urgency; // HIGH, MEDIUM, LOW
        private String reason; // "Overdue follow-up", "No recent contact", "Hot lead"
        private String aiSummary; // AI-generated quick insight
        private LocalDateTime lastContactDate;
        private Integer daysSinceContact;
        private String recommendedAction;
    }
}
