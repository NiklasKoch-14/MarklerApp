package com.marklerapp.crm.service;

import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.ClientDeletionAuditLog;
import com.marklerapp.crm.repository.ClientDeletionAuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ClientDeletionAuditServiceTest {

    @Mock
    private ClientDeletionAuditLogRepository auditLogRepository;

    private ClientDeletionAuditService auditService;

    @BeforeEach
    void setUp() {
        auditService = new ClientDeletionAuditService(auditLogRepository);
    }

    @Test
    void logDeletion_ShouldPersistSnapshotWithCascadeCounts() {
        // Given
        Agent agent = Agent.builder().firstName("Max").lastName("Mustermann").build();
        agent.setId(UUID.randomUUID());

        Client client = Client.builder()
            .agent(agent)
            .firstName("John")
            .lastName("Doe")
            .email("john.doe@example.com")
            .build();
        client.setId(UUID.randomUUID());

        // When
        auditService.logDeletion(client, agent, 4, 2, 1, true);

        // Then
        ArgumentCaptor<ClientDeletionAuditLog> captor = ArgumentCaptor.forClass(ClientDeletionAuditLog.class);
        verify(auditLogRepository).save(captor.capture());

        ClientDeletionAuditLog saved = captor.getValue();
        assertThat(saved.getAgent()).isEqualTo(agent);
        assertThat(saved.getDeletedClientId()).isEqualTo(client.getId());
        assertThat(saved.getClientDisplayName()).isEqualTo("John Doe");
        assertThat(saved.getClientEmail()).isEqualTo("john.doe@example.com");
        assertThat(saved.getDeletedCallNotesCount()).isEqualTo(4);
        assertThat(saved.getDeletedViewingsCount()).isEqualTo(2);
        assertThat(saved.getDeletedFileAttachmentsCount()).isEqualTo(1);
        assertThat(saved.getHadSearchCriteria()).isTrue();
        assertThat(saved.getDeletionTimestamp()).isNotNull();
    }
}
