package com.marklerapp.crm.service;

import com.marklerapp.crm.dto.DashboardAnalyticsDto;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.CallNote;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.repository.CallNoteRepository;
import com.marklerapp.crm.repository.ClientRepository;
import com.marklerapp.crm.repository.PropertyRepository;
import com.marklerapp.crm.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Trennung der beiden Trichter (Issue #38). Der Käufer-Trichter darf Verkäufer nicht
 * mitzählen, und der Verkäufer-Trichter muss kumulativ zählen — sonst rutscht ein
 * Eigentümer beim Fortschritt aus der vorherigen Stufe und die Quoten übersteigen 100 %.
 */
@ExtendWith(MockitoExtension.class)
class DashboardAnalyticsSellerFunnelTest {

    @Mock private AgentRepository agentRepository;
    @Mock private ClientRepository clientRepository;
    @Mock private PropertyRepository propertyRepository;
    @Mock private CallNoteRepository callNoteRepository;
    @Mock private TaskRepository taskRepository;

    private DashboardAnalyticsService service;
    private Agent agent;
    private UUID agentId;

    @BeforeEach
    void setUp() {
        agentId = UUID.randomUUID();
        agent = Agent.builder().firstName("Max").lastName("Makler").email("max@example.com").build();
        agent.setId(agentId);

        service = new DashboardAnalyticsService(
                agentRepository, clientRepository, propertyRepository, callNoteRepository, taskRepository);
    }

    private Client seller(Client.SellerPipelineStage stage) {
        Client c = Client.builder()
                .agent(agent)
                .firstName("Erika")
                .lastName("Eigentuemer")
                .clientType(Client.ClientType.SELLER)
                .sellerPipelineStage(stage)
                .build();
        c.setId(UUID.randomUUID());
        return c;
    }

    private Client buyer(Client.PipelineStage stage) {
        Client c = Client.builder()
                .agent(agent)
                .firstName("Bernd")
                .lastName("Bieter")
                .clientType(Client.ClientType.BUYER)
                .pipelineStage(stage)
                .build();
        c.setId(UUID.randomUUID());
        return c;
    }

    private CallNote note(Client client, CallNote.CallOutcome outcome) {
        CallNote n = CallNote.builder()
                .client(client)
                .agent(agent)
                .callDate(LocalDateTime.now())
                .outcome(outcome)
                .build();
        n.setId(UUID.randomUUID());
        return n;
    }

    private DashboardAnalyticsDto analyticsFor(List<Client> clients, List<CallNote> notes) {
        when(agentRepository.findById(agentId)).thenReturn(Optional.of(agent));
        when(clientRepository.findByAgent(agent)).thenReturn(clients);
        when(callNoteRepository.findByAgentOrderByCallDateDesc(any(Agent.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(notes));
        Page<com.marklerapp.crm.entity.Property> empty = new PageImpl<>(List.of());
        when(propertyRepository.findByAgent(any(Agent.class), any(Pageable.class))).thenReturn(empty);
        return service.generateAnalytics(agentId);
    }

    @Test
    void sellerFunnel_CountsCumulatively() {
        List<Client> clients = List.of(
                seller(Client.SellerPipelineStage.LEAD),
                seller(Client.SellerPipelineStage.VALUATION),
                seller(Client.SellerPipelineStage.PITCH),
                seller(Client.SellerPipelineStage.MANDATE),
                seller(Client.SellerPipelineStage.SOLD),
                seller(Client.SellerPipelineStage.LOST));

        var funnel = analyticsFor(clients, List.of()).getSellerPipeline();

        assertThat(funnel.getTotalSellers()).isEqualTo(6);
        // VALUATION, PITCH, MANDATE und SOLD haben alle mindestens die Wertermittlung erreicht
        assertThat(funnel.getValuations()).isEqualTo(4);
        assertThat(funnel.getPitches()).isEqualTo(3);
        assertThat(funnel.getMandates()).isEqualTo(2);
        assertThat(funnel.getSold()).isEqualTo(1);
        assertThat(funnel.getLost()).isEqualTo(1);
    }

    @Test
    void sellerFunnel_RatesNeverExceedHundredPercent() {
        List<Client> clients = List.of(
                seller(Client.SellerPipelineStage.SOLD),
                seller(Client.SellerPipelineStage.MANDATE),
                seller(Client.SellerPipelineStage.LEAD));

        var funnel = analyticsFor(clients, List.of()).getSellerPipeline();

        assertThat(funnel.getValuationRate()).isLessThanOrEqualTo(100.0);
        assertThat(funnel.getPitchRate()).isLessThanOrEqualTo(100.0);
        assertThat(funnel.getMandateRate()).isLessThanOrEqualTo(100.0);
        assertThat(funnel.getSoldRate()).isLessThanOrEqualTo(100.0);
        // 2 von 3 Eigentümern haben einen Auftrag (auf eine Dezimalstelle gerundet)
        assertThat(funnel.getOverallMandateRate()).isEqualTo(66.7);
    }

    @Test
    void sellerFunnel_WithoutSellers_IsEmptyRatherThanNull() {
        var funnel = analyticsFor(List.of(buyer(Client.PipelineStage.PROSPECT)), List.of())
                .getSellerPipeline();

        assertThat(funnel).isNotNull();
        assertThat(funnel.getTotalSellers()).isZero();
        assertThat(funnel.getOverallMandateRate()).isZero();
    }

    @Test
    void buyerFunnel_ExcludesSellersAndTheirCallNotes() {
        Client sellerClient = seller(Client.SellerPipelineStage.MANDATE);
        Client buyerClient = buyer(Client.PipelineStage.ACTIVE_SEARCH);

        // Der Eigentümer hat ein Gespräch mit Ergebnis "Besichtigung vereinbart" —
        // ohne die Trennung würde er die Besichtigungsquote der Käufer aufblähen.
        List<CallNote> notes = List.of(
                note(sellerClient, CallNote.CallOutcome.SCHEDULED_VIEWING),
                note(buyerClient, CallNote.CallOutcome.INTERESTED));

        var funnel = analyticsFor(List.of(sellerClient, buyerClient), notes).getConversionFunnel();

        assertThat(funnel.getTotalClients()).isEqualTo(1);
        assertThat(funnel.getInterestedClients()).isEqualTo(1);
        assertThat(funnel.getScheduledViewings()).isZero();
    }
}
