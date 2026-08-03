package com.marklerapp.crm.repository;

import com.marklerapp.crm.entity.WorkflowOverrideLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface WorkflowOverrideLogRepository extends JpaRepository<WorkflowOverrideLog, UUID> {
}
