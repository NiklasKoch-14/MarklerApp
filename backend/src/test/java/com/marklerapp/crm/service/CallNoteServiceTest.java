package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.dto.AiSummaryDto;
import com.marklerapp.crm.dto.CallNoteDto;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.CallNote;
import com.marklerapp.crm.entity.CallNote.CallOutcome;
import com.marklerapp.crm.entity.CallNote.CallType;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.mapper.CallNoteMapper;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.repository.CallNoteRepository;
import com.marklerapp.crm.repository.ClientRepository;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Comprehensive test coverage for CallNoteService.
 * Tests all CRUD operations, search, follow-ups, and AI summarization.
 */
@ExtendWith(MockitoExtension.class)
class CallNoteServiceTest {

    @Mock
    private CallNoteRepository callNoteRepository;

    @Mock
    private ClientRepository clientRepository;

    @Mock
    private AgentRepository agentRepository;

    @Mock
    private PropertyRepository propertyRepository;

    @Mock
    private OllamaService ollamaService;

    @Mock
    private AsyncSummaryService asyncSummaryService;

    @Mock
    private CallNoteMapper callNoteMapper;

    private OwnershipValidator ownershipValidator;

    private CallNoteService callNoteService;

    private Agent testAgent;
    private Client testClient;
    private Property testProperty;
    private CallNote testCallNote;
    private CallNoteDto.Response testCallNoteResponse;
    private UUID agentId;
    private UUID clientId;
    private UUID propertyId;
    private UUID callNoteId;

    @BeforeEach
    void setUp() {
        // Initialize real OwnershipValidator
        ownershipValidator = new OwnershipValidator();
        callNoteService = new CallNoteService(
            callNoteRepository,
            clientRepository,
            agentRepository,
            propertyRepository,
            ollamaService,
            asyncSummaryService,
            callNoteMapper,
            ownershipValidator
        );
        agentId = UUID.randomUUID();
        clientId = UUID.randomUUID();
        propertyId = UUID.randomUUID();
        callNoteId = UUID.randomUUID();

        testAgent = Agent.builder()
            .firstName("Max")
            .lastName("Mustermann")
            .email("max@example.com")
            .build();
        testAgent.setId(agentId);

        testClient = Client.builder()
            .agent(testAgent)
            .firstName("John")
            .lastName("Doe")
            .email("john.doe@example.com")
            .build();
        testClient.setId(clientId);

        testProperty = Property.builder()
            .agent(testAgent)
            .title("Test Property")
            .build();
        testProperty.setId(propertyId);

        testCallNote = CallNote.builder()
            .agent(testAgent)
            .client(testClient)
            .property(testProperty)
            .callDate(LocalDateTime.now())
            .durationMinutes(30)
            .callType(CallType.PHONE_OUTBOUND)
            .subject("Property viewing discussion")
            .notes("Discussed property details and scheduled viewing")
            .followUpRequired(true)
            .followUpDate(LocalDate.now().plusDays(7))
            .outcome(CallOutcome.INTERESTED)
            .build();
        testCallNote.setId(callNoteId);

        testCallNoteResponse = CallNoteDto.Response.builder()
            .id(callNoteId)
            .agentId(agentId)
            .clientId(clientId)
            .propertyId(propertyId)
            .callDate(LocalDateTime.now())
            .subject("Property viewing discussion")
            .build();
    }

    // ========================================
    // createCallNote Tests
    // ========================================

