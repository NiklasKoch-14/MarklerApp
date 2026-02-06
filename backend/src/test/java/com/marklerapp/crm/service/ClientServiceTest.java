package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.dto.ClientDto;
import com.marklerapp.crm.dto.PropertySearchCriteriaDto;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.PropertySearchCriteria;
import com.marklerapp.crm.mapper.ClientMapper;
import com.marklerapp.crm.mapper.PropertySearchCriteriaMapper;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.repository.ClientRepository;
import com.marklerapp.crm.repository.PropertySearchCriteriaRepository;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Comprehensive test coverage for ClientService.
 * Tests all CRUD operations, search functionality, and business logic validation.
 */
@ExtendWith(MockitoExtension.class)
class ClientServiceTest {

    @Mock
    private ClientRepository clientRepository;

    @Mock
    private AgentRepository agentRepository;

    @Mock
    private PropertySearchCriteriaRepository searchCriteriaRepository;

    @Mock
    private ClientMapper clientMapper;

    @Mock
    private PropertySearchCriteriaMapper searchCriteriaMapper;

    @InjectMocks
    private ClientService clientService;

    private Agent testAgent;
    private Client testClient;
    private ClientDto testClientDto;
    private UUID agentId;
    private UUID clientId;

    @BeforeEach
    void setUp() {
        agentId = UUID.randomUUID();
        clientId = UUID.randomUUID();

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
            .phone("+49 123 456789")
            .addressCity("Berlin")
            .addressPostalCode("10115")
            .addressCountry("Germany")
            .gdprConsentGiven(true)
            .gdprConsentDate(LocalDateTime.now())
            .build();
        testClient.setId(clientId);

        testClientDto = ClientDto.builder()
            .id(clientId)
            .agentId(agentId)
            .firstName("John")
            .lastName("Doe")
            .email("john.doe@example.com")
            .phone("+49 123 456789")
            .addressCity("Berlin")
            .addressPostalCode("10115")
            .addressCountry("Germany")
            .gdprConsentGiven(true)
            .gdprConsentDate(LocalDateTime.now())
            .build();
    }

    // ========================================
    // getClientsByAgent Tests
    // ========================================

