# MapStruct Mappers

This package contains MapStruct mapper interfaces for automating DTO conversions throughout the application. MapStruct generates type-safe, performant implementation classes at compile-time, eliminating the need for manual mapping code.

## Overview

MapStruct is configured in `pom.xml` with version 1.5.5.Final and Lombok compatibility. The annotation processor runs during Maven compilation and generates implementation classes in `target/generated-sources/annotations/`.

## Available Mappers

### 1. AgentMapper
**Purpose**: Maps between `Agent` entity and `AgentDto`

**Key Features**:
- Computes `fullName` from firstName and lastName
- Ignores sensitive fields like `passwordHash` during DTO-to-entity mapping
- Provides list mapping method `toDtoList()`

**Usage**:
```java
@Autowired
private AgentMapper agentMapper;

AgentDto dto = agentMapper.toDto(agent);
List<AgentDto> dtos = agentMapper.toDtoList(agents);
```

### 2. ClientMapper
**Purpose**: Maps between `Client` entity and `ClientDto`

**Key Features**:
- Maps nested `PropertySearchCriteria` using `PropertySearchCriteriaMapper`
- Computes `fullName` and `formattedAddress`
- Maps `agent.id` to `agentId`
- Ignores collections like `callNotes` during mapping

**Usage**:
```java
@Autowired
private ClientMapper clientMapper;

ClientDto dto = clientMapper.toDto(client);
Client entity = clientMapper.toEntity(dto);
// Note: You must set the agent separately
entity.setAgent(agent);
```

### 3. PropertySearchCriteriaMapper
**Purpose**: Maps between `PropertySearchCriteria` entity and `PropertySearchCriteriaDto`

**Key Features**:
- Converts comma-separated strings to lists (preferredLocations, propertyTypes)
- Computes constraint flags (hasBudgetConstraints, hasSizeConstraints, hasRoomConstraints)
- Custom helper methods for array-to-list conversions

**Usage**:
```java
@Autowired
private PropertySearchCriteriaMapper searchCriteriaMapper;

PropertySearchCriteriaDto dto = searchCriteriaMapper.toDto(criteria);
```

### 4. CallNoteMapper
**Purpose**: Maps between `CallNote` entity and various `CallNoteDto` types

**Key Features**:
- **Response DTO**: Full detailed view with agent name, client name, property title/address
- **Summary DTO**: List view with truncated notes preview (150 chars)
- **FollowUpReminder DTO**: Simplified view with overdue calculations
- Computes property address from property entity
- Calculates days until follow-up due (positive=future, negative=overdue)

**Usage**:
```java
@Autowired
private CallNoteMapper callNoteMapper;

CallNoteDto.Response response = callNoteMapper.toResponse(callNote);
CallNoteDto.Summary summary = callNoteMapper.toSummary(callNote);
CallNoteDto.FollowUpReminder reminder = callNoteMapper.toFollowUpReminder(callNote);
```

### 5. PropertyImageMapper
**Purpose**: Maps between `PropertyImage` entity and `PropertyImageDto`

**Key Features**:
- Creates Base64 data URLs for `imageUrl` and `thumbnailUrl`
- Computes `formattedFileSize`, `fileExtension`, `aspectRatio`
- Ignores binary data fields (`imageData`, `thumbnailData`) during DTO-to-entity mapping

**Usage**:
```java
@Autowired
private PropertyImageMapper propertyImageMapper;

PropertyImageDto dto = propertyImageMapper.toDto(propertyImage);
List<PropertyImageDto> dtos = propertyImageMapper.toDtoList(images);
```

### 6. PropertyMapper
**Purpose**: Maps between `Property` entity and `PropertyDto`

**Key Features**:
- Maps nested `PropertyImage` collections using `PropertyImageMapper`
- Computes `formattedAddress` and `calculatedPricePerSqm`
- Determines `mainImageUrl` (primary image or first image)
- Calculates `imageCount`
- Maps `agent.id` to `agentId`

**Usage**:
```java
@Autowired
private PropertyMapper propertyMapper;

PropertyDto dto = propertyMapper.toDto(property);
List<PropertyDto> dtos = propertyMapper.toDtoList(properties);

Property entity = propertyMapper.toEntity(dto);
// Note: You must set the agent separately
entity.setAgent(agent);
```

## Configuration

### Maven Configuration
The project is configured with MapStruct in `pom.xml`:

```xml
<properties>
    <mapstruct.version>1.5.5.Final</mapstruct.version>
</properties>

<dependencies>
    <!-- MapStruct API -->
    <dependency>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct</artifactId>
        <version>${mapstruct.version}</version>
    </dependency>

    <!-- MapStruct Processor -->
    <dependency>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct-processor</artifactId>
        <version>${mapstruct.version}</version>
        <scope>provided</scope>
    </dependency>
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <configuration>
                <annotationProcessorPaths>
                    <path>
                        <groupId>org.mapstruct</groupId>
                        <artifactId>mapstruct-processor</artifactId>
                        <version>${mapstruct.version}</version>
                    </path>
                    <path>
                        <groupId>org.projectlombok</groupId>
                        <artifactId>lombok</artifactId>
                        <version>${lombok.version}</version>
                    </path>
                    <path>
                        <groupId>org.projectlombok</groupId>
                        <artifactId>lombok-mapstruct-binding</artifactId>
                        <version>0.2.0</version>
                    </path>
                </annotationProcessorPaths>
            </configuration>
        </plugin>
    </plugins>
</build>
```

