package com.marklerapp.crm.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.marklerapp.crm.config.GoogleAuthProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;
import java.util.Set;

/**
 * Verifies Google ID tokens issued to the browser by Google Identity Services.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleTokenVerifier {

    private static final Set<String> VALID_ISSUERS = Set.of(
            "accounts.google.com",
            "https://accounts.google.com"
    );

    private final GoogleAuthProperties props;

    private volatile GoogleIdTokenVerifier verifier;

    public boolean isEnabled() {
        return props.isConfigured();
    }

    /**
     * Verify an ID token and extract the claims we care about.
     *
     * @throws BadCredentialsException if the token is missing, malformed, expired,
     *                                 issued for another client, or has an unverified email
     */
    public GoogleUserInfo verify(String idToken) {
        GoogleIdToken token;
        try {
            // Checks signature against Google's public keys, plus audience and expiry.
            // IllegalArgumentException: verify() parses the JWT before validating it, so a
            // malformed token surfaces as a decoding error rather than a security exception.
            token = getVerifier().verify(idToken);
        } catch (GeneralSecurityException | IOException | IllegalArgumentException e) {
            log.warn("Google ID token verification failed: {}", e.getMessage());
            throw new BadCredentialsException("Google sign-in failed");
        }

        if (token == null) {
            log.warn("Google ID token rejected (bad signature, audience, or expired)");
            throw new BadCredentialsException("Google sign-in failed");
        }

        GoogleIdToken.Payload payload = token.getPayload();

        if (!VALID_ISSUERS.contains(payload.getIssuer())) {
            log.warn("Google ID token has unexpected issuer: {}", payload.getIssuer());
            throw new BadCredentialsException("Google sign-in failed");
        }

        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            log.warn("Google ID token for {} has unverified email", payload.getEmail());
            throw new BadCredentialsException("Google sign-in failed");
        }

        return new GoogleUserInfo(
                payload.getSubject(),
                payload.getEmail(),
                (String) payload.get("given_name"),
                (String) payload.get("family_name"),
                (String) payload.get("name")
        );
    }

    private GoogleIdTokenVerifier getVerifier() {
        GoogleIdTokenVerifier local = verifier;
        if (local == null) {
            synchronized (this) {
                local = verifier;
                if (local == null) {
                    local = new GoogleIdTokenVerifier.Builder(
                            new NetHttpTransport(), GsonFactory.getDefaultInstance())
                            .setAudience(List.of(props.getClientId()))
                            .build();
                    verifier = local;
                }
            }
        }
        return local;
    }

    /**
     * The subset of Google's ID token claims used to provision an Agent.
     * Only sub and email are guaranteed present; the name claims depend on account type.
     */
    public record GoogleUserInfo(String sub, String email, String firstName, String lastName, String fullName) {
    }
}
