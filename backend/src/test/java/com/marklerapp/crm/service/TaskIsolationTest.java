package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.dto.TaskDto;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.ListingType;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyType;
import com.marklerapp.crm.entity.Task;
import com.marklerapp.crm.mapper.TaskMapperImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Aufgaben tragen Termine und Gespraechsinhalte -- ein Zugriff ueber die Mandantengrenze
 * hinweg waere ein Datenleck, kein Komfortproblem. Der Test setzt zwei Makler mit
 * gleichartigen Daten auf und prueft, dass der fremde Makler eine Aufgabe weder lesen
 * noch aendern, loeschen, erledigen oder verschieben kann -- und dass jeder Versuch als
 * "nicht gefunden" endet, damit die Antwort nicht die Existenz fremder Datensaetze verraet.
 */
@DataJpaTest
@Import({TaskService.class, TaskMapperImpl.class, OwnershipValidator.class})
@TestPropertySource(properties = {
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.defer-datasource-initialization=false",
        "spring.sql.init.mode=never",
        "spring.flyway.enabled=false"
})
class TaskIsolationTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private TaskService taskService;

    private Agent ownAgent;
    private Agent foreignAgent;
    private Client foreignClient;
    private Property foreignProperty;
    private UUID ownTaskId;

    @BeforeEach
    void setUp() {
        ownAgent = persistAgent("own@marklerapp.test");
        foreignAgent = persistAgent("foreign@marklerapp.test");

        Client ownClient = persistClient(ownAgent, "Max", "Bornheimer");
        foreignClient = persistClient(foreignAgent, "Erika", "Bornheimer");
        foreignProperty = persistProperty(foreignAgent, "Fremdes Reihenhaus");

        Task ownTask = entityManager.persist(Task.builder()
                .agent(ownAgent)
                .client(ownClient)
                .title("Grundbuchauszug anfordern")
                .dueDate(LocalDate.now())
                .status(Task.TaskStatus.OPEN)
                .build());
        ownTaskId = ownTask.getId();

        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @DisplayName("Der eigene Makler erreicht seine Aufgabe -- die Gegenprobe zu allem Folgenden")
    void ownAgentReachesItsOwnTask() {
        TaskDto.Response response = taskService.getTask(ownAgent.getId(), ownTaskId);

        assertThat(response.getTitle()).isEqualTo("Grundbuchauszug anfordern");
        assertThat(taskService.getDueTasks(ownAgent.getId())).hasSize(1);
    }

    @Test
    @DisplayName("Ein fremder Makler kann eine Aufgabe nicht lesen")
    void foreignAgentCannotRead() {
        assertThatThrownBy(() -> taskService.getTask(foreignAgent.getId(), ownTaskId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Ein fremder Makler kann eine Aufgabe nicht aendern")
    void foreignAgentCannotUpdate() {
        TaskDto.UpdateRequest request = TaskDto.UpdateRequest.builder().title("Uebernommen").build();

        assertThatThrownBy(() -> taskService.updateTask(foreignAgent.getId(), ownTaskId, request))
                .isInstanceOf(ResourceNotFoundException.class);

        assertThat(entityManager.find(Task.class, ownTaskId).getTitle())
                .isEqualTo("Grundbuchauszug anfordern");
    }

    @Test
    @DisplayName("Ein fremder Makler kann eine Aufgabe nicht loeschen")
    void foreignAgentCannotDelete() {
        assertThatThrownBy(() -> taskService.deleteTask(foreignAgent.getId(), ownTaskId))
                .isInstanceOf(ResourceNotFoundException.class);

        assertThat(entityManager.find(Task.class, ownTaskId)).isNotNull();
    }

    @Test
    @DisplayName("Ein fremder Makler kann eine Aufgabe nicht erledigen")
    void foreignAgentCannotComplete() {
        assertThatThrownBy(() -> taskService.completeTask(foreignAgent.getId(), ownTaskId, null))
                .isInstanceOf(ResourceNotFoundException.class);

        assertThat(entityManager.find(Task.class, ownTaskId).getStatus())
                .isEqualTo(Task.TaskStatus.OPEN);
    }

    @Test
    @DisplayName("Ein fremder Makler kann eine Aufgabe nicht verschieben")
    void foreignAgentCannotPostpone() {
        LocalDate original = entityManager.find(Task.class, ownTaskId).getDueDate();

        assertThatThrownBy(() ->
                taskService.postponeTask(foreignAgent.getId(), ownTaskId, LocalDate.now().plusDays(30)))
                .isInstanceOf(ResourceNotFoundException.class);

        assertThat(entityManager.find(Task.class, ownTaskId).getDueDate()).isEqualTo(original);
    }

    @Test
    @DisplayName("Eine Aufgabe laesst sich nicht an einen fremden Kunden haengen")
    void cannotLinkTaskToForeignClient() {
        TaskDto.CreateRequest request = TaskDto.CreateRequest.builder()
                .clientId(foreignClient.getId())
                .title("Fremdzugriff ueber die Verknuepfung")
                .dueDate(LocalDate.now())
                .build();

        assertThatThrownBy(() -> taskService.createTask(ownAgent.getId(), request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Eine Aufgabe laesst sich nicht an ein fremdes Objekt haengen")
    void cannotLinkTaskToForeignProperty() {
        TaskDto.CreateRequest request = TaskDto.CreateRequest.builder()
                .propertyId(foreignProperty.getId())
                .title("Fremdzugriff ueber das Objekt")
                .dueDate(LocalDate.now())
                .build();

        assertThatThrownBy(() -> taskService.createTask(ownAgent.getId(), request))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Die Listen fremder Kunden und Objekte bleiben verschlossen")
    void listEndpointsRejectForeignOwners() {
        assertThatThrownBy(() -> taskService.getTasksByClient(ownAgent.getId(), foreignClient.getId()))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> taskService.getTasksByProperty(ownAgent.getId(), foreignProperty.getId()))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Die Tagesliste des fremden Maklers bleibt leer")
    void foreignAgentSeesNoDueTasks() {
        assertThat(taskService.getDueTasks(foreignAgent.getId())).isEmpty();
    }

    // ── Fixtures ─────────────────────────────────────────────────────────────

    private Agent persistAgent(String email) {
        return entityManager.persist(Agent.builder()
                .email(email)
                .firstName("Test")
                .lastName("Makler")
                .passwordHash("$2a$10$abcdefghijklmnopqrstuv")
                .build());
    }

    private Client persistClient(Agent agent, String firstName, String lastName) {
        return entityManager.persist(Client.builder()
                .agent(agent)
                .firstName(firstName)
                .lastName(lastName)
                .email(firstName.toLowerCase() + "@example.com")
                .build());
    }

    private Property persistProperty(Agent agent, String title) {
        return entityManager.persist(Property.builder()
                .agent(agent)
                .title(title)
                .propertyType(PropertyType.HOUSE)
                .listingType(ListingType.SALE)
                .addressStreet("Hauptstrasse 1")
                .addressCity("Bornheim")
                .addressPostalCode("53332")
                .build());
    }
}
