# Data Model: Real Estate CRM System

**Created**: 2025-12-04
**Feature**: Real Estate CRM System
**Database**: SQLite (MVP) → PostgreSQL (Production)

## Entity Overview

The system manages real estate agents, their clients, properties, and interaction history through five core entities with clear relationships and GDPR compliance.

## Core Entities

### Agent

Represents real estate professionals using the system.

**Fields:**
- `id` (UUID) - Primary key
- `email` (String, unique, required) - Login identifier
- `first_name` (String, required) - Agent first name
- `last_name` (String, required) - Agent last name
- `phone` (String, optional) - Contact phone number
- `language_preference` (Enum: DE, EN, default: DE) - UI language setting
- `password_hash` (String, required) - Hashed password for authentication
- `created_at` (Timestamp, required) - Record creation time
- `updated_at` (Timestamp, required) - Last modification time
- `is_active` (Boolean, default: true) - Account status

**Relationships:**
- One-to-many with Client (agent manages multiple clients)
- One-to-many with CallNote (agent creates call notes)
- One-to-many with Property (agent manages property listings)

**Validation Rules:**
- Email must be valid format and unique
- Password must meet security requirements (8+ chars, mixed case, numbers)
- Names must be 2-100 characters
- Phone must match German/international format if provided

**GDPR Considerations:**
- Personal data (name, email, phone) requires consent
- Data retention policy: 7 years after account closure
- Right to erasure: anonymize data while preserving business records

### Client

Represents potential buyers/renters in the real estate market.

**Fields:**
- `id` (UUID) - Primary key
- `agent_id` (UUID, required) - Foreign key to Agent
- `first_name` (String, required) - Client first name
- `last_name` (String, required) - Client last name
- `email` (String, optional) - Client email address
- `phone` (String, optional) - Client phone number
- `address_street` (String, optional) - Street address
- `address_city` (String, optional) - City
- `address_postal_code` (String, optional) - Postal code
- `address_country` (String, default: "Germany") - Country
- `created_at` (Timestamp, required) - Record creation time
- `updated_at` (Timestamp, required) - Last modification time
- `gdpr_consent_given` (Boolean, required) - GDPR consent status
- `gdpr_consent_date` (Timestamp, nullable) - When consent was given

**Relationships:**
- Many-to-one with Agent (client belongs to one agent)
- One-to-many with CallNote (client has multiple call notes)
- One-to-one with PropertySearchCriteria (client has search preferences)
- Many-to-many with Property (client can be interested in multiple properties)

**Validation Rules:**
- Names must be 2-100 characters
- Email must be valid format if provided
- Phone must match German/international format if provided
- Postal code must match German format (5 digits) if provided
- GDPR consent required before storing personal data

**GDPR Considerations:**
- Explicit consent required for all personal data processing
- Data retention: 3 years after last contact or consent withdrawal
- Right to portability: export all client data in structured format
- Right to rectification: allow data updates and corrections

### PropertySearchCriteria

Represents client preferences for property matching.

**Fields:**
- `id` (UUID) - Primary key
- `client_id` (UUID, required, unique) - Foreign key to Client (one-to-one)
- `min_square_meters` (Integer, optional) - Minimum property size
- `max_square_meters` (Integer, optional) - Maximum property size
- `min_rooms` (Integer, optional) - Minimum room count
- `max_rooms` (Integer, optional) - Maximum room count
- `min_budget` (Decimal, optional) - Minimum budget in EUR
- `max_budget` (Decimal, optional) - Maximum budget in EUR
- `preferred_locations` (Text, optional) - Comma-separated list of preferred areas
- `property_types` (Text, optional) - Comma-separated list of property types
- `additional_requirements` (Text, optional) - Free text for special requirements
- `created_at` (Timestamp, required) - Record creation time
- `updated_at` (Timestamp, required) - Last modification time

**Relationships:**
- One-to-one with Client (each client has one search criteria record)

**Validation Rules:**
- Min values must be less than max values where both provided
- Budget and size values must be positive
- Room count must be between 1-20
- Square meters must be between 10-10000
- Property types must be from predefined list

**Business Logic:**
- Auto-matching algorithm uses these criteria to suggest properties
- Criteria updates trigger re-evaluation of property matches
- Historical criteria changes tracked for analytics

### Property

Represents real estate listings (apartments, houses, commercial spaces).

**Fields:**
- `id` (UUID) - Primary key
- `agent_id` (UUID, required) - Foreign key to Agent
- `title` (String, required) - Property title/name
- `description` (Text, optional) - Detailed property description
- `property_type` (Enum, required) - APARTMENT, HOUSE, COMMERCIAL, LAND
- `address_street` (String, required) - Street address
- `address_city` (String, required) - City
- `address_postal_code` (String, required) - Postal code
- `address_country` (String, default: "Germany") - Country
- `price` (Decimal, required) - Price in EUR
- `price_type` (Enum, required) - SALE, RENT_MONTHLY
- `square_meters` (Integer, required) - Property size
- `room_count` (Integer, required) - Number of rooms
- `bedroom_count` (Integer, optional) - Number of bedrooms
- `bathroom_count` (Integer, optional) - Number of bathrooms
- `floor_number` (Integer, optional) - Floor number (if applicable)
- `has_balcony` (Boolean, default: false) - Balcony availability
- `has_garden` (Boolean, default: false) - Garden availability
- `has_parking` (Boolean, default: false) - Parking availability
- `year_built` (Integer, optional) - Construction year
- `available_from` (Date, optional) - Availability date
- `is_active` (Boolean, default: true) - Listing status
- `custom_fields` (JSON, optional) - Additional property-specific information
- `created_at` (Timestamp, required) - Record creation time
- `updated_at` (Timestamp, required) - Last modification time

