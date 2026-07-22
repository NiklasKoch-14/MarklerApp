package com.marklerapp.crm.service;

import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.PasswordResetToken;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.repository.PasswordResetTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Guards the deliberate decision from Issue #26: a Google-only account may obtain a
 * password through the reset flow, gaining a second way in if Google access is lost.
 * Without these tests, "Google accounts must not reset passwords" reads like an
 * oversight and invites a well-meaning rejection branch.
 */
@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private AgentRepository agentRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private PasswordResetService passwordResetService;

    private Agent googleOnlyAgent;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(passwordResetService, "expirationMinutes", 15);

        googleOnlyAgent = new Agent();
        googleOnlyAgent.setEmail("google-user@example.com");
        googleOnlyAgent.setGoogleSub("google-sub-123");
        googleOnlyAgent.setPasswordHash(null);
    }

    @Test
    void requestPasswordReset_googleOnlyAccount_stillIssuesToken() {
        when(agentRepository.findByEmail("google-user@example.com")).thenReturn(Optional.of(googleOnlyAgent));
        when(tokenRepository.countByAgentAndCreatedAtAfter(eq(googleOnlyAgent), any())).thenReturn(0);

        passwordResetService.requestPasswordReset("google-user@example.com", "127.0.0.1");

        ArgumentCaptor<PasswordResetToken> saved = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository).save(saved.capture());
        assertThat(saved.getValue().getAgent()).isSameAs(googleOnlyAgent);
    }

    @Test
    void resetPassword_googleOnlyAccount_setsPasswordAndKeepsGoogleLink() {
        PasswordResetToken token = PasswordResetToken.builder()
                .tokenHash("irrelevant — the repository lookup is mocked")
                .agent(googleOnlyAgent)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .used(false)
                .build();

        when(tokenRepository.findByTokenHashAndUsedFalse(anyString())).thenReturn(Optional.of(token));
        when(tokenRepository.findByAgentAndUsedFalse(googleOnlyAgent)).thenReturn(List.of());
        when(passwordEncoder.encode("NewPassw0rd")).thenReturn("hashed-new-password");

        passwordResetService.resetPassword("a".repeat(64), "NewPassw0rd");

        assertThat(googleOnlyAgent.getPasswordHash()).isEqualTo("hashed-new-password");
        // Der Google-Login muss weiter funktionieren — das Passwort ist ein Zusatz,
        // kein Ersatz. Ein geleertes googleSub waere genau der stille Regress.
        assertThat(googleOnlyAgent.getGoogleSub()).isEqualTo("google-sub-123");
        assertThat(token.isUsed()).isTrue();
    }
}
