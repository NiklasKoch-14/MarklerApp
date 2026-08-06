package com.marklerapp.crm.controller;

import com.marklerapp.crm.dto.TaskDto;
import com.marklerapp.crm.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/tasks")
@RequiredArgsConstructor
@Tag(name = "Tasks", description = "Endpoints for managing tasks and reminders (Aufgaben)")
public class TaskController extends BaseController {

    private final TaskService taskService;

    @PostMapping
    @Operation(summary = "Create a task")
    public ResponseEntity<TaskDto.Response> create(
            @Valid @RequestBody TaskDto.CreateRequest request,
            Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.createTask(agentId, request));
    }

    @PutMapping("/{taskId}")
    @Operation(summary = "Update a task")
    public ResponseEntity<TaskDto.Response> update(
            @PathVariable UUID taskId,
            @Valid @RequestBody TaskDto.UpdateRequest request,
            Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        return ResponseEntity.ok(taskService.updateTask(agentId, taskId, request));
    }

    @DeleteMapping("/{taskId}")
    @Operation(summary = "Delete a task")
    public ResponseEntity<Void> delete(
            @PathVariable UUID taskId,
            Authentication authentication) {
        taskService.deleteTask(getAgentIdFromAuth(authentication), taskId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{taskId}")
    @Operation(summary = "Get a single task")
    public ResponseEntity<TaskDto.Response> get(
            @PathVariable UUID taskId,
            Authentication authentication) {
        return ResponseEntity.ok(taskService.getTask(getAgentIdFromAuth(authentication), taskId));
    }

    @GetMapping("/due")
    @Operation(summary = "Tagesliste: open tasks due today or overdue")
    public ResponseEntity<List<TaskDto.Summary>> due(Authentication authentication) {
        return ResponseEntity.ok(taskService.getDueTasks(getAgentIdFromAuth(authentication)));
    }

    @GetMapping("/client/{clientId}")
    @Operation(summary = "All tasks linked to a client")
    public ResponseEntity<List<TaskDto.Summary>> byClient(
            @PathVariable UUID clientId,
            Authentication authentication) {
        return ResponseEntity.ok(taskService.getTasksByClient(getAgentIdFromAuth(authentication), clientId));
    }

    @GetMapping("/property/{propertyId}")
    @Operation(summary = "All tasks linked to a property")
    public ResponseEntity<List<TaskDto.Summary>> byProperty(
            @PathVariable UUID propertyId,
            Authentication authentication) {
        return ResponseEntity.ok(taskService.getTasksByProperty(getAgentIdFromAuth(authentication), propertyId));
    }

    /**
     * Erledigen. Der Ein-Klick-Fall schickt keinen Body -- deshalb {@code required = false};
     * mit outcome und Notiz entsteht zusaetzlich eine Gespraechsnotiz.
     */
    @PostMapping("/{taskId}/complete")
    @Operation(summary = "Complete a task, optionally logging a call note")
    public ResponseEntity<TaskDto.Response> complete(
            @PathVariable UUID taskId,
            @RequestBody(required = false) TaskDto.CompleteRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(taskService.completeTask(getAgentIdFromAuth(authentication), taskId, request));
    }

    @PostMapping("/{taskId}/postpone")
    @Operation(summary = "Postpone a task to a new due date")
    public ResponseEntity<TaskDto.Response> postpone(
            @PathVariable UUID taskId,
            @Valid @RequestBody TaskDto.PostponeRequest request,
            Authentication authentication) {
        UUID agentId = getAgentIdFromAuth(authentication);
        return ResponseEntity.ok(taskService.postponeTask(agentId, taskId, request.getDueDate()));
    }
}
