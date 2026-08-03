package com.marklerapp.crm.service;

import com.marklerapp.crm.dto.UpdatePropertyRequest;
import com.marklerapp.crm.dto.ViewingDto;
import com.marklerapp.crm.entity.*;
import com.marklerapp.crm.exception.WorkflowRuleBlockedException;
import com.marklerapp.crm.exception.WorkflowRuleWarningException;
import com.marklerapp.crm.mapper.*;
import com.marklerapp.crm.repository.*;
import com.marklerapp.crm.rules.*;
import com.marklerapp.crm.rules.property.*;
import com.marklerapp.crm.rules.viewing.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.assertj.core.api.InstanceOfAssertFactories;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Prueft die Verdrahtung: laedt der Service die richtigen Nachbardaten in den Kontext,
 * und fuehrt er die Kaskade quittierter Warnungen tatsaechlich aus?
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class WorkflowGuardIntegrationTest {

    @Mock private PropertyRepository propertyRepository;
    @Mock private PropertyImageRepository propertyImageRepository;
    @Mock private ViewingRepository viewingRepository;
    @Mock private ClientRepository clientRepository;
    @Mock private AgentRepository agentRepository;
    @Mock private PropertyMapper propertyMapper;
    @Mock private PropertyImageMapper propertyImageMapper;
    @Mock private ViewingMapper viewingMapper;
    @Mock private OwnershipValidator ownershipValidator;
    @Mock private GeocodingService geocodingService;
    @Mock private WorkflowOverrideLogger overrideLogger;

    private WorkflowGuard guard;
    private PropertyService propertyService;
    private ViewingService viewingService;
    private UUID agentId;
    private Agent agent;

    @BeforeEach
    void setUp() {
        guard = new WorkflowGuard(List.of(
                new RentMarkedSoldRule(), new SoldWithOpenViewingsRule(),
                new PropertyReopenedRule(), new ReservedWithoutViewingRule(),
                new ViewingForClosedPropertyRule(), new ViewingCompletedInFutureRule(),
                new ViewingScheduledInPastRule()));

        // Argumentreihenfolge = Feldreihenfolge der Klasse (Lombok @RequiredArgsConstructor).
        // Die drei neuen Felder kommen in Schritt 5 ans Ende der Feldliste.
        propertyService = new PropertyService(
                propertyRepository, propertyImageRepository, agentRepository, clientRepository,
                propertyMapper, propertyImageMapper, ownershipValidator, geocodingService,
                viewingRepository, guard, overrideLogger);

        viewingService = new ViewingService(
                viewingRepository, clientRepository, agentRepository, propertyRepository,
                viewingMapper, ownershipValidator, guard, overrideLogger);

        agentId = UUID.randomUUID();
        agent = new Agent();
        agent.setId(agentId);
    }

    private Property property(ListingType listingType, PropertyStatus status) {
        Property p = new Property();
        p.setId(UUID.randomUUID());
        p.setAgent(agent);
        p.setListingType(listingType);
        p.setStatus(status);
        p.setTitle("Testobjekt");
        when(propertyRepository.findById(p.getId())).thenReturn(Optional.of(p));
        when(propertyRepository.save(any(Property.class))).thenAnswer(i -> i.getArgument(0));
        return p;
    }

    private Viewing scheduledViewing(Property property) {
        Client client = new Client();
        client.setFirstName("Max");
        client.setLastName("Mueller");

        Viewing v = new Viewing();
        v.setId(UUID.randomUUID());
        v.setProperty(property);
        v.setClient(client);
        v.setViewingDate(LocalDateTime.now().plusDays(3));
        v.setStatus(Viewing.ViewingStatus.SCHEDULED);
        return v;
    }

    @Test
    void blockedRuleThrowsEvenWhenAcknowledged() {
        Property p = property(ListingType.RENT, PropertyStatus.AVAILABLE);
        UpdatePropertyRequest request = new UpdatePropertyRequest();
        request.setStatus(PropertyStatus.SOLD);
        request.setAcknowledgedRules(Set.of(RuleCode.PROPERTY_RENT_MARKED_SOLD));

        assertThatThrownBy(() -> propertyService.updateProperty(p.getId(), request, agentId))
                .isInstanceOf(WorkflowRuleBlockedException.class);

        verify(propertyRepository, never()).save(any());
        verify(viewingRepository, never()).saveAll(any());
    }

    @Test
    void unacknowledgedWarningThrowsAndSavesNothing() {
        Property p = property(ListingType.SALE, PropertyStatus.AVAILABLE);
        Viewing open = scheduledViewing(p);
        when(viewingRepository.findByPropertyIdAndStatus(p.getId(), Viewing.ViewingStatus.SCHEDULED))
                .thenReturn(List.of(open));

        UpdatePropertyRequest request = new UpdatePropertyRequest();
        request.setStatus(PropertyStatus.SOLD);

        assertThatThrownBy(() -> propertyService.updateProperty(p.getId(), request, agentId))
                .isInstanceOf(WorkflowRuleWarningException.class)
                .extracting(e -> ((WorkflowRuleWarningException) e).getViolations())
                .asInstanceOf(InstanceOfAssertFactories.list(RuleViolation.class))
                .extracting(RuleViolation::code)
                .contains(RuleCode.PROPERTY_SOLD_WITH_OPEN_VIEWINGS);

        verify(propertyRepository, never()).save(any());
        verify(viewingRepository, never()).saveAll(any());
    }

    @Test
    void acknowledgedWarningSavesAndRunsCascade() {
        Property p = property(ListingType.SALE, PropertyStatus.AVAILABLE);
        Viewing open = scheduledViewing(p);
        when(viewingRepository.findByPropertyIdAndStatus(p.getId(), Viewing.ViewingStatus.SCHEDULED))
                .thenReturn(List.of(open));
        when(viewingRepository.findAllById(List.of(open.getId()))).thenReturn(List.of(open));

        UpdatePropertyRequest request = new UpdatePropertyRequest();
        request.setStatus(PropertyStatus.SOLD);
        request.setAcknowledgedRules(Set.of(RuleCode.PROPERTY_SOLD_WITH_OPEN_VIEWINGS));

        propertyService.updateProperty(p.getId(), request, agentId);

        assertThat(p.getStatus()).isEqualTo(PropertyStatus.SOLD);
        assertThat(open.getStatus()).isEqualTo(Viewing.ViewingStatus.CANCELLED);
        verify(viewingRepository).saveAll(List.of(open));
        verify(overrideLogger).record(
                Set.of(RuleCode.PROPERTY_SOLD_WITH_OPEN_VIEWINGS), "PROPERTY", p.getId(), agentId);
    }

    @Test
    void editWithoutStatusChangeSkipsRulesEntirely() {
        Property p = property(ListingType.RENT, PropertyStatus.AVAILABLE);

        UpdatePropertyRequest request = new UpdatePropertyRequest();
        request.setTitle("Neuer Titel");

        propertyService.updateProperty(p.getId(), request, agentId);

        verify(viewingRepository, never()).findByPropertyIdAndStatus(any(), any());
        verify(propertyRepository).save(p);
    }

    @Test
    void combinedListingTypeAndStatusChangeIsEvaluatedAgainstTheTargetType() {
        // Ein einzelnes PUT, das listingType auf RENT UND status auf SOLD umstellt, darf nicht
        // durchrutschen, nur weil property.getListingType() zum Pruefzeitpunkt noch SALE ist
        // (Finding 4): der Kontext muss den Ziel-Typ tragen, nicht den Vorher-Zustand.
        Property p = property(ListingType.SALE, PropertyStatus.AVAILABLE);

        UpdatePropertyRequest request = new UpdatePropertyRequest();
        request.setListingType(ListingType.RENT);
        request.setStatus(PropertyStatus.SOLD);

        assertThatThrownBy(() -> propertyService.updateProperty(p.getId(), request, agentId))
                .isInstanceOf(WorkflowRuleBlockedException.class);

        verify(propertyRepository, never()).save(any());
    }

    @Test
    void listingTypeChangeAloneOnAlreadySoldPropertyIsBlocked() {
        // Zweite Luecke aus Finding 4: nur der Angebotstyp aendert sich (kein status im
        // Request), das Objekt ist aber bereits SOLD. statusChanges allein wuerde das
        // uebersehen -- listingTypeChanges muss die Regelpruefung ebenfalls ausloesen.
        Property p = property(ListingType.SALE, PropertyStatus.SOLD);

        UpdatePropertyRequest request = new UpdatePropertyRequest();
        request.setListingType(ListingType.RENT);

        assertThatThrownBy(() -> propertyService.updateProperty(p.getId(), request, agentId))
                .isInstanceOf(WorkflowRuleBlockedException.class);

        verify(propertyRepository, never()).save(any());
    }

    @Test
    void editWithStatusResentUnchangedSkipsRulesEntirely() {
        // Ein vollstaendiges PUT vom Frontend sendet den Status auch dann mit, wenn er
        // sich nicht geaendert hat -- das darf keine Regeln auswerten oder Termine nachladen.
        Property p = property(ListingType.SALE, PropertyStatus.AVAILABLE);

        UpdatePropertyRequest request = new UpdatePropertyRequest();
        request.setStatus(PropertyStatus.AVAILABLE);

        propertyService.updateProperty(p.getId(), request, agentId);

        verify(viewingRepository, never()).findByPropertyIdAndStatus(any(), any());
        verify(propertyRepository).save(p);
    }

    @Test
    void newViewingForSoldPropertyIsBlocked() {
        Property p = property(ListingType.SALE, PropertyStatus.SOLD);
        Client client = new Client();
        client.setId(UUID.randomUUID());
        when(clientRepository.findById(client.getId())).thenReturn(Optional.of(client));
        when(agentRepository.findById(agentId)).thenReturn(Optional.of(agent));

        ViewingDto.CreateRequest request = new ViewingDto.CreateRequest();
        request.setClientId(client.getId());
        request.setPropertyId(p.getId());
        request.setViewingDate(LocalDateTime.now().plusDays(1));

        assertThatThrownBy(() -> viewingService.createViewing(agentId, request))
                .isInstanceOf(WorkflowRuleBlockedException.class);

        verify(viewingRepository, never()).save(any());
    }

    @Test
    void cancellingViewingOnSoldPropertyIsAllowed() {
        Property p = property(ListingType.SALE, PropertyStatus.SOLD);
        Viewing existing = scheduledViewing(p);
        when(viewingRepository.findByIdWithDetails(existing.getId())).thenReturn(Optional.of(existing));
        when(viewingRepository.save(any(Viewing.class))).thenAnswer(i -> i.getArgument(0));

        ViewingDto.UpdateRequest request = new ViewingDto.UpdateRequest();
        request.setViewingDate(existing.getViewingDate());
        request.setStatus(Viewing.ViewingStatus.CANCELLED);

        viewingService.updateViewing(agentId, existing.getId(), request);

        assertThat(existing.getStatus()).isEqualTo(Viewing.ViewingStatus.CANCELLED);
    }

    @Test
    void acknowledgedWarningOnViewingCreateIsRecorded() {
        Property p = property(ListingType.SALE, PropertyStatus.AVAILABLE);
        Client client = new Client();
        client.setId(UUID.randomUUID());
        when(clientRepository.findById(client.getId())).thenReturn(Optional.of(client));
        when(agentRepository.findById(agentId)).thenReturn(Optional.of(agent));

        UUID viewingId = UUID.randomUUID();
        when(viewingRepository.save(any(Viewing.class))).thenAnswer(i -> {
            Viewing v = i.getArgument(0);
            v.setId(viewingId);
            return v;
        });

        ViewingDto.CreateRequest request = new ViewingDto.CreateRequest();
        request.setClientId(client.getId());
        request.setPropertyId(p.getId());
        request.setViewingDate(LocalDateTime.now().minusDays(1));
        request.setAcknowledgedRules(Set.of(RuleCode.VIEWING_SCHEDULED_IN_PAST));

        viewingService.createViewing(agentId, request);

        verify(overrideLogger).record(
                Set.of(RuleCode.VIEWING_SCHEDULED_IN_PAST), "VIEWING", viewingId, agentId);
    }
}
