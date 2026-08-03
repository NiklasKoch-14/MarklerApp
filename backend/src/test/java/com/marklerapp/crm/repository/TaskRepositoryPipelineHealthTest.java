package com.marklerapp.crm.repository;

import com.marklerapp.crm.entity.Agent;
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
 * DashboardAnalyticsService's Pipeline-Health-Kennzahlen (#33) lasen frueher direkt aus
 * CallNote.followUpRequired/-Date. Task 4 hat auf Task umgestellt, aber TaskService.completeTask
 * setzt den Task-Status auf DONE, ohne die Notiz je anzufassen -- eine erledigte Aufgabe mit
 * vergangenem Faelligkeitsdatum darf darum nicht mehr als ueberfaellig zaehlen. Dieser Test
 * belegt das gegen die echte JPQL-Query, nicht nur gegen ein Mock.
 */
@DataJpaTest
@TestPropertySource(properties = {
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.defer-datasource-initialization=false",
        "spring.sql.init.mode=never",
        "spring.flyway.enabled=false"
})
class TaskRepositoryPipelineHealthTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private TaskRepository taskRepository;

    private Agent agent;
    private LocalDate today;

    @BeforeEach
    void setUp() {
        agent = entityManager.persist(Agent.builder()
                .email("makler@marklerapp.test")
                .firstName("Test")
                .lastName("Makler")
                .passwordHash("$2a$10$abcdefghijklmnopqrstuv")
                .build());
        today = LocalDate.now();
    }

    private Task persistTask(LocalDate dueDate, Task.TaskStatus status) {
        Task task = entityManager.persist(Task.builder()
                .agent(agent)
                .title("Rueckruf")
                .dueDate(dueDate)
                .status(status)
                .build());
        entityManager.flush();
        return task;
    }

    @Test
    @DisplayName("Eine erledigte Aufgabe mit vergangenem Datum zaehlt nicht als ueberfaellig")
    void completedTaskWithPastDueDateIsNotCountedAsOverdue() {
        persistTask(today.minusDays(5), Task.TaskStatus.DONE);
        persistTask(today.minusDays(2), Task.TaskStatus.OPEN);

        long overdue = taskRepository.countOverdue(agent, today);

        assertThat(overdue).isEqualTo(1);
    }

    @Test
    @DisplayName("Faelligkeit heute zaehlt noch als ueberfaellig, konsistent mit der Tagesliste")
    void dueTodayCountsAsOverdue() {
        persistTask(today, Task.TaskStatus.OPEN);

        assertThat(taskRepository.countOverdue(agent, today)).isEqualTo(1);
    }

    @Test
    @DisplayName("Wochen-Buckets zaehlen nur offene Aufgaben im jeweiligen Fenster")
    void countDueBetween_OnlyCountsOpenTasksInWindow() {
        persistTask(today.plusDays(3), Task.TaskStatus.OPEN);   // diese Woche
        persistTask(today.plusWeeks(1).plusDays(1), Task.TaskStatus.OPEN); // naechste Woche
        persistTask(today.plusDays(3), Task.TaskStatus.DONE);   // erledigt, zaehlt nicht

        long thisWeek = taskRepository.countDueBetween(agent, today.plusDays(1), today.plusWeeks(1));
        long nextWeek = taskRepository.countDueBetween(agent, today.plusWeeks(1), today.plusWeeks(2));

        assertThat(thisWeek).isEqualTo(1);
        assertThat(nextWeek).isEqualTo(1);
    }
}
