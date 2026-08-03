package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.dto.TaskDto;
import com.marklerapp.crm.entity.*;
import com.marklerapp.crm.mapper.TaskMapper;
import com.marklerapp.crm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final AgentRepository agentRepository;
    private final ClientRepository clientRepository;
    private final PropertyRepository propertyRepository;
    private final CallNoteRepository callNoteRepository;
    private final TaskMapper taskMapper;
    private final OwnershipValidator ownershipValidator;

    @Transactional
    public TaskDto.Response createTask(UUID agentId, TaskDto.CreateRequest request) {
        Agent agent = requireAgent(agentId);

        Task task = Task.builder()
                .agent(agent)
                .client(resolveClient(request.getClientId(), agentId))
                .property(resolveProperty(request.getPropertyId(), agentId))
                .title(request.getTitle())
                .description(request.getDescription())
                .dueDate(request.getDueDate())
                .status(Task.TaskStatus.OPEN)
                .build();

        return taskMapper.toResponse(taskRepository.save(task));
    }

    @Transactional
    public TaskDto.Response updateTask(UUID agentId, UUID taskId, TaskDto.UpdateRequest request) {
        Task task = requireOwnTask(taskId, agentId);

        if (request.getTitle() != null) task.setTitle(request.getTitle());
        if (request.getDescription() != null) task.setDescription(request.getDescription());
        if (request.getDueDate() != null) task.setDueDate(request.getDueDate());
        if (request.getClientId() != null) task.setClient(resolveClient(request.getClientId(), agentId));
        if (request.getPropertyId() != null) task.setProperty(resolveProperty(request.getPropertyId(), agentId));

        return taskMapper.toResponse(taskRepository.save(task));
    }

    @Transactional
    public void deleteTask(UUID agentId, UUID taskId) {
        taskRepository.delete(requireOwnTask(taskId, agentId));
    }

    @Transactional(readOnly = true)
    public TaskDto.Response getTask(UUID agentId, UUID taskId) {
        return taskMapper.toResponse(requireOwnTask(taskId, agentId));
    }

    /** Tagesliste: alles Offene bis einschliesslich heute. */
    @Transactional(readOnly = true)
    public List<TaskDto.Summary> getDueTasks(UUID agentId) {
        return taskMapper.toSummaryList(taskRepository.findDue(requireAgent(agentId), LocalDate.now()));
    }

    @Transactional(readOnly = true)
    public List<TaskDto.Summary> getTasksByClient(UUID agentId, UUID clientId) {
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client", "id", clientId));
        denyIfForeign(() -> ownershipValidator.validateClientOwnership(client, agentId));
        return taskMapper.toSummaryList(taskRepository.findByClientId(clientId));
    }

    @Transactional(readOnly = true)
    public List<TaskDto.Summary> getTasksByProperty(UUID agentId, UUID propertyId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property", "id", propertyId));
        denyIfForeign(() -> ownershipValidator.validatePropertyOwnership(property, agentId));
        return taskMapper.toSummaryList(taskRepository.findByPropertyId(propertyId));
    }

    // ---- Hilfen, auch von Task 3 benutzt ----

    Agent requireAgent(UUID agentId) {
        return agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent", "id", agentId));
    }

    Task requireOwnTask(UUID taskId, UUID agentId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task", "id", taskId));
        if (task.getAgent() == null || !agentId.equals(task.getAgent().getId())) {
            throw new ResourceNotFoundException("Task not found or access denied");
        }
        return task;
    }

    private Client resolveClient(UUID clientId, UUID agentId) {
        if (clientId == null) return null;
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client", "id", clientId));
        denyIfForeign(() -> ownershipValidator.validateClientOwnership(client, agentId));
        return client;
    }

    private Property resolveProperty(UUID propertyId, UUID agentId) {
        if (propertyId == null) return null;
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property", "id", propertyId));
        denyIfForeign(() -> ownershipValidator.validatePropertyOwnership(property, agentId));
        return property;
    }

    /**
     * Fremdzugriff wird als "nicht gefunden" gemeldet, nicht als "verboten" -- sonst
     * verraet die Antwort die Existenz fremder Datensaetze.
     */
    private void denyIfForeign(Runnable check) {
        try {
            check.run();
        } catch (AccessDeniedException e) {
            throw new ResourceNotFoundException("Not found or access denied");
        }
    }
}
