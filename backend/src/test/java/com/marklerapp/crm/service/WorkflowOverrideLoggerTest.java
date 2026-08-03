package com.marklerapp.crm.service;

import com.marklerapp.crm.entity.WorkflowOverrideLog;
import com.marklerapp.crm.repository.WorkflowOverrideLogRepository;
import com.marklerapp.crm.rules.RuleCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class WorkflowOverrideLoggerTest {

    @Mock
    private WorkflowOverrideLogRepository repository;

    @InjectMocks
    private WorkflowOverrideLogger logger;

    @Test
    void writesOneRowPerAcknowledgedRule() {
        UUID entityId = UUID.randomUUID();
        UUID agentId = UUID.randomUUID();

        logger.record(Set.of(RuleCode.PROPERTY_REOPENED, RuleCode.PROPERTY_RESERVED_WITHOUT_VIEWING),
                "PROPERTY", entityId, agentId);

        ArgumentCaptor<List<WorkflowOverrideLog>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());

        List<WorkflowOverrideLog> saved = captor.getValue();
        assertThat(saved).hasSize(2);
        assertThat(saved).allSatisfy(row -> {
            assertThat(row.getId()).isNotNull();
            assertThat(row.getCreatedAt()).isNotNull();
            assertThat(row.getEntityType()).isEqualTo("PROPERTY");
            assertThat(row.getEntityId()).isEqualTo(entityId);
            assertThat(row.getAgentId()).isEqualTo(agentId);
        });
        assertThat(saved).extracting(WorkflowOverrideLog::getRuleCode)
                .containsExactlyInAnyOrder("PROPERTY_REOPENED", "PROPERTY_RESERVED_WITHOUT_VIEWING");
    }

    @Test
    void writesNothingWhenNothingWasAcknowledged() {
        logger.record(Set.of(), "PROPERTY", UUID.randomUUID(), UUID.randomUUID());
        verifyNoInteractions(repository);
    }

    @Test
    void toleratesNullAcknowledgementSet() {
        logger.record(null, "PROPERTY", UUID.randomUUID(), UUID.randomUUID());
        verifyNoInteractions(repository);
    }
}
