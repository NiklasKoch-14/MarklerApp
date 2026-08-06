package com.marklerapp.crm.service;

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

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TaskCompletionTest {

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
    private Client client;

    @BeforeEach
    void setUp() {
        service = new TaskService(taskRepository, agentRepository, clientRepository,
                propertyRepository, callNoteRepository, taskMapper, ownershipValidator);
        agentId = UUID.randomUUID();
        agent = new Agent();
        agent.setId(agentId);
        client = new Client();
        client.setId(UUID.randomUUID());
        when(taskRepository.save(any(Task.class))).thenAnswer(i -> i.getArgument(0));
        when(callNoteRepository.save(any(CallNote.class))).thenAnswer(i -> i.getArgument(0));
    }

    private Task openTask(Client linkedClient) {
        Task task = Task.builder().agent(agent).client(linkedClient)
                .title("Rueckruf Mueller").dueDate(LocalDate.now())
                .status(Task.TaskStatus.OPEN).build();
        task.setId(UUID.randomUUID());
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        return task;
    }

    @Test
    void completeWithoutBodyOnlyTicksOff() {
        Task task = openTask(client);

        service.completeTask(agentId, task.getId(), null);

        assertThat(task.getStatus()).isEqualTo(Task.TaskStatus.DONE);
        assertThat(task.getCompletedAt()).isNotNull();
        verify(callNoteRepository, never()).save(any());
    }

    @Test
    void completeWithOutcomeAlsoWritesACallNote() {
        Task task = openTask(client);

        service.completeTask(agentId, task.getId(), TaskDto.CompleteRequest.builder()
                .outcome(CallNote.CallOutcome.INTERESTED)
                .note("Will Unterlagen per Mail")
                .build());

        assertThat(task.getStatus()).isEqualTo(Task.TaskStatus.DONE);

        ArgumentCaptor<CallNote> captor = ArgumentCaptor.forClass(CallNote.class);
        verify(callNoteRepository).save(captor.capture());
        CallNote note = captor.getValue();
        assertThat(note.getClient()).isEqualTo(client);
        assertThat(note.getAgent()).isEqualTo(agent);
        assertThat(note.getOutcome()).isEqualTo(CallNote.CallOutcome.INTERESTED);
        assertThat(note.getNotes()).isEqualTo("Will Unterlagen per Mail");
        assertThat(note.getSubject()).isEqualTo("Rueckruf Mueller");
        assertThat(note.getFollowUpRequired()).isFalse();
    }

    @Test
    void completeWithOutcomeButNoClientWritesNoNote() {
        Task task = openTask(null);

        service.completeTask(agentId, task.getId(), TaskDto.CompleteRequest.builder()
                .outcome(CallNote.CallOutcome.INTERESTED).note("egal").build());

        assertThat(task.getStatus()).isEqualTo(Task.TaskStatus.DONE);
        verify(callNoteRepository, never()).save(any());
    }

    @Test
    void completingTwiceKeepsTheFirstTimestamp() {
        Task task = openTask(client);
        service.completeTask(agentId, task.getId(), null);
        var first = task.getCompletedAt();

        service.completeTask(agentId, task.getId(), null);

        assertThat(task.getCompletedAt()).isEqualTo(first);
    }

    @Test
    void postponeMovesDueDateAndKeepsItOpen() {
        Task task = openTask(client);
        LocalDate target = LocalDate.now().plusDays(7);

        service.postponeTask(agentId, task.getId(), target);

        assertThat(task.getDueDate()).isEqualTo(target);
        assertThat(task.getStatus()).isEqualTo(Task.TaskStatus.OPEN);
        assertThat(task.getCompletedAt()).isNull();
    }
}
