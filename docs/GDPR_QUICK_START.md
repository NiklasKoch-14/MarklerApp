# GDPR Export Feature - Quick Start Guide

## Quick Testing Steps

### 1. Start the Application

```bash
# Navigate to backend directory
cd C:\Users\nkoch\Git\MarklerApp\backend

# Run the application
mvn spring-boot:run
```

The application will start on `http://localhost:8085`

### 2. Access Swagger UI

Open your browser and navigate to:
```
http://localhost:8085/swagger-ui.html
```

### 3. Authenticate

1. Find the **Auth** section in Swagger UI
2. Expand **POST /api/v1/auth/login**
3. Click "Try it out"
4. Use these credentials:
   ```json
   {
     "email": "admin@marklerapp.com",
     "password": "Admin123!"
   }
   ```
5. Click "Execute"
6. Copy the `token` value from the response
7. Scroll to the top and click the "Authorize" button
8. Enter: `Bearer <paste-your-token-here>`
9. Click "Authorize" and then "Close"

### 4. Test GDPR Endpoints

Now you can test all GDPR endpoints in the **GDPR Compliance** section:

#### a) Get Export Summary (No Download)
- Expand **GET /api/v1/gdpr/export/summary**
- Click "Try it out" → "Execute"
- See statistics about your data

#### b) Export All Data as JSON
- Expand **GET /api/v1/gdpr/export**
- Click "Try it out" → "Execute"
- Click "Download" to save the JSON file

#### c) Export All Data as PDF
- Expand **GET /api/v1/gdpr/export/pdf**
- Click "Try it out" → "Execute"
- Click "Download" to save the PDF file

#### d) Export Only Clients
- Expand **GET /api/v1/gdpr/export/clients**
- Click "Try it out" → "Execute"
- Click "Download" to save the JSON file

#### e) Export Only Properties
- Expand **GET /api/v1/gdpr/export/properties**
- Click "Try it out" → "Execute"
- Click "Download" to save the JSON file

#### f) Export Only Call Notes
- Expand **GET /api/v1/gdpr/export/call-notes**
- Click "Try it out" → "Execute"
- Click "Download" to save the JSON file

### 5. Verify Audit Logs

Connect to your database and check the audit logs:

```sql
-- View all GDPR export requests
SELECT * FROM gdpr_export_audit_logs
ORDER BY export_timestamp DESC;

-- View export statistics
SELECT * FROM v_gdpr_audit_stats;
```

## Expected Results

### Export Summary Response
```json
{
  "agentId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "totalClients": 3,
  "totalProperties": 5,
  "totalCallNotes": 5,
  "totalSearchCriteria": 3,
  "totalPropertyImages": 5,
  "estimatedExportSizeKb": 175
}
```

### Full Export Structure
```json
{
  "metadata": {
    "exportTimestamp": "2024-12-16T13:45:30",
    "exportVersion": "1.0",
    "dataController": "MarklerApp Real Estate CRM",
    "gdprStatement": "...",
    "purposeOfProcessing": "..."
  },
  "agent": {
    "id": "...",
    "email": "admin@marklerapp.com",
    "firstName": "Admin",
    "lastName": "User",
    "fullName": "Admin User",
    ...
  },
  "clients": [...],
  "properties": [...],
  "callNotes": [...],
  "statistics": {
    "totalClients": 3,
    "totalProperties": 5,
    "totalCallNotes": 5,
    ...
  }
}
```

## Testing with curl (Alternative)

If you prefer command-line testing:

```bash
# 1. Login and get token
TOKEN=$(curl -s -X POST http://localhost:8085/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@marklerapp.com","password":"Admin123!"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 2. Export full data as JSON
curl -X GET http://localhost:8085/api/v1/gdpr/export \
  -H "Authorization: Bearer $TOKEN" \
  -o gdpr_export.json

# 3. Export full data as PDF
curl -X GET http://localhost:8085/api/v1/gdpr/export/pdf \
  -H "Authorization: Bearer $TOKEN" \
  -o gdpr_export.pdf

# 4. Get export summary
curl -X GET http://localhost:8085/api/v1/gdpr/export/summary \
  -H "Authorization: Bearer $TOKEN"
```

## Common Issues & Solutions

### Issue: 401 Unauthorized
**Solution**: Make sure you're authenticated and the token hasn't expired. Re-login if needed.

### Issue: PDF Download Doesn't Work
**Solution**: Check if iText dependency is properly loaded. Check application logs for errors.

### Issue: Empty Data in Export
**Solution**: Make sure you're using the admin account which has sample data. Check database has been properly initialized.

### Issue: Slow Export Performance
**Solution**: For production with large datasets, consider:
- Implementing pagination
- Using streaming for large files
- Adding caching for frequently accessed data

## Sample Data

The application includes sample data:
- 3 clients (Hans Mueller, Anna Schmidt, Peter Weber)
- 5 properties (apartments, houses in various German cities)
- 5 call notes (communication records)
- 3 property search criteria

All associated with the admin agent.

## Next Steps

After successful testing:

1. **Review the exports**: Check JSON and PDF files contain all expected data
2. **Verify audit logs**: Ensure all requests are properly logged
3. **Test error cases**: Try invalid tokens, simulate failures
4. **Performance testing**: Test with larger datasets
5. **Integration**: Connect frontend to these endpoints

## Support

For detailed information, see:
- `docs/GDPR_EXPORT_FEATURE.md` - Complete documentation
- `http://localhost:8085/swagger-ui.html` - Interactive API documentation
- Application logs in `backend/logs/` directory
