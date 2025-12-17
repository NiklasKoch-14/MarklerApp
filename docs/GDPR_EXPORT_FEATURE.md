# GDPR Data Export Feature - Documentation

## Overview

This feature implements comprehensive GDPR Article 15 "Right of Access" compliance for the MarklerApp Real Estate CRM. It allows agents to export all their personal data stored in the system in both JSON and PDF formats.

## Components

### 1. DTOs (Data Transfer Objects)

Located in: `backend/src/main/java/com/marklerapp/crm/dto/`

- **GdprExportResponse**: Main export response containing all data
- **GdprAgentData**: Agent information
- **GdprClientData**: Client information including search criteria
- **GdprPropertyData**: Property information including images
- **GdprCallNoteData**: Communication records

### 2. Services

Located in: `backend/src/main/java/com/marklerapp/crm/service/`

- **GdprService**: Core service for data collection and formatting
- **GdprPdfService**: PDF generation service using iText library
- **GdprAuditService**: Audit logging service for compliance tracking

### 3. Controller

Located in: `backend/src/main/java/com/marklerapp/crm/controller/`

- **GdprController**: REST API endpoints for GDPR exports

### 4. Entities

Located in: `backend/src/main/java/com/marklerapp/crm/entity/`

- **GdprExportAuditLog**: Entity for tracking all export requests

### 5. Repository

Located in: `backend/src/main/java/com/marklerapp/crm/repository/`

- **GdprExportAuditLogRepository**: Data access for audit logs

### 6. Database Migrations

Located in: `backend/src/main/resources/db/migration/`

- **V4__Create_call_notes_table.sql**: Call notes table migration
- **V5__Create_gdpr_audit_log_table.sql**: GDPR audit log table migration

## API Endpoints

All endpoints require JWT authentication and are prefixed with `/api/v1/gdpr`

### 1. Full Export (JSON)
- **GET** `/api/v1/gdpr/export`
- **Description**: Export all agent data as JSON
- **Response**: JSON file with all data
- **Audit**: Logged as `FULL_EXPORT` / `JSON`

### 2. Full Export (PDF)
- **GET** `/api/v1/gdpr/export/pdf`
- **Description**: Export all agent data as PDF
- **Response**: PDF file with formatted data
- **Audit**: Logged as `FULL_EXPORT` / `PDF`

### 3. Clients Only (JSON)
- **GET** `/api/v1/gdpr/export/clients`
- **Description**: Export only client data
- **Response**: JSON array of client records
- **Audit**: Logged as `CLIENTS_ONLY` / `JSON`

### 4. Properties Only (JSON)
- **GET** `/api/v1/gdpr/export/properties`
- **Description**: Export only property data
- **Response**: JSON array of property records
- **Audit**: Logged as `PROPERTIES_ONLY` / `JSON`

### 5. Call Notes Only (JSON)
- **GET** `/api/v1/gdpr/export/call-notes`
- **Description**: Export only call notes
- **Response**: JSON array of call note records
- **Audit**: Logged as `CALL_NOTES_ONLY` / `JSON`

### 6. Export Summary
- **GET** `/api/v1/gdpr/export/summary`
- **Description**: Get export summary without actual data
- **Response**: Statistics about exportable data
- **Audit**: Logged as `EXPORT_SUMMARY` / `JSON`

## Testing with Swagger

1. Start the application:
   ```bash
   cd backend
   mvn spring-boot:run
   ```

2. Navigate to Swagger UI:
   ```
   http://localhost:8085/swagger-ui.html
   ```

3. Authenticate:
   - Go to the Auth endpoints
   - Login with credentials: `admin@marklerapp.com` / `Admin123!`
   - Copy the JWT token
   - Click "Authorize" button in Swagger UI
   - Enter: `Bearer <your-token>`

4. Test GDPR endpoints:
   - Navigate to "GDPR Compliance" section
   - Try each endpoint
   - Verify downloads work correctly
   - Check audit logs in database

## Testing with curl

### 1. Login and Get Token
```bash
curl -X POST http://localhost:8085/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@marklerapp.com",
    "password": "Admin123!"
  }'
```

### 2. Export Full Data (JSON)
```bash
curl -X GET http://localhost:8085/api/v1/gdpr/export \
  -H "Authorization: Bearer <your-token>" \
  -o gdpr_export.json
```

### 3. Export Full Data (PDF)
```bash
curl -X GET http://localhost:8085/api/v1/gdpr/export/pdf \
  -H "Authorization: Bearer <your-token>" \
  -o gdpr_export.pdf
```

### 4. Export Clients Only
```bash
curl -X GET http://localhost:8085/api/v1/gdpr/export/clients \
  -H "Authorization: Bearer <your-token>" \
  -o clients_export.json
```

