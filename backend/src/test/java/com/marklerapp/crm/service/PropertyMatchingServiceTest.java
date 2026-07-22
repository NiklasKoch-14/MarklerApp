package com.marklerapp.crm.service;

import com.marklerapp.crm.dto.ClientDto;
import com.marklerapp.crm.dto.MatchReasonDto;
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
import static org.assertj.core.api.Assertions.within;
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

    // Real mappers: scoring now reads from the mapped DTO, so a mock returning an
    // empty DTO would silently blank out every property field under test.
    private final PropertyMapper propertyMapper = realPropertyMapper();
    private final com.marklerapp.crm.mapper.PropertySearchCriteriaMapper searchCriteriaMapper =
        new com.marklerapp.crm.mapper.PropertySearchCriteriaMapperImpl();

    @Mock
    private ClientMapper clientMapper;

    private static PropertyMapper realPropertyMapper() {
        com.marklerapp.crm.mapper.PropertyMapperImpl mapper = new com.marklerapp.crm.mapper.PropertyMapperImpl();
        org.springframework.test.util.ReflectionTestUtils.setField(
            mapper, "propertyImageMapper", new com.marklerapp.crm.mapper.PropertyImageMapperImpl());
        return mapper;
    }

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
            propertyMapper, clientMapper, searchCriteriaMapper, clientService, propertyService
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

    // ========================================
    // matchClientsForProperty — warm rent weighting
    // ========================================

    private Client renterWithWarmRentBudget(String firstName, BigDecimal maxWarmRent) {
        PropertySearchCriteria criteria = PropertySearchCriteria.builder()
            .maxWarmRent(maxWarmRent)
            .restrictToSearchRadius(true)
            .build();
        Client client = Client.builder()
            .agent(agent)
            .firstName(firstName)
            .lastName("Mieter")
            .clientType(Client.ClientType.RENTER)
            .pipelineStage(Client.PipelineStage.ACTIVE_SEARCH)
            .searchCriteria(criteria)
            .build();
        client.setId(UUID.randomUUID());
        criteria.setClient(client);
        return client;
    }

    @Test
    void matchClientsForProperty_WarmRentIncludesAdditionalAndHeatingCosts() {
        // Cold rent 700 + 150 additional + 100 heating = 950 warm rent.
        PropertyDto property = PropertyDto.builder()
            .id(propertyId)
            .listingType(ListingType.RENT)
            .price(new BigDecimal("700"))
            .additionalCosts(new BigDecimal("150"))
            .heatingCosts(new BigDecimal("100"))
            .build();

        // 950 warm rent is 18.75% over this client's 800 budget — the price score
        // must drop below 100. If the costs are dropped, warm rent looks like 700
        // and the client is wrongly scored as a perfect price match.
        Client tightBudget = renterWithWarmRentBudget("Petra", new BigDecimal("800"));

        when(propertyService.getProperty(propertyId, agentId)).thenReturn(property);
        when(clientRepository.findByAgentWithSearchCriteria(any())).thenReturn(List.of(tightBudget));

        PropertyMatchResponse response = matchingService.matchClientsForProperty(
            propertyId, agentId,
            PropertyMatchRequest.builder().propertyId(propertyId).matchThreshold(0).build());

        assertThat(response.getClients()).hasSize(1);
        assertThat(response.getClients().get(0).getScoreBreakdown().getPriceScore()).isLessThan(100);
    }

    @Test
    void matchClientsForProperty_ClientWhoseWarmRentBudgetFits_RanksHotter() {
        PropertyDto property = PropertyDto.builder()
            .id(propertyId)
            .listingType(ListingType.RENT)
            .price(new BigDecimal("700"))
            .additionalCosts(new BigDecimal("150"))
            .heatingCosts(new BigDecimal("100"))
            .build();

        Client tightBudget = renterWithWarmRentBudget("Petra", new BigDecimal("800"));
        Client fittingBudget = renterWithWarmRentBudget("Jonas", new BigDecimal("1000"));

        when(propertyService.getProperty(propertyId, agentId)).thenReturn(property);
        when(clientRepository.findByAgentWithSearchCriteria(any()))
            .thenReturn(List.of(tightBudget, fittingBudget));
        when(clientMapper.toDto(any(Client.class)))
            .thenAnswer(inv -> ClientDto.builder().id(((Client) inv.getArgument(0)).getId()).build());

        PropertyMatchResponse response = matchingService.matchClientsForProperty(
            propertyId, agentId,
            PropertyMatchRequest.builder().propertyId(propertyId).matchThreshold(0).build());

        assertThat(response.getClients()).hasSize(2);
        assertThat(response.getClients().get(0).getClient().getId()).isEqualTo(fittingBudget.getId());
        assertThat(response.getClients().get(0).getMatchScore())
            .isGreaterThan(response.getClients().get(1).getMatchScore());
    }

    // ========================================
    // Score transparency (Issue #30) — the breakdown the UI shows must add up
    // ========================================

    @Test
    void matchPropertiesForClient_WeightedContributionsSumToOverallScore() {
        // The UI presents each category as "score × weight / 100" and sums them. If that
        // sum drifts from matchScore, the explanation contradicts the headline number.
        Property property = propertyIn("Berlin", BERLIN_LAT, BERLIN_LNG);
        PropertySearchCriteriaDto criteria = PropertySearchCriteriaDto.builder()
            .maxBudget(new BigDecimal("300000"))     // property is 350000 -> partial price score
            .minSquareMeters(100)                    // property is 80 -> partial area score
            .maxRooms(2)                             // property has 3 -> partial room score
            .preferredLocations(List.of("Hamburg"))  // property is Berlin -> location mismatch
            .propertyTypes(List.of("HOUSE"))         // property is APARTMENT -> type mismatch
            .build();

        when(clientService.getClientById(clientId, agentId)).thenReturn(clientWithCriteria(criteria));
        when(propertyRepository.findByAgentId(agentId, null))
            .thenReturn(new PageImpl<>(List.of(property)));

        PropertyMatchResponse response = matchingService.matchPropertiesForClient(
            clientId, agentId,
            PropertyMatchRequest.builder().clientId(clientId).matchThreshold(0).build());

        assertThat(response.getProperties()).hasSize(1);
        PropertyMatchResponse.PropertyMatchResult result = response.getProperties().get(0);
        PropertyMatchResponse.MatchScoreBreakdown breakdown = result.getScoreBreakdown();
        PropertyMatchResponse.MatchWeights weights = response.getAppliedWeights();

        assertThat(weights).isNotNull();
        assertThat(weights.getPriceWeight() + weights.getLocationWeight() + weights.getAreaWeight()
            + weights.getRoomWeight() + weights.getFeatureWeight()).isEqualTo(100);

        double sumOfContributions =
            breakdown.getPriceScore() * weights.getPriceWeight() / 100.0
                + breakdown.getLocationScore() * weights.getLocationWeight() / 100.0
                + breakdown.getAreaScore() * weights.getAreaWeight() / 100.0
                + breakdown.getRoomScore() * weights.getRoomWeight() / 100.0
                + breakdown.getFeatureScore() * weights.getFeatureWeight() / 100.0;

        assertThat((double) result.getMatchScore()).isCloseTo(sumOfContributions, within(0.5));
    }

    @Test
    void matchPropertiesForClient_CustomWeightsAreNormalizedToWholePercentagesSummingTo100() {
        // Weights that neither sum to 100 nor divide evenly — largest-remainder
        // distribution has to make up the difference, or the UI's parts won't add up.
        Property property = propertyIn("Berlin", BERLIN_LAT, BERLIN_LNG);
        PropertySearchCriteriaDto criteria = radiusCriteria(BERLIN_LAT, BERLIN_LNG, 10, true);

        when(clientService.getClientById(clientId, agentId)).thenReturn(clientWithCriteria(criteria));
        when(propertyRepository.findByAgentId(agentId, null))
            .thenReturn(new PageImpl<>(List.of(property)));

        PropertyMatchResponse response = matchingService.matchPropertiesForClient(
            clientId, agentId,
            PropertyMatchRequest.builder()
                .clientId(clientId)
                .matchThreshold(0)
                .priceWeight(1).locationWeight(1).areaWeight(1).roomWeight(1).featureWeight(1)
                .build());

        PropertyMatchResponse.MatchWeights weights = response.getAppliedWeights();
        assertThat(weights.getPriceWeight() + weights.getLocationWeight() + weights.getAreaWeight()
            + weights.getRoomWeight() + weights.getFeatureWeight()).isEqualTo(100);
    }

    @Test
    void matchPropertiesForClient_ReasonsAreTranslatableCodesNotRenderedSentences() {
        // Reasons must stay machine-readable — rendered English prose here would be
        // untranslatable in the UI.
        Property property = propertyIn("Berlin", BERLIN_LAT, BERLIN_LNG);
        PropertySearchCriteriaDto criteria = PropertySearchCriteriaDto.builder()
            .maxBudget(new BigDecimal("400000"))     // property is 350000 -> within budget
            .preferredLocations(List.of("Hamburg"))  // property is Berlin -> mismatch
            .build();

        when(clientService.getClientById(clientId, agentId)).thenReturn(clientWithCriteria(criteria));
        when(propertyRepository.findByAgentId(agentId, null))
            .thenReturn(new PageImpl<>(List.of(property)));

        PropertyMatchResponse response = matchingService.matchPropertiesForClient(
            clientId, agentId,
            PropertyMatchRequest.builder().clientId(clientId).matchThreshold(0).build());

        PropertyMatchResponse.PropertyMatchResult result = response.getProperties().get(0);

        assertThat(result.getMatchReasons())
            .extracting(MatchReasonDto::code)
            .contains("priceWithinRange");
        assertThat(result.getMatchReasons())
            .extracting(MatchReasonDto::category)
            .contains(MatchReasonDto.CATEGORY_PRICE);
        assertThat(result.getMismatchReasons())
            .extracting(MatchReasonDto::code)
            .contains("locationNoMatch");

        MatchReasonDto priceReason = result.getMatchReasons().stream()
            .filter(r -> "priceWithinRange".equals(r.code()))
            .findFirst()
            .orElseThrow();
        assertThat(priceReason.params()).containsKeys("priceKind", "value");
    }
}
