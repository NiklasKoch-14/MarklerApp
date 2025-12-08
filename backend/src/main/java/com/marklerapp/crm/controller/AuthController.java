package com.marklerapp.crm.controller;

import com.marklerapp.crm.dto.AuthRequest;
import com.marklerapp.crm.dto.AuthResponse;
import com.marklerapp.crm.dto.RegisterRequest;
import com.marklerapp.crm.security.CustomUserDetails;
import com.marklerapp.crm.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for authentication operations.
 */
@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "APIs for user authentication and registration")
public class AuthController {

    private final AuthService authService;

    /**
     * User login
     */
    @PostMapping("/login")
    @Operation(summary = "User login", description = "Authenticate user and return JWT token")
    public ResponseEntity<AuthResponse> login(
            @Parameter(description = "Login credentials") @Valid @RequestBody AuthRequest authRequest) {

        log.info("Login attempt for email: {}", authRequest.getEmail());

        AuthResponse response = authService.login(authRequest);

        return ResponseEntity.ok(response);
    }

    /**
     * User registration
     */
    @PostMapping("/register")
    @Operation(summary = "User registration", description = "Register a new user account")
    public ResponseEntity<AuthResponse> register(
            @Parameter(description = "Registration data") @Valid @RequestBody RegisterRequest registerRequest) {

        log.info("Registration attempt for email: {}", registerRequest.getEmail());

        AuthResponse response = authService.register(registerRequest);

        return ResponseEntity.ok(response);
    }

    /**
     * Refresh JWT token
     */
    @PostMapping("/refresh")
    @Operation(summary = "Refresh token", description = "Refresh the JWT token for authenticated user")
    public ResponseEntity<AuthResponse> refreshToken(Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        String email = userDetails.getUsername();

        log.debug("Token refresh request for user: {}", email);

        AuthResponse response = authService.refreshToken(email);

        return ResponseEntity.ok(response);
    }

    /**
     * Check email availability
     */
    @GetMapping("/check-email")
    @Operation(summary = "Check email availability", description = "Check if email is available for registration")
    public ResponseEntity<Map<String, Boolean>> checkEmail(
            @Parameter(description = "Email to check") @RequestParam String email) {

        log.debug("Checking email availability: {}", email);

        boolean available = authService.isEmailAvailable(email);

        return ResponseEntity.ok(Map.of("available", available));
    }

    /**
     * Validate current token
     */
    @GetMapping("/validate")
    @Operation(summary = "Validate token", description = "Validate if the current JWT token is valid")
    public ResponseEntity<Map<String, Object>> validateToken(Authentication authentication) {

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();

        Map<String, Object> response = Map.of(
                "valid", true,
                "username", userDetails.getUsername(),
                "agent", userDetails.getAgent()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * User logout (client-side token removal)
     */
    @PostMapping("/logout")
    @Operation(summary = "User logout", description = "Logout user (client should remove token)")
    public ResponseEntity<Map<String, String>> logout() {

        log.debug("Logout request received");

        Map<String, String> response = Map.of(
                "message", "Logged out successfully. Please remove the token from client storage."
        );

        return ResponseEntity.ok(response);
    }
}