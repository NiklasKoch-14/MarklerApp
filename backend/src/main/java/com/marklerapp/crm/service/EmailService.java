package com.marklerapp.crm.service;

import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.LanguagePreference;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Service for sending emails to agents.
 * Handles password reset emails with bilingual templates (German/English).
 */
@Slf4j
@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${application.mail.from}")
    private String fromEmail;

    @Value("${application.mail.from-name}")
    private String fromName;

    @Value("${application.mail.base-url}")
    private String baseUrl;

    @Value("${application.mail.reset-token-expiration-minutes}")
    private int expirationMinutes;

    /**
     * Send password reset email to agent.
     * Email language is determined by agent's languagePreference.
     *
     * @param agent The agent requesting password reset
     * @param token The plaintext reset token (not the hash)
     */
    public void sendPasswordResetEmail(Agent agent, String token) {
        if (mailSender == null) {
            log.warn("Mail sender not configured. Set SPRING_MAIL_USERNAME and SPRING_MAIL_PASSWORD to enable email. Agent: {}", agent.getEmail());
            return;
        }

        String resetLink = String.format("%s/auth/reset-password?token=%s", baseUrl, token);
        LanguagePreference lang = agent.getLanguagePreference() != null
                ? agent.getLanguagePreference()
                : LanguagePreference.DE;

        String subject = buildSubject(lang);
        String body = buildEmailBody(agent, resetLink, lang);

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(String.format("%s <%s>", fromName, fromEmail));
            message.setTo(agent.getEmail());
            message.setSubject(subject);
            message.setText(body);

            mailSender.send(message);
            log.info("Password reset email sent successfully to: {}", agent.getEmail());

        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", agent.getEmail(), e);
            throw new RuntimeException("Failed to send password reset email", e);
        }
    }

    /**
     * Build email subject based on language preference
     */
    private String buildSubject(LanguagePreference lang) {
        if (lang == LanguagePreference.EN) {
            return "Password Reset Request - MarklerApp CRM";
        }
        return "Passwort zurücksetzen - MarklerApp CRM";
    }

    /**
     * Build email body with bilingual templates
     */
    private String buildEmailBody(Agent agent, String resetLink, LanguagePreference lang) {
        if (lang == LanguagePreference.EN) {
            return buildEnglishEmailBody(agent, resetLink);
        }
        return buildGermanEmailBody(agent, resetLink);
    }

    /**
     * Build English email template
     */
    private String buildEnglishEmailBody(Agent agent, String resetLink) {
        return String.format(
            """
            Hello %s,

            You requested a password reset for your MarklerApp CRM account.

            To reset your password, please click the link below:

            %s

            This link will expire in %d minutes for security reasons.

            If you did not request this password reset, please ignore this email.
            Your password will remain unchanged.

            For security reasons, never share this link with anyone.

            Best regards,
            MarklerApp CRM Team
            """,
            agent.getFirstName(),
            resetLink,
            expirationMinutes
        );
    }

    /**
     * Build German email template
     */
    private String buildGermanEmailBody(Agent agent, String resetLink) {
        return String.format(
            """
            Hallo %s,

            Sie haben das Zurücksetzen Ihres Passworts für Ihr MarklerApp CRM-Konto angefordert.

            Um Ihr Passwort zurückzusetzen, klicken Sie bitte auf den folgenden Link:

            %s

            Dieser Link läuft aus Sicherheitsgründen in %d Minuten ab.

            Falls Sie diese Passwort-Zurücksetzung nicht angefordert haben, ignorieren Sie bitte diese E-Mail.
            Ihr Passwort bleibt unverändert.

            Aus Sicherheitsgründen sollten Sie diesen Link niemals mit anderen teilen.

            Mit freundlichen Grüßen,
            Ihr MarklerApp CRM-Team
            """,
            agent.getFirstName(),
            resetLink,
            expirationMinutes
        );
    }
}
