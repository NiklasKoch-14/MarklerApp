package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.dto.*;
import com.marklerapp.crm.entity.*;
import com.marklerapp.crm.mapper.PropertyImageMapper;
import com.marklerapp.crm.mapper.PropertyMapper;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.repository.PropertyImageRepository;
import com.marklerapp.crm.repository.PropertyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Comprehensive test coverage for PropertyService.
 * Tests all CRUD operations, search functionality, filtering, statistics, and expose management.
 */
@ExtendWith(MockitoExtension.class)
class PropertyServiceTest {

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private PropertyImageRepository propertyImageRepository;

    @Mock
    private AgentRepository agentRepository;

    @Mock
    private PropertyMapper propertyMapper;

    @Mock
    private PropertyImageMapper propertyImageMapper;

    @InjectMocks
    private PropertyService propertyService;

    private Agent testAgent;
    private Property testProperty;
    private PropertyDto testPropertyDto;
    private CreatePropertyRequest createRequest;
    private UpdatePropertyRequest updateRequest;
    private UUID agentId;
    private UUID propertyId;

    @BeforeEach
    void setUp() {
        agentId = UUID.randomUUID();
        propertyId = UUID.randomUUID();

        testAgent = Agent.builder()
            .firstName("Max")
            .lastName("Mustermann")
            .email("max@example.com")
            .build();
        testAgent.setId(agentId);

        testProperty = Property.builder()
            .agent(testAgent)
            .title("Beautiful Apartment in Berlin")
            .description("Modern apartment with great view")
            .propertyType(PropertyType.APARTMENT)
            .listingType(ListingType.SALE)
            .status(PropertyStatus.AVAILABLE)
            .addressStreet("Hauptstraße")
            .addressHouseNumber("123")
            .addressCity("Berlin")
            .addressPostalCode("10115")
            .addressState("Berlin")
            .addressCountry("Germany")
            .livingAreaSqm(new BigDecimal("85.5"))
            .rooms(new BigDecimal("3"))
            .bedrooms(2)
            .bathrooms(1)
            .price(new BigDecimal("350000.00"))
            .pricePerSqm(new BigDecimal("4093.57"))
            .hasBalcony(true)
            .hasElevator(true)
            .dataProcessingConsent(true)
            .consentDate(LocalDate.now())
            .availableFrom(LocalDate.now().plusMonths(1))
            .build();
        testProperty.setId(propertyId);

        testPropertyDto = PropertyDto.builder()
            .id(propertyId)
            .agentId(agentId)
            .title("Beautiful Apartment in Berlin")
            .description("Modern apartment with great view")
            .propertyType(PropertyType.APARTMENT)
            .listingType(ListingType.SALE)
            .status(PropertyStatus.AVAILABLE)
            .addressStreet("Hauptstraße")
            .addressCity("Berlin")
            .addressPostalCode("10115")
            .livingAreaSqm(new BigDecimal("85.5"))
            .rooms(new BigDecimal("3"))
            .price(new BigDecimal("350000.00"))
            .build();

        createRequest = CreatePropertyRequest.builder()
            .title("Beautiful Apartment in Berlin")
            .description("Modern apartment with great view")
            .propertyType(PropertyType.APARTMENT)
            .listingType(ListingType.SALE)
            .addressStreet("Hauptstraße")
            .addressHouseNumber("123")
            .addressCity("Berlin")
            .addressPostalCode("10115")
            .addressState("Berlin")
            .livingAreaSqm(new BigDecimal("85.5"))
            .rooms(new BigDecimal("3"))
            .bedrooms(2)
            .bathrooms(1)
            .price(new BigDecimal("350000.00"))
            .dataProcessingConsent(true)
            .build();

        updateRequest = UpdatePropertyRequest.builder()
            .title("Updated Apartment Title")
            .description("Updated description")
            .price(new BigDecimal("360000.00"))
            .status(PropertyStatus.AVAILABLE)
            .build();
    }

