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
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
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
    private final GoogleTokenVerifier googleTokenVerifier;

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
     * Authenticate via a Google ID token, provisioning or linking the account as needed.
     */
    @Transactional
    public AuthResponse loginWithGoogle(String idToken) {
        GoogleTokenVerifier.GoogleUserInfo googleUser = googleTokenVerifier.verify(idToken);

        Agent agent = agentRepository.findByGoogleSub(googleUser.sub())
                .or(() -> linkExistingAccount(googleUser))
                .orElseGet(() -> provisionAccount(googleUser));

        if (!agent.isActive()) {
            log.warn("Google sign-in rejected for inactive account: {}", agent.getEmail());
            throw new BadCredentialsException("Google sign-in failed");
        }

        List<String> authorities = List.of("ROLE_AGENT");
        String jwt = jwtUtil.generateToken(agent.getEmail(), authorities);

        log.info("User {} authenticated via Google", agent.getEmail());

        return AuthResponse.builder()
                .accessToken(jwt)
                .tokenType("Bearer")
                .expiresIn(86400) // 24 hours
                .agent(agent)
                .build();
    }

    /**
     * Attach the Google identity to a pre-existing password account with the same email,
     * so the agent can subsequently use either sign-in method.
     */
    private Optional<Agent> linkExistingAccount(GoogleTokenVerifier.GoogleUserInfo googleUser) {
        return agentRepository.findByEmail(googleUser.email())
                .map(existing -> {
                    existing.setGoogleSub(googleUser.sub());
                    log.info("Linked Google identity to existing account: {}", existing.getEmail());
                    return agentRepository.save(existing);
                });
    }

    /**
     * TODO Phase 5: registration will hang off organization/plan onboarding — auto-provisioning
     * has to move into that flow rather than silently creating an agent here.
     */
    private Agent provisionAccount(GoogleTokenVerifier.GoogleUserInfo googleUser) {
        Agent agent = Agent.builder()
                .email(googleUser.email())
                .firstName(resolveFirstName(googleUser))
                .lastName(resolveLastName(googleUser))
                .googleSub(googleUser.sub())
                .passwordHash(null)
                .isActive(true)
                .build();

        log.info("Provisioned new account from Google sign-in: {}", googleUser.email());

        return agentRepository.save(agent);
    }

    // Only sub and email are guaranteed in a Google ID token — given_name/family_name are
    // absent for some account types, so both fall back to the email local part rather than
    // inventing a name. firstName/lastName are NOT NULL with a 2-char minimum.
    private String resolveFirstName(GoogleTokenVerifier.GoogleUserInfo googleUser) {
        if (isPresent(googleUser.firstName())) {
            return googleUser.firstName();
        }
        if (isPresent(googleUser.fullName())) {
            return googleUser.fullName().trim().split("\\s+")[0];
        }
        return emailLocalPart(googleUser.email());
    }

    private String resolveLastName(GoogleTokenVerifier.GoogleUserInfo googleUser) {
        if (isPresent(googleUser.lastName())) {
            return googleUser.lastName();
        }
        if (isPresent(googleUser.fullName())) {
            String[] parts = googleUser.fullName().trim().split("\\s+", 2);
            if (parts.length == 2) {
                return parts[1];
            }
        }
        return emailLocalPart(googleUser.email());
    }

    private String emailLocalPart(String email) {
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0, at) : email;
    }

    private boolean isPresent(String value) {
        return value != null && !value.isBlank();
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