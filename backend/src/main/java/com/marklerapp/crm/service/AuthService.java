package com.marklerapp.crm.service;

import com.marklerapp.crm.dto.AuthRequest;
import com.marklerapp.crm.dto.AuthResponse;
import com.marklerapp.crm.dto.RegisterRequest;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.security.CustomUserDetails;
import com.marklerapp.crm.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for handling authentication operations including login and registration.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final AgentRepository agentRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    /**
     * Authenticate user and generate JWT token
     */
    @Transactional(readOnly = true)
    public AuthResponse login(AuthRequest authRequest) {
        log.debug("Attempting to authenticate user: {}", authRequest.getEmail());

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        authRequest.getEmail(),
                        authRequest.getPassword()
                )
        );

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        Agent agent = userDetails.getAgent();

        List<String> authorities = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toList());

        String jwt = jwtUtil.generateToken(agent.getEmail(), authorities);

        log.info("User {} authenticated successfully", authRequest.getEmail());

        return AuthResponse.builder()
                .accessToken(jwt)
                .tokenType("Bearer")
                .expiresIn(86400) // 24 hours
                .agent(agent)
                .build();
    }

    /**
     * Register a new agent account
     */
    @Transactional
    public AuthResponse register(RegisterRequest registerRequest) {
        log.debug("Attempting to register new user: {}", registerRequest.getEmail());

        // Check if user already exists
        if (agentRepository.existsByEmail(registerRequest.getEmail())) {
            throw new IllegalArgumentException("Email is already in use");
        }

        // Create new agent
        Agent agent = Agent.builder()
                .email(registerRequest.getEmail())
                .firstName(registerRequest.getFirstName())
                .lastName(registerRequest.getLastName())
                .phone(registerRequest.getPhone())
                .languagePreference(registerRequest.getLanguagePreference())
                .passwordHash(passwordEncoder.encode(registerRequest.getPassword()))
                .isActive(true)
                .build();

        Agent savedAgent = agentRepository.save(agent);

        // Generate JWT token
        List<String> authorities = List.of("ROLE_AGENT");
        String jwt = jwtUtil.generateToken(savedAgent.getEmail(), authorities);

        log.info("New user {} registered successfully", registerRequest.getEmail());

        return AuthResponse.builder()
                .accessToken(jwt)
                .tokenType("Bearer")
                .expiresIn(86400) // 24 hours
                .agent(savedAgent)
                .build();
    }

    /**
     * Refresh JWT token
     */
    @Transactional(readOnly = true)
    public AuthResponse refreshToken(String email) {
        log.debug("Refreshing token for user: {}", email);

        Agent agent = agentRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!agent.isActive()) {
            throw new IllegalArgumentException("User account is inactive");
        }

        List<String> authorities = List.of("ROLE_AGENT");
        String jwt = jwtUtil.generateToken(agent.getEmail(), authorities);

        log.info("Token refreshed for user: {}", email);

        return AuthResponse.builder()
                .accessToken(jwt)
                .tokenType("Bearer")
                .expiresIn(86400) // 24 hours
                .agent(agent)
                .build();
    }

    /**
     * Validate if email is available for registration
     */
    @Transactional(readOnly = true)
    public boolean isEmailAvailable(String email) {
        return !agentRepository.existsByEmail(email);
    }
}