    // ========================================
    // createProperty Tests
    // ========================================

    @Test
    void createProperty_WithValidData_ShouldReturnCreatedProperty() {
        // Given
        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.save(any(Property.class))).thenReturn(testProperty);
        when(propertyMapper.toDto(testProperty)).thenReturn(testPropertyDto);

        // When
        PropertyDto result = propertyService.createProperty(createRequest, agentId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Beautiful Apartment in Berlin");
        verify(agentRepository).findById(agentId);
        verify(propertyRepository).save(any(Property.class));
        verify(propertyMapper).toDto(testProperty);
    }

    @Test
    void createProperty_WithNonExistentAgent_ShouldThrowException() {
        // Given
        when(agentRepository.findById(agentId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> propertyService.createProperty(createRequest, agentId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Agent");

        verify(agentRepository).findById(agentId);
        verifyNoInteractions(propertyRepository);
    }

    @Test
    void createProperty_WithoutGdprConsent_ShouldThrowException() {
        // Given
        CreatePropertyRequest noConsentRequest = CreatePropertyRequest.builder()
            .title("Test Property")
            .propertyType(PropertyType.APARTMENT)
            .listingType(ListingType.SALE)
            .addressStreet("Test St")
            .addressCity("Berlin")
            .addressPostalCode("10115")
            .dataProcessingConsent(false)
            .build();

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));

        // When & Then
        assertThatThrownBy(() -> propertyService.createProperty(noConsentRequest, agentId))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("consent is required");

        verify(agentRepository).findById(agentId);
        verifyNoInteractions(propertyRepository);
    }

    @Test
    void createProperty_ShouldCalculatePricePerSqm() {
        // Given
        CreatePropertyRequest requestWithoutPricePerSqm = CreatePropertyRequest.builder()
            .title("Test Property")
            .propertyType(PropertyType.APARTMENT)
            .listingType(ListingType.SALE)
            .addressStreet("Test St")
            .addressCity("Berlin")
            .addressPostalCode("10115")
            .livingAreaSqm(new BigDecimal("100"))
            .price(new BigDecimal("300000"))
            .dataProcessingConsent(true)
            .build();

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.save(any(Property.class))).thenAnswer(invocation -> {
            Property property = invocation.getArgument(0);
            // Verify price per sqm was calculated
            assertThat(property.getPricePerSqm()).isEqualByComparingTo(new BigDecimal("3000.00"));
            return testProperty;
        });
        when(propertyMapper.toDto(any(Property.class))).thenReturn(testPropertyDto);

        // When
        propertyService.createProperty(requestWithoutPricePerSqm, agentId);

        // Then
        verify(propertyRepository).save(any(Property.class));
    }

    @Test
    void createProperty_ShouldSetDefaultCountryToGermany() {
        // Given
        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.save(any(Property.class))).thenAnswer(invocation -> {
            Property property = invocation.getArgument(0);
            assertThat(property.getAddressCountry()).isEqualTo("Germany");
            return testProperty;
        });
        when(propertyMapper.toDto(any(Property.class))).thenReturn(testPropertyDto);

        // When
        propertyService.createProperty(createRequest, agentId);

