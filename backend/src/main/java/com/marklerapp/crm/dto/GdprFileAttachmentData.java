package com.marklerapp.crm.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO representing a file attachment's metadata for GDPR export.
 * Deliberately excludes the raw file payload (base64 fileData) — the export
 * discloses what documents are held, not a bulk re-download of their contents.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GdprFileAttachmentData {

    private UUID id;
    private String fileName;
    private String originalFileName;
    private String mimeType;
    private String fileType;
    private Long fileSize;
    private String formattedFileSize;
    private String description;
    private LocalDateTime uploadDate;
}
