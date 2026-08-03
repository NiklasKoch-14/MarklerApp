package com.marklerapp.crm.config;

import com.marklerapp.crm.exception.WorkflowRuleBlockedException;
import com.marklerapp.crm.exception.WorkflowRuleWarningException;
import com.marklerapp.crm.rules.AffectedRecord;
import com.marklerapp.crm.rules.CascadeAction;
import com.marklerapp.crm.rules.CascadeType;
import com.marklerapp.crm.rules.RuleCode;
import com.marklerapp.crm.rules.RuleViolation;
import com.marklerapp.crm.rules.Severity;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class WorkflowExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @SuppressWarnings("unchecked")
    void warningBecomes409WithFullPayload() {
        UUID viewingId = UUID.randomUUID();
        RuleViolation violation = RuleViolation
                .of(RuleCode.PROPERTY_SOLD_WITH_OPEN_VIEWINGS, Severity.WARN)
                .withParams(Map.of("count", 3))
                .withAffected(List.of(new AffectedRecord("VIEWING", viewingId, "12.08. 14:00 - Mueller")))
                .withCascade(new CascadeAction(
                        CascadeType.CANCEL_VIEWINGS, "workflow.cascade.cancelViewings", List.of(viewingId)));

        ResponseEntity<Map<String, Object>> response =
                handler.handleWorkflowWarning(new WorkflowRuleWarningException(List.of(violation)));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("type", "WORKFLOW_WARNING");

        List<Map<String, Object>> violations = (List<Map<String, Object>>) response.getBody().get("violations");
        assertThat(violations).hasSize(1);
        assertThat(violations.get(0))
                .containsEntry("code", "PROPERTY_SOLD_WITH_OPEN_VIEWINGS")
                .containsEntry("severity", "WARN")
                .containsEntry("messageKey", "workflow.rule.propertySoldWithOpenViewings")
                .containsEntry("params", Map.of("count", 3));

        List<Map<String, Object>> affected = (List<Map<String, Object>>) violations.get(0).get("affected");
        assertThat(affected.get(0)).containsEntry("type", "VIEWING").containsEntry("id", viewingId);

        Map<String, Object> cascade = (Map<String, Object>) violations.get(0).get("cascade");
        assertThat(cascade)
                .containsEntry("action", "CANCEL_VIEWINGS")
                .containsEntry("messageKey", "workflow.cascade.cancelViewings");
    }

    @Test
    void blockBecomes422() {
        ResponseEntity<Map<String, Object>> response = handler.handleWorkflowBlocked(
                new WorkflowRuleBlockedException(List.of(
                        RuleViolation.of(RuleCode.PROPERTY_RENT_MARKED_SOLD, Severity.BLOCK))));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody()).containsEntry("type", "WORKFLOW_BLOCKED");
    }

    @Test
    @SuppressWarnings("unchecked")
    void cascadeIsAbsentWhenRuleHasNone() {
        ResponseEntity<Map<String, Object>> response = handler.handleWorkflowWarning(
                new WorkflowRuleWarningException(List.of(
                        RuleViolation.of(RuleCode.PROPERTY_REOPENED, Severity.WARN))));

        List<Map<String, Object>> violations = (List<Map<String, Object>>) response.getBody().get("violations");
        assertThat(violations.get(0)).doesNotContainKey("cascade");
    }
}
