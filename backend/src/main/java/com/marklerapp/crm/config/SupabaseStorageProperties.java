package com.marklerapp.crm.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "supabase.storage")
public class SupabaseStorageProperties {

    /** Base URL of the Supabase project, e.g. https://<ref>.supabase.co */
    private String url;

    /** service_role key from Dashboard → Settings → API */
    private String serviceRoleKey;

    /** Storage bucket name (must exist in Supabase before first upload) */
    private String bucket = "property-images";

    /** Lifetime of signed URLs in seconds (default 1 hour) */
    private int signedUrlExpirySeconds = 3600;

    public boolean isConfigured() {
        return url != null && !url.isBlank()
            && serviceRoleKey != null && !serviceRoleKey.isBlank();
    }
}
