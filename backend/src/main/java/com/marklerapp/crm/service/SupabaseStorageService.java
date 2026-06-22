package com.marklerapp.crm.service;

import com.marklerapp.crm.config.SupabaseStorageProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * REST client for Supabase Storage.
 * Only active when supabase.storage.url is set (prod profile).
 * In dev (SQLite) and docker (local Postgres) profiles this bean is absent
 * and PropertyImageService falls back to Base64-in-DB storage.
 */
@Slf4j
@Service
@ConditionalOnProperty(prefix = "supabase.storage", name = "url")
@RequiredArgsConstructor
public class SupabaseStorageService {

    private final SupabaseStorageProperties props;

    private RestClient client;

    @PostConstruct
    void init() {
        client = RestClient.builder()
            .baseUrl(props.getUrl())
            .defaultHeader("Authorization", "Bearer " + props.getServiceRoleKey())
            .defaultHeader("apikey", props.getServiceRoleKey())
            .build();
    }

    /**
     * Upload raw bytes to Supabase Storage.
     *
     * @param storagePath path inside the bucket, e.g. "properties/{uuid}/img.jpg"
     * @param data        raw image bytes
     * @param contentType MIME type of the data
     */
    public void upload(String storagePath, byte[] data, String contentType) {
        client.put()
            .uri("/storage/v1/object/{bucket}/{path}", props.getBucket(), storagePath)
            .header("x-upsert", "true")
            .contentType(MediaType.parseMediaType(contentType))
            .body(data)
            .retrieve()
            .toBodilessEntity();
        log.debug("Uploaded {} bytes to Supabase Storage at {}", data.length, storagePath);
    }

    /**
     * Create a time-limited signed URL for the given storage path.
     *
     * @return absolute signed URL ready for browser use
     */
    public String getSignedUrl(String storagePath) {
        @SuppressWarnings("unchecked")
        Map<String, String> response = client.post()
            .uri("/storage/v1/object/sign/{bucket}/{path}", props.getBucket(), storagePath)
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of("expiresIn", props.getSignedUrlExpirySeconds()))
            .retrieve()
            .body(Map.class);

        if (response == null || !response.containsKey("signedURL")) {
            throw new IllegalStateException("Supabase Storage did not return a signedURL for: " + storagePath);
        }
        // signedURL is a relative path — prepend the project base URL
        String relative = response.get("signedURL");
        return relative.startsWith("http") ? relative : props.getUrl() + relative;
    }

    /**
     * Delete one or more objects from the bucket.
     *
     * @param storagePaths paths inside the bucket to delete
     */
    public void delete(List<String> storagePaths) {
        if (storagePaths == null || storagePaths.isEmpty()) {
            return;
        }
        client.delete()
            .uri("/storage/v1/object/{bucket}", props.getBucket())
            .header("Content-Type", "application/json")
            .body(Map.of("prefixes", storagePaths))
            .retrieve()
            .toBodilessEntity();
        log.debug("Deleted {} object(s) from Supabase Storage", storagePaths.size());
    }
}
