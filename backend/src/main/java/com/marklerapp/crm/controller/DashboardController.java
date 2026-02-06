package com.marklerapp.crm.controller;

import com.marklerapp.crm.dto.DashboardAnalyticsDto;
import com.marklerapp.crm.service.DashboardAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * REST controller for dashboard analytics.
 * Provides comprehensive insights for real estate managers.
 *
 * @author Claude Sonnet 4.5
 * @since Dashboard Analytics Feature
 */
@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Dashboard", description = "Dashboard analytics and insights")
public class DashboardController extends BaseController {

    private final DashboardAnalyticsService dashboardAnalyticsService;

    /**
     * Get comprehensive dashboard analytics.
     * Includes conversion funnel, pipeline health, property portfolio,
     * activity trends, and AI-powered insights.
     *
     * @param authentication Spring Security authentication
     * @return Dashboard analytics DTO with all metrics
     */
    @GetMapping("/analytics")
    @Operation(summary = "Get dashboard analytics", description = "Retrieve comprehensive analytics for the authenticated agent")
    public ResponseEntity<DashboardAnalyticsDto> getDashboardAnalytics(Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        log.info("Fetching dashboard analytics for agent: {}", agentId);

        DashboardAnalyticsDto analytics = dashboardAnalyticsService.generateAnalytics(agentId);

        return ResponseEntity.ok(analytics);
    }
}
