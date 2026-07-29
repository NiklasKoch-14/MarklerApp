package com.marklerapp.crm.controller;

import com.marklerapp.crm.dto.SearchResultDto;
import com.marklerapp.crm.service.SearchService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Global search across clients, properties and call notes — backs the command palette.
 * Scoped to the authenticated agent; no request parameter can widen that scope.
 */
@RestController
@RequestMapping("/search")
@RequiredArgsConstructor
@Tag(name = "Search", description = "Global search across clients, properties and call notes")
public class SearchController extends BaseController {

    private final SearchService searchService;

    @GetMapping
    @Operation(summary = "Global search",
            description = "Returns matching clients, properties and call notes of the authenticated agent, grouped by type and capped per group")
    public ResponseEntity<SearchResultDto> search(
            Authentication authentication,
            @Parameter(description = "Search term") @RequestParam(name = "q", required = false, defaultValue = "") String query) {

        UUID agentId = getAgentIdFromAuth(authentication);
        return ResponseEntity.ok(searchService.search(agentId, query));
    }
}
