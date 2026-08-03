package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.dto.TaskDto;
import com.marklerapp.crm.entity.*;
import com.marklerapp.crm.mapper.TaskMapper;
import com.marklerapp.crm.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TaskServiceTest {

    @Mock private TaskRepository taskRepository;
    @Mock private AgentRepository agentRepository;
    @Mock private ClientRepository clientRepository;
    @Mock private PropertyRepository propertyRepository;
    @Mock private CallNoteRepository callNoteRepository;
    @Mock private TaskMapper taskMapper;
    @Mock private OwnershipValidator ownershipValidator;

    private TaskService service;
    private UUID agentId;
    private Agent agent;

    @BeforeEach
    void setUp() {
        service = new TaskService(taskRepository, agentRepository, clientRepository,
                propertyRepository, callNoteRepository, taskMapper, ownershipValidator);
        agentId = UUID.randomUUID();
        agent = new Agent();
        agent.setId(agentId);
        when(agentRepository.findById(agentId)).thenReturn(Optional.of(agent));
        when(taskRepository.save(any(Task.class))).thenAnswer(i -> i.getArgument(0));
    }

    private TaskDto.CreateRequest request() {
        return TaskDto.CreateRequest.builder()
                .title("Grundbuchauszug anfordern")
                .dueDate(LocalDate.now().plusDays(2))
                .build();
    }

    @Test
    void createsTaskWithoutAnyLink() {
        service.createTask(agentId, request());

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(captor.capture());
        Task saved = captor.getValue();
        assertThat(saved.getTitle()).isEqualTo("Grundbuchauszug anfordern");
        assertThat(saved.getStatus()).isEqualTo(Task.TaskStatus.OPEN);
        assertThat(saved.getAgent()).isEqualTo(agent);
        assertThat(saved.getClient()).isNull();
        assertThat(saved.getProperty()).isNull();
        assertThat(saved.getCompletedAt()).isNull();
    }

    @Test
    void linksClientAfterCheckingOwnership() {
        Client client = new Client();
        client.setId(UUID.randomUUID());
        when(clientRepository.findById(client.getId())).thenReturn(Optional.of(client));

        TaskDto.CreateRequest req = request();
        req.setClientId(client.getId());
        service.createTask(agentId, req);

        verify(ownershipValidator).validateClientOwnership(client, agentId);
        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(captor.capture());
        assertThat(captor.getValue().getClient()).isEqualTo(client);
    }

    @Test
    void refusesForeignClient() {
        Client foreign = new Client();
        foreign.setId(UUID.randomUUID());
        when(clientRepository.findById(foreign.getId())).thenReturn(Optional.of(foreign));
        doThrow(new AccessDeniedException("denied"))
                .when(ownershipValidator).validateClientOwnership(foreign, agentId);

        TaskDto.CreateRequest req = request();
        req.setClientId(foreign.getId());

        assertThatThrownBy(() -> service.createTask(agentId, req))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(taskRepository, never()).save(any());
    }

    @Test
    void refusesForeignProperty() {
        Property foreign = new Property();
        foreign.setId(UUID.randomUUID());
        when(propertyRepository.findById(foreign.getId())).thenReturn(Optional.of(foreign));
        doThrow(new AccessDeniedException("denied"))
                .when(ownershipValidator).validatePropertyOwnership(foreign, agentId);

        TaskDto.CreateRequest req = request();
        req.setPropertyId(foreign.getId());

        assertThatThrownBy(() -> service.createTask(agentId, req))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(taskRepository, never()).save(any());
    }

    @Test
    void dueListAsksForTodayAndEverythingBefore() {
        when(taskRepository.findDue(eq(agent), any(LocalDate.class))).thenReturn(List.of());

        service.getDueTasks(agentId);

        ArgumentCaptor<LocalDate> captor = ArgumentCaptor.forClass(LocalDate.class);
        verify(taskRepository).findDue(eq(agent), captor.capture());
        assertThat(captor.getValue()).isEqualTo(LocalDate.now());
    }

    @Test
    void updateChangesOnlyProvidedFields() {
        Task existing = Task.builder().agent(agent).title("alt")
                .description("Beschreibung").dueDate(LocalDate.now()).build();
        existing.setId(UUID.randomUUID());
        when(taskRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

        service.updateTask(agentId, existing.getId(),
                TaskDto.UpdateRequest.builder().title("neu").build());

        assertThat(existing.getTitle()).isEqualTo("neu");
        assertThat(existing.getDescription()).isEqualTo("Beschreibung");
    }

    @Test
    void refusesForeignTask() {
        Agent other = new Agent();
        other.setId(UUID.randomUUID());
        Task foreign = Task.builder().agent(other).title("fremd").dueDate(LocalDate.now()).build();
        foreign.setId(UUID.randomUUID());
        when(taskRepository.findById(foreign.getId())).thenReturn(Optional.of(foreign));

        assertThatThrownBy(() -> service.deleteTask(agentId, foreign.getId()))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(taskRepository, never()).delete(any());
    }
}
