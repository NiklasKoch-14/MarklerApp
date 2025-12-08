package com.marklerapp.crm.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS configuration for enabling cross-origin requests.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${application.cors.allowed-origins}")
    private String allowedOrigins;

    @Value("${application.cors.allowed-methods}")
    private String allowedMethods;

    @Value("${application.cors.allowed-headers}")
    private String allowedHeaders;

    @Value("${application.cors.allow-credentials}")
    private boolean allowCredentials;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOriginPatterns(allowedOrigins.split(","))
                .allowedMethods(allowedMethods.split(","))
                .allowedHeaders(allowedHeaders)
                .allowCredentials(allowCredentials)
                .maxAge(3600);

        // Additional CORS mapping for Swagger/OpenAPI
        registry.addMapping("/v3/api-docs/**")
                .allowedOriginPatterns(allowedOrigins.split(","))
                .allowedMethods("GET", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false)
                .maxAge(3600);

        registry.addMapping("/swagger-ui/**")
                .allowedOriginPatterns(allowedOrigins.split(","))
                .allowedMethods("GET", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false)
                .maxAge(3600);
    }
}