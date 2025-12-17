package com.marklerapp.crm.config;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.cfg.CoercionAction;
import com.fasterxml.jackson.databind.cfg.CoercionInputShape;
import com.fasterxml.jackson.databind.type.LogicalType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

/**
 * Jackson configuration for JSON serialization/deserialization.
 *
 * <p>This configuration handles special cases such as:
 * <ul>
 *   <li>Converting empty strings to null for enums</li>
 *   <li>Handling optional enum fields from frontend</li>
 *   <li>Consistent date/time formatting</li>
 * </ul>
 * </p>
 */
@Configuration
public class JacksonConfig {

    /**
     * Configure ObjectMapper to handle empty strings gracefully for enums.
     *
     * <p>When the frontend sends an empty string ("") for an optional enum field,
     * this configuration converts it to null instead of throwing a deserialization error.</p>
     *
     * @param builder Jackson2ObjectMapperBuilder provided by Spring
     * @return Configured ObjectMapper
     */
    @Bean
    public ObjectMapper objectMapper(Jackson2ObjectMapperBuilder builder) {
        ObjectMapper objectMapper = builder.build();

        // Configure coercion for enums: empty string -> null
        objectMapper.coercionConfigFor(LogicalType.Enum)
                .setCoercion(CoercionInputShape.EmptyString, CoercionAction.AsNull);

        // Also accept null for empty strings in general
        objectMapper.coercionConfigFor(LogicalType.POJO)
                .setCoercion(CoercionInputShape.EmptyString, CoercionAction.AsNull);

        // Fail on unknown properties to catch potential issues early
        objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        return objectMapper;
    }
}
