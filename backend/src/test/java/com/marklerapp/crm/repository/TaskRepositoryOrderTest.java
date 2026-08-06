package com.marklerapp.crm.repository;

import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.ListingType;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyType;
import com.marklerapp.crm.entity.Task;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Die Aufgabenliste einer Detailseite muss mit dem beginnen, was noch zu tun ist.
 *
 * <p>Der erste Anlauf sortierte nach {@code status ASC}. Weil {@code @Enumerated(STRING)}
 * den Namen ablegt, sortierte das alphabetisch — 'DONE' vor 'OPEN' — und die erledigten
 * Aufgaben standen oben. Dieser Test haelt die fachliche Reihenfolge fest, damit ein
 * spaeterer dritter Status sie nicht wieder unbemerkt umdreht.</p>
 */
@DataJpaTest
@TestPropertySource(properties = {
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.defer-datasource-initialization=false",
        "spring.sql.init.mode=never",
        "spring.flyway.enabled=false"
})
class TaskRepositoryOrderTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private TaskRepository taskRepository;

    private Agent agent;
    private Client client;
    private Property property;

    @BeforeEach
    void setUp() {
        agent = entityManager.persist(Agent.builder()
                .email("own@marklerapp.test")
                .firstName("Test")
                .lastName("Makler")
                .passwordHash("$2a$10$abcdefghijklmnopqrstuv")
                .build());

        client = entityManager.persist(Client.builder()
                .agent(agent)
                .firstName("Max")
                .lastName("Bornheimer")
                .email("max@example.com")
                .build());

        property = entityManager.persist(Property.builder()
                .agent(agent)
                .title("Reihenhaus")
                .propertyType(PropertyType.HOUSE)
                .listingType(ListingType.SALE)
                .addressStreet("Hauptstrasse 1")
                .addressCity("Bornheim")
                .addressPostalCode("53332")
                .build());
    }

    @Test
    @DisplayName("Beim Kunden stehen offene Aufgaben vor erledigten, innerhalb nach Faelligkeit")
    void clientTasksListOpenBeforeDone() {
        persist("Erledigt, aber juengst faellig", LocalDate.now().plusDays(5), Task.TaskStatus.DONE, true);
        persist("Offen, spaet faellig", LocalDate.now().plusDays(9), Task.TaskStatus.OPEN, true);
        persist("Offen, frueh faellig", LocalDate.now().plusDays(1), Task.TaskStatus.OPEN, true);
        entityManager.flush();
        entityManager.clear();

        assertThat(taskRepository.findByClientId(client.getId()))
                .extracting(Task::getTitle)
                .containsExactly("Offen, frueh faellig", "Offen, spaet faellig", "Erledigt, aber juengst faellig");
    }

    @Test
    @DisplayName("Beim Objekt gilt dieselbe Reihenfolge")
    void propertyTasksListOpenBeforeDone() {
        persist("Erledigt", LocalDate.now(), Task.TaskStatus.DONE, false);
        persist("Offen", LocalDate.now().plusDays(3), Task.TaskStatus.OPEN, false);
        entityManager.flush();
        entityManager.clear();

        assertThat(taskRepository.findByPropertyId(property.getId()))
                .extracting(Task::getTitle)
                .containsExactly("Offen", "Erledigt");
    }

    private void persist(String title, LocalDate dueDate, Task.TaskStatus status, boolean onClient) {
        entityManager.persist(Task.builder()
                .agent(agent)
                .client(onClient ? client : null)
                .property(onClient ? null : property)
                .title(title)
                .dueDate(dueDate)
                .status(status)
                .build());
    }
}
