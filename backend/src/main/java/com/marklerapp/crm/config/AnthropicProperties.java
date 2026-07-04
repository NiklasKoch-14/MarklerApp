package com.marklerapp.crm.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "anthropic")
public class AnthropicProperties {

    /** API key from console.anthropic.com — feature is disabled when blank */
    private String apiKey;

    /** Model used for voice-note structuring; Haiku is fast + cheap (~0,001 €/Notiz) */
    private String model = "claude-haiku-4-5";

    private int maxTokens = 1024;

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
