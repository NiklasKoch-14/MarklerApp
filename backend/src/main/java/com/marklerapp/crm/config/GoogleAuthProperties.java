package com.marklerapp.crm.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "google")
public class GoogleAuthProperties {

    /** OAuth Client ID from Google Cloud Console — Google Sign-In is disabled when blank */
    private String clientId;

    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank();
    }
}
