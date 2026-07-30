package com.marklerapp.crm.service;

import com.marklerapp.crm.dto.SearchResultDto;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.CallNote;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.ListingType;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The point of the global search is that it never leaves the authenticated agent's data.
 * A search that matches across agents would be a data leak, so this test seeds two agents
 * with deliberately identical, matching data and asserts that each only ever sees their own.
 *
 * <p>Runs against H2, i.e. the portable LIKE path of {@link SearchService}. The PostgreSQL
 * full-text path carries the same {@code agent_id} filter in its WHERE clause.</p>
 */
@DataJpaTest
@Import({SearchService.class, FullTextSearchSupport.class})
@TestPropertySource(properties = {
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.defer-datasource-initialization=false",
        "spring.sql.init.mode=never",
        "spring.flyway.enabled=false"
})
class SearchServiceIsolationTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private SearchService searchService;

    private Agent ownAgent;
    private Agent foreignAgent;

    @BeforeEach
    void setUp() {
        ownAgent = persistAgent("own@marklerapp.test");
        foreignAgent = persistAgent("foreign@marklerapp.test");

        Client ownClient = persistClient(ownAgent, "Max", "Bornheimer", "max@example.com", "+49 221 445566");
        Client foreignClient = persistClient(foreignAgent, "Erika", "Bornheimer", "erika@example.com", "+49 221 998877");

        persistProperty(ownAgent, "Gemuetliches Reihenhaus", "Hauptstrasse", "Bornheim");
        persistProperty(foreignAgent, "Reihenhaus mit Garten", "Nebenweg", "Bornheim");

        persistNote(ownAgent, ownClient, "Rueckruf Reihenhaus",
                "Der Kunde sucht ein Reihenhaus in Bornheim mit Garten und Stellplatz.");
        persistNote(foreignAgent, foreignClient, "Fremde Notiz",
                "Reihenhaus in Bornheim, aber ein anderer Makler.");

        entityManager.flush();
        entityManager.clear();
    }

    @Test
    @DisplayName("Kundentreffer stammen ausschliesslich vom angemeldeten Makler")
    void clientHitsNeverCrossAgents() {
        SearchResultDto result = searchService.search(ownAgent.getId(), "Bornheimer");

        assertThat(result.getClients()).hasSize(1);
        assertThat(result.getClients().get(0).getTitle()).isEqualTo("Max Bornheimer");
        assertThat(result.getClients())
                .extracting(SearchResultDto.Hit::getTitle)
                .doesNotContain("Erika Bornheimer");
    }

    @Test
    @DisplayName("Immobilien- und Notiztreffer stammen ausschliesslich vom angemeldeten Makler")
    void propertyAndNoteHitsNeverCrossAgents() {
        SearchResultDto result = searchService.search(ownAgent.getId(), "Reihenhaus");

        assertThat(result.getProperties())
                .extracting(SearchResultDto.Hit::getTitle)
                .containsExactly("Gemuetliches Reihenhaus");
        assertThat(result.getNotes())
                .extracting(SearchResultDto.Hit::getTitle)
                .containsExactly("Rueckruf Reihenhaus");
    }

    @Test
    @DisplayName("Der fremde Makler sieht spiegelbildlich nur seine eigenen Daten")
    void foreignAgentSeesOnlyItsOwnData() {
        SearchResultDto result = searchService.search(foreignAgent.getId(), "Bornheim");

        assertThat(result.getClients())
                .extracting(SearchResultDto.Hit::getTitle)
                .containsExactly("Erika Bornheimer");
        assertThat(result.getProperties())
                .extracting(SearchResultDto.Hit::getTitle)
                .containsExactly("Reihenhaus mit Garten");
        assertThat(result.getNotes())
                .extracting(SearchResultDto.Hit::getTitle)
                .containsExactly("Fremde Notiz");
    }

    @Test
    @DisplayName("Notiztreffer verweisen auf den eigenen Kunden, damit die Detailseite erreichbar ist")
    void noteHitCarriesItsOwnClient() {
        SearchResultDto result = searchService.search(ownAgent.getId(), "Stellplatz");

        assertThat(result.getNotes()).hasSize(1);
        SearchResultDto.Hit hit = result.getNotes().get(0);
        assertThat(hit.getClientId()).isNotNull();
        assertThat(hit.getSubtitle()).isEqualTo("Max Bornheimer");
        assertThat(hit.getSnippet()).contains("Stellplatz");
    }

    @Test
    @DisplayName("Kunden werden auch ueber E-Mail und Telefon gefunden — aber nur die eigenen")
    void findsOwnClientsByContactData() {
        assertThat(searchService.search(ownAgent.getId(), "445566").getClients()).hasSize(1);
        assertThat(searchService.search(ownAgent.getId(), "erika@example.com").getClients()).isEmpty();
    }

    @Test
    @DisplayName("Zu kurze Eingaben liefern nichts, statt die halbe Datenbank zu scannen")
    void ignoresTooShortQueries() {
        SearchResultDto result = searchService.search(ownAgent.getId(), "B");

        assertThat(result.getTotalHits()).isZero();
        assertThat(result.getClients()).isEmpty();
        assertThat(result.getProperties()).isEmpty();
        assertThat(result.getNotes()).isEmpty();
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

    private Client persistClient(Agent agent, String firstName, String lastName, String email, String phone) {
        return entityManager.persist(Client.builder()
                .agent(agent)
                .firstName(firstName)
                .lastName(lastName)
                .email(email)
                .phone(phone)
                .build());
    }

    private void persistProperty(Agent agent, String title, String street, String city) {
        entityManager.persist(Property.builder()
                .agent(agent)
                .title(title)
                .propertyType(PropertyType.HOUSE)
                .listingType(ListingType.SALE)
                .addressStreet(street)
                .addressCity(city)
                .addressPostalCode("53332")
                .build());
    }

    private void persistNote(Agent agent, Client client, String subject, String notes) {
        entityManager.persist(CallNote.builder()
                .agent(agent)
                .client(client)
                .callDate(LocalDateTime.now().minusDays(1))
                .callType(CallNote.CallType.PHONE_INBOUND)
                .subject(subject)
                .notes(notes)
                .build());
    }
}
