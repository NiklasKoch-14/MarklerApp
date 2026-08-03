# Aufgaben als eigenes Objekt — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Task` wird die alleinige Quelle für „was steht heute an" — mit Objektbezug, Verschieben und Abhaken, ohne dass eine bestehende Gesprächsnotiz ihre Follow-up-Felder verliert.

**Architecture:** Neue Entity `Task` mit Migration und Backfill. `CallNoteService` spiegelt seine Follow-up-Felder in Aufgaben, statt dass irgendwer sie noch abfragt. Erledigen ist ein Endpunkt mit optionalem Gesprächsergebnis — mit Ergebnis entsteht zusätzlich eine Notiz, in derselben Transaktion. Im Frontend wechselt der bestehende Dashboard-Reiter die Quelle; der vorhandene Abschluss-Dialog wird wiederverwendet.

**Tech Stack:** Java 17, Spring Boot 3.3.6, Lombok, MapStruct, Flyway, JUnit 5 + AssertJ + Mockito, Angular 17 standalone, ngx-translate, Tailwind.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-03-aufgaben-als-eigenes-objekt-design.md`, Issue #33.
- **Kein lokales Maven/JDK.** Backend-Tests im Container:
  ```bash
  docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
    maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=<TestClass>
  ```
  `backend/target/` gehört danach root — erwartet, nicht reparieren.
- **Migration:** nächste freie Nummer ist **V38** (höchste bestehende: `V37__Create_workflow_override_log.sql`). PostgreSQL-kompatibel; literale UUIDs nur mit Hex (0-9, a-f). **Im `dev`-Profil läuft Flyway nicht** (SQLite + `ddl-auto: update`) — Migrationen gegen `docker-compose.dev.yml` prüfen, nicht gegen `mvn spring-boot:run`.
- **Mandantentrennung:** jede Service-Methode nimmt eine `agentId` und prüft über `OwnershipValidator`. Bei `clientId`/`propertyId` zusätzlich prüfen, dass der referenzierte Datensatz demselben Agenten gehört — sonst wäre eine Aufgabe ein Weg, fremde Datensätze zu adressieren.
- **Controller-Mapping:** `@RequestMapping("/tasks")` — `/api/v1` wird automatisch vorangestellt. Controller erbt von `BaseController`, Agent über `getAgentIdFromAuth(authentication)`.
- **i18n:** keine hartcodierten UI-Strings; `de.json` und `en.json` gemeinsam, identische Schlüsselbäume.
- **Styling (ADR 0001):** Farben nur über CSS-Variablen-Tokens (`bg-surface`, `text-body-2`, `border-border`). Kein `bg-white`/`text-gray-*`/`border-gray-*`, kein statisches `style="…"`. Schriftgrade `text-11` … `text-26`. Keine Hex-Werte in `tailwind.config.js`.
- **Buttons (#28):** Aktionszeile in `.form-actions`, primärer Button zuerst im Markup, `ri-check-line` / `ri-close-line`, `ri-add-line` fürs Anlegen.
- **Commits:** Deutsch, keine Umlaute in der Betreffzeile, mit `(#33)`.

---

## Dateistruktur

**Backend neu:**

| Datei | Verantwortung |
|---|---|
| `db/migration/V38__Create_tasks_table.sql` | Tabelle, Indizes, Backfill, Audit-Spalte |
| `entity/Task.java` | Entity, erbt `BaseEntity`; nested enum `TaskStatus` |
| `repository/TaskRepository.java` | Abfragen für fällig, nach Kunde, nach Objekt, nach Quell-Notiz |
| `dto/TaskDto.java` | `CreateRequest`, `UpdateRequest`, `CompleteRequest`, `PostponeRequest`, `Response`, `Summary` |
| `mapper/TaskMapper.java` | MapStruct |
| `service/TaskService.java` | CRUD, fällig, erledigen, verschieben |
| `controller/TaskController.java` | REST |

**Backend geändert:** `service/CallNoteService.java` (Spiegelung), `repository/CallNoteRepository.java` (tote Abfragen raus), `service/ClientService.java` + `service/ClientDeletionAuditService.java` + `entity/ClientDeletionAuditLog.java` (Aufgabenzahl im Protokoll).

**Frontend neu:** `core/services/task.service.ts`, `shared/models/task.model.ts`, `shared/components/task-form-dialog/`, `shared/components/task-list/`.
**Frontend geändert:** `features/dashboard/dashboard.component.ts`, Kunden- und Objekt-Detailseite, `assets/i18n/{de,en}.json`.

---

## Task 1: Schema, Entity, Repository

**Files:**
- Create: `backend/src/main/resources/db/migration/V38__Create_tasks_table.sql`
- Create: `backend/src/main/java/com/marklerapp/crm/entity/Task.java`
- Create: `backend/src/main/java/com/marklerapp/crm/repository/TaskRepository.java`
- Modify: `backend/src/main/java/com/marklerapp/crm/entity/ClientDeletionAuditLog.java`

**Interfaces:**
- Consumes: `BaseEntity` (liefert `id`, `createdAt`, `updatedAt` mit `@Getter/@Setter`), `Agent`, `Client`, `Property`, `CallNote`.
- Produces: `Task` mit `getTitle/setTitle`, `getDescription`, `getDueDate`, `getStatus`, `getCompletedAt`, `getClient`, `getProperty`, `getAgent`, `getSourceCallNote`; das Enum `Task.TaskStatus { OPEN, DONE }`; `TaskRepository` mit den unten definierten Methoden.

- [ ] **Step 1: Migration schreiben**

`V38__Create_tasks_table.sql`:
```sql
-- Aufgaben als eigenes Objekt (Issue #33). Bis hierher hing die Tagesliste an
-- CallNote.follow_up_required/-date; damit war eine Aufgabe ohne Telefonat nicht
-- erfassbar und ein Objektbezug gar nicht.
CREATE TABLE tasks (
    id                  UUID PRIMARY KEY,
    agent_id            UUID         NOT NULL,
    client_id           UUID,
    property_id         UUID,
    title               VARCHAR(200) NOT NULL,
    description         VARCHAR(2000),
    due_date            DATE         NOT NULL,
    status              VARCHAR(16)  NOT NULL,
    completed_at        TIMESTAMP,
    source_call_note_id UUID,
    created_at          TIMESTAMP    NOT NULL,
    updated_at          TIMESTAMP    NOT NULL,
    FOREIGN KEY (agent_id)            REFERENCES agents(id)     ON DELETE CASCADE,
    FOREIGN KEY (client_id)           REFERENCES clients(id)    ON DELETE CASCADE,
    FOREIGN KEY (property_id)         REFERENCES properties(id) ON DELETE CASCADE,
    -- Die Aufgabe ueberlebt das Loeschen ihrer Quell-Notiz: die Arbeit bleibt zu tun,
    -- auch wenn die Notiz weg ist.
    FOREIGN KEY (source_call_note_id) REFERENCES call_notes(id) ON DELETE SET NULL
);

-- Bedient die einzige heisse Abfrage: was ist fuer diesen Agenten offen und faellig.
CREATE INDEX idx_tasks_agent_due      ON tasks (agent_id, status, due_date);
CREATE INDEX idx_tasks_client_id      ON tasks (client_id);
CREATE INDEX idx_tasks_property_id    ON tasks (property_id);
CREATE INDEX idx_tasks_source_note    ON tasks (source_call_note_id);

-- Backfill: jedes offene Follow-up wird eine Aufgabe. Ohne diesen Schritt verschwaende
-- die Umstellung die Arbeitsliste, an der Nutzer heute haengen.
INSERT INTO tasks (id, agent_id, client_id, property_id, title, due_date, status,
                   source_call_note_id, created_at, updated_at)
SELECT gen_random_uuid(),
       cn.agent_id,
       cn.client_id,
       cn.property_id,
       COALESCE(NULLIF(TRIM(cn.subject), ''), 'Rückruf'),
       cn.follow_up_date,
       'OPEN',
       cn.id,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM call_notes cn
WHERE cn.follow_up_required = true
  AND cn.follow_up_date IS NOT NULL;

-- Das Loeschprotokoll muss vollstaendig bleiben (DSGVO): eine geloeschte Aufgabe,
-- die nirgends gezaehlt ist, macht den Nachweis unvollstaendig.
ALTER TABLE client_deletion_audit_log
    ADD COLUMN deleted_tasks_count INTEGER NOT NULL DEFAULT 0;
```

- [ ] **Step 2: Entity anlegen**

`Task.java` — Aufbau von `Viewing.java` übernehmen (dieselben Lombok-Annotationen, `extends BaseEntity`):
```java
package com.marklerapp.crm.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Task extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "agent_id", nullable = false)
    @NotNull
    private Agent agent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id")
    private Property property;

    @Column(name = "title", nullable = false, length = 200)
    @NotBlank(message = "Title is required")
    @Size(max = 200)
    private String title;

    @Column(name = "description", length = 2000)
    @Size(max = 2000)
    private String description;

    /** Ohne Faelligkeit taucht eine Aufgabe in keiner Liste auf -- dann ist sie keine. */
    @Column(name = "due_date", nullable = false)
    @NotNull(message = "Due date is required")
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    @Builder.Default
    private TaskStatus status = TaskStatus.OPEN;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_call_note_id")
    private CallNote sourceCallNote;

    public enum TaskStatus {
        OPEN,
        DONE
    }
}
```

Ergänze in `ClientDeletionAuditLog.java` neben `deletedFileAttachmentsCount`:
```java
    @Column(name = "deleted_tasks_count")
    @Builder.Default
    private Integer deletedTasksCount = 0;
```

- [ ] **Step 3: Repository anlegen**

```java
package com.marklerapp.crm.repository;

import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    /** Tagesliste: offen und faellig (heute oder ueberfaellig), aelteste zuerst. */
    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.client LEFT JOIN FETCH t.property "
         + "WHERE t.agent = :agent AND t.status = com.marklerapp.crm.entity.Task$TaskStatus.OPEN "
         + "AND t.dueDate <= :until ORDER BY t.dueDate ASC")
    List<Task> findDue(@Param("agent") Agent agent, @Param("until") LocalDate until);

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.property WHERE t.client.id = :clientId "
         + "ORDER BY t.status ASC, t.dueDate ASC")
    List<Task> findByClientId(@Param("clientId") UUID clientId);

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.client WHERE t.property.id = :propertyId "
         + "ORDER BY t.status ASC, t.dueDate ASC")
    List<Task> findByPropertyId(@Param("propertyId") UUID propertyId);

    /** Die aus einer Notiz gespiegelte, noch offene Aufgabe -- hoechstens eine. */
    @Query("SELECT t FROM Task t WHERE t.sourceCallNote.id = :callNoteId "
         + "AND t.status = com.marklerapp.crm.entity.Task$TaskStatus.OPEN")
    Optional<Task> findOpenBySourceCallNoteId(@Param("callNoteId") UUID callNoteId);

    long countByClient(Client client);
}
```

- [ ] **Step 4: Migration gegen PostgreSQL prüfen**

```bash
docker compose -f docker-compose.dev.yml up --build -d database backend
docker compose -f docker-compose.dev.yml logs backend | grep -iE "flyway|migrat|error" | tail -20
```
Erwartet: `Successfully applied` für V38, kein Fehler. Danach `docker compose -f docker-compose.dev.yml down`.

Schlägt `gen_random_uuid()` fehl, fehlt die Extension — dann `CREATE EXTENSION IF NOT EXISTS pgcrypto;` an den Anfang der Migration setzen und erneut prüfen.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/db/migration/V38__Create_tasks_table.sql \
        backend/src/main/java/com/marklerapp/crm/entity/Task.java \
        backend/src/main/java/com/marklerapp/crm/entity/ClientDeletionAuditLog.java \
        backend/src/main/java/com/marklerapp/crm/repository/TaskRepository.java
git commit -m "Aufgaben-Schema mit Backfill offener Follow-ups (#33)"
```

---

## Task 2: TaskService — CRUD, Fälligkeit, Mandantentrennung

**Files:**
- Create: `backend/src/main/java/com/marklerapp/crm/dto/TaskDto.java`
- Create: `backend/src/main/java/com/marklerapp/crm/mapper/TaskMapper.java`
- Create: `backend/src/main/java/com/marklerapp/crm/service/TaskService.java`
- Test: `backend/src/test/java/com/marklerapp/crm/service/TaskServiceTest.java`

**Interfaces:**
- Consumes: `TaskRepository` (Task 1), `OwnershipValidator.validateClientOwnership(Client, UUID)` / `validatePropertyOwnership(Property, UUID)`, `AgentRepository`, `ClientRepository`, `PropertyRepository`.
- Produces: `TaskService.createTask(UUID agentId, TaskDto.CreateRequest) → TaskDto.Response`, `updateTask(UUID agentId, UUID taskId, TaskDto.UpdateRequest)`, `deleteTask(UUID agentId, UUID taskId)`, `getDueTasks(UUID agentId) → List<TaskDto.Summary>`, `getTasksByClient(UUID agentId, UUID clientId)`, `getTasksByProperty(UUID agentId, UUID propertyId)`. Task 3 ergänzt `completeTask` und `postponeTask`; Task 4 ruft `createTask`/`updateTask` intern nicht auf, sondern arbeitet direkt auf dem Repository.

- [ ] **Step 1: DTO anlegen**

`TaskDto.java` — Aufbau von `ViewingDto.java` übernehmen (statische verschachtelte Klassen, Lombok `@Data @NoArgsConstructor @AllArgsConstructor @Builder`):
```java
package com.marklerapp.crm.dto;

import com.marklerapp.crm.entity.Task;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class TaskDto {

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateRequest {
        private UUID clientId;
        private UUID propertyId;
        @NotBlank(message = "Title is required")
        @Size(max = 200)
        private String title;
        @Size(max = 2000)
        private String description;
        @NotNull(message = "Due date is required")
        private LocalDate dueDate;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateRequest {
        private UUID clientId;
        private UUID propertyId;
        @Size(max = 200)
        private String title;
        @Size(max = 2000)
        private String description;
        private LocalDate dueDate;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PostponeRequest {
        @NotNull(message = "Due date is required")
        private LocalDate dueDate;
    }

    /** Ohne outcome/note wird nur abgehakt; mit beidem entsteht zusaetzlich eine Notiz. */
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CompleteRequest {
        private com.marklerapp.crm.entity.CallNote.CallOutcome outcome;
        @Size(max = 5000)
        private String note;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Response {
        private UUID id;
        private UUID clientId;
        private String clientName;
        private UUID propertyId;
        private String propertyTitle;
        private String title;
        private String description;
        private LocalDate dueDate;
        private Task.TaskStatus status;
        private LocalDateTime completedAt;
        private UUID sourceCallNoteId;
        private LocalDateTime createdAt;
    }

    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Summary {
        private UUID id;
        private UUID clientId;
        private String clientName;
        private UUID propertyId;
        private String propertyTitle;
        private String title;
        private String description;
        private LocalDate dueDate;
        private Task.TaskStatus status;
    }
}
```

- [ ] **Step 2: Mapper anlegen**

```java
package com.marklerapp.crm.mapper;

import com.marklerapp.crm.dto.TaskDto;
import com.marklerapp.crm.entity.Task;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface TaskMapper {

    @Mapping(target = "clientId", source = "client.id")
    @Mapping(target = "clientName", source = "client.fullName")
    @Mapping(target = "propertyId", source = "property.id")
    @Mapping(target = "propertyTitle", source = "property.title")
    @Mapping(target = "sourceCallNoteId", source = "sourceCallNote.id")
    TaskDto.Response toResponse(Task task);

    @Mapping(target = "clientId", source = "client.id")
    @Mapping(target = "clientName", source = "client.fullName")
    @Mapping(target = "propertyId", source = "property.id")
    @Mapping(target = "propertyTitle", source = "property.title")
    TaskDto.Summary toSummary(Task task);

    List<TaskDto.Summary> toSummaryList(List<Task> tasks);
}
```

- [ ] **Step 3: Den fehlschlagenden Test schreiben**

`TaskServiceTest.java`:
```java
package com.marklerapp.crm.service;

import com.marklerapp.crm.dto.TaskDto;
import com.marklerapp.crm.entity.*;
import com.marklerapp.crm.exception.ResourceNotFoundException;
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
```

- [ ] **Step 4: Test laufen lassen — er muss fehlschlagen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=TaskServiceTest
```
Erwartet: „cannot find symbol: class TaskService".

- [ ] **Step 5: `TaskService` implementieren**

```java
package com.marklerapp.crm.service;

import com.marklerapp.crm.dto.TaskDto;
import com.marklerapp.crm.entity.*;
import com.marklerapp.crm.exception.ResourceNotFoundException;
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
```

- [ ] **Step 6: Test laufen lassen — er muss bestehen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=TaskServiceTest
```
Erwartet: 7 Tests grün.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/marklerapp/crm/dto/TaskDto.java \
        backend/src/main/java/com/marklerapp/crm/mapper/TaskMapper.java \
        backend/src/main/java/com/marklerapp/crm/service/TaskService.java \
        backend/src/test/java/com/marklerapp/crm/service/TaskServiceTest.java
git commit -m "TaskService: CRUD, Tagesliste und Mandantenpruefung (#33)"
```

---

## Task 3: Erledigen und Verschieben

**Files:**
- Modify: `backend/src/main/java/com/marklerapp/crm/service/TaskService.java`
- Test: `backend/src/test/java/com/marklerapp/crm/service/TaskCompletionTest.java`

**Interfaces:**
- Consumes: `TaskService.requireOwnTask(UUID, UUID)` (Task 2, package-private), `CallNoteRepository`, `TaskDto.CompleteRequest` / `PostponeRequest`.
- Produces: `completeTask(UUID agentId, UUID taskId, TaskDto.CompleteRequest request) → TaskDto.Response` (request darf null sein) und `postponeTask(UUID agentId, UUID taskId, LocalDate newDueDate) → TaskDto.Response`.

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`TaskCompletionTest.java` — gleicher Mock-Aufbau wie `TaskServiceTest` (Konstruktor-Argumente in derselben Reihenfolge):
```java
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
```

- [ ] **Step 2: Test laufen lassen — er muss fehlschlagen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=TaskCompletionTest
```
Erwartet: „cannot find symbol: method completeTask".

- [ ] **Step 3: Die beiden Methoden ergänzen**

In `TaskService` anfügen (Importe `java.time.LocalDateTime` ergänzen):
```java
    /**
     * Hakt ab. Traegt der Request ein Gespraechsergebnis und hat die Aufgabe einen
     * Kundenbezug, entsteht zusaetzlich eine Gespraechsnotiz -- in derselben Transaktion,
     * damit keine erledigte Aufgabe ohne die Notiz zurueckbleibt, die ihren Wert ausmacht.
     */
    @Transactional
    public TaskDto.Response completeTask(UUID agentId, UUID taskId, TaskDto.CompleteRequest request) {
        Task task = requireOwnTask(taskId, agentId);

        if (task.getStatus() != Task.TaskStatus.DONE) {
            task.setStatus(Task.TaskStatus.DONE);
            task.setCompletedAt(LocalDateTime.now());
        }

        if (request != null && request.getOutcome() != null && task.getClient() != null) {
            callNoteRepository.save(CallNote.builder()
                    .agent(task.getAgent())
                    .client(task.getClient())
                    .property(task.getProperty())
                    .callDate(LocalDateTime.now())
                    .callType(CallNote.CallType.OUTGOING)
                    .subject(task.getTitle())
                    .notes(request.getNote())
                    .outcome(request.getOutcome())
                    .followUpRequired(false)
                    .build());
        }

        return taskMapper.toResponse(taskRepository.save(task));
    }

    /** Verschiebt die Faelligkeit. Eine erledigte Aufgabe wird dadurch nicht wieder offen. */
    @Transactional
    public TaskDto.Response postponeTask(UUID agentId, UUID taskId, LocalDate newDueDate) {
        Task task = requireOwnTask(taskId, agentId);
        task.setDueDate(newDueDate);
        return taskMapper.toResponse(taskRepository.save(task));
    }
```

Prüfe beim Schreiben die tatsächlichen Enum-Konstanten von `CallNote.CallType` und `CallNote.CallOutcome` in `entity/CallNote.java` und setze die real vorhandenen ein — die Namen oben sind aus dem Entwurf und müssen gegen den Code abgeglichen werden.

- [ ] **Step 4: Test laufen lassen — er muss bestehen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=TaskCompletionTest
```
Erwartet: 5 Tests grün.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/marklerapp/crm/service/TaskService.java \
        backend/src/test/java/com/marklerapp/crm/service/TaskCompletionTest.java
git commit -m "Aufgaben erledigen und verschieben, Gespraechsnotiz transaktional (#33)"
```

---

## Task 4: Spiegelung aus der Gesprächsnotiz

**Files:**
- Modify: `backend/src/main/java/com/marklerapp/crm/service/CallNoteService.java`
- Modify: `backend/src/main/java/com/marklerapp/crm/repository/CallNoteRepository.java`
- Test: `backend/src/test/java/com/marklerapp/crm/service/CallNoteTaskMirrorTest.java`

**Interfaces:**
- Consumes: `TaskRepository.findOpenBySourceCallNoteId(UUID)` (Task 1), `Task.builder()`.
- Produces: nichts für spätere Tasks — dies schließt die Backend-Seite ab.

> **Hinweis:** `CallNoteService` bekommt `TaskRepository` als neues Feld. Hänge es **ans Ende** der Feldliste (nach `ownershipValidator`), weil Lombok den Konstruktor in Feldreihenfolge erzeugt und `CallNoteServiceTest` ihn positionell aufruft — diese Testdatei muss mit angepasst werden.

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

```java
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
```

Prüfe vor dem Ausführen die tatsächliche Signatur, mit der `updateCallNote` die Notiz lädt
(`findById` oder eine Fetch-Variante), und passe die Stubs entsprechend an.

- [ ] **Step 2: Test laufen lassen — er muss fehlschlagen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=CallNoteTaskMirrorTest
```
Erwartet: Kompilierfehler wegen der Konstruktor-Arität.

- [ ] **Step 3: Spiegelung implementieren**

`private final TaskRepository taskRepository;` **ans Ende** der Feldliste von `CallNoteService`. In `createCallNote`, nach dem Speichern der Notiz, und in `updateCallNote`, nach dem Speichern, jeweils `syncTask(saved)` aufrufen. Dann anfügen:

```java
    private static final String DEFAULT_TASK_TITLE = "Rückruf";

    /**
     * Haelt die aus einer Notiz gespiegelte Aufgabe im Gleichklang. Die Follow-up-Felder
     * der Notiz bleiben Eingabefeld; gelesen wird ab jetzt nur noch die Aufgabe.
     */
    private void syncTask(CallNote note) {
        boolean wanted = Boolean.TRUE.equals(note.getFollowUpRequired()) && note.getFollowUpDate() != null;
        Optional<Task> existing = taskRepository.findOpenBySourceCallNoteId(note.getId());

        if (!wanted) {
            // Eine bereits erledigte Aufgabe bleibt als Historie stehen -- findOpenBy...
            // liefert sie gar nicht erst.
            existing.ifPresent(taskRepository::delete);
            return;
        }

        if (existing.isPresent()) {
            existing.get().setDueDate(note.getFollowUpDate());
            taskRepository.save(existing.get());
            return;
        }

        String title = note.getSubject() == null || note.getSubject().isBlank()
                ? DEFAULT_TASK_TITLE : note.getSubject().trim();

        taskRepository.save(Task.builder()
                .agent(note.getAgent())
                .client(note.getClient())
                .property(note.getProperty())
                .title(title)
                .dueDate(note.getFollowUpDate())
                .status(Task.TaskStatus.OPEN)
                .sourceCallNote(note)
                .build());
    }
```

- [ ] **Step 4: Tote Abfragen entfernen**

`findCallNotesRequiringFollowUp()` und `findOverdueFollowUps(LocalDate)` aus `CallNoteRepository` löschen, ebenso `getFollowUpReminders` und `getOverdueFollowUps` aus `CallNoteService` und die zugehörigen Controller-Endpunkte. Eine ungenutzte Abfrage auf Feldern, die niemand mehr liest, ist eine Falle für den Nächsten.

Aufrufer finden:
```bash
grep -rn "getFollowUpReminders\|getOverdueFollowUps\|findCallNotesRequiringFollowUp\|findOverdueFollowUps" backend/src frontend/src
```
Jeden Treffer entfernen. Das Frontend wird in Task 6 auf die neue Quelle umgestellt — bis dahin darf die Dashboard-Abfrage brechen, aber der Build muss grün sein.

- [ ] **Step 5: Fokustest und volle Suite**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=CallNoteTaskMirrorTest
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn test 2>&1 | grep -E "Tests run:.*Skipped: [0-9]+$|BUILD"
```
Erwartet: 7 neue Tests grün; die volle Suite (253 vor diesem Branch, plus die neuen) grün. `CallNoteServiceTest` muss wegen der Konstruktor-Arität angepasst werden — reiner Kompilierfix, keine Erwartung ändern.

- [ ] **Step 6: Commit**

```bash
git add backend/src
git commit -m "Gespraechsnotiz spiegelt Follow-ups in Aufgaben, tote Abfragen entfernt (#33)"
```

---

## Task 5: Löschprotokoll vervollständigen

**Files:**
- Modify: `backend/src/main/java/com/marklerapp/crm/service/ClientService.java`
- Modify: `backend/src/main/java/com/marklerapp/crm/service/ClientDeletionAuditService.java`
- Test: `backend/src/test/java/com/marklerapp/crm/service/ClientDeletionAuditServiceTest.java`

**Interfaces:**
- Consumes: `TaskRepository.countByClient(Client)` (Task 1), `ClientDeletionAuditLog.deletedTasksCount` (Task 1).
- Produces: erweiterte Signatur `logDeletion(client, agent, callNotesCount, viewingsCount, fileAttachmentsCount, tasksCount, hadSearchCriteria)`.

- [ ] **Step 1: Signatur erweitern**

In `ClientDeletionAuditService.logDeletion(...)` einen Parameter `int tasksCount` **vor** `hadSearchCriteria` einfügen und auf `deletedTasksCount` setzen. In `ClientService.deleteClient` `TaskRepository` als Feld ergänzen (ans Ende der Feldliste) und den Zähler mitgeben:

```java
        int tasksCount = (int) taskRepository.countByClient(client);
        clientDeletionAuditService.logDeletion(
            client, client.getAgent(), callNotesCount, viewingsCount,
            fileAttachmentsCount, tasksCount, hadSearchCriteria
        );
```

Die Aufgaben selbst löscht die Datenbank über `ON DELETE CASCADE` — wie bei Gesprächsnotizen und Besichtigungen auch. Das Protokoll hält nur fest, wie viele es waren.

- [ ] **Step 2: Test ergänzen**

In `ClientDeletionAuditServiceTest` die bestehenden Aufrufe um den neuen Parameter erweitern und einen Fall ergänzen, der prüft, dass `deletedTasksCount` im geschriebenen Protokoll ankommt. Folge dem Aufbau der vorhandenen Tests derselben Datei.

- [ ] **Step 3: Tests laufen lassen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest='ClientDeletionAuditServiceTest+ClientServiceTest+UpdateFieldParityTest'
```
Erwartet: alle grün. `UpdateFieldParityTest` und `ClientServiceTest` brauchen ggf. einen Konstruktor-Kompilierfix — **keine Erwartung abschwächen**; schlägt eine Zusicherung fachlich fehl, melde es statt sie anzupassen.

- [ ] **Step 4: Commit**

```bash
git add backend/src
git commit -m "Loeschprotokoll zaehlt geloeschte Aufgaben mit (#33)"
```

---

## Task 6: TaskController

**Files:**
- Create: `backend/src/main/java/com/marklerapp/crm/controller/TaskController.java`
- Test: `backend/src/test/java/com/marklerapp/crm/service/TaskIsolationTest.java`

**Interfaces:**
- Consumes: alle `TaskService`-Methoden aus Task 2 und 3.
- Produces: die REST-Oberfläche, gegen die Task 7 und 8 programmieren.

- [ ] **Step 1: Controller schreiben**

Aufbau von `ViewingController.java` übernehmen (`@RestController`, `@RequestMapping("/tasks")`, `extends BaseController`, `@Tag`/`@Operation` wie dort):
```java
    @PostMapping
    public ResponseEntity<TaskDto.Response> create(Authentication auth,
            @Valid @RequestBody TaskDto.CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taskService.createTask(getAgentIdFromAuth(auth), request));
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<TaskDto.Response> update(Authentication auth, @PathVariable UUID taskId,
            @Valid @RequestBody TaskDto.UpdateRequest request) {
        return ResponseEntity.ok(taskService.updateTask(getAgentIdFromAuth(auth), taskId, request));
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<Void> delete(Authentication auth, @PathVariable UUID taskId) {
        taskService.deleteTask(getAgentIdFromAuth(auth), taskId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{taskId}")
    public ResponseEntity<TaskDto.Response> get(Authentication auth, @PathVariable UUID taskId) {
        return ResponseEntity.ok(taskService.getTask(getAgentIdFromAuth(auth), taskId));
    }

    /** Tagesliste: offen und faellig bis einschliesslich heute. */
    @GetMapping("/due")
    public ResponseEntity<List<TaskDto.Summary>> due(Authentication auth) {
        return ResponseEntity.ok(taskService.getDueTasks(getAgentIdFromAuth(auth)));
    }

    @GetMapping("/client/{clientId}")
    public ResponseEntity<List<TaskDto.Summary>> byClient(Authentication auth, @PathVariable UUID clientId) {
        return ResponseEntity.ok(taskService.getTasksByClient(getAgentIdFromAuth(auth), clientId));
    }

    @GetMapping("/property/{propertyId}")
    public ResponseEntity<List<TaskDto.Summary>> byProperty(Authentication auth, @PathVariable UUID propertyId) {
        return ResponseEntity.ok(taskService.getTasksByProperty(getAgentIdFromAuth(auth), propertyId));
    }

    @PostMapping("/{taskId}/complete")
    public ResponseEntity<TaskDto.Response> complete(Authentication auth, @PathVariable UUID taskId,
            @RequestBody(required = false) TaskDto.CompleteRequest request) {
        return ResponseEntity.ok(taskService.completeTask(getAgentIdFromAuth(auth), taskId, request));
    }

    @PostMapping("/{taskId}/postpone")
    public ResponseEntity<TaskDto.Response> postpone(Authentication auth, @PathVariable UUID taskId,
            @Valid @RequestBody TaskDto.PostponeRequest request) {
        return ResponseEntity.ok(taskService.postponeTask(getAgentIdFromAuth(auth), taskId, request.getDueDate()));
    }
```

`@RequestBody(required = false)` bei `complete` ist wesentlich: der Ein-Klick-Fall schickt keinen Body.

- [ ] **Step 2: Isolationstest schreiben**

`TaskIsolationTest.java` nach dem Vorbild von `SearchServiceIsolationTest`: ein zweiter Agent darf eine fremde Aufgabe weder lesen, ändern, löschen, erledigen noch verschieben — jeder Aufruf endet in `ResourceNotFoundException`, nie in einer Antwort mit Daten. Dazu ein Fall, der eine Aufgabe über `clientId` an einen fremden Kunden zu hängen versucht.

- [ ] **Step 3: Tests und Suite**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn test 2>&1 | grep -E "Tests run:.*Skipped: [0-9]+$|BUILD"
```
Erwartet: alles grün.

- [ ] **Step 4: Commit**

```bash
git add backend/src
git commit -m "TaskController mit Isolationstest (#33)"
```

---

> **Zu den Tasks 7 und 8:** Die Backend-Tasks tragen den vollständigen Code. Die
> Frontend-Tasks sind bewusst auf Schnittstellen- und Verhaltensebene beschrieben —
> `dashboard.component.ts` ist über 600 Zeilen lang und hat eine gewachsene Struktur mit drei
> Reitern und einem bestehenden Abschluss-Dialog. Erfundener Code, der zu dieser Struktur nicht
> passt, wäre irreführender als die Anweisung, sie zuerst zu lesen. Der Implementer liest die
> Datei, ordnet sich ein und folgt dem vorhandenen Muster; die Zielschnittstelle, die Texte und
> die Prüfschritte sind vollständig festgelegt.

## Task 7: Frontend — Dashboard auf Aufgaben umstellen

**Files:**
- Create: `frontend/src/app/shared/models/task.model.ts`
- Create: `frontend/src/app/core/services/task.service.ts`
- Modify: `frontend/src/app/features/dashboard/dashboard.component.ts`
- Modify: `frontend/src/assets/i18n/de.json`, `frontend/src/assets/i18n/en.json`

**Interfaces:**
- Consumes: die Endpunkte aus Task 6.
- Produces: `TaskService` mit `getDue()`, `getByClient(id)`, `getByProperty(id)`, `create(req)`, `update(id, req)`, `remove(id)`, `complete(id, body?)`, `postpone(id, dueDate)` — Task 8 benutzt dieselben.

- [ ] **Step 1: Modell und Dienst anlegen**

`task.model.ts`:
```typescript
export type TaskStatus = 'OPEN' | 'DONE';

export interface TaskSummary {
  id: string;
  clientId?: string;
  clientName?: string;
  propertyId?: string;
  propertyTitle?: string;
  title: string;
  description?: string;
  dueDate: string;
  status: TaskStatus;
}

export interface TaskCreateRequest {
  clientId?: string;
  propertyId?: string;
  title: string;
  description?: string;
  dueDate: string;
}

export interface TaskCompleteRequest {
  outcome?: string;
  note?: string;
}
```

`task.service.ts` — Aufbau eines bestehenden Dienstes aus `core/services` übernehmen (dieselbe Art, `environment.apiUrl` zu benutzen):
```typescript
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly base = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  getDue(): Observable<TaskSummary[]> { return this.http.get<TaskSummary[]>(`${this.base}/due`); }
  getByClient(clientId: string): Observable<TaskSummary[]> {
    return this.http.get<TaskSummary[]>(`${this.base}/client/${clientId}`);
  }
  getByProperty(propertyId: string): Observable<TaskSummary[]> {
    return this.http.get<TaskSummary[]>(`${this.base}/property/${propertyId}`);
  }
  create(req: TaskCreateRequest): Observable<TaskSummary> { return this.http.post<TaskSummary>(this.base, req); }
  update(id: string, req: Partial<TaskCreateRequest>): Observable<TaskSummary> {
    return this.http.put<TaskSummary>(`${this.base}/${id}`, req);
  }
  remove(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
  complete(id: string, body?: TaskCompleteRequest): Observable<TaskSummary> {
    return this.http.post<TaskSummary>(`${this.base}/${id}/complete`, body ?? null);
  }
  postpone(id: string, dueDate: string): Observable<TaskSummary> {
    return this.http.post<TaskSummary>(`${this.base}/${id}/postpone`, { dueDate });
  }
}
```

- [ ] **Step 2: Dashboard-Reiter umstellen**

Im `dashboard.component.ts` den Reiter „Follow-ups" auf `tasks.dueTitle` umbenennen und seine Quelle von den Follow-up-Notizen auf `taskService.getDue()` wechseln. Pro Zeile: Titel, Fälligkeit, Kunden- bzw. Objektbezug als Deeplink, und die drei Aktionen.

Überfälligkeit wird über eine CSS-Variablen-Farbe ausgezeichnet (`text-error`), **nicht** über `text-red-*`.

Der bestehende Abschluss-Dialog (Gesprächsergebnis + Notiz) bleibt erhalten und hängt künftig am zweiten Knopf; er ruft `complete(id, { outcome, note })`. Der einfache Haken ruft `complete(id)` ohne Body. Beide entfernen die Zeile nach Erfolg aus der Liste.

Beim Anfassen dieser Datei die berührten Inline-Styles auf ADR-0001-Vokabular umstellen (opportunistische Migration — kein Sammel-Refactor).

- [ ] **Step 3: Übersetzungen**

Neuer Top-Level-Schlüssel `tasks` in **beiden** i18n-Dateien mit identischem Baum:

`de.json`:
```json
  "tasks": {
    "dueTitle": "Heute zu tun",
    "empty": "Nichts offen — alles erledigt.",
    "add": "Aufgabe",
    "title": "Titel",
    "description": "Notiz",
    "dueDate": "Fällig am",
    "overdue": "Überfällig",
    "complete": "Erledigt",
    "completeWithNote": "Erledigt + Gespräch notieren",
    "postpone": "Verschieben",
    "postponeTomorrow": "Morgen",
    "postponeNextWeek": "Nächste Woche",
    "postponePickDate": "Datum wählen",
    "linkedClient": "Kunde",
    "linkedProperty": "Objekt",
    "openCount": "{{count}} offen"
  }
```

`en.json` mit demselben Baum: „To do today", „Nothing open — all clear.", „Task", „Title", „Note", „Due", „Overdue", „Done", „Done + log call", „Postpone", „Tomorrow", „Next week", „Pick a date", „Client", „Property", „{{count}} open".

- [ ] **Step 4: Prüfen**

```bash
cd frontend && npx tsc --noEmit && npx ng test --watch=false --browsers=ChromeHeadless
```
`npm run lint` ist repo-weit defekt (keine ESLint-Konfiguration, siehe #49) — `tsc --noEmit` ist der Ersatz.

Styling-Gate über die geänderten Dateien:
```bash
git diff --name-only main | grep -E '\.(html|ts)$' | xargs grep -nE \
  'class="[^"]*(bg-white|text-gray-|border-gray-)|style="[a-z-]+:[^"]*"' 2>/dev/null
```
Erwartet: keine Treffer aus den neu angelegten Dateien.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "Dashboard zeigt Aufgaben statt Notiz-Follow-ups (#33)"
```

---

## Task 8: Frontend — Schnellerfassung auf den Detailseiten

**Files:**
- Create: `frontend/src/app/shared/components/task-form-dialog/task-form-dialog.component.ts`
- Create: `frontend/src/app/shared/components/task-list/task-list.component.ts`
- Modify: Kunden-Detailseite und Objekt-Detailseite

**Interfaces:**
- Consumes: `TaskService` (Task 7), die `tasks.*`-Übersetzungsschlüssel (Task 7).
- Produces: nichts — Abschluss des Vorhabens.

- [ ] **Step 1: Dialog anlegen**

`TaskFormDialogComponent` — standalone, `@Input() open`, `@Input() clientId?`, `@Input() propertyId?`, `@Input() task?` (zum Bearbeiten), `@Output() saved`, `@Output() cancelled`. Felder: Titel (Pflicht), Notiz (mehrzeilig, optional), Fälligkeit (Datum, Pflicht, Vorbelegung heute).

Struktur und Verhalten am `ConfirmDialogComponent` orientieren, **Styling ausdrücklich nicht** — der ist voller Inline-Styles und Ziel von #45. Stattdessen `.surface-card`, `.form-input`, `.form-actions form-actions--centered`, primärer Button zuerst, `ri-check-line` / `ri-close-line`.

- [ ] **Step 2: Liste anlegen**

`TaskListComponent` — `@Input() tasks`, `@Output() completed`, `@Output() postponed`, `@Output() edited`. Zeigt offene zuerst, dann erledigte ausgegraut. Wird von beiden Detailseiten und optional vom Dashboard benutzt.

- [ ] **Step 3: In die Detailseiten einhängen**

Auf Kunden- und Objekt-Detailseite je ein Abschnitt „Aufgaben" mit `.section-label`, der Liste und einem „+ Aufgabe"-Button (`.btn-secondary`, `ri-add-line`), der den Dialog mit vorbelegtem Bezug öffnet. Nach dem Speichern die Liste neu laden.

- [ ] **Step 4: Prüfen**

```bash
cd frontend && npx tsc --noEmit && npx ng test --watch=false --browsers=ChromeHeadless
git diff --name-only main | grep -E '\.(html|ts)$' | xargs grep -nE \
  'class="[^"]*(bg-white|text-gray-|border-gray-)|style="[a-z-]+:[^"]*"' 2>/dev/null
```

- [ ] **Step 5: Manuell prüfen**

`docker compose -f docker-compose.dev.yml up --build`, dann:
1. Notiz mit Follow-up anlegen → die Aufgabe erscheint unter „Heute zu tun".
2. Datum in der Notiz ändern → die Fälligkeit zieht mit. Haken entfernen → die Aufgabe verschwindet.
3. Aufgabe ohne Kundenbezug über „+ Aufgabe" auf einer Objektseite anlegen → sie erscheint in der Tagesliste, wenn sie fällig ist.
4. Ein Klick auf den Haken erledigt ohne Dialog. „Erledigt + Gespräch notieren" legt eine Gesprächsnotiz an, die auf der Kundenseite auftaucht.
5. Verschieben auf „Nächste Woche" → die Aufgabe verlässt die Tagesliste.
6. Dark Mode einschalten → keine hellen Restflächen in Liste und Dialog.

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "Aufgaben auf Kunden- und Objekt-Detailseite (#33)"
```

---

## Abschluss

- [ ] In #46 vermerken: `FOLLOWUP_REQUIRED_WITHOUT_DATE` entfällt (`due_date` ist `NOT NULL`), `CLIENT_CLOSED_WITH_OPEN_FOLLOWUPS` wird `CLIENT_CLOSED_WITH_OPEN_TASKS`
- [ ] PR gegen `main` mit Bezug auf #33, dann selbst mergen
