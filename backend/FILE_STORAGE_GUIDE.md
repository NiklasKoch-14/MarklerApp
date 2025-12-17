# File Storage System Documentation

## Overview

This document describes the comprehensive file storage system implemented for the Real Estate CRM application. The system provides secure, organized, and cross-platform compatible file storage for property images.

## Architecture

### Components

1. **FileStorageService** - Core service handling all file operations
2. **FileStorageProperties** - Configuration management
3. **PropertyImageService** - Business logic for property images
4. **PropertyController** - REST API endpoints
5. **WebMvcConfig** - Static resource serving
6. **FileStorageInitializer** - Startup initialization
7. **Custom Exceptions** - Error handling

### Directory Structure

```
uploads/
  properties/
    {propertyId}/
      {uuid}.jpg              # Original image
      {uuid}_thumb.jpg        # Thumbnail
      {uuid}.png
      {uuid}_thumb.png
```

## Configuration

### Application Properties

#### Development (`application.yml`)

```yaml
app:
  file-storage:
    upload-dir: ./uploads/properties
    max-file-size: 10485760  # 10MB
    allowed-content-types:
      - image/jpeg
      - image/jpg
      - image/png
      - image/webp
      - image/gif
    allowed-extensions:
      - jpg
      - jpeg
      - png
      - webp
      - gif
    thumbnail:
      width: 300
      height: 200
      maintain-aspect-ratio: true
      quality: 0.85
    image-quality:
      compression-quality: 0.9
      max-width: 0  # 0 = no resizing
      max-height: 0
```

#### Docker (`application-docker.yml`)

```yaml
app:
  file-storage:
    upload-dir: /app/uploads/properties
```

#### Production (`application-prod.yml`)

```yaml
app:
  file-storage:
    upload-dir: /app/uploads/properties
    max-file-size: 10485760
```

### Environment Variables

- `FILE_UPLOAD_DIR` - Override upload directory path
- `MAX_FILE_SIZE` - Override maximum file size (bytes)

## API Endpoints

### Upload Image

**POST** `/api/v1/properties/{propertyId}/images`

**Request:**
- Content-Type: `multipart/form-data`
- Parameters:
  - `file` (required): Image file
  - `title` (optional): Image title
  - `description` (optional): Image description
  - `imageType` (optional): Image type (EXTERIOR, INTERIOR, etc.)
  - `isPrimary` (optional): Set as primary image

**Response:** `201 Created`

```json
{
  "id": "uuid",
  "propertyId": "uuid",
  "filename": "uuid.jpg",
  "originalFilename": "house_front.jpg",
  "contentType": "image/jpeg",
  "fileSize": 2048576,
  "width": 1920,
  "height": 1080,
  "isPrimary": true,
  "sortOrder": 0,
  "imageType": "EXTERIOR",
  "imageUrl": "/api/v1/properties/{propertyId}/images/{imageId}/file",
  "thumbnailUrl": "/api/v1/properties/{propertyId}/images/{imageId}/thumbnail",
  "createdAt": "2025-12-16T12:00:00"
}
```

### Get Image File

**GET** `/api/v1/properties/{propertyId}/images/{imageId}/file`

**Parameters:**
- `download` (optional): Boolean to force download (default: false)

**Response:** `200 OK`
- Returns the actual image file with appropriate Content-Type
- Content-Disposition: inline (display in browser) or attachment (download)

### Get Image Thumbnail

**GET** `/api/v1/properties/{propertyId}/images/{imageId}/thumbnail`

**Response:** `200 OK`
- Returns the thumbnail image file

### Get All Property Images

**GET** `/api/v1/properties/{propertyId}/images`

**Response:** `200 OK`

```json
[
  {
    "id": "uuid",
    "propertyId": "uuid",
    "filename": "uuid.jpg",
    ...
  }
]
```

### Delete Image

**DELETE** `/api/v1/properties/{propertyId}/images/{imageId}`

**Response:** `204 No Content`

### Set Primary Image

**PUT** `/api/v1/properties/{propertyId}/images/{imageId}/primary`

**Response:** `200 OK`

## Features

### File Validation

- **Size Validation**: Configurable maximum file size (default: 10MB)
- **Type Validation**: Only allowed MIME types accepted
- **Extension Validation**: File extension must match content type
- **Security**: Path traversal protection, sanitized filenames

### Thumbnail Generation

- **Automatic**: Thumbnails generated on upload
- **Aspect Ratio**: Maintains original aspect ratio by default
- **Quality**: Configurable compression quality
- **Dimensions**: Configurable width/height (default: 300x200)

### File Organization

- **Property-based**: Files organized by property ID
- **UUID Naming**: Unique filenames prevent conflicts
- **Metadata Storage**: Database stores file information
- **Sort Order**: Automatic ordering of images

### Cross-Platform Compatibility

- **Path Handling**: Works on Windows and Linux
- **Separator Normalization**: Handles different path separators
- **Absolute Paths**: Uses absolute paths internally
- **Relative URLs**: Returns platform-independent URLs

### Error Handling

- **Disk Full**: Graceful handling of insufficient disk space
- **Permissions**: Proper error messages for permission issues
- **Missing Files**: 404 responses for non-existent files
- **Invalid Files**: Validation errors with detailed messages

## Security Considerations

### Access Control

