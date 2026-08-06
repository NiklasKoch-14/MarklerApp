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

    /**
     * Offene zuerst, erledigte darunter. Die Reihenfolge kommt aus einem CASE, nicht aus
     * dem Enum-Namen: {@code @Enumerated(STRING)} legt 'DONE' und 'OPEN' als Text ab, und
     * alphabetisch stuende das Erledigte oben -- genau verkehrt herum.
     */
    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.property WHERE t.client.id = :clientId "
         + "ORDER BY CASE WHEN t.status = com.marklerapp.crm.entity.Task$TaskStatus.OPEN "
         + "THEN 0 ELSE 1 END ASC, t.dueDate ASC")
    List<Task> findByClientId(@Param("clientId") UUID clientId);

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.client WHERE t.property.id = :propertyId "
         + "ORDER BY CASE WHEN t.status = com.marklerapp.crm.entity.Task$TaskStatus.OPEN "
         + "THEN 0 ELSE 1 END ASC, t.dueDate ASC")
    List<Task> findByPropertyId(@Param("propertyId") UUID propertyId);

    /** Die aus einer Notiz gespiegelte, noch offene Aufgabe -- hoechstens eine. */
    @Query("SELECT t FROM Task t WHERE t.sourceCallNote.id = :callNoteId "
         + "AND t.status = com.marklerapp.crm.entity.Task$TaskStatus.OPEN")
    Optional<Task> findOpenBySourceCallNoteId(@Param("callNoteId") UUID callNoteId);

    long countByClient(Client client);

    /**
     * Ueberfaellige offene Aufgaben -- heute zaehlt noch als ueberfaellig, konsistent mit der
     * Tagesliste. Eine erledigte Aufgabe mit vergangenem Faelligkeitsdatum zaehlt nicht mit,
     * weil der Status-Filter sie ausschliesst -- das war der Fehler im alten, notizbasierten Weg.
     */
    @Query("SELECT COUNT(t) FROM Task t WHERE t.agent = :agent "
         + "AND t.status = com.marklerapp.crm.entity.Task$TaskStatus.OPEN AND t.dueDate <= :today")
    long countOverdue(@Param("agent") Agent agent, @Param("today") LocalDate today);

    /** Offene Aufgaben faellig im Zeitfenster [von, bis). */
    @Query("SELECT COUNT(t) FROM Task t WHERE t.agent = :agent "
         + "AND t.status = com.marklerapp.crm.entity.Task$TaskStatus.OPEN "
         + "AND t.dueDate >= :fromInclusive AND t.dueDate < :toExclusive")
    long countDueBetween(@Param("agent") Agent agent,
                          @Param("fromInclusive") LocalDate fromInclusive,
                          @Param("toExclusive") LocalDate toExclusive);
}
