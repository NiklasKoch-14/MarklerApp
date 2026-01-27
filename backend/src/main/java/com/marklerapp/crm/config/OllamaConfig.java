package com.marklerapp.crm.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app.ollama")
@Data
public class OllamaConfig {
    private boolean enabled = false;
    private String baseUrl = "http://localhost:11434";
    private String model = "phi3:mini";
    private int timeout = 120000;  // 2 minutes for AI inference
    private int maxTokens = 500;
}