**Relationships:**
- Many-to-one with Agent (agent manages multiple properties)
- One-to-many with PropertyImage (property has multiple images)
- Many-to-many with Client (property can interest multiple clients)

**Validation Rules:**
- Title must be 5-200 characters
- Price must be positive
- Square meters must be between 10-10000
- Room count must be between 1-20
- Postal code must be valid German format (5 digits)
- Year built must be between 1800-current year

**Business Logic:**
- Auto-matching with client search criteria
- Price history tracking for market analysis
- Status workflow: DRAFT → ACTIVE → SOLD/RENTED → ARCHIVED

### PropertyImage

Represents images associated with property listings.

**Fields:**
- `id` (UUID) - Primary key
- `property_id` (UUID, required) - Foreign key to Property
- `file_name` (String, required) - Original file name
- `file_path` (String, required) - Storage path/URL
- `file_size` (Long, required) - File size in bytes
- `mime_type` (String, required) - Image MIME type
- `alt_text` (String, optional) - Accessibility description
- `display_order` (Integer, default: 0) - Sort order for display
- `is_primary` (Boolean, default: false) - Main property image flag
- `uploaded_at` (Timestamp, required) - Upload timestamp

**Relationships:**
- Many-to-one with Property (property has multiple images)

**Validation Rules:**
- File size must be ≤ 10MB
- MIME type must be image/* (JPEG, PNG, WebP)
- Only one primary image per property
- Display order must be unique per property
- Alt text recommended for accessibility

**Storage Strategy:**
- Local file system for MVP (Docker volume)
- Cloud storage (AWS S3) for production
- Image optimization: generate thumbnails, compress for web
- CDN integration for performance

### CallNote

Represents documented interactions between agents and clients.

**Fields:**
- `id` (UUID) - Primary key
- `agent_id` (UUID, required) - Foreign key to Agent
- `client_id` (UUID, required) - Foreign key to Client
- `call_date` (Timestamp, required) - When the interaction occurred
- `duration_minutes` (Integer, optional) - Call duration
- `call_type` (Enum, required) - PHONE_INBOUND, PHONE_OUTBOUND, EMAIL, MEETING, OTHER
- `subject` (String, required) - Brief call subject/title
- `notes` (Text, required) - Detailed call notes
- `follow_up_required` (Boolean, default: false) - Follow-up action needed
- `follow_up_date` (Date, optional) - When to follow up
- `properties_discussed` (Text, optional) - Property IDs discussed (JSON array)
- `outcome` (Enum, optional) - INTERESTED, NOT_INTERESTED, SCHEDULED_VIEWING, OFFER_MADE, DEAL_CLOSED
- `created_at` (Timestamp, required) - Record creation time
- `updated_at` (Timestamp, required) - Last modification time

**Relationships:**
- Many-to-one with Agent (agent creates call notes)
- Many-to-one with Client (client has multiple call notes)

**Validation Rules:**
- Subject must be 5-200 characters
- Notes must be 10-5000 characters
- Duration must be positive if provided
- Follow-up date must be future date if provided
- Call date cannot be in future

**Business Logic:**
- Auto-summary generation from multiple call notes
- Follow-up reminder system
- Integration with property matching (properties_discussed)
- Activity timeline for client relationship management

**GDPR Considerations:**
- Call notes contain personal opinions and assessments
- Data retention: 3 years from last client interaction
- Right to erasure: anonymize notes while preserving business patterns
- Access logging: track who accesses sensitive call notes

## Relationships Summary

```
Agent (1) ──── (M) Client
  │               │
  │               └── (1) PropertySearchCriteria
  │
  ├── (M) Property ──── (M) PropertyImage
  │         │
  │         └── (M) ←→ (M) Client [ClientPropertyInterest join table]
  │
  └── (M) CallNote ──── (M) Client
```

## Database Considerations

### Indexing Strategy
- Primary keys (UUIDs) automatically indexed
- Foreign keys indexed for relationship queries
- Email fields (unique constraints)
- Search-heavy fields: property location, price, square meters
- Temporal queries: created_at, call_date fields

### Migration Path (SQLite → PostgreSQL)
1. **MVP Phase**: SQLite with file-based storage
   - Single-file database for easy deployment
   - No additional infrastructure required
   - Suitable for small deployments (1-5 agents)

2. **Production Phase**: PostgreSQL migration
   - Export data using Flyway migration scripts
   - Preserve UUIDs for data consistency
   - Performance optimization with proper indexing
   - Connection pooling and query optimization

### Performance Optimizations
- **Pagination**: All list endpoints use cursor-based pagination
- **Caching**: Redis for frequently accessed property listings
- **File Storage**: Separate volume/CDN for property images
- **Query Optimization**: Use JPA projections for list views
- **Connection Pooling**: HikariCP for database connections

### GDPR Compliance Implementation
- **Consent Management**: Track consent per data category
- **Data Anonymization**: Replace personal identifiers with hashes
- **Audit Logging**: Track all access to personal data
- **Export Capability**: Generate complete data exports
- **Retention Policies**: Automated cleanup of expired data