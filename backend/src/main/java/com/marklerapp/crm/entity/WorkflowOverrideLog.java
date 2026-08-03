package com.marklerapp.crm.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "workflow_override_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowOverrideLog {

    @Id
    private UUID id;

    @Column(name = "rule_code", nullable = false, length = 64)
    private String ruleCode;

    @Column(name = "entity_type", nullable = false, length = 32)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
