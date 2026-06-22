package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.constants.ValidationConstants;
import com.marklerapp.crm.dto.PropertyImageDto;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyImage;
import com.marklerapp.crm.entity.PropertyImageType;
import com.marklerapp.crm.repository.PropertyImageRepository;
import com.marklerapp.crm.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PropertyImageService {

    private final PropertyImageRepository propertyImageRepository;
    private final PropertyRepository propertyRepository;
    private final Optional<SupabaseStorageService> supabaseStorage;

    @Transactional
    public PropertyImageDto uploadImage(UUID propertyId, MultipartFile file,
                                       PropertyImageDto metadata, UUID agentId) throws IOException {

        Property property = getPropertyByIdAndValidateOwnership(propertyId, agentId);
        validateImageFile(file);

        BufferedImage original = ImageIO.read(file.getInputStream());
        int width = original.getWidth();
        int height = original.getHeight();

        String filename = generateUniqueFilename(file.getOriginalFilename());
        Integer sortOrder = propertyImageRepository.findNextSortOrder(property);
        boolean isPrimary = propertyImageRepository.countByProperty(property) == 0;
        if (metadata != null && metadata.getIsPrimary() != null) {
            isPrimary = metadata.getIsPrimary();
        }
        if (isPrimary) {
            unsetOtherPrimaryImages(property);
        }

        PropertyImage.PropertyImageBuilder builder = PropertyImage.builder()
            .property(property)
            .filename(filename)
            .originalFilename(file.getOriginalFilename())
            .contentType(file.getContentType())
            .fileSize(file.getSize())
            .width(width)
            .height(height)
            .isPrimary(isPrimary)
            .sortOrder(sortOrder)
            .imageType(metadata != null && metadata.getImageType() != null
                ? metadata.getImageType() : PropertyImageType.GENERAL);

        if (supabaseStorage.isPresent()) {
            // Upload original + thumbnail to Supabase Storage
            String thumbFilename = toThumbnailFilename(filename);
            String basePath = "properties/" + propertyId + "/";

            supabaseStorage.get().upload(basePath + filename, file.getBytes(), file.getContentType());

            byte[] thumbBytes = generateThumbnailBytes(original, file.getContentType());
            supabaseStorage.get().upload(basePath + thumbFilename, thumbBytes, file.getContentType());

            builder.storagePath(basePath + filename)
                   .thumbnailStoragePath(basePath + thumbFilename);
        } else {
            // Fallback: Base64 in DB (dev / docker profile without Supabase)
            builder.imageData(Base64.getEncoder().encodeToString(file.getBytes()))
                   .thumbnailData(Base64.getEncoder().encodeToString(
                       generateThumbnailBytes(original, file.getContentType())));
        }

        if (metadata != null) {
            builder.title(metadata.getTitle())
                   .description(metadata.getDescription())
                   .altText(metadata.getAltText());
        }

        PropertyImage saved = propertyImageRepository.save(builder.build());
        log.info("Uploaded image {} for property {}", saved.getId(), propertyId);
        return convertToDto(saved);
    }

    @Transactional
    public PropertyImageDto updateImageMetadata(UUID imageId, PropertyImageDto metadata, UUID agentId) {
        PropertyImage image = getImageByIdAndValidateOwnership(imageId, agentId);

        if (metadata.getTitle() != null)       image.setTitle(metadata.getTitle());
        if (metadata.getDescription() != null) image.setDescription(metadata.getDescription());
        if (metadata.getAltText() != null)     image.setAltText(metadata.getAltText());
        if (metadata.getImageType() != null)   image.setImageType(metadata.getImageType());
        if (metadata.getSortOrder() != null)   image.setSortOrder(metadata.getSortOrder());

        if (Boolean.TRUE.equals(metadata.getIsPrimary())) {
            unsetOtherPrimaryImages(image.getProperty());
            image.setIsPrimary(true);
        } else if (Boolean.FALSE.equals(metadata.getIsPrimary())) {
            long primaryCount = propertyImageRepository.countByPropertyAndImageType(
                image.getProperty(), PropertyImageType.GENERAL);
            if (primaryCount > 1 || !image.getIsPrimary()) {
                image.setIsPrimary(false);
            } else {
                throw new IllegalArgumentException(
                    "Cannot unset primary image: property must have at least one primary image");
            }
        }

        return convertToDto(propertyImageRepository.save(image));
    }

    @Transactional
    public void deleteImage(UUID imageId, UUID agentId) {
        PropertyImage image = getImageByIdAndValidateOwnership(imageId, agentId);

        if (image.getIsPrimary()) {
            propertyImageRepository.findByPropertyOrderBySortOrderAsc(image.getProperty()).stream()
                .filter(img -> !img.getId().equals(imageId))
                .findFirst()
                .ifPresent(img -> {
                    img.setIsPrimary(true);
                    propertyImageRepository.save(img);
                });
        }

        deleteStorageFiles(image);
        propertyImageRepository.delete(image);
        log.info("Deleted image {}", imageId);
    }

    @Transactional(readOnly = true)
    public PropertyImageDto getImage(UUID imageId, UUID agentId) {
        return convertToDto(getImageByIdAndValidateOwnership(imageId, agentId));
    }

    @Transactional(readOnly = true)
    public List<PropertyImageDto> getAllImages(UUID propertyId, UUID agentId) {
        Property property = getPropertyByIdAndValidateOwnership(propertyId, agentId);
        return propertyImageRepository.findByPropertyOrderBySortOrderAsc(property).stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PropertyImageDto> getImagesByType(UUID propertyId, PropertyImageType imageType, UUID agentId) {
        Property property = getPropertyByIdAndValidateOwnership(propertyId, agentId);
        return propertyImageRepository.findByPropertyAndImageTypeOrderBySortOrderAsc(property, imageType).stream()
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PropertyImageDto getPrimaryImage(UUID propertyId, UUID agentId) {
        Property property = getPropertyByIdAndValidateOwnership(propertyId, agentId);
        return propertyImageRepository.findByPropertyAndIsPrimaryTrue(property)
            .map(this::convertToDto)
            .orElse(null);
    }

    @Transactional(readOnly = true)
    public long countImages(UUID propertyId, UUID agentId) {
        Property property = getPropertyByIdAndValidateOwnership(propertyId, agentId);
        return propertyImageRepository.countByProperty(property);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private byte[] generateThumbnailBytes(BufferedImage original, String contentType) throws IOException {
        int maxSize = ValidationConstants.THUMBNAIL_SIZE;
        double scale = Math.min((double) maxSize / original.getWidth(),
                                (double) maxSize / original.getHeight());
        int w = (int) (original.getWidth() * scale);
        int h = (int) (original.getHeight() * scale);

        BufferedImage thumb = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = thumb.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(original, 0, 0, w, h, null);
        g.dispose();

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(thumb, getFormatName(contentType), baos);
        return baos.toByteArray();
    }

    private String getFormatName(String contentType) {
        if (contentType == null) return "jpg";
        if (contentType.contains("png"))  return "png";
        if (contentType.contains("gif"))  return "gif";
        if (contentType.contains("webp")) return "webp";
        return "jpg";
    }

    private String generateUniqueFilename(String originalFilename) {
        String ext = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        return UUID.randomUUID() + ext;
    }

    private String toThumbnailFilename(String filename) {
        int dot = filename.lastIndexOf(".");
        return dot > 0
            ? filename.substring(0, dot) + "_thumb" + filename.substring(dot)
            : filename + "_thumb";
    }

    private void validateImageFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException(ValidationConstants.FILE_EMPTY_MESSAGE);
        }
        if (file.getSize() > ValidationConstants.MAX_ATTACHMENT_SIZE_BYTES) {
            throw new IllegalArgumentException(ValidationConstants.IMAGE_SIZE_LIMIT_MESSAGE);
        }
        String ct = file.getContentType();
        if (ct == null || !ct.startsWith("image/")) {
            throw new IllegalArgumentException(ValidationConstants.FILE_MUST_BE_IMAGE_MESSAGE);
        }
        if (!ct.matches(ValidationConstants.SUPPORTED_IMAGE_FORMAT_REGEX)) {
            throw new IllegalArgumentException(ValidationConstants.UNSUPPORTED_IMAGE_FORMAT_MESSAGE);
        }
    }

    private void deleteStorageFiles(PropertyImage image) {
        if (supabaseStorage.isEmpty()) return;
        List<String> paths = new ArrayList<>();
        if (image.getStoragePath() != null)          paths.add(image.getStoragePath());
        if (image.getThumbnailStoragePath() != null) paths.add(image.getThumbnailStoragePath());
        if (!paths.isEmpty()) {
            supabaseStorage.get().delete(paths);
        }
    }

    private Property getPropertyByIdAndValidateOwnership(UUID propertyId, UUID agentId) {
        Property property = propertyRepository.findById(propertyId)
            .orElseThrow(() -> new ResourceNotFoundException("Property", "id", propertyId));
        if (!property.getAgent().getId().equals(agentId)) {
            throw new ResourceNotFoundException("Property not found or access denied");
        }
        return property;
    }

    private PropertyImage getImageByIdAndValidateOwnership(UUID imageId, UUID agentId) {
        PropertyImage image = propertyImageRepository.findById(imageId)
            .orElseThrow(() -> new ResourceNotFoundException("PropertyImage", "id", imageId));
        if (!image.getProperty().getAgent().getId().equals(agentId)) {
            throw new ResourceNotFoundException("Image not found or access denied");
        }
        return image;
    }

    private void unsetOtherPrimaryImages(Property property) {
        propertyImageRepository.findByPropertyOrderBySortOrderAsc(property).stream()
            .filter(PropertyImage::getIsPrimary)
            .forEach(img -> {
                img.setIsPrimary(false);
                propertyImageRepository.save(img);
            });
    }

    private PropertyImageDto convertToDto(PropertyImage image) {
        PropertyImageDto dto = PropertyImageDto.builder()
            .id(image.getId())
            .propertyId(image.getProperty().getId())
            .filename(image.getFilename())
            .originalFilename(image.getOriginalFilename())
            .filePath(image.getFilePath())
            .contentType(image.getContentType())
            .fileSize(image.getFileSize())
            .title(image.getTitle())
            .description(image.getDescription())
            .altText(image.getAltText())
            .width(image.getWidth())
            .height(image.getHeight())
            .isPrimary(image.getIsPrimary())
            .sortOrder(image.getSortOrder())
            .imageType(image.getImageType())
            .createdAt(image.getCreatedAt())
            .updatedAt(image.getUpdatedAt())
            .build();

        dto.setFileExtension(image.getFileExtension());
        dto.setFormattedFileSize(image.getFormattedFileSize());
        dto.setAspectRatio(image.getAspectRatio());

        // URL resolution: Supabase signed URL → legacy Base64 data URL
        if (image.getStoragePath() != null && supabaseStorage.isPresent()) {
            try {
                dto.setImageUrl(supabaseStorage.get().getSignedUrl(image.getStoragePath()));
                if (image.getThumbnailStoragePath() != null) {
                    dto.setThumbnailUrl(supabaseStorage.get().getSignedUrl(image.getThumbnailStoragePath()));
                }
            } catch (Exception e) {
                log.warn("Could not generate signed URL for image {}: {}", image.getId(), e.getMessage());
            }
        } else {
            if (image.getImageData() != null) {
                dto.setImageUrl("data:" + image.getContentType() + ";base64," + image.getImageData());
            }
            if (image.getThumbnailData() != null) {
                dto.setThumbnailUrl("data:" + image.getContentType() + ";base64," + image.getThumbnailData());
            }
        }

        return dto;
    }
}
