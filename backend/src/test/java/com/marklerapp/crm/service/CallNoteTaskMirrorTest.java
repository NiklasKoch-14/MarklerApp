package com.marklerapp.crm.service;

import com.marklerapp.crm.dto.CallNoteDto;
import com.marklerapp.crm.entity.*;
import com.marklerapp.crm.mapper.CallNoteMapper;
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
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CallNoteTaskMirrorTest {

    @Mock private CallNoteRepository callNoteRepository;
    @Mock private ClientRepository clientRepository;
    @Mock private AgentRepository agentRepository;
    @Mock private PropertyRepository propertyRepository;
    @Mock private CallNoteMapper callNoteMapper;
    @Mock private OwnershipValidator ownershipValidator;
    @Mock private TaskRepository taskRepository;

    private CallNoteService service;
    private UUID agentId;
    private Agent agent;
    private Client client;

    @BeforeEach
    void setUp() {
        // Argumentreihenfolge = Feldreihenfolge; taskRepository kommt ans Ende.
        service = new CallNoteService(callNoteRepository, clientRepository, agentRepository,
                propertyRepository, callNoteMapper, ownershipValidator, taskRepository);
        agentId = UUID.randomUUID();
        agent = new Agent();
        agent.setId(agentId);
        client = new Client();
        client.setId(UUID.randomUUID());
        when(agentRepository.findById(agentId)).thenReturn(Optional.of(agent));
        when(clientRepository.findById(client.getId())).thenReturn(Optional.of(client));
        when(callNoteRepository.save(any(CallNote.class))).thenAnswer(i -> {
            CallNote n = i.getArgument(0);
            if (n.getId() == null) n.setId(UUID.randomUUID());
            return n;
        });
        when(taskRepository.save(any(Task.class))).thenAnswer(i -> i.getArgument(0));
    }

    private CallNoteDto.CreateRequest noteWithFollowUp(boolean required, LocalDate date) {
        CallNoteDto.CreateRequest r = new CallNoteDto.CreateRequest();
        r.setClientId(client.getId());
        r.setCallDate(LocalDateTime.now());
        r.setSubject("Preisvorstellung besprochen");
        r.setFollowUpRequired(required);
        r.setFollowUpDate(date);
        return r;
    }

    @Test
    void followUpCreatesATask() {
        LocalDate due = LocalDate.now().plusDays(3);

        service.createCallNote(agentId, noteWithFollowUp(true, due));

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(captor.capture());
        Task task = captor.getValue();
        assertThat(task.getTitle()).isEqualTo("Preisvorstellung besprochen");
        assertThat(task.getDueDate()).isEqualTo(due);
        assertThat(task.getClient()).isEqualTo(client);
        assertThat(task.getStatus()).isEqualTo(Task.TaskStatus.OPEN);
        assertThat(task.getSourceCallNote()).isNotNull();
    }

    @Test
    void noFollowUpCreatesNoTask() {
        service.createCallNote(agentId, noteWithFollowUp(false, null));
        verify(taskRepository, never()).save(any());
    }

    @Test
    void followUpWithoutDateCreatesNoTask() {
        service.createCallNote(agentId, noteWithFollowUp(true, null));
        verify(taskRepository, never()).save(any());
    }

    @Test
    void emptySubjectFallsBackToANeutralTitle() {
        CallNoteDto.CreateRequest r = noteWithFollowUp(true, LocalDate.now().plusDays(1));
        r.setSubject("   ");

        service.createCallNote(agentId, r);

        ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
        verify(taskRepository).save(captor.capture());
        assertThat(captor.getValue().getTitle()).isNotBlank();
    }

    @Test
    void changingTheDateMovesTheOpenTask() {
        CallNote note = existingNoteWithFollowUp();
        Task mirrored = Task.builder().agent(agent).client(client).title("alt")
                .dueDate(LocalDate.now()).status(Task.TaskStatus.OPEN).sourceCallNote(note).build();
        when(taskRepository.findOpenBySourceCallNoteId(note.getId())).thenReturn(Optional.of(mirrored));

        LocalDate moved = LocalDate.now().plusDays(10);
        CallNoteDto.UpdateRequest u = new CallNoteDto.UpdateRequest();
        u.setCallDate(note.getCallDate());
        u.setFollowUpRequired(true);
        u.setFollowUpDate(moved);
        service.updateCallNote(agentId, note.getId(), u);

        assertThat(mirrored.getDueDate()).isEqualTo(moved);
        verify(taskRepository, never()).delete(any());
    }

    @Test
    void clearingTheFlagDeletesTheOpenTask() {
        CallNote note = existingNoteWithFollowUp();
        Task mirrored = Task.builder().agent(agent).client(client).title("alt")
                .dueDate(LocalDate.now()).status(Task.TaskStatus.OPEN).sourceCallNote(note).build();
        when(taskRepository.findOpenBySourceCallNoteId(note.getId())).thenReturn(Optional.of(mirrored));

        CallNoteDto.UpdateRequest u = new CallNoteDto.UpdateRequest();
        u.setCallDate(note.getCallDate());
        u.setFollowUpRequired(false);
        service.updateCallNote(agentId, note.getId(), u);

        verify(taskRepository).delete(mirrored);
    }

    @Test
    void clearingTheFlagLeavesACompletedTaskAlone() {
        CallNote note = existingNoteWithFollowUp();
        when(taskRepository.findOpenBySourceCallNoteId(note.getId())).thenReturn(Optional.empty());

        CallNoteDto.UpdateRequest u = new CallNoteDto.UpdateRequest();
        u.setCallDate(note.getCallDate());
        u.setFollowUpRequired(false);
        service.updateCallNote(agentId, note.getId(), u);

        verify(taskRepository, never()).delete(any());
    }

    private CallNote existingNoteWithFollowUp() {
        CallNote note = CallNote.builder().agent(agent).client(client)
                .callDate(LocalDateTime.now()).subject("alt")
                .followUpRequired(true).followUpDate(LocalDate.now()).build();
        note.setId(UUID.randomUUID());
        when(callNoteRepository.findById(note.getId())).thenReturn(Optional.of(note));
        return note;
    }
}
