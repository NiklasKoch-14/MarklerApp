package com.marklerapp.crm.controller;

import com.marklerapp.crm.dto.CalendarSubscriptionDto;
import com.marklerapp.crm.service.CalendarFeedService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * ICS-Kalenderfeed der Besichtigungen (Issue #34).
 *
 * <p>Der Feed-Endpoint ist in der {@code SecurityConfig} von der JWT-Pflicht
 * ausgenommen ({@code /calendar/*.ics}) -- Kalender-Clients koennen keinen
 * Authorization-Header setzen, der Token in der URL ist die Authentifizierung.
 * Die Verwaltung des Tokens laeuft ueber die authentifizierten Endpoints
 * unter {@code /calendar/subscription}.</p>
 */
@Slf4j
@RestController
@RequestMapping("/calendar")
@RequiredArgsConstructor
@Tag(name = "Calendar Feed", description = "Read-only iCalendar feed of viewings")
public class CalendarFeedController extends BaseController {

    private final CalendarFeedService calendarFeedService;

    /**
     * Der oeffentliche Feed. Ohne JWT erreichbar; der Pfad-Token authentifiziert.
     */
    @GetMapping(value = "/{token}.ics", produces = "text/calendar;charset=UTF-8")
    @Operation(summary = "iCalendar feed of viewings",
               description = "Public, read-only. The path token authenticates — calendar clients "
                           + "cannot send an Authorization header. Rotating the token revokes the link.")
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "iCalendar document"),
        @ApiResponse(responseCode = "404", description = "Unknown or revoked token")
    })
    public ResponseEntity<byte[]> getFeed(
            @Parameter(description = "Calendar feed token") @PathVariable String token) {

        String ics = calendarFeedService.generateFeed(token);
        byte[] body = ics.getBytes(StandardCharsets.UTF_8);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/calendar;charset=UTF-8"));
        headers.set(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"besichtigungen.ics\"");
        // Kalender-Clients pollen im Minutentakt; ohne no-cache liefern Proxies alte Termine.
        headers.setCacheControl("no-cache, no-store, must-revalidate");
        return new ResponseEntity<>(body, headers, org.springframework.http.HttpStatus.OK);
    }

    /**
     * Abo-Daten des angemeldeten Maklers. Erzeugt den Token beim ersten Aufruf.
     */
    @GetMapping("/subscription")
    @Operation(summary = "Get the current agent's calendar subscription",
               description = "Returns the feed token, creating it on first call.")
    public ResponseEntity<CalendarSubscriptionDto> getSubscription(Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        String token = calendarFeedService.getOrCreateFeedToken(agentId);
        return ResponseEntity.ok(build(token));
    }

    /**
     * Neuen Token erzeugen. Der alte Link liefert danach 404 -- das ist der Widerruf.
     */
    @PostMapping("/subscription/rotate")
    @Operation(summary = "Issue a new feed token",
               description = "Invalidates the previous link. Use when a shared link should stop working.")
    public ResponseEntity<CalendarSubscriptionDto> rotate(Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        String token = calendarFeedService.rotateFeedToken(agentId);
        return ResponseEntity.ok(build(token));
    }

    /**
     * Nur der relative Pfad. Die absolute URL setzt das Frontend aus seiner
     * API-Basis zusammen -- der Server kennt hinter Railways Proxy seine
     * oeffentliche Adresse nicht zuverlaessig.
     */
    private CalendarSubscriptionDto build(String token) {
        return CalendarSubscriptionDto.builder()
                .token(token)
                .feedPath("/calendar/" + token + ".ics")
                .build();
    }
}