- **Agent Isolation**: Agents can only access their own properties
- **JWT Authentication**: All endpoints require valid JWT token
- **Ownership Validation**: Property ownership checked before file operations

### File Security

- **Path Traversal Protection**: Prevents directory traversal attacks
- **Content Type Validation**: Verifies actual file content matches declared type
- **File Size Limits**: Prevents disk exhaustion attacks
- **Sanitized Filenames**: Removes potentially dangerous characters

## Performance Optimization

### Caching

- **Static Resources**: 1-hour cache for served files
- **Thumbnails**: Pre-generated on upload
- **Metadata**: Stored in database for fast retrieval

### Efficiency

- **Streaming**: Files served using Spring Resource API
- **Lazy Loading**: Images loaded only when accessed
- **Compression**: JPEG quality optimization

## Error Responses

### File Too Large

```json
{
  "timestamp": "2025-12-16T12:00:00",
  "status": 500,
  "error": "Internal Server Error",
  "message": "File size (15728640 bytes) exceeds maximum allowed size (10485760 bytes)",
  "path": "/api/v1/properties/{id}/images"
}
```

### Invalid File Type

```json
{
  "timestamp": "2025-12-16T12:00:00",
  "status": 500,
  "error": "Internal Server Error",
  "message": "File type 'application/pdf' is not allowed. Allowed types: [image/jpeg, image/jpg, image/png, image/webp, image/gif]",
  "path": "/api/v1/properties/{id}/images"
}
```

### File Not Found

```json
{
  "timestamp": "2025-12-16T12:00:00",
  "status": 404,
  "error": "Not Found",
  "message": "File not found: uuid.jpg",
  "path": "/api/v1/properties/{id}/images/{imageId}/file"
}
```

## Maintenance

### Disk Space Monitoring

Monitor the upload directory for disk usage:

```bash
# Linux/Mac
du -sh /app/uploads/properties

# Windows
dir "C:\path\to\uploads\properties" /s
```

### Cleanup

To clean up orphaned files (files not referenced in database):

```sql
-- Find orphaned images
SELECT * FROM property_images
WHERE file_path NOT IN (
  -- Query to check actual files on disk
);
```

### Backup

Backup strategy should include:
1. Database backup (includes file metadata)
2. File system backup (uploads directory)
3. Regular integrity checks

## Troubleshooting

### Issue: Files not being saved

**Symptoms:** Upload returns 500 error, logs show "Could not create upload directory"

**Solution:**
1. Check directory permissions
2. Verify disk space available
3. Ensure parent directory exists

### Issue: Thumbnails not generated

**Symptoms:** Thumbnail endpoint returns 404

**Solution:**
1. Check if original image is valid
2. Verify thumbnail dimensions in config
3. Check logs for thumbnail generation errors

### Issue: Images not accessible via URL

**Symptoms:** GET requests return 404

**Solution:**
1. Verify WebMvcConfig is loaded
2. Check if file exists on disk
3. Ensure correct property ID in URL

## Best Practices

### Development

1. Use relative paths for upload directory (`./uploads/properties`)
2. Test with various image formats and sizes
3. Verify cross-platform path handling

### Production

1. Use absolute paths for upload directory (`/app/uploads/properties`)
2. Mount external volume for uploads directory
3. Configure appropriate file size limits
4. Enable HTTPS for secure file transfers
5. Implement CDN for better performance

### Docker

Add volume mount for persistent storage:

```yaml
volumes:
  - ./uploads:/app/uploads
```

## Future Enhancements

Potential improvements for the file storage system:

1. **Cloud Storage Integration** - S3, Azure Blob, Google Cloud Storage
2. **Image Processing** - Automatic resizing, watermarking, format conversion
3. **CDN Integration** - CloudFront, CloudFlare for better performance
4. **Virus Scanning** - Integrate antivirus scanning for uploaded files
5. **Advanced Caching** - Redis caching for frequently accessed images
6. **Batch Operations** - Bulk upload/delete operations
7. **Image Optimization** - WebP conversion, progressive JPEGs
8. **Access Logs** - Track image access for analytics

## Testing

### Manual Testing

1. **Upload Image:**
   ```bash
   curl -X POST http://localhost:8085/api/v1/properties/{propertyId}/images \
     -H "Authorization: Bearer {token}" \
     -F "file=@test-image.jpg" \
     -F "title=Test Image"
   ```

2. **Get Image:**
   ```bash
   curl -X GET http://localhost:8085/api/v1/properties/{propertyId}/images/{imageId}/file \
     -H "Authorization: Bearer {token}" \
     --output downloaded-image.jpg
   ```

3. **Get Thumbnail:**
   ```bash
   curl -X GET http://localhost:8085/api/v1/properties/{propertyId}/images/{imageId}/thumbnail \
     -H "Authorization: Bearer {token}" \
     --output thumbnail.jpg
   ```

### Automated Testing

Unit tests should cover:
- File validation logic
- Thumbnail generation
- Path handling
- Error scenarios

Integration tests should verify:
- End-to-end file upload
- File retrieval
- Deletion cleanup
- Access control

## Conclusion

This file storage system provides a robust, secure, and scalable solution for managing property images in the Real Estate CRM application. It handles cross-platform compatibility, implements proper security measures, and provides comprehensive error handling.