    @Test
    void getClientsByAgent_WithValidAgent_ShouldReturnPageOfClients() {
        // Given
        Pageable pageable = PageRequest.of(0, 20);
        Page<Client> clientPage = new PageImpl<>(List.of(testClient));

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(clientRepository.findByAgent(testAgent, pageable)).thenReturn(clientPage);
        when(clientMapper.toDto(testClient)).thenReturn(testClientDto);

        // When
        Page<ClientDto> result = clientService.getClientsByAgent(agentId, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0)).isEqualTo(testClientDto);
        verify(agentRepository).findById(agentId);
        verify(clientRepository).findByAgent(testAgent, pageable);
        verify(clientMapper).toDto(testClient);
    }

    @Test
    void getClientsByAgent_WithNonExistentAgent_ShouldThrowException() {
        // Given
        Pageable pageable = PageRequest.of(0, 20);
        when(agentRepository.findById(agentId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> clientService.getClientsByAgent(agentId, pageable))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Agent");

        verify(agentRepository).findById(agentId);
        verifyNoInteractions(clientRepository);
    }

    @Test
    void getClientsByAgent_WithEmptyResults_ShouldReturnEmptyPage() {
        // Given
        Pageable pageable = PageRequest.of(0, 20);
        Page<Client> emptyPage = new PageImpl<>(List.of());

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(clientRepository.findByAgent(testAgent, pageable)).thenReturn(emptyPage);

        // When
        Page<ClientDto> result = clientService.getClientsByAgent(agentId, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEmpty();
        verify(agentRepository).findById(agentId);
        verify(clientRepository).findByAgent(testAgent, pageable);
    }

    // ========================================
    // getClientById Tests
    // ========================================

    @Test
    void getClientById_WithValidClientAndAgent_ShouldReturnClient() {
        // Given
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));
        when(clientMapper.toDto(testClient)).thenReturn(testClientDto);

        // When
        ClientDto result = clientService.getClientById(clientId, agentId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(clientId);
        assertThat(result.getFirstName()).isEqualTo("John");
        verify(clientRepository).findById(clientId);
        verify(clientMapper).toDto(testClient);
    }

    @Test
    void getClientById_WithNonExistentClient_ShouldThrowException() {
        // Given
        when(clientRepository.findById(clientId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> clientService.getClientById(clientId, agentId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Client");

        verify(clientRepository).findById(clientId);
        verifyNoInteractions(clientMapper);
    }

    @Test
    void getClientById_WithWrongAgent_ShouldThrowException() {
        // Given
        UUID wrongAgentId = UUID.randomUUID();
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));

        // When & Then
        assertThatThrownBy(() -> clientService.getClientById(clientId, wrongAgentId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Client");

        verify(clientRepository).findById(clientId);
        verifyNoInteractions(clientMapper);
    }

    // ========================================
    // createClient Tests
    // ========================================

    @Test
    void createClient_WithValidData_ShouldReturnCreatedClient() {
        // Given
        ClientDto createRequest = ClientDto.builder()
            .firstName("Jane")
            .lastName("Smith")
            .email("jane.smith@example.com")
            .phone("+49 987 654321")
            .gdprConsentGiven(true)
            .build();

        Client newClient = Client.builder()
            .firstName("Jane")
            .lastName("Smith")
            .email("jane.smith@example.com")
            .build();

        Client savedClient = Client.builder()
            .agent(testAgent)
            .firstName("Jane")
            .lastName("Smith")
            .email("jane.smith@example.com")
            .addressCountry("Germany")
            .gdprConsentGiven(true)
            .gdprConsentDate(LocalDateTime.now())
            .build();
        savedClient.setId(UUID.randomUUID());

        ClientDto savedClientDto = ClientDto.builder()
            .id(savedClient.getId())
            .firstName("Jane")
            .lastName("Smith")
            .email("jane.smith@example.com")
            .build();

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(clientRepository.existsByAgentAndEmail(testAgent, createRequest.getEmail())).thenReturn(false);
        when(clientMapper.toEntity(any(ClientDto.class))).thenReturn(newClient);
        when(clientRepository.save(any(Client.class))).thenReturn(savedClient);
        when(clientMapper.toDto(savedClient)).thenReturn(savedClientDto);

        // When
        ClientDto result = clientService.createClient(createRequest, agentId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getFirstName()).isEqualTo("Jane");
        assertThat(result.getLastName()).isEqualTo("Smith");
        verify(agentRepository).findById(agentId);
        verify(clientRepository).existsByAgentAndEmail(testAgent, createRequest.getEmail());
        verify(clientRepository).save(any(Client.class));
        verify(clientMapper).toDto(savedClient);
    }

    @Test
    void createClient_WithNonExistentAgent_ShouldThrowException() {
        // Given
        ClientDto createRequest = ClientDto.builder()
            .firstName("Jane")
            .lastName("Smith")
            .build();

        when(agentRepository.findById(agentId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> clientService.createClient(createRequest, agentId))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Invalid agent session");

        verify(agentRepository).findById(agentId);
        verifyNoInteractions(clientRepository);
    }

    @Test
    void createClient_WithDuplicateEmail_ShouldThrowException() {
        // Given
        ClientDto createRequest = ClientDto.builder()
            .firstName("Jane")
            .lastName("Smith")
            .email("existing@example.com")
            .build();

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(clientRepository.existsByAgentAndEmail(testAgent, "existing@example.com")).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> clientService.createClient(createRequest, agentId))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("email already exists");

        verify(agentRepository).findById(agentId);
        verify(clientRepository).existsByAgentAndEmail(testAgent, "existing@example.com");
        verify(clientRepository, never()).save(any());
    }

    @Test
    void createClient_WithGdprConsentButNoDate_ShouldSetConsentDate() {
        // Given
        ClientDto createRequest = ClientDto.builder()
            .firstName("Jane")
            .lastName("Smith")
            .email("jane@example.com")
            .gdprConsentGiven(true)
            .gdprConsentDate(null)
            .build();

        Client newClient = Client.builder()
            .firstName("Jane")
            .lastName("Smith")
            .build();

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(clientRepository.existsByAgentAndEmail(any(), any())).thenReturn(false);
        when(clientMapper.toEntity(any(ClientDto.class))).thenReturn(newClient);
        when(clientRepository.save(any(Client.class))).thenReturn(testClient);
        when(clientMapper.toDto(any())).thenReturn(testClientDto);

        // When
        clientService.createClient(createRequest, agentId);

        // Then
        assertThat(createRequest.getGdprConsentDate()).isNotNull();
        verify(clientRepository).save(any(Client.class));
    }

    // ========================================
    // updateClient Tests
    // ========================================

    @Test
    void updateClient_WithValidData_ShouldReturnUpdatedClient() {
        // Given
        ClientDto updateRequest = ClientDto.builder()
            .firstName("John Updated")
            .lastName("Doe Updated")
            .email("john.updated@example.com")
            .phone("+49 111 222333")
            .addressCity("Munich")
            .build();

        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));
        when(clientRepository.existsByAgentAndEmail(testAgent, updateRequest.getEmail())).thenReturn(false);
        when(clientRepository.save(testClient)).thenReturn(testClient);
        when(clientMapper.toDto(testClient)).thenReturn(testClientDto);

        // When
        ClientDto result = clientService.updateClient(clientId, updateRequest, agentId);

        // Then
        assertThat(result).isNotNull();
        verify(clientRepository).findById(clientId);
        verify(clientRepository).existsByAgentAndEmail(testAgent, updateRequest.getEmail());
        verify(clientRepository).save(testClient);
    }

    @Test
    void updateClient_WithNonExistentClient_ShouldThrowException() {
        // Given
        ClientDto updateRequest = ClientDto.builder().firstName("Test").build();
        when(clientRepository.findById(clientId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> clientService.updateClient(clientId, updateRequest, agentId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Client");

        verify(clientRepository).findById(clientId);
        verify(clientRepository, never()).save(any());
    }

    @Test
    void updateClient_WithWrongAgent_ShouldThrowException() {
        // Given
        UUID wrongAgentId = UUID.randomUUID();
        ClientDto updateRequest = ClientDto.builder().firstName("Test").build();
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));

        // When & Then
        assertThatThrownBy(() -> clientService.updateClient(clientId, updateRequest, wrongAgentId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Client");

        verify(clientRepository).findById(clientId);
        verify(clientRepository, never()).save(any());
    }

    @Test
    void updateClient_WithDuplicateEmail_ShouldThrowException() {
        // Given
        ClientDto updateRequest = ClientDto.builder()
            .firstName("John")
            .lastName("Doe")
            .email("duplicate@example.com")
            .build();

        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));
        when(clientRepository.existsByAgentAndEmail(testAgent, "duplicate@example.com")).thenReturn(true);

        // When & Then
        assertThatThrownBy(() -> clientService.updateClient(clientId, updateRequest, agentId))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("email already exists");

        verify(clientRepository).findById(clientId);
        verify(clientRepository).existsByAgentAndEmail(testAgent, "duplicate@example.com");
        verify(clientRepository, never()).save(any());
    }

    // ========================================
    // deleteClient Tests
    // ========================================

    @Test
    void deleteClient_WithValidClient_ShouldDeleteSuccessfully() {
        // Given
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));
        doNothing().when(clientRepository).delete(testClient);

        // When
        clientService.deleteClient(clientId, agentId);

        // Then
        verify(clientRepository).findById(clientId);
        verify(clientRepository).delete(testClient);
    }

    @Test
    void deleteClient_WithNonExistentClient_ShouldThrowException() {
        // Given
        when(clientRepository.findById(clientId)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> clientService.deleteClient(clientId, agentId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Client");

        verify(clientRepository).findById(clientId);
        verify(clientRepository, never()).delete(any());
    }

    @Test
    void deleteClient_WithWrongAgent_ShouldThrowException() {
        // Given
        UUID wrongAgentId = UUID.randomUUID();
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));

        // When & Then
        assertThatThrownBy(() -> clientService.deleteClient(clientId, wrongAgentId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Client");

        verify(clientRepository).findById(clientId);
        verify(clientRepository, never()).delete(any());
    }

    @Test
    void deleteClient_WithSearchCriteria_ShouldDeleteCascade() {
        // Given
        PropertySearchCriteria searchCriteria = PropertySearchCriteria.builder().build();
        testClient.setSearchCriteria(searchCriteria);

        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));
        doNothing().when(searchCriteriaRepository).delete(searchCriteria);
        doNothing().when(clientRepository).delete(testClient);

        // When
        clientService.deleteClient(clientId, agentId);

        // Then
        verify(searchCriteriaRepository).delete(searchCriteria);
        verify(clientRepository).delete(testClient);
    }

    // ========================================
    // searchClients Tests
    // ========================================

    @Test
    void searchClients_WithSearchTerm_ShouldReturnMatchingClients() {
        // Given
        String searchTerm = "John";
        Pageable pageable = PageRequest.of(0, 20);
        Page<Client> searchResults = new PageImpl<>(List.of(testClient));

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(clientRepository.findByAgentAndSearchTerm(testAgent, searchTerm, pageable))
            .thenReturn(searchResults);
        when(clientMapper.toDto(testClient)).thenReturn(testClientDto);

        // When
        Page<ClientDto> result = clientService.searchClients(agentId, searchTerm, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        verify(clientRepository).findByAgentAndSearchTerm(testAgent, searchTerm, pageable);
    }

    @Test
    void searchClients_WithNoResults_ShouldReturnEmptyPage() {
        // Given
        String searchTerm = "NonExistent";
        Pageable pageable = PageRequest.of(0, 20);
        Page<Client> emptyResults = new PageImpl<>(List.of());

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(clientRepository.findByAgentAndSearchTerm(testAgent, searchTerm, pageable))
            .thenReturn(emptyResults);

        // When
        Page<ClientDto> result = clientService.searchClients(agentId, searchTerm, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEmpty();
    }

    // ========================================
    // getRecentClients Tests
    // ========================================

    @Test
    void getRecentClients_WithValidDays_ShouldReturnRecentClients() {
        // Given
        int days = 7;
        List<Client> recentClients = List.of(testClient);

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(clientRepository.findRecentClientsByAgent(eq(testAgent), any(LocalDateTime.class)))
            .thenReturn(recentClients);
        when(clientMapper.toDto(testClient)).thenReturn(testClientDto);

        // When
        List<ClientDto> result = clientService.getRecentClients(agentId, days);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        verify(clientRepository).findRecentClientsByAgent(eq(testAgent), any(LocalDateTime.class));
    }

    @Test
    void getRecentClients_WithNoRecentClients_ShouldReturnEmptyList() {
        // Given
        int days = 30;

        when(agentRepository.findById(agentId)).thenReturn(Optional.of(testAgent));
        when(clientRepository.findRecentClientsByAgent(eq(testAgent), any(LocalDateTime.class)))
            .thenReturn(List.of());

        // When
        List<ClientDto> result = clientService.getRecentClients(agentId, days);

        // Then
        assertThat(result).isNotNull();
        assertThat(result).isEmpty();
    }

    // ========================================
    // countClientsByAgent Tests
    // ========================================

    @Test
    void countClientsByAgent_WithClients_ShouldReturnCount() {
        // Given
        long expectedCount = 42L;
        when(clientRepository.countByAgentId(agentId)).thenReturn(expectedCount);

        // When
        long result = clientService.countClientsByAgent(agentId);

        // Then
        assertThat(result).isEqualTo(expectedCount);
        verify(clientRepository).countByAgentId(agentId);
    }

    @Test
    void countClientsByAgent_WithNoClients_ShouldReturnZero() {
        // Given
        when(clientRepository.countByAgentId(agentId)).thenReturn(0L);

        // When
        long result = clientService.countClientsByAgent(agentId);

        // Then
        assertThat(result).isEqualTo(0L);
        verify(clientRepository).countByAgentId(agentId);
    }

    // ========================================
    // exportClientData Tests
    // ========================================

    @Test
    void exportClientData_WithValidClient_ShouldReturnClientData() {
        // Given
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));
        when(clientMapper.toDto(testClient)).thenReturn(testClientDto);

        // When
        ClientDto result = clientService.exportClientData(clientId, agentId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(clientId);
        verify(clientRepository).findById(clientId);
        verify(clientMapper).toDto(testClient);
    }

    @Test
    void exportClientData_WithWrongAgent_ShouldThrowException() {
        // Given
        UUID wrongAgentId = UUID.randomUUID();
        when(clientRepository.findById(clientId)).thenReturn(Optional.of(testClient));

        // When & Then
        assertThatThrownBy(() -> clientService.exportClientData(clientId, wrongAgentId))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Client");

        verify(clientRepository).findById(clientId);
        verifyNoInteractions(clientMapper);
    }
}