### Lombok Integration
The `lombok-mapstruct-binding` dependency ensures proper interaction between Lombok-generated code and MapStruct mappers. MapStruct can access Lombok-generated getters/setters/builders during annotation processing.

## Migration Strategy

### Replacing Manual Mapping Methods

The mappers can replace existing manual conversion methods in service classes:

#### ClientService
**Before**:
```java
private ClientDto convertToDto(Client client) {
    ClientDto dto = ClientDto.builder()
        .id(client.getId())
        .agentId(client.getAgent().getId())
        .firstName(client.getFirstName())
        // ... many more fields
        .build();
    return dto;
}
```

**After**:
```java
@Autowired
private ClientMapper clientMapper;

// In service methods
ClientDto dto = clientMapper.toDto(client);
```

#### CallNoteService
**Before**:
```java
private CallNoteDto.Response convertToResponse(CallNote callNote) {
    String propertyAddress = null;
    if (callNote.getProperty() != null) {
        propertyAddress = callNote.getProperty().getAddressCity() + ", " +
                         callNote.getProperty().getAddressPostalCode();
    }
    return CallNoteDto.Response.builder()
        .id(callNote.getId())
        .agentName(callNote.getAgent().getFirstName() + " " +
                  callNote.getAgent().getLastName())
        // ... many more fields
        .build();
}
```

**After**:
```java
@Autowired
private CallNoteMapper callNoteMapper;

// In service methods
CallNoteDto.Response response = callNoteMapper.toResponse(callNote);
```

## Best Practices

### 1. Use Expressions for Complex Logic
For computed fields that require business logic, use Java expressions:
```java
@Mapping(target = "fullName", expression = "java(entity.getFullName())")
```

### 2. Ignore Managed Fields
Always ignore fields that are managed by JPA or should not be set:
```java
@Mapping(target = "id", ignore = true)
@Mapping(target = "createdAt", ignore = true)
@Mapping(target = "updatedAt", ignore = true)
```

### 3. Separate Relationship Setting
For many-to-one relationships, map the entity after conversion:
```java
Client client = clientMapper.toEntity(dto);
client.setAgent(currentAgent);
clientRepository.save(client);
```

### 4. Use Nested Mappers
Leverage the `uses` parameter to map nested objects:
```java
@Mapper(componentModel = "spring", uses = {PropertyImageMapper.class})
public interface PropertyMapper { ... }
```

### 5. Provide List Mapping Methods
Always include list mapping for bulk operations:
```java
List<ClientDto> toDtoList(List<Client> clients);
```

## Testing

MapStruct-generated implementations can be tested like any Spring bean:

```java
@SpringBootTest
class ClientMapperTest {

    @Autowired
    private ClientMapper clientMapper;

    @Test
    void shouldMapClientToDto() {
        Client client = createTestClient();
        ClientDto dto = clientMapper.toDto(client);

        assertThat(dto.getId()).isEqualTo(client.getId());
        assertThat(dto.getFullName()).isEqualTo(
            client.getFirstName() + " " + client.getLastName()
        );
    }
}
```

## Performance Benefits

MapStruct generates plain Java code with no reflection, resulting in:
- **Type Safety**: Compile-time error checking
- **Performance**: No runtime overhead from reflection
- **Maintainability**: Single source of truth for mappings
- **Readability**: Cleaner service code without boilerplate

## Troubleshooting

### Mappers Not Found
If Spring cannot autowire mappers, ensure:
1. Maven compilation succeeded: `mvn clean compile`
2. Generated implementations exist in `target/generated-sources/annotations/`
3. `@Mapper(componentModel = "spring")` is present on all mappers

### Compilation Errors
If MapStruct reports errors:
1. Check all mapped fields exist in both entity and DTO
2. Verify Lombok annotations are correct (MapStruct needs getters/setters)
3. Ensure annotation processor paths are configured in `pom.xml`

### Null Pointer Exceptions
If mapping fails with NPE:
1. Add null checks for optional relationships (e.g., `property` in CallNote)
2. Use `@Mapping(target = "field", ignore = true)` for unavailable fields
3. Consider adding `@Mapping(target = "field", defaultValue = "...")` for primitives

## References

- [MapStruct Documentation](https://mapstruct.org/)
- [MapStruct with Lombok](https://mapstruct.org/documentation/stable/reference/html/#lombok)
- [Spring Boot Integration](https://mapstruct.org/documentation/stable/reference/html/#spring-bean-injection)

---

**Last Updated**: 2026-01-27
**MapStruct Version**: 1.5.5.Final
**Lombok Binding Version**: 0.2.0