### 5. Export Properties Only
```bash
curl -X GET http://localhost:8085/api/v1/gdpr/export/properties \
  -H "Authorization: Bearer <your-token>" \
  -o properties_export.json
```

### 6. Export Call Notes Only
```bash
curl -X GET http://localhost:8085/api/v1/gdpr/export/call-notes \
  -H "Authorization: Bearer <your-token>" \
  -o call_notes_export.json
```

### 7. Get Export Summary
```bash
curl -X GET http://localhost:8085/api/v1/gdpr/export/summary \
  -H "Authorization: Bearer <your-token>"
```

## Audit Logging

Every export request is automatically logged with the following information:

- Agent ID
- Export type (FULL_EXPORT, CLIENTS_ONLY, etc.)
- Export format (JSON, PDF)
- Timestamp
- IP address
- User agent
- Number of records exported
- Export size in bytes
- Success status
- Error message (if failed)
- Processing time in milliseconds

### Viewing Audit Logs

Query the database:

```sql
-- View all exports for an agent
SELECT * FROM gdpr_export_audit_logs
WHERE agent_id = '<agent-uuid>'
ORDER BY export_timestamp DESC;

-- View export statistics
SELECT * FROM v_gdpr_audit_stats
WHERE agent_id = '<agent-uuid>';

-- View failed exports
SELECT * FROM gdpr_export_audit_logs
WHERE success = false
ORDER BY export_timestamp DESC;
```

## Data Included in Exports

### Agent Data
- ID, name, email, phone
- Language preference
- Account status
- Created/updated timestamps

### Client Data
- Personal information (name, email, phone)
- Address details
- GDPR consent status and date
- Property search criteria
- Created/updated timestamps

### Property Data
- Property details (title, description, type)
- Location information
- Specifications (area, rooms, etc.)
- Financial information (price, costs)
- Features and amenities
- Energy efficiency data
- Property images metadata
- Created/updated timestamps

### Call Notes Data
- Communication records
- Subject and notes content
- Call type and outcome
- Follow-up information
- Properties discussed
- Created/updated timestamps

## GDPR Compliance Statement

The export includes:

**Data Controller**: MarklerApp Real Estate CRM

**Purpose**: This export contains all personal data stored in the MarklerApp CRM system as required by GDPR Article 15 (Right of Access). The data has been exported in a structured, commonly used, and machine-readable format.

**Purpose of Processing**: The personal data is processed for the purpose of real estate client relationship management, property portfolio management, and communication tracking for real estate agents in accordance with GDPR regulations.

## Security Features

1. **JWT Authentication**: All endpoints require valid JWT token
2. **Agent Isolation**: Agents can only export their own data
3. **Audit Trail**: All export requests are logged with IP and user agent
4. **Error Logging**: Failed export attempts are tracked
5. **Data Minimization**: Only relevant data is exported

## Performance Considerations

- **Large Datasets**: Exports handle pagination internally
- **PDF Generation**: May take longer for large datasets
- **Processing Time**: Tracked and logged for monitoring
- **File Size**: Calculated and logged for audit purposes

## Dependencies

### Maven Dependencies Added:

```xml
<!-- iText for PDF generation -->
<dependency>
    <groupId>com.itextpdf</groupId>
    <artifactId>itext7-core</artifactId>
    <version>7.2.5</version>
    <type>pom</type>
</dependency>
```

## Future Enhancements

Potential improvements for future versions:

1. **Email Export**: Send exports via email
2. **Scheduled Exports**: Automatic periodic exports
3. **Data Anonymization**: Support for "Right to Erasure"
4. **Export History UI**: Frontend interface for viewing export history
5. **Export Filters**: Date range and selective data filters
6. **CSV Format**: Additional export format support
7. **Compression**: ZIP archives for large exports
8. **Encryption**: Encrypted exports for sensitive data

## Troubleshooting

### PDF Generation Fails
- Check iText dependency is properly loaded
- Verify sufficient memory for large datasets
- Check logs for specific error messages

### Audit Logging Fails
- Export will still succeed even if audit logging fails
- Check database connection
- Verify audit log table exists

### Large Export Timeouts
- Increase request timeout in configuration
- Consider implementing pagination for very large datasets
- Use streaming for large file downloads

## Related Documentation

- [GDPR Article 15 - Right of Access](https://gdpr-info.eu/art-15-gdpr/)
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [iText PDF Library](https://itextpdf.com/)
- [OpenAPI Specification](https://swagger.io/specification/)

## Support

For issues or questions:
- Check application logs: `backend/logs/`
- Review Swagger documentation: `http://localhost:8085/swagger-ui.html`
- Check database audit logs for failed export attempts
