package com.marklerapp.crm.service;

import com.marklerapp.crm.dto.AuthResponse;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.service.GoogleTokenVerifier.GoogleUserInfo;
import com.marklerapp.crm.util.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Covers Google sign-in: account linking, auto-provisioning, and rejection paths.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceGoogleTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private AgentRepository agentRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private GoogleTokenVerifier googleTokenVerifier;

    @InjectMocks
    private AuthService authService;

    private static final String ID_TOKEN = "google-id-token";

    private GoogleUserInfo googleUser;

    @BeforeEach
    void setUp() {
        googleUser = new GoogleUserInfo("sub-123", "maria@example.com", "Maria", "Schmidt", "Maria Schmidt");
    }

    @Test
    void returnsTokenForKnownGoogleAccount() {
        Agent existing = agent("maria@example.com", "sub-123");
        when(googleTokenVerifier.verify(ID_TOKEN)).thenReturn(googleUser);
        when(agentRepository.findByGoogleSub("sub-123")).thenReturn(Optional.of(existing));
        when(jwtUtil.generateToken(eq("maria@example.com"), anyList())).thenReturn("jwt-token");

        AuthResponse response = authService.loginWithGoogle(ID_TOKEN);

        assertThat(response.getAccessToken()).isEqualTo("jwt-token");
        assertThat(response.getAgent()).isSameAs(existing);
        verify(agentRepository, never()).save(any());
    }

    @Test
    void linksGoogleIdentityToExistingPasswordAccount() {
        Agent existing = agent("maria@example.com", null);
        existing.setPasswordHash("$2a$10$existinghash");
        when(googleTokenVerifier.verify(ID_TOKEN)).thenReturn(googleUser);
        when(agentRepository.findByGoogleSub("sub-123")).thenReturn(Optional.empty());
        when(agentRepository.findByEmail("maria@example.com")).thenReturn(Optional.of(existing));
        when(agentRepository.save(any(Agent.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtUtil.generateToken(eq("maria@example.com"), anyList())).thenReturn("jwt-token");

        AuthResponse response = authService.loginWithGoogle(ID_TOKEN);

        assertThat(response.getAccessToken()).isEqualTo("jwt-token");
        assertThat(existing.getGoogleSub()).isEqualTo("sub-123");
        // Linking must not disturb the existing password login.
        assertThat(existing.getPasswordHash()).isEqualTo("$2a$10$existinghash");
    }

    @Test
    void provisionsNewAccountWhenGoogleUserIsUnknown() {
        when(googleTokenVerifier.verify(ID_TOKEN)).thenReturn(googleUser);
        when(agentRepository.findByGoogleSub("sub-123")).thenReturn(Optional.empty());
        when(agentRepository.findByEmail("maria@example.com")).thenReturn(Optional.empty());
        when(agentRepository.save(any(Agent.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtUtil.generateToken(eq("maria@example.com"), anyList())).thenReturn("jwt-token");

        authService.loginWithGoogle(ID_TOKEN);

        ArgumentCaptor<Agent> saved = ArgumentCaptor.forClass(Agent.class);
        verify(agentRepository).save(saved.capture());

        Agent created = saved.getValue();
        assertThat(created.getEmail()).isEqualTo("maria@example.com");
        assertThat(created.getFirstName()).isEqualTo("Maria");
        assertThat(created.getLastName()).isEqualTo("Schmidt");
        assertThat(created.getGoogleSub()).isEqualTo("sub-123");
        assertThat(created.getPasswordHash()).isNull();
        assertThat(created.isActive()).isTrue();
    }

    @Test
    void fallsBackToEmailLocalPartWhenGoogleOmitsNameClaims() {
        when(googleTokenVerifier.verify(ID_TOKEN))
                .thenReturn(new GoogleUserInfo("sub-123", "maria@example.com", null, null, null));
        when(agentRepository.findByGoogleSub("sub-123")).thenReturn(Optional.empty());
        when(agentRepository.findByEmail("maria@example.com")).thenReturn(Optional.empty());
        when(agentRepository.save(any(Agent.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtUtil.generateToken(anyString(), anyList())).thenReturn("jwt-token");

        authService.loginWithGoogle(ID_TOKEN);

        ArgumentCaptor<Agent> saved = ArgumentCaptor.forClass(Agent.class);
        verify(agentRepository).save(saved.capture());

        // Must satisfy the entity's 2-char minimum rather than inventing a name.
        assertThat(saved.getValue().getFirstName()).isEqualTo("maria");
        assertThat(saved.getValue().getLastName()).isEqualTo("maria");
    }

    @Test
    void splitsFullNameWhenGivenAndFamilyNameAreMissing() {
        when(googleTokenVerifier.verify(ID_TOKEN))
                .thenReturn(new GoogleUserInfo("sub-123", "maria@example.com", null, null, "Maria von Schmidt"));
        when(agentRepository.findByGoogleSub("sub-123")).thenReturn(Optional.empty());
        when(agentRepository.findByEmail("maria@example.com")).thenReturn(Optional.empty());
        when(agentRepository.save(any(Agent.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtUtil.generateToken(anyString(), anyList())).thenReturn("jwt-token");

        authService.loginWithGoogle(ID_TOKEN);

        ArgumentCaptor<Agent> saved = ArgumentCaptor.forClass(Agent.class);
        verify(agentRepository).save(saved.capture());

        assertThat(saved.getValue().getFirstName()).isEqualTo("Maria");
        assertThat(saved.getValue().getLastName()).isEqualTo("von Schmidt");
    }

    @Test
    void rejectsInvalidToken() {
        when(googleTokenVerifier.verify(ID_TOKEN)).thenThrow(new BadCredentialsException("Google sign-in failed"));

        assertThatThrownBy(() -> authService.loginWithGoogle(ID_TOKEN))
                .isInstanceOf(BadCredentialsException.class);

        verify(agentRepository, never()).save(any());
        verify(jwtUtil, never()).generateToken(anyString(), anyList());
    }

    @Test
    void rejectsDeactivatedAccount() {
        Agent deactivated = agent("maria@example.com", "sub-123");
        deactivated.setActive(false);
        when(googleTokenVerifier.verify(ID_TOKEN)).thenReturn(googleUser);
        when(agentRepository.findByGoogleSub("sub-123")).thenReturn(Optional.of(deactivated));

        assertThatThrownBy(() -> authService.loginWithGoogle(ID_TOKEN))
                .isInstanceOf(BadCredentialsException.class);

        verify(jwtUtil, never()).generateToken(anyString(), anyList());
    }

    private Agent agent(String email, String googleSub) {
        return Agent.builder()
                .email(email)
                .firstName("Maria")
                .lastName("Schmidt")
                .googleSub(googleSub)
                .isActive(true)
                .build();
    }
}
