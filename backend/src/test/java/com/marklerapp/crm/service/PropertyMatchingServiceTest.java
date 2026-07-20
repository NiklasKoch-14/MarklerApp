package com.marklerapp.crm.service;

import com.marklerapp.crm.dto.ClientDto;
import com.marklerapp.crm.dto.PropertyDto;
import com.marklerapp.crm.dto.PropertyMatchRequest;
import com.marklerapp.crm.dto.PropertyMatchResponse;
import com.marklerapp.crm.dto.PropertySearchCriteriaDto;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.ListingType;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertySearchCriteria;
import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.entity.PropertyType;
import com.marklerapp.crm.mapper.ClientMapper;
import com.marklerapp.crm.mapper.PropertyMapper;
import com.marklerapp.crm.repository.ClientRepository;
import com.marklerapp.crm.repository.PropertyRepository;
import com.marklerapp.crm.repository.ViewingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * Covers the geo-based radius matching added for the location feature (Issue #19):
 * the hard filter that excludes out-of-radius properties by default, the
 * restrictToSearchRadius checkbox that lifts it, and the fallback to the legacy
 * city/postal-code text matching whenever either side lacks coordinates.
 */
@ExtendWith(MockitoExtension.class)
class PropertyMatchingServiceTest {

    // Berlin Mitte and Munich Marienplatz — real coordinates, ~504 km apart, used to
    // exercise "clearly inside" vs "clearly outside" a small search radius.
    private static final BigDecimal BERLIN_LAT = new BigDecimal("52.5200");
    private static final BigDecimal BERLIN_LNG = new BigDecimal("13.4050");
    private static final BigDecimal MUNICH_LAT = new BigDecimal("48.1351");
    private static final BigDecimal MUNICH_LNG = new BigDecimal("11.5820");

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private ClientRepository clientRepository;

    @Mock
    private ViewingRepository viewingRepository;

    @Mock
    private PropertyMapper propertyMapper;

    @Mock
    private ClientMapper clientMapper;

    @Mock
    private ClientService clientService;

    @Mock
    private PropertyService propertyService;

    private PropertyMatchingService matchingService;

    private UUID agentId;
    private UUID clientId;
    private UUID propertyId;
    private Agent agent;

    @BeforeEach
    void setUp() {
        matchingService = new PropertyMatchingService(
            propertyRepository, clientRepository, viewingRepository,
            propertyMapper, clientMapper, clientService, propertyService
        );

        agentId = UUID.randomUUID();
        clientId = UUID.randomUUID();
        propertyId = UUID.randomUUID();
        agent = Agent.builder().firstName("Max").lastName("Makler").email("max@example.com").build();
        agent.setId(agentId);

        // Not every test below exercises both matching directions, so these shared
        // fixtures are stubbed leniently rather than duplicated per test.
        lenient().when(viewingRepository.findByClient_Id(any())).thenReturn(List.of());
        lenient().when(viewingRepository.findByProperty_Id(any())).thenReturn(List.of());
        lenient().when(propertyMapper.toDto(any(Property.class))).thenAnswer(inv -> PropertyDto.builder().build());
        lenient().when(clientMapper.toDto(any(Client.class))).thenAnswer(inv -> ClientDto.builder().build());
    }

    private Property propertyIn(String city, BigDecimal lat, BigDecimal lng) {
        // Price/area/rooms are set so those score components land on their "no
        // constraints specified" branch (100) rather than "not specified on property"
        // (50) — keeps locationScore the only variable across these tests.
        Property property = Property.builder()
            .agent(agent)
            .title("Testobjekt " + city)
            .propertyType(PropertyType.APARTMENT)
            .listingType(ListingType.SALE)
            .status(PropertyStatus.AVAILABLE)
            .addressStreet("Teststraße")
            .addressCity(city)
            .addressPostalCode("10115")
            .latitude(lat)
            .longitude(lng)
            .price(new BigDecimal("350000"))
            .livingAreaSqm(new BigDecimal("80"))
            .rooms(new BigDecimal("3"))
            .build();
        property.setId(UUID.randomUUID());
        return property;
    }

    private PropertySearchCriteriaDto radiusCriteria(BigDecimal lat, BigDecimal lng, int radiusKm,
                                                       boolean restrictToSearchRadius) {
        return PropertySearchCriteriaDto.builder()
            .latitude(lat)
            .longitude(lng)
            .searchRadiusKm(radiusKm)
            .restrictToSearchRadius(restrictToSearchRadius)
            .build();
    }

    private ClientDto clientWithCriteria(PropertySearchCriteriaDto criteria) {
        return ClientDto.builder()
            .id(clientId)
            .clientType(Client.ClientType.BUYER)
            .searchCriteria(criteria)
            .build();
    }

    // ========================================
    // matchPropertiesForClient — hard radius filter
    // ========================================

    @Test
    void matchPropertiesForClient_PropertyWithinRadius_IsIncludedWithHighScore() {
        Property nearby = propertyIn("Berlin", BERLIN_LAT, BERLIN_LNG);
        PropertySearchCriteriaDto criteria = radiusCriteria(BERLIN_LAT, BERLIN_LNG, 10, true);

        when(clientService.getClientById(clientId, agentId)).thenReturn(clientWithCriteria(criteria));
        when(propertyRepository.findByAgentId(agentId, null))
            .thenReturn(new PageImpl<>(List.of(nearby)));

        PropertyMatchResponse response = matchingService.matchPropertiesForClient(
            clientId, agentId, PropertyMatchRequest.builder().clientId(clientId).build());

        assertThat(response.getProperties()).hasSize(1);
        assertThat(response.getProperties().get(0).getScoreBreakdown().getLocationScore()).isEqualTo(100);
    }

    @Test
    void matchPropertiesForClient_PropertyOutsideRadius_IsExcludedWhenRestricted() {
        Property farAway = propertyIn("München", MUNICH_LAT, MUNICH_LNG);
        PropertySearchCriteriaDto criteria = radiusCriteria(BERLIN_LAT, BERLIN_LNG, 10, true);

        when(clientService.getClientById(clientId, agentId)).thenReturn(clientWithCriteria(criteria));
        when(propertyRepository.findByAgentId(agentId, null))
            .thenReturn(new PageImpl<>(List.of(farAway)));

        PropertyMatchResponse response = matchingService.matchPropertiesForClient(
            clientId, agentId, PropertyMatchRequest.builder().clientId(clientId).build());

        assertThat(response.getProperties()).isEmpty();
    }

    @Test
    void matchPropertiesForClient_PropertyOutsideRadius_IsIncludedWhenRestrictionDisabled() {
        Property farAway = propertyIn("München", MUNICH_LAT, MUNICH_LNG);
        // restrictToSearchRadius=false: the checkbox is unchecked, so out-of-radius
        // properties stay in the results — just scored lower.
        PropertySearchCriteriaDto criteria = radiusCriteria(BERLIN_LAT, BERLIN_LNG, 10, false);

        when(clientService.getClientById(clientId, agentId)).thenReturn(clientWithCriteria(criteria));
        when(propertyRepository.findByAgentId(agentId, null))
            .thenReturn(new PageImpl<>(List.of(farAway)));

        PropertyMatchResponse response = matchingService.matchPropertiesForClient(
            clientId, agentId,
            PropertyMatchRequest.builder().clientId(clientId).matchThreshold(0).build());

        assertThat(response.getProperties()).hasSize(1);
        assertThat(response.getProperties().get(0).getScoreBreakdown().getLocationScore()).isLessThan(70);
    }

    @Test
    void matchPropertiesForClient_UngeocodedProperty_FallsBackToTextMatchingInsteadOfBeingExcluded() {
        // Property has no coordinates yet (created before the geocoding feature, or
        // Nominatim failed) — the hard filter must not silently hide it.
        Property ungeocoded = Property.builder()
            .agent(agent)
            .title("Altbestand ohne Geokoordinaten")
            .propertyType(PropertyType.APARTMENT)
            .listingType(ListingType.SALE)
            .status(PropertyStatus.AVAILABLE)
            .addressStreet("Teststraße")
            .addressCity("Berlin")
            .addressPostalCode("10115")
            .price(new BigDecimal("350000"))
            .livingAreaSqm(new BigDecimal("80"))
            .rooms(new BigDecimal("3"))
            .build();
        ungeocoded.setId(UUID.randomUUID());

        PropertySearchCriteriaDto criteria = radiusCriteria(BERLIN_LAT, BERLIN_LNG, 10, true);

        when(clientService.getClientById(clientId, agentId)).thenReturn(clientWithCriteria(criteria));
        when(propertyRepository.findByAgentId(agentId, null))
            .thenReturn(new PageImpl<>(List.of(ungeocoded)));

        PropertyMatchResponse response = matchingService.matchPropertiesForClient(
            clientId, agentId, PropertyMatchRequest.builder().clientId(clientId).build());

        assertThat(response.getProperties()).hasSize(1);
    }

    @Test
    void matchPropertiesForClient_CriteriaWithoutPin_UsesLegacyBehaviorUnaffected() {
        // No map pin ever set on this client's criteria — regression check that the
        // new radius gate doesn't change anything for pre-existing, text-only criteria.
        Property farAway = propertyIn("München", MUNICH_LAT, MUNICH_LNG);
        PropertySearchCriteriaDto criteria = PropertySearchCriteriaDto.builder().build();

        when(clientService.getClientById(clientId, agentId)).thenReturn(clientWithCriteria(criteria));
        when(propertyRepository.findByAgentId(agentId, null))
            .thenReturn(new PageImpl<>(List.of(farAway)));

        PropertyMatchResponse response = matchingService.matchPropertiesForClient(
            clientId, agentId, PropertyMatchRequest.builder().clientId(clientId).build());

        assertThat(response.getProperties()).hasSize(1);
    }

    // ========================================
    // matchClientsForProperty — mirrored gate, property -> clients direction
    // ========================================

    @Test
    void matchClientsForProperty_ClientOutsideRadius_IsExcludedWhenRestricted() {
        PropertyDto property = PropertyDto.builder()
            .id(propertyId)
            .listingType(ListingType.SALE)
            .latitude(BERLIN_LAT)
            .longitude(BERLIN_LNG)
            .build();

        PropertySearchCriteria criteria = PropertySearchCriteria.builder()
            .latitude(MUNICH_LAT)
            .longitude(MUNICH_LNG)
            .searchRadiusKm(10)
            .restrictToSearchRadius(true)
            .build();

        Client client = Client.builder()
            .agent(agent)
            .firstName("Petra")
            .lastName("Fern")
            .clientType(Client.ClientType.BUYER)
            .pipelineStage(Client.PipelineStage.ACTIVE_SEARCH)
            .searchCriteria(criteria)
            .build();
        client.setId(UUID.randomUUID());
        criteria.setClient(client);

        when(propertyService.getProperty(propertyId, agentId)).thenReturn(property);
        when(clientRepository.findByAgentWithSearchCriteria(any())).thenReturn(List.of(client));

        PropertyMatchResponse response = matchingService.matchClientsForProperty(
            propertyId, agentId, PropertyMatchRequest.builder().propertyId(propertyId).build());

        assertThat(response.getClients()).isEmpty();
    }

    @Test
    void matchClientsForProperty_ClientWithinRadius_IsIncluded() {
        PropertyDto property = PropertyDto.builder()
            .id(propertyId)
            .listingType(ListingType.SALE)
            .latitude(BERLIN_LAT)
            .longitude(BERLIN_LNG)
            .build();

        PropertySearchCriteria criteria = PropertySearchCriteria.builder()
            .latitude(BERLIN_LAT)
            .longitude(BERLIN_LNG)
            .searchRadiusKm(10)
            .restrictToSearchRadius(true)
            .build();

        Client client = Client.builder()
            .agent(agent)
            .firstName("Jonas")
            .lastName("Nah")
            .clientType(Client.ClientType.BUYER)
            .pipelineStage(Client.PipelineStage.ACTIVE_SEARCH)
            .searchCriteria(criteria)
            .build();
        client.setId(UUID.randomUUID());
        criteria.setClient(client);

        when(propertyService.getProperty(propertyId, agentId)).thenReturn(property);
        when(clientRepository.findByAgentWithSearchCriteria(any())).thenReturn(List.of(client));

        PropertyMatchResponse response = matchingService.matchClientsForProperty(
            propertyId, agentId,
            PropertyMatchRequest.builder().propertyId(propertyId).matchThreshold(0).build());

        assertThat(response.getClients()).hasSize(1);
    }
}
