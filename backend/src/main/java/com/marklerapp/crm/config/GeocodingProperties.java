package com.marklerapp.crm.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "geocoding")
public class GeocodingProperties {

    /** Nominatim-compatible base URL — public instance by default, self-hostable later. */
    private String baseUrl = "https://nominatim.openstreetmap.org";

    /** Required by Nominatim's usage policy to identify the calling application. */
    private String userAgent = "MarklerApp/1.0 (support@marklerapp.example)";

    /** Kill switch — disables all geocoding calls without a code change. */
    private boolean enabled = true;
}