        // Then
        verify(propertyRepository).save(any(Property.class));
    }

    // ========================================
    // updateProperty Tests
    // ========================================

    @Test
    void updateProperty_WithValidData_ShouldReturnUpdatedProperty() {
        // Given
        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));
        when(propertyRepository.save(testProperty)).thenReturn(testProperty);
        when(propertyMapper.toDto(testProperty)).thenReturn(testPropertyDto);

        // When
        PropertyDto result = propertyService.updateProperty(propertyId, updateRequest, agentId);

        // Then
        assertThat(result).isNotNull();
        verify(propertyRepository).findById(propertyId);
        verify(propertyRepository).save(testProperty);
        verify(propertyMapper).toDto(testProperty);
    }

    @Test
    void updateProperty_WithNonExistentProperty_ShouldThrowException() {
        // Given
        when(propertyRepository.findById(propertyId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> propertyService.updateProperty(propertyId, updateRequest, agentId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Property");

        verify(propertyRepository).findById(propertyId);
        verify(propertyRepository, never()).save(any());
    }

    @Test
    void updateProperty_WithWrongAgent_ShouldThrowException() {
        // Given
        UUID wrongAgentId = UUID.randomUUID();
        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));

        // When & Then
        assertThatThrownBy(() -> propertyService.updateProperty(propertyId, updateRequest, wrongAgentId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("not found or access denied");

        verify(propertyRepository).findById(propertyId);
        verify(propertyRepository, never()).save(any());
    }

    @Test
    void updateProperty_ShouldRecalculatePricePerSqm() {
        // Given
        UpdatePropertyRequest requestWithPriceChange = UpdatePropertyRequest.builder()
            .price(new BigDecimal("400000"))
            .livingAreaSqm(new BigDecimal("100"))
            .build();

        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));
        when(propertyRepository.save(any(Property.class))).thenAnswer(invocation -> {
            Property property = invocation.getArgument(0);
            assertThat(property.getPricePerSqm()).isEqualByComparingTo(new BigDecimal("4000.00"));
            return property;
        });
        when(propertyMapper.toDto(any(Property.class))).thenReturn(testPropertyDto);

        // When
        propertyService.updateProperty(propertyId, requestWithPriceChange, agentId);

        // Then
        verify(propertyRepository).save(any(Property.class));
    }

    // ========================================
    // getProperty Tests
    // ========================================

    @Test
    void getProperty_WithValidPropertyAndAgent_ShouldReturnProperty() {
        // Given
        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));
        when(propertyMapper.toDto(testProperty)).thenReturn(testPropertyDto);

        // When
        PropertyDto result = propertyService.getProperty(propertyId, agentId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(propertyId);
        verify(propertyRepository).findById(propertyId);
        verify(propertyMapper).toDto(testProperty);
    }

    @Test
    void getProperty_WithNonExistentProperty_ShouldThrowException() {
        // Given
        when(propertyRepository.findById(propertyId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> propertyService.getProperty(propertyId, agentId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Property");

        verify(propertyRepository).findById(propertyId);
        verifyNoInteractions(propertyMapper);
    }

    @Test
    void getProperty_WithWrongAgent_ShouldThrowException() {
        // Given
        UUID wrongAgentId = UUID.randomUUID();
        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));

        // When & Then
        assertThatThrownBy(() -> propertyService.getProperty(propertyId, wrongAgentId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("not found or access denied");

        verify(propertyRepository).findById(propertyId);
        verifyNoInteractions(propertyMapper);
    }

    // ========================================
    // getAllProperties Tests
    // ========================================

    @Test
    void getAllProperties_WithValidAgent_ShouldReturnPageOfProperties() {
        // Given
        Pageable pageable = PageRequest.of(0, 20);
        Page<Property> propertyPage = new PageImpl<>(List.of(testProperty));

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.findByAgent(testAgent, pageable)).thenReturn(propertyPage);
        when(propertyMapper.toDto(testProperty)).thenReturn(testPropertyDto);

        // When
        Page<PropertyDto> result = propertyService.getAllProperties(agentId, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0)).isEqualTo(testPropertyDto);
        verify(agentRepository).findById(agentId);
        verify(propertyRepository).findByAgent(testAgent, pageable);
    }

    @Test
    void getAllProperties_WithNonExistentAgent_ShouldThrowException() {
        // Given
        Pageable pageable = PageRequest.of(0, 20);
        when(agentRepository.findById(agentId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> propertyService.getAllProperties(agentId, pageable))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Agent");

        verify(agentRepository).findById(agentId);
        verifyNoInteractions(propertyRepository);
    }

    @Test
    void getAllProperties_WithEmptyResults_ShouldReturnEmptyPage() {
        // Given
        Pageable pageable = PageRequest.of(0, 20);
        Page<Property> emptyPage = new PageImpl<>(List.of());

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.findByAgent(testAgent, pageable)).thenReturn(emptyPage);

        // When
        Page<PropertyDto> result = propertyService.getAllProperties(agentId, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEmpty();
    }

    // ========================================
    // deleteProperty Tests
    // ========================================

    @Test
    void deleteProperty_WithValidProperty_ShouldDeleteSuccessfully() {
        // Given
        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));
        doNothing().when(propertyImageRepository).deleteByProperty(testProperty);
        doNothing().when(propertyRepository).delete(testProperty);

        // When
        propertyService.deleteProperty(propertyId, agentId);

        // Then
        verify(propertyRepository).findById(propertyId);
        verify(propertyImageRepository).deleteByProperty(testProperty);
        verify(propertyRepository).delete(testProperty);
    }

    @Test
    void deleteProperty_WithNonExistentProperty_ShouldThrowException() {
        // Given
        when(propertyRepository.findById(propertyId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> propertyService.deleteProperty(propertyId, agentId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Property");

        verify(propertyRepository).findById(propertyId);
        verify(propertyRepository, never()).delete(any());
    }

    @Test
    void deleteProperty_WithWrongAgent_ShouldThrowException() {
        // Given
        UUID wrongAgentId = UUID.randomUUID();
        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));

        // When & Then
        assertThatThrownBy(() -> propertyService.deleteProperty(propertyId, wrongAgentId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("not found or access denied");

        verify(propertyRepository).findById(propertyId);
        verify(propertyRepository, never()).delete(any());
    }

    // ========================================
    // searchProperties Tests
    // ========================================

    @Test
    void searchProperties_WithCriteria_ShouldReturnMatchingProperties() {
        // Given
        PropertyService.PropertySearchFilter criteria = new PropertyService.PropertySearchFilter();
        criteria.setPropertyType(PropertyType.APARTMENT);
        criteria.setMinPrice(new BigDecimal("300000"));
        criteria.setMaxPrice(new BigDecimal("400000"));
        criteria.setCity("Berlin");

        Pageable pageable = PageRequest.of(0, 20);
        Page<Property> searchResults = new PageImpl<>(List.of(testProperty));

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.findByAdvancedCriteria(
            eq(testAgent),
            any(),
            eq(PropertyType.APARTMENT),
            any(),
            eq("Berlin"),
            eq(new BigDecimal("300000")),
            eq(new BigDecimal("400000")),
            any(),
            any(),
            any(),
            any(),
            eq(pageable)
        )).thenReturn(searchResults);
        when(propertyMapper.toDto(testProperty)).thenReturn(testPropertyDto);

        // When
        Page<PropertyDto> result = propertyService.searchProperties(criteria, agentId, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        verify(propertyRepository).findByAdvancedCriteria(
            any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any(), any()
        );
    }

    // ========================================
    // getPropertiesByStatus Tests
    // ========================================

    @Test
    void getPropertiesByStatus_WithValidStatus_ShouldReturnFilteredProperties() {
        // Given
        Pageable pageable = PageRequest.of(0, 20);
        Page<Property> propertyPage = new PageImpl<>(List.of(testProperty));

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.findByAgentAndStatus(testAgent, PropertyStatus.AVAILABLE, pageable))
            .thenReturn(propertyPage);
        when(propertyMapper.toDto(testProperty)).thenReturn(testPropertyDto);

        // When
        Page<PropertyDto> result = propertyService.getPropertiesByStatus(PropertyStatus.AVAILABLE, agentId, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        verify(propertyRepository).findByAgentAndStatus(testAgent, PropertyStatus.AVAILABLE, pageable);
    }

    // ========================================
    // getPropertiesByType Tests
    // ========================================

    @Test
    void getPropertiesByType_WithValidType_ShouldReturnFilteredProperties() {
        // Given
        Pageable pageable = PageRequest.of(0, 20);
        Page<Property> propertyPage = new PageImpl<>(List.of(testProperty));

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.findByAgentAndPropertyType(testAgent, PropertyType.APARTMENT, pageable))
            .thenReturn(propertyPage);
        when(propertyMapper.toDto(testProperty)).thenReturn(testPropertyDto);

        // When
        Page<PropertyDto> result = propertyService.getPropertiesByType(PropertyType.APARTMENT, agentId, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        verify(propertyRepository).findByAgentAndPropertyType(testAgent, PropertyType.APARTMENT, pageable);
    }

    // ========================================
    // getPropertiesByCity Tests
    // ========================================

    @Test
    void getPropertiesByCity_WithValidCity_ShouldReturnFilteredProperties() {
        // Given
        Pageable pageable = PageRequest.of(0, 20);
        Page<Property> propertyPage = new PageImpl<>(List.of(testProperty));

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.findByAgentAndAddressCity(testAgent, "Berlin", pageable))
            .thenReturn(propertyPage);
        when(propertyMapper.toDto(testProperty)).thenReturn(testPropertyDto);

        // When
        Page<PropertyDto> result = propertyService.getPropertiesByCity("Berlin", agentId, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        verify(propertyRepository).findByAgentAndAddressCity(testAgent, "Berlin", pageable);
    }

    // ========================================
    // getPropertiesByPriceRange Tests
    // ========================================

    @Test
    void getPropertiesByPriceRange_WithValidRange_ShouldReturnFilteredProperties() {
        // Given
        BigDecimal minPrice = new BigDecimal("300000");
        BigDecimal maxPrice = new BigDecimal("400000");
        Pageable pageable = PageRequest.of(0, 20);
        Page<Property> propertyPage = new PageImpl<>(List.of(testProperty));

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.findByAgentAndPriceRange(testAgent, minPrice, maxPrice, pageable))
            .thenReturn(propertyPage);
        when(propertyMapper.toDto(testProperty)).thenReturn(testPropertyDto);

        // When
        Page<PropertyDto> result = propertyService.getPropertiesByPriceRange(minPrice, maxPrice, agentId, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        verify(propertyRepository).findByAgentAndPriceRange(testAgent, minPrice, maxPrice, pageable);
    }

    // ========================================
    // getPropertiesByListingType Tests
    // ========================================

    @Test
    void getPropertiesByListingType_WithValidType_ShouldReturnFilteredProperties() {
        // Given
        Pageable pageable = PageRequest.of(0, 20);
        Page<Property> propertyPage = new PageImpl<>(List.of(testProperty));

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.findByAgentAndListingType(testAgent, ListingType.SALE, pageable))
            .thenReturn(propertyPage);
        when(propertyMapper.toDto(testProperty)).thenReturn(testPropertyDto);

        // When
        Page<PropertyDto> result = propertyService.getPropertiesByListingType(ListingType.SALE, agentId, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        verify(propertyRepository).findByAgentAndListingType(testAgent, ListingType.SALE, pageable);
    }

    // ========================================
    // getRecentProperties Tests
    // ========================================

    @Test
    void getRecentProperties_WithValidDays_ShouldReturnRecentProperties() {
        // Given
        int days = 7;
        List<Property> recentProperties = List.of(testProperty);

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.findRecentPropertiesByAgent(eq(testAgent), any(LocalDateTime.class)))
            .thenReturn(recentProperties);
        when(propertyMapper.toDto(testProperty)).thenReturn(testPropertyDto);

        // When
        List<PropertyDto> result = propertyService.getRecentProperties(agentId, days);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        verify(propertyRepository).findRecentPropertiesByAgent(eq(testAgent), any(LocalDateTime.class));
    }

    @Test
    void getRecentProperties_WithNoRecentProperties_ShouldReturnEmptyList() {
        // Given
        int days = 30;

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.findRecentPropertiesByAgent(eq(testAgent), any(LocalDateTime.class)))
            .thenReturn(List.of());

        // When
        List<PropertyDto> result = propertyService.getRecentProperties(agentId, days);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEmpty();
    }

    // ========================================
    // getAvailableProperties Tests
    // ========================================

    @Test
    void getAvailableProperties_WithValidDate_ShouldReturnAvailableProperties() {
        // Given
        LocalDate availableFrom = LocalDate.now();
        Pageable pageable = PageRequest.of(0, 20);
        Page<Property> propertyPage = new PageImpl<>(List.of(testProperty));

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.findAvailableProperties(testAgent, availableFrom, pageable))
            .thenReturn(propertyPage);
        when(propertyMapper.toDto(testProperty)).thenReturn(testPropertyDto);

        // When
        Page<PropertyDto> result = propertyService.getAvailableProperties(agentId, availableFrom, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        verify(propertyRepository).findAvailableProperties(testAgent, availableFrom, pageable);
    }

    // ========================================
    // countPropertiesByAgent Tests
    // ========================================

    @Test
    void countPropertiesByAgent_WithProperties_ShouldReturnCount() {
        // Given
        long expectedCount = 15L;
        when(propertyRepository.countByAgentId(agentId)).thenReturn(expectedCount);

        // When
        long result = propertyService.countPropertiesByAgent(agentId);

        // Then
        assertThat(result).isEqualTo(expectedCount);
        verify(propertyRepository).countByAgentId(agentId);
    }

    @Test
    void countPropertiesByAgent_WithNoProperties_ShouldReturnZero() {
        // Given
        when(propertyRepository.countByAgentId(agentId)).thenReturn(0L);

        // When
        long result = propertyService.countPropertiesByAgent(agentId);

        // Then
        assertThat(result).isEqualTo(0L);
        verify(propertyRepository).countByAgentId(agentId);
    }

    // ========================================
    // countPropertiesByStatus Tests
    // ========================================

    @Test
    void countPropertiesByStatus_WithValidStatus_ShouldReturnCount() {
        // Given
        long expectedCount = 5L;
        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.countByAgentAndStatus(testAgent, PropertyStatus.AVAILABLE))
            .thenReturn(expectedCount);

        // When
        long result = propertyService.countPropertiesByStatus(agentId, PropertyStatus.AVAILABLE);

        // Then
        assertThat(result).isEqualTo(expectedCount);
        verify(propertyRepository).countByAgentAndStatus(testAgent, PropertyStatus.AVAILABLE);
    }

    // ========================================
    // getPropertyStats Tests
    // ========================================

    @Test
    void getPropertyStats_ShouldReturnComprehensiveStatistics() {
        // Given
        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.countByAgent(testAgent)).thenReturn(20L);
        when(propertyRepository.countByAgentAndStatus(testAgent, PropertyStatus.AVAILABLE)).thenReturn(15L);
        when(propertyRepository.countByAgentAndStatus(testAgent, PropertyStatus.SOLD)).thenReturn(3L);
        when(propertyRepository.countByAgentAndStatus(testAgent, PropertyStatus.RENTED)).thenReturn(2L);
        when(propertyRepository.countByAgentAndListingType(testAgent, ListingType.SALE)).thenReturn(12L);
        when(propertyRepository.countByAgentAndListingType(testAgent, ListingType.RENT)).thenReturn(8L);

        // When
        PropertyService.PropertyStatsDto result = propertyService.getPropertyStats(agentId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.totalProperties).isEqualTo(20L);
        assertThat(result.availableProperties).isEqualTo(15L);
        assertThat(result.soldProperties).isEqualTo(3L);
        assertThat(result.rentedProperties).isEqualTo(2L);
        assertThat(result.saleProperties).isEqualTo(12L);
        assertThat(result.rentalProperties).isEqualTo(8L);
    }

    // ========================================
    // searchPropertiesByText Tests
    // ========================================

    @Test
    void searchPropertiesByText_WithSearchTerm_ShouldReturnMatchingProperties() {
        // Given
        String searchTerm = "Berlin";
        Pageable pageable = PageRequest.of(0, 20);
        Page<Property> searchResults = new PageImpl<>(List.of(testProperty));

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.findByAgentAndSearchTerm(testAgent, searchTerm, pageable))
            .thenReturn(searchResults);
        when(propertyMapper.toDto(testProperty)).thenReturn(testPropertyDto);

        // When
        Page<PropertyDto> result = propertyService.searchPropertiesByText(agentId, searchTerm, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        verify(propertyRepository).findByAgentAndSearchTerm(testAgent, searchTerm, pageable);
    }

    @Test
    void searchPropertiesByText_WithNoResults_ShouldReturnEmptyPage() {
        // Given
        String searchTerm = "NonExistent";
        Pageable pageable = PageRequest.of(0, 20);
        Page<Property> emptyResults = new PageImpl<>(List.of());

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(propertyRepository.findByAgentAndSearchTerm(testAgent, searchTerm, pageable))
            .thenReturn(emptyResults);

        // When
        Page<PropertyDto> result = propertyService.searchPropertiesByText(agentId, searchTerm, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEmpty();
    }

    // ========================================
    // uploadExpose Tests
    // ========================================

    @Test
    void uploadExpose_WithValidPdf_ShouldUploadSuccessfully() {
        // Given
        String base64Pdf = java.util.Base64.getEncoder().encodeToString("%PDF-1.4 test content".getBytes());
        PropertyExposeDto exposeDto = PropertyExposeDto.builder()
            .propertyId(propertyId)
            .fileName("property-expose.pdf")
            .fileData(base64Pdf)
            .fileSize(1024L)
            .build();

        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));
        when(propertyRepository.save(testProperty)).thenReturn(testProperty);

        // When
        PropertyExposeDto result = propertyService.uploadExpose(agentId, propertyId, exposeDto);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getFileName()).isEqualTo("property-expose.pdf");
        verify(propertyRepository).findById(propertyId);
        verify(propertyRepository).save(testProperty);
    }

    @Test
    void uploadExpose_WithWrongAgent_ShouldThrowException() {
        // Given
        UUID wrongAgentId = UUID.randomUUID();
        PropertyExposeDto exposeDto = PropertyExposeDto.builder()
            .fileName("test.pdf")
            .fileData("data")
            .fileSize(1024L)
            .build();

        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));

        // When & Then
        assertThatThrownBy(() -> propertyService.uploadExpose(wrongAgentId, propertyId, exposeDto))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("does not belong to the specified agent");

        verify(propertyRepository).findById(propertyId);
        verify(propertyRepository, never()).save(any());
    }

    @Test
    void uploadExpose_WithNonPdfFile_ShouldThrowException() {
        // Given
        PropertyExposeDto exposeDto = PropertyExposeDto.builder()
            .fileName("document.txt")
            .fileData("data")
            .fileSize(1024L)
            .build();

        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));

        // When & Then
        assertThatThrownBy(() -> propertyService.uploadExpose(agentId, propertyId, exposeDto))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("must be a PDF");
    }

    @Test
    void uploadExpose_WithFileTooLarge_ShouldThrowException() {
        // Given
        PropertyExposeDto exposeDto = PropertyExposeDto.builder()
            .fileName("large-file.pdf")
            .fileData("data")
            .fileSize(60_000_000L) // 60MB, exceeds 50MB limit
            .build();

        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));

        // When & Then
        assertThatThrownBy(() -> propertyService.uploadExpose(agentId, propertyId, exposeDto))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("must not exceed 50MB");
    }

    // ========================================
    // downloadExpose Tests
    // ========================================

    @Test
    void downloadExpose_WithExistingExpose_ShouldReturnExpose() {
        // Given
        testProperty.setExposeFileName("test-expose.pdf");
        testProperty.setExposeFileData("base64data");
        testProperty.setExposeFileSize(2048L);
        testProperty.setExposeUploadedAt(LocalDateTime.now());

        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));

        // When
        PropertyExposeDto result = propertyService.downloadExpose(agentId, propertyId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getFileName()).isEqualTo("test-expose.pdf");
        assertThat(result.getFileData()).isEqualTo("base64data");
        assertThat(result.getFileSize()).isEqualTo(2048L);
        verify(propertyRepository).findById(propertyId);
    }

    @Test
    void downloadExpose_WithNoExpose_ShouldThrowException() {
        // Given
        testProperty.setExposeFileName(null);
        testProperty.setExposeFileData(null);

        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));

        // When & Then
        assertThatThrownBy(() -> propertyService.downloadExpose(agentId, propertyId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("No expose found");

        verify(propertyRepository).findById(propertyId);
    }

    @Test
    void downloadExpose_WithWrongAgent_ShouldThrowException() {
        // Given
        UUID wrongAgentId = UUID.randomUUID();
        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));

        // When & Then
        assertThatThrownBy(() -> propertyService.downloadExpose(wrongAgentId, propertyId))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("does not belong to the specified agent");

        verify(propertyRepository).findById(propertyId);
    }

    // ========================================
    // deleteExpose Tests
    // ========================================

    @Test
    void deleteExpose_WithExistingExpose_ShouldDeleteSuccessfully() {
        // Given
        testProperty.setExposeFileName("test-expose.pdf");
        testProperty.setExposeFileData("base64data");
        testProperty.setExposeFileSize(2048L);

        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));
        when(propertyRepository.save(testProperty)).thenReturn(testProperty);

        // When
        propertyService.deleteExpose(agentId, propertyId);

        // Then
        assertThat(testProperty.getExposeFileName()).isNull();
        assertThat(testProperty.getExposeFileData()).isNull();
        assertThat(testProperty.getExposeFileSize()).isNull();
        verify(propertyRepository).findById(propertyId);
        verify(propertyRepository).save(testProperty);
    }

    @Test
    void deleteExpose_WithWrongAgent_ShouldThrowException() {
        // Given
        UUID wrongAgentId = UUID.randomUUID();
        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));

        // When & Then
        assertThatThrownBy(() -> propertyService.deleteExpose(wrongAgentId, propertyId))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("does not belong to the specified agent");

        verify(propertyRepository).findById(propertyId);
        verify(propertyRepository, never()).save(any());
    }

    // ========================================
    // hasExpose Tests
    // ========================================

    @Test
    void hasExpose_WithExistingExpose_ShouldReturnTrue() {
        // Given
        testProperty.setExposeFileName("test.pdf");
        testProperty.setExposeFileData("data");

        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));

        // When
        boolean result = propertyService.hasExpose(agentId, propertyId);

        // Then
        assertThat(result).isTrue();
        verify(propertyRepository).findById(propertyId);
    }

    @Test
    void hasExpose_WithNoExpose_ShouldReturnFalse() {
        // Given
        testProperty.setExposeFileName(null);
        testProperty.setExposeFileData(null);

        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));

        // When
        boolean result = propertyService.hasExpose(agentId, propertyId);

        // Then
        assertThat(result).isFalse();
        verify(propertyRepository).findById(propertyId);
    }

    @Test
    void hasExpose_WithWrongAgent_ShouldThrowException() {
        // Given
        UUID wrongAgentId = UUID.randomUUID();
        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));

        // When & Then
        assertThatThrownBy(() -> propertyService.hasExpose(wrongAgentId, propertyId))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("does not belong to the specified agent");

        verify(propertyRepository).findById(propertyId);
    }
}