    @Test
    void createCallNote_WithValidData_ShouldReturnCreatedCallNote() {
        // Given
        CallNoteDto.CreateRequest request = CallNoteDto.CreateRequest.builder()
            .clientId(clientId)
            .propertyId(propertyId)
            .callDate(LocalDateTime.now())
            .durationMinutes(30)
            .callType(CallType.PHONE_OUTBOUND)
            .subject("Test call")
            .notes("Test notes for the call")
            .followUpRequired(true)
            .followUpDate(LocalDate.now().plusDays(7))
            .outcome(CallOutcome.INTERESTED)
            .build();

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));
        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));
        when(callNoteRepository.save(any(CallNote.class))).thenReturn(testCallNote);
        when(callNoteMapper.toResponse(testCallNote)).thenReturn(testCallNoteResponse);
        doNothing().when(asyncSummaryService).generateAndPersistSummary(clientId);

        // When
        CallNoteDto.Response result = callNoteService.createCallNote(agentId, request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(callNoteId);
        verify(agentRepository).findById(agentId);
        verify(clientRepository).findById(clientId);
        verify(propertyRepository).findById(propertyId);
        verify(callNoteRepository).save(any(CallNote.class));
        verify(asyncSummaryService).generateAndPersistSummary(clientId);
    }

    @Test
    void createCallNote_WithoutProperty_ShouldSucceed() {
        // Given
        CallNoteDto.CreateRequest request = CallNoteDto.CreateRequest.builder()
            .clientId(clientId)
            .propertyId(null)
            .callDate(LocalDateTime.now())
            .callType(CallType.PHONE_INBOUND)
            .subject("General inquiry")
            .notes("Client called to inquire about available properties")
            .build();

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));
        when(callNoteRepository.save(any(CallNote.class))).thenReturn(testCallNote);
        when(callNoteMapper.toResponse(testCallNote)).thenReturn(testCallNoteResponse);
        doNothing().when(asyncSummaryService).generateAndPersistSummary(clientId);

        // When
        CallNoteDto.Response result = callNoteService.createCallNote(agentId, request);

        // Then
        assertThat(result).isNotNull();
        verify(propertyRepository, never()).findById(any());
    }

    @Test
    void createCallNote_WithNonExistentAgent_ShouldThrowException() {
        // Given
        CallNoteDto.CreateRequest request = CallNoteDto.CreateRequest.builder()
            .clientId(clientId)
            .callDate(LocalDateTime.now())
            .callType(CallType.PHONE_OUTBOUND)
            .subject("Test")
            .notes("Test notes")
            .build();

        when(agentRepository.findById(agentId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> callNoteService.createCallNote(agentId, request))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Agent not found");

        verify(agentRepository).findById(agentId);
        verifyNoInteractions(callNoteRepository);
    }

    @Test
    void createCallNote_WithNonExistentClient_ShouldThrowException() {
        // Given
        CallNoteDto.CreateRequest request = CallNoteDto.CreateRequest.builder()
            .clientId(clientId)
            .callDate(LocalDateTime.now())
            .callType(CallType.PHONE_OUTBOUND)
            .subject("Test")
            .notes("Test notes")
            .build();

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(clientRepository.findById(clientId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> callNoteService.createCallNote(agentId, request))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Client not found");

        verify(clientRepository).findById(clientId);
        verifyNoInteractions(callNoteRepository);
    }

    @Test
    void createCallNote_WithClientBelongingToDifferentAgent_ShouldThrowException() {
        // Given
        Agent differentAgent = Agent.builder()
            .firstName("Different")
            .lastName("Agent")
            .build();
        differentAgent.setId(UUID.randomUUID());

        Client clientWithDifferentAgent = Client.builder()
            .agent(differentAgent)
            .build();
        clientWithDifferentAgent.setId(clientId);

        CallNoteDto.CreateRequest request = CallNoteDto.CreateRequest.builder()
            .clientId(clientId)
            .callDate(LocalDateTime.now())
            .callType(CallType.PHONE_OUTBOUND)
            .subject("Test")
            .notes("Test notes")
            .build();

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(clientWithDifferentAgent));

        // When & Then
        assertThatThrownBy(() -> callNoteService.createCallNote(agentId, request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Client does not belong to the specified agent");

        verifyNoInteractions(callNoteRepository);
    }

    // ========================================
    // updateCallNote Tests
    // ========================================

    @Test
    void updateCallNote_WithValidData_ShouldReturnUpdatedCallNote() {
        // Given
        CallNoteDto.UpdateRequest request = CallNoteDto.UpdateRequest.builder()
            .propertyId(propertyId)
            .callDate(LocalDateTime.now())
            .durationMinutes(45)
            .callType(CallType.MEETING)
            .subject("Updated subject")
            .notes("Updated notes")
            .followUpRequired(false)
            .outcome(CallOutcome.SCHEDULED_VIEWING)
            .build();

        when(callNoteRepository.findById(callNoteId)).thenReturn(Optional.of(testCallNote));
        when(propertyRepository.findById(propertyId)).thenReturn(Optional.of(testProperty));
        when(callNoteRepository.save(testCallNote)).thenReturn(testCallNote);
        when(callNoteMapper.toResponse(testCallNote)).thenReturn(testCallNoteResponse);
        doNothing().when(asyncSummaryService).generateAndPersistSummary(clientId);

        // When
        CallNoteDto.Response result = callNoteService.updateCallNote(agentId, callNoteId, request);

        // Then
        assertThat(result).isNotNull();
        verify(callNoteRepository).findById(callNoteId);
        verify(callNoteRepository).save(testCallNote);
        verify(asyncSummaryService).generateAndPersistSummary(clientId);
    }

    @Test
    void updateCallNote_WithNonExistentCallNote_ShouldThrowException() {
        // Given
        CallNoteDto.UpdateRequest request = CallNoteDto.UpdateRequest.builder()
            .subject("Test")
            .notes("Test notes")
            .callDate(LocalDateTime.now())
            .callType(CallType.PHONE_OUTBOUND)
            .build();

        when(callNoteRepository.findById(callNoteId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> callNoteService.updateCallNote(agentId, callNoteId, request))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Call note not found");

        verify(callNoteRepository).findById(callNoteId);
        verify(callNoteRepository, never()).save(any());
    }

    @Test
    void updateCallNote_WithWrongAgent_ShouldThrowException() {
        // Given
        UUID wrongAgentId = UUID.randomUUID();
        CallNoteDto.UpdateRequest request = CallNoteDto.UpdateRequest.builder()
            .subject("Test")
            .notes("Test notes")
            .callDate(LocalDateTime.now())
            .callType(CallType.PHONE_OUTBOUND)
            .build();

        when(callNoteRepository.findById(callNoteId)).thenReturn(Optional.of(testCallNote));

        // When & Then
        assertThatThrownBy(() -> callNoteService.updateCallNote(wrongAgentId, callNoteId, request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("does not belong to the specified agent");

        verify(callNoteRepository).findById(callNoteId);
        verify(callNoteRepository, never()).save(any());
    }

    // ========================================
    // getCallNote Tests
    // ========================================

    @Test
    void getCallNote_WithValidCallNoteAndAgent_ShouldReturnCallNote() {
        // Given
        when(callNoteRepository.findById(callNoteId)).thenReturn(Optional.of(testCallNote));
        when(callNoteMapper.toResponse(testCallNote)).thenReturn(testCallNoteResponse);

        // When
        CallNoteDto.Response result = callNoteService.getCallNote(agentId, callNoteId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(callNoteId);
        verify(callNoteRepository).findById(callNoteId);
        verify(callNoteMapper).toResponse(testCallNote);
    }

    @Test
    void getCallNote_WithNonExistentCallNote_ShouldThrowException() {
        // Given
        when(callNoteRepository.findById(callNoteId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> callNoteService.getCallNote(agentId, callNoteId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Call note not found");

        verify(callNoteRepository).findById(callNoteId);
        verifyNoInteractions(callNoteMapper);
    }

    @Test
    void getCallNote_WithWrongAgent_ShouldThrowException() {
        // Given
        UUID wrongAgentId = UUID.randomUUID();
        when(callNoteRepository.findById(callNoteId)).thenReturn(Optional.of(testCallNote));

        // When & Then
        assertThatThrownBy(() -> callNoteService.getCallNote(wrongAgentId, callNoteId))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("does not belong to the specified agent");

        verify(callNoteRepository).findById(callNoteId);
        verifyNoInteractions(callNoteMapper);
    }

    // ========================================
    // deleteCallNote Tests
    // ========================================

    @Test
    void deleteCallNote_WithValidCallNote_ShouldDeleteSuccessfully() {
        // Given
        when(callNoteRepository.findById(callNoteId)).thenReturn(Optional.of(testCallNote));
        doNothing().when(callNoteRepository).delete(testCallNote);
        doNothing().when(asyncSummaryService).generateAndPersistSummary(clientId);

        // When
        callNoteService.deleteCallNote(agentId, callNoteId);

        // Then
        verify(callNoteRepository).findById(callNoteId);
        verify(callNoteRepository).delete(testCallNote);
        verify(asyncSummaryService).generateAndPersistSummary(clientId);
    }

    @Test
    void deleteCallNote_WithNonExistentCallNote_ShouldThrowException() {
        // Given
        when(callNoteRepository.findById(callNoteId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> callNoteService.deleteCallNote(agentId, callNoteId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Call note not found");

        verify(callNoteRepository).findById(callNoteId);
        verify(callNoteRepository, never()).delete(any());
    }

    @Test
    void deleteCallNote_WithWrongAgent_ShouldThrowException() {
        // Given
        UUID wrongAgentId = UUID.randomUUID();
        when(callNoteRepository.findById(callNoteId)).thenReturn(Optional.of(testCallNote));

        // When & Then
        assertThatThrownBy(() -> callNoteService.deleteCallNote(wrongAgentId, callNoteId))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("does not belong to the specified agent");

        verify(callNoteRepository).findById(callNoteId);
        verify(callNoteRepository, never()).delete(any());
    }

    // ========================================
    // getCallNotesByClient Tests
    // ========================================

    @Test
    void getCallNotesByClient_WithValidClient_ShouldReturnPageOfCallNotes() {
        // Given
        Pageable pageable = PageRequest.of(0, 20);
        CallNoteDto.Summary summary = CallNoteDto.Summary.builder().id(callNoteId).build();
        Page<CallNote> callNotesPage = new PageImpl<>(List.of(testCallNote));

        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));
        when(callNoteRepository.findByClientOrderByCallDateDesc(testClient, pageable))
            .thenReturn(callNotesPage);
        when(callNoteMapper.toSummary(testCallNote)).thenReturn(summary);

        // When
        Page<CallNoteDto.Summary> result = callNoteService.getCallNotesByClient(agentId, clientId, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        verify(clientRepository).findById(clientId);
        verify(callNoteRepository).findByClientOrderByCallDateDesc(testClient, pageable);
    }

    @Test
    void getCallNotesByClient_WithClientFromDifferentAgent_ShouldThrowException() {
        // Given
        Agent differentAgent = Agent.builder()
            .build();
        differentAgent.setId(UUID.randomUUID());

        Client clientWithDifferentAgent = Client.builder()
            .agent(differentAgent)
            .build();
        clientWithDifferentAgent.setId(clientId);

        Pageable pageable = PageRequest.of(0, 20);

        when(clientRepository.findById(clientId)).thenReturn(Optional.of(clientWithDifferentAgent));

        // When & Then
        assertThatThrownBy(() -> callNoteService.getCallNotesByClient(agentId, clientId, pageable))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Client does not belong to the specified agent");

        verifyNoInteractions(callNoteRepository);
    }

    // ========================================
    // getCallNotesByAgent Tests
    // ========================================

    @Test
    void getCallNotesByAgent_WithValidAgent_ShouldReturnPageOfCallNotes() {
        // Given
        Pageable pageable = PageRequest.of(0, 20);
        CallNoteDto.Summary summary = CallNoteDto.Summary.builder().id(callNoteId).build();
        Page<CallNote> callNotesPage = new PageImpl<>(List.of(testCallNote));

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(callNoteRepository.findByAgentOrderByCallDateDesc(testAgent, pageable))
            .thenReturn(callNotesPage);
        when(callNoteMapper.toSummary(testCallNote)).thenReturn(summary);

        // When
        Page<CallNoteDto.Summary> result = callNoteService.getCallNotesByAgent(agentId, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        verify(agentRepository).findById(agentId);
        verify(callNoteRepository).findByAgentOrderByCallDateDesc(testAgent, pageable);
    }

    @Test
    void getCallNotesByAgent_WithNonExistentAgent_ShouldThrowException() {
        // Given
        Pageable pageable = PageRequest.of(0, 20);
        when(agentRepository.findById(agentId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> callNoteService.getCallNotesByAgent(agentId, pageable))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Agent not found");

        verifyNoInteractions(callNoteRepository);
    }

    // ========================================
    // searchCallNotes Tests
    // ========================================

    @Test
    void searchCallNotes_WithSearchTerm_ShouldReturnMatchingCallNotes() {
        // Given
        CallNoteDto.SearchFilter filter = CallNoteDto.SearchFilter.builder()
            .searchTerm("viewing")
            .build();

        Pageable pageable = PageRequest.of(0, 20);
        CallNoteDto.Summary summary = CallNoteDto.Summary.builder().id(callNoteId).build();
        Page<CallNote> searchResults = new PageImpl<>(List.of(testCallNote));

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(callNoteRepository.findByAgentAndSearchTerm(testAgent, "viewing", pageable))
            .thenReturn(searchResults);
        when(callNoteMapper.toSummary(testCallNote)).thenReturn(summary);

        // When
        Page<CallNoteDto.Summary> result = callNoteService.searchCallNotes(agentId, filter, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        verify(callNoteRepository).findByAgentAndSearchTerm(testAgent, "viewing", pageable);
    }

    @Test
    void searchCallNotes_WithEmptySearchTerm_ShouldReturnAllCallNotes() {
        // Given
        CallNoteDto.SearchFilter filter = CallNoteDto.SearchFilter.builder()
            .searchTerm("")
            .build();

        Pageable pageable = PageRequest.of(0, 20);
        CallNoteDto.Summary summary = CallNoteDto.Summary.builder().id(callNoteId).build();
        Page<CallNote> allCallNotes = new PageImpl<>(List.of(testCallNote));

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(callNoteRepository.findByAgentOrderByCallDateDesc(testAgent, pageable))
            .thenReturn(allCallNotes);
        when(callNoteMapper.toSummary(testCallNote)).thenReturn(summary);

        // When
        Page<CallNoteDto.Summary> result = callNoteService.searchCallNotes(agentId, filter, pageable);

        // Then
        assertThat(result).isNotNull();
        verify(callNoteRepository).findByAgentOrderByCallDateDesc(testAgent, pageable);
        verify(callNoteRepository, never()).findByAgentAndSearchTerm(any(), any(), any());
    }

    // ========================================
    // getFollowUpReminders Tests
    // ========================================

    @Test
    void getFollowUpReminders_WithPendingFollowUps_ShouldReturnReminders() {
        // Given
        CallNoteDto.FollowUpReminder reminder = CallNoteDto.FollowUpReminder.builder()
            .id(callNoteId)
            .build();

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(callNoteRepository.findCallNotesRequiringFollowUp())
            .thenReturn(List.of(testCallNote));
        when(callNoteMapper.toFollowUpReminder(testCallNote)).thenReturn(reminder);

        // When
        List<CallNoteDto.FollowUpReminder> result = callNoteService.getFollowUpReminders(agentId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        verify(callNoteRepository).findCallNotesRequiringFollowUp();
    }

    @Test
    void getFollowUpReminders_WithNoFollowUps_ShouldReturnEmptyList() {
        // Given
        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(callNoteRepository.findCallNotesRequiringFollowUp()).thenReturn(List.of());

        // When
        List<CallNoteDto.FollowUpReminder> result = callNoteService.getFollowUpReminders(agentId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEmpty();
    }

    // ========================================
    // getOverdueFollowUps Tests
    // ========================================

    @Test
    void getOverdueFollowUps_WithOverdueFollowUps_ShouldReturnReminders() {
        // Given
        CallNoteDto.FollowUpReminder reminder = CallNoteDto.FollowUpReminder.builder()
            .id(callNoteId)
            .build();

        when(callNoteRepository.findOverdueFollowUps(any(LocalDate.class)))
            .thenReturn(List.of(testCallNote));
        when(callNoteMapper.toFollowUpReminder(testCallNote)).thenReturn(reminder);

        // When
        List<CallNoteDto.FollowUpReminder> result = callNoteService.getOverdueFollowUps(agentId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        verify(callNoteRepository).findOverdueFollowUps(any(LocalDate.class));
    }

    @Test
    void getOverdueFollowUps_WithNoOverdueFollowUps_ShouldReturnEmptyList() {
        // Given
        when(callNoteRepository.findOverdueFollowUps(any(LocalDate.class))).thenReturn(List.of());

        // When
        List<CallNoteDto.FollowUpReminder> result = callNoteService.getOverdueFollowUps(agentId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEmpty();
    }

    // ========================================
    // getClientCallNotesSummary Tests
    // ========================================

    @Test
    void getClientCallNotesSummary_WithCallNotes_ShouldReturnSummary() {
        // Given
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));
        when(callNoteRepository.findByClientOrderByCallDateDesc(testClient))
            .thenReturn(List.of(testCallNote));

        // When
        CallNoteDto.BulkSummary result = callNoteService.getClientCallNotesSummary(agentId, clientId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getClientId()).isEqualTo(clientId);
        assertThat(result.getTotalCallNotes()).isEqualTo(1);
        assertThat(result.getLastCallDate()).isNotNull();
        verify(clientRepository).findById(clientId);
        verify(callNoteRepository).findByClientOrderByCallDateDesc(testClient);
    }

    @Test
    void getClientCallNotesSummary_WithNoCallNotes_ShouldReturnEmptySummary() {
        // Given
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));
        when(callNoteRepository.findByClientOrderByCallDateDesc(testClient))
            .thenReturn(List.of());

        // When
        CallNoteDto.BulkSummary result = callNoteService.getClientCallNotesSummary(agentId, clientId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getClientId()).isEqualTo(clientId);
        assertThat(result.getTotalCallNotes()).isEqualTo(0);
        assertThat(result.getLastCallDate()).isNull();
    }

    // ========================================
    // generateAiSummary Tests
    // ========================================

    @Test
    void generateAiSummary_WithExistingSummary_ShouldReturnStoredSummary() {
        // Given
        String existingSummary = "This is an existing AI summary";
        LocalDateTime summaryDate = LocalDateTime.now().minusHours(1);
        testClient.setAiSummary(existingSummary);
        testClient.setAiSummaryUpdatedAt(summaryDate);

        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));
        when(callNoteRepository.findByClientOrderByCallDateDesc(testClient))
            .thenReturn(List.of(testCallNote));

        // When
        AiSummaryDto result = callNoteService.generateAiSummary(clientId, agentId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getSummary()).isEqualTo(existingSummary);
        assertThat(result.getGeneratedAt()).isEqualTo(summaryDate);
        assertThat(result.getCallNotesCount()).isEqualTo(1);
        assertThat(result.isAvailable()).isTrue();
        verifyNoInteractions(asyncSummaryService);
    }

    @Test
    void generateAiSummary_WithNoExistingSummary_ShouldTriggerGeneration() {
        // Given
        testClient.setAiSummary(null);
        testClient.setAiSummaryUpdatedAt(null);

        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));
        when(callNoteRepository.findByClientOrderByCallDateDesc(testClient))
            .thenReturn(List.of(testCallNote));
        doNothing().when(asyncSummaryService).generateAndPersistSummary(clientId);

        // When
        AiSummaryDto result = callNoteService.generateAiSummary(clientId, agentId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getSummary()).contains("wird gerade generiert");
        assertThat(result.isAvailable()).isFalse();
        verify(asyncSummaryService).generateAndPersistSummary(clientId);
    }

    @Test
    void generateAiSummary_WithNoCallNotes_ShouldThrowException() {
        // Given
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));
        when(callNoteRepository.findByClientOrderByCallDateDesc(testClient))
            .thenReturn(List.of());

        // When & Then
        assertThatThrownBy(() -> callNoteService.generateAiSummary(clientId, agentId))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("No call notes found");
    }

    @Test
    void generateAiSummary_WithWrongAgent_ShouldThrowException() {
        // Given
        UUID wrongAgentId = UUID.randomUUID();
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));

        // When & Then
        assertThatThrownBy(() -> callNoteService.generateAiSummary(clientId, wrongAgentId))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Not authorized");

        verifyNoInteractions(callNoteRepository);
    }
}
