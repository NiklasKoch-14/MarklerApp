package com.marklerapp.crm.service;

import com.marklerapp.crm.entity.WorkflowOverrideLog;
import com.marklerapp.crm.repository.WorkflowOverrideLogRepository;
import com.marklerapp.crm.rules.RuleCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkflowOverrideLogger {

    private final WorkflowOverrideLogRepository repository;

    public void record(Set<RuleCode> acknowledged, String entityType, UUID entityId, UUID agentId) {
        if (acknowledged == null || acknowledged.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        repository.saveAll(acknowledged.stream()
                .map(code -> WorkflowOverrideLog.builder()
                        .id(UUID.randomUUID())
                        .ruleCode(code.name())
                        .entityType(entityType)
                        .entityId(entityId)
                        .agentId(agentId)
                        .createdAt(now)
                        .build())
                .toList());
    }
}
