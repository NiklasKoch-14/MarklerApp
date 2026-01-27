package com.marklerapp.crm.controller;

import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.security.CustomUserDetails;
import org.springframework.security.core.Authentication;

import java.util.UUID;

/**
 * Base controller providing common functionality for all REST controllers.
 * Reduces code duplication by centralizing authentication-related helper methods.
 *
 * @author Claude Sonnet 4.5
 * @since Phase 7.1 - Code Quality Improvements
 */
public abstract class BaseController {

    /**
     * Extracts the authenticated agent's ID from the Spring Security authentication principal.
     *
     * @param authentication Spring Security authentication object containing user details
     * @return UUID of the authenticated agent
     * @throws ClassCastException if the principal is not an instance of CustomUserDetails
     */
    protected UUID getAgentIdFromAuth(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return userDetails.getAgent().getId();
    }

    /**
     * Extracts the full Agent entity from the Spring Security authentication principal.
     * Useful when you need access to more than just the agent's ID.
     *
     * @param authentication Spring Security authentication object containing user details
     * @return Agent entity of the authenticated user
     * @throws ClassCastException if the principal is not an instance of CustomUserDetails
     */
    protected Agent getAgentFromAuth(Authentication authentication) {
        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        return userDetails.getAgent();
    }
}
