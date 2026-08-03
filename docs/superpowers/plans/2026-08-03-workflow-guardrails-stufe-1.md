# Workflow-Guardrails Stufe 1 — Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Objekt- und Besichtigungs-Statuswechsel bekommen sieben Regeln — drei harte Sperren (`422`) und vier quittierbare Warnungen (`409`) mit Kaskadenvorschau —, getragen von einer Regel-Engine, auf der die Stufen 2–4 aufbauen.

**Architecture:** Eine `RuleContext`-Sealed-Hierarchie transportiert *Zustand vorher + beabsichtigte Änderung + bereits geladene Nachbardaten* an zustandslose Regelklassen. Die Regeln greifen dadurch **nie** selbst auf Repositories zu und sind ohne Mock testbar. Der `WorkflowGuard` sammelt die Verstöße, wirft bei BLOCK bzw. nicht quittiertem WARN, und gibt sonst die auszuführenden Kaskaden an den Service zurück. Im Frontend fängt ein einziger HTTP-Interceptor die `409` und wiederholt nach Bestätigung — kein Feature-Component wird angefasst.

**Tech Stack:** Java 17 (sealed interfaces, records, pattern matching), Spring Boot 3.3.6, Lombok, JUnit 5 + AssertJ + Mockito, Flyway, Angular 17 standalone + ngx-translate, RxJS.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-08-03-workflow-guardrails-design.md`, Issue #46.
- **i18n:** `RuleViolation` trägt **nur** `messageKey` + `params`, nie fertigen Text. Jeder neue Schlüssel geht in `frontend/src/assets/i18n/de.json` **und** `en.json`.
- **Controller-Mapping:** `@RequestMapping("/properties")` — das Context-Path `/api/v1` wird automatisch vorangestellt, niemals `/api/...` schreiben.
- **Styling (ADR 0001):** Farben ausschließlich über CSS-Variablen (`bg-surface`, `text-body-2`, `border-border`). Kein `bg-white`, `text-gray-*`, `border-gray-*`. Kein statisches `style="…"` mit konstanten Werten — wiederkehrende Bausteine als Klasse in `styles.scss`, berechnete Werte per `[style.x]`-Binding. Schriftgrade sind `text-11`…`text-26`.
  **Achtung:** Der bestehende `ConfirmDialogComponent` ist voller statischer Inline-Styles (er ist Ziel von Issue #45). Er dient als Vorlage für *Struktur und Verhalten*, **nicht** für Styling.
- **Buttons (Issue #28):** Aktionszeile unter dem Formular in `.form-actions form-actions--centered`, **primärer Button zuerst im Markup**. Bestätigen `ri-check-line`, Abbrechen `ri-close-line`.
- **Tests:** Kein lokales Maven/JDK. Backend-Tests laufen im Container:
  ```bash
  docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
    maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=<TestClass>
  ```
  `backend/target/` gehört danach root — vor lokalen Builds ggf. `sudo rm -rf backend/target`.
- **Migrationen:** Nächste freie Nummer ist **V37** (höchste bestehende: `V36__Add_calendar_feed_token_to_agents.sql`). PostgreSQL-kompatibel, UUIDs nur mit Hex-Zeichen (0-9, a-f) — **nie** Buchstabenpräfixe wie p/i/n/s.
- **Commits:** Deutsch, ohne Umlaute in der Betreffzeile (Repo-Konvention: „Adress-Vervollstaendigung"), mit `(#46)`.

---

## Dateistruktur

**Neues Paket `backend/src/main/java/com/marklerapp/crm/rules/`** — eine Datei je Verantwortung, jede Regel isoliert lesbar:

| Datei | Verantwortung |
|---|---|
| `Severity.java` | Enum `BLOCK`, `WARN` |
| `RuleCode.java` | Enum aller Regel-Codes mit explizitem `messageKey` |
| `CascadeType.java` | Enum `CANCEL_VIEWINGS` (Stufe 1); 2–4 ergänzen später |
| `AffectedRecord.java` | Record `(String type, UUID id, String label)` |
| `CascadeAction.java` | Record `(CascadeType action, String messageKey, List<UUID> ids)` |
| `RuleViolation.java` | Record — Code, Severity, messageKey, params, affected, cascade |
| `RuleContext.java` | Sealed interface |
| `PropertyStatusChange.java` | Record-Kontext für Objektstatuswechsel |
| `ViewingChange.java` | Record-Kontext für Besichtigungs-Anlage/-Änderung |
| `WorkflowRule.java` | Interface |
| `TypedWorkflowRule.java` | Abstrakte Basis, erledigt `supports` + Cast |
| `WorkflowGuard.java` | `@Service` — sammelt Regeln, wirft, liefert Kaskaden |
| `WorkflowRuleBlockedException.java` | → `422` |
| `WorkflowRuleWarningException.java` | → `409` |
| `rules/property/*.java` | 4 Objektregeln |
| `rules/viewing/*.java` | 3 Besichtigungsregeln |

**Warum Kontext-Records statt Repository-Zugriff in der Regel:** eine Regel wird dadurch mit drei Zeilen Testaufbau geprüft statt mit einem Mockito-Gerüst, und die Ladelogik lebt an *einer* Stelle im Service statt siebenmal verstreut.

**Geändert:**
- `config/GlobalExceptionHandler.java` — zwei Handler
- `dto/UpdatePropertyRequest.java`, `dto/ViewingDto.java` — Feld `acknowledgedRules`
- `service/PropertyService.java`, `service/ViewingService.java` — Guard-Aufruf + Kaskade
- `repository/ViewingRepository.java` — zwei Abfragen
- `entity/WorkflowOverrideLog.java`, `repository/WorkflowOverrideLogRepository.java` (neu)
- `db/migration/V37__Create_workflow_override_log.sql` (neu)

**Frontend neu:**
- `core/workflow/workflow-violation.model.ts` — Typen
- `core/workflow/workflow-guard.service.ts` — Dialogsteuerung
- `core/interceptors/workflow-guard.interceptor.ts`
- `shared/components/workflow-warning-dialog/workflow-warning-dialog.component.ts`

---

## Task 1: Regel-Engine-Kern

**Files:**
- Create: `backend/src/main/java/com/marklerapp/crm/rules/{Severity,RuleCode,CascadeType,AffectedRecord,CascadeAction,RuleViolation,RuleContext,PropertyStatusChange,ViewingChange,WorkflowRule,TypedWorkflowRule,WorkflowGuard}.java`
- Create: `backend/src/main/java/com/marklerapp/crm/exception/{WorkflowRuleBlockedException,WorkflowRuleWarningException}.java`
- Test: `backend/src/test/java/com/marklerapp/crm/rules/WorkflowGuardTest.java`

**Interfaces:**
- Consumes: nichts.
- Produces: `WorkflowGuard.check(RuleContext, Set<RuleCode>) → List<CascadeAction>`; die Kontext-Records `PropertyStatusChange` und `ViewingChange`; die Basisklasse `TypedWorkflowRule<C>` mit abstrakter Methode `protected abstract Optional<RuleViolation> check(C context)`.

- [ ] **Step 1: Werttypen anlegen**

`Severity.java`:
```java
package com.marklerapp.crm.rules;

public enum Severity {
    /** Fachlich unmoeglich — nicht uebersteuerbar, fuehrt zu HTTP 422. */
    BLOCK,
    /** Unwahrscheinlich, aber legitim — quittierbar, fuehrt zu HTTP 409. */
    WARN
}
```

`RuleCode.java` — der `messageKey` steht ausgeschrieben da, damit er greppbar bleibt:
```java
package com.marklerapp.crm.rules;

public enum RuleCode {

    PROPERTY_RENT_MARKED_SOLD("workflow.rule.propertyRentMarkedSold"),
    VIEWING_FOR_CLOSED_PROPERTY("workflow.rule.viewingForClosedProperty"),
    VIEWING_COMPLETED_IN_FUTURE("workflow.rule.viewingCompletedInFuture"),
    VIEWING_SCHEDULED_IN_PAST("workflow.rule.viewingScheduledInPast"),
    PROPERTY_SOLD_WITH_OPEN_VIEWINGS("workflow.rule.propertySoldWithOpenViewings"),
    PROPERTY_REOPENED("workflow.rule.propertyReopened"),
    PROPERTY_RESERVED_WITHOUT_VIEWING("workflow.rule.propertyReservedWithoutViewing");

    private final String messageKey;

    RuleCode(String messageKey) {
        this.messageKey = messageKey;
    }

    public String getMessageKey() {
        return messageKey;
    }
}
```

`CascadeType.java`:
```java
package com.marklerapp.crm.rules;

public enum CascadeType {
    CANCEL_VIEWINGS
}
```

`AffectedRecord.java`:
```java
package com.marklerapp.crm.rules;

import java.util.UUID;

/** Ein vom Verstoss betroffener Datensatz, wie ihn der Dialog auflistet. */
public record AffectedRecord(String type, UUID id, String label) {
}
```

`CascadeAction.java`:
```java
package com.marklerapp.crm.rules;

import java.util.List;
import java.util.UUID;

public record CascadeAction(CascadeType action, String messageKey, List<UUID> ids) {
}
```

`RuleViolation.java`:
```java
package com.marklerapp.crm.rules;

import java.util.List;
import java.util.Map;

/**
 * Ein Regelverstoss. Traegt bewusst nur messageKey und params statt eines fertigen
 * Satzes — der Text entsteht im Frontend, sonst waeren die Meldungen am i18n-System
 * vorbei hartcodiert.
 */
public record RuleViolation(
        RuleCode code,
        Severity severity,
        String messageKey,
        Map<String, Object> params,
        List<AffectedRecord> affected,
        CascadeAction cascade) {

    public static RuleViolation of(RuleCode code, Severity severity) {
        return new RuleViolation(code, severity, code.getMessageKey(), Map.of(), List.of(), null);
    }

    public RuleViolation withParams(Map<String, Object> params) {
        return new RuleViolation(code, severity, messageKey, params, affected, cascade);
    }

    public RuleViolation withAffected(List<AffectedRecord> affected) {
        return new RuleViolation(code, severity, messageKey, params, affected, cascade);
    }

    public RuleViolation withCascade(CascadeAction cascade) {
        return new RuleViolation(code, severity, messageKey, params, affected, cascade);
    }
}
```

- [ ] **Step 2: Kontext-Typen anlegen**

`RuleContext.java`:
```java
package com.marklerapp.crm.rules;

/**
 * Alles, was eine Regel zur Bewertung braucht — Zustand vorher, beabsichtigte Aenderung
 * und die bereits geladenen Nachbardaten. Regeln greifen nie selbst auf Repositories zu:
 * das macht sie ohne Mocks testbar und haelt die Ladelogik an einer Stelle.
 */
public sealed interface RuleContext permits PropertyStatusChange, ViewingChange {
}
```

`PropertyStatusChange.java`:
```java
package com.marklerapp.crm.rules;

import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.entity.Viewing;

import java.util.List;

/**
 * @param property           Objekt im Zustand VOR der Aenderung
 * @param targetStatus       gewuenschter neuer Status
 * @param scheduledViewings  noch offene Termine (Status SCHEDULED) dieses Objekts
 * @param completedViewingCount Anzahl bereits stattgefundener Termine
 */
public record PropertyStatusChange(
        Property property,
        PropertyStatus targetStatus,
        List<Viewing> scheduledViewings,
        long completedViewingCount) implements RuleContext {
}
```

`ViewingChange.java`:
```java
package com.marklerapp.crm.rules;

import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.Viewing;

import java.time.LocalDateTime;

/**
 * @param existing     bestehender Termin, oder null bei Neuanlage
 * @param property     das Objekt, auf das sich der Termin bezieht
 * @param targetDate   gewuenschter Termin
 * @param targetStatus gewuenschter Status
 */
public record ViewingChange(
        Viewing existing,
        Property property,
        LocalDateTime targetDate,
        Viewing.ViewingStatus targetStatus) implements RuleContext {

    public boolean isNew() {
        return existing == null;
    }
}
```

- [ ] **Step 3: Regel-Interface und typisierte Basis anlegen**

`WorkflowRule.java`:
```java
package com.marklerapp.crm.rules;

import java.util.Optional;

public interface WorkflowRule {

    RuleCode code();

    Severity severity();

    boolean supports(RuleContext context);

    Optional<RuleViolation> evaluate(RuleContext context);
}
```

`TypedWorkflowRule.java`:
```java
package com.marklerapp.crm.rules;

import java.util.Optional;

/**
 * Nimmt jeder Regel den Cast ab: die Unterklasse sieht nur ihren eigenen Kontexttyp.
 */
public abstract class TypedWorkflowRule<C extends RuleContext> implements WorkflowRule {

    private final Class<C> contextType;

    protected TypedWorkflowRule(Class<C> contextType) {
        this.contextType = contextType;
    }

    @Override
    public final boolean supports(RuleContext context) {
        return contextType.isInstance(context);
    }

    @Override
    public final Optional<RuleViolation> evaluate(RuleContext context) {
        return check(contextType.cast(context));
    }

    protected abstract Optional<RuleViolation> check(C context);
}
```

- [ ] **Step 4: Exceptions anlegen**

`WorkflowRuleBlockedException.java`:
```java
package com.marklerapp.crm.exception;

import com.marklerapp.crm.rules.RuleViolation;
import lombok.Getter;

import java.util.List;

/** Fachlich unmoegliche Aenderung — nicht uebersteuerbar. */
@Getter
public class WorkflowRuleBlockedException extends RuntimeException {

    private final transient List<RuleViolation> violations;

    public WorkflowRuleBlockedException(List<RuleViolation> violations) {
        super("Workflow rule blocked the change: " + violations.size() + " violation(s)");
        this.violations = violations;
    }
}
```

`WorkflowRuleWarningException.java` — identisch, nur anderer Name und Meldungstext:
```java
package com.marklerapp.crm.exception;

import com.marklerapp.crm.rules.RuleViolation;
import lombok.Getter;

import java.util.List;

/** Unwahrscheinliche, aber zulaessige Aenderung — quittierbar via acknowledgedRules. */
@Getter
public class WorkflowRuleWarningException extends RuntimeException {

    private final transient List<RuleViolation> violations;

    public WorkflowRuleWarningException(List<RuleViolation> violations) {
        super("Workflow rule warning: " + violations.size() + " unacknowledged violation(s)");
        this.violations = violations;
    }
}
```

- [ ] **Step 5: Den fehlschlagenden Test schreiben**

`backend/src/test/java/com/marklerapp/crm/rules/WorkflowGuardTest.java`:
```java
package com.marklerapp.crm.rules;

import com.marklerapp.crm.exception.WorkflowRuleBlockedException;
import com.marklerapp.crm.exception.WorkflowRuleWarningException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WorkflowGuardTest {

    /** Minimalregel, die immer ausloest — der Guard selbst ist hier der Prueflings. */
    private static WorkflowRule alwaysFiring(RuleCode code, Severity severity, CascadeAction cascade) {
        return new TypedWorkflowRule<PropertyStatusChange>(PropertyStatusChange.class) {
            @Override
            public RuleCode code() {
                return code;
            }

            @Override
            public Severity severity() {
                return severity;
            }

            @Override
            protected Optional<RuleViolation> check(PropertyStatusChange context) {
                RuleViolation v = RuleViolation.of(code, severity);
                return Optional.of(cascade == null ? v : v.withCascade(cascade));
            }
        };
    }

    private static PropertyStatusChange anyContext() {
        return new PropertyStatusChange(null, null, List.of(), 0L);
    }

    @Test
    void blocksRegardlessOfAcknowledgement() {
        WorkflowGuard guard = new WorkflowGuard(List.of(
                alwaysFiring(RuleCode.PROPERTY_RENT_MARKED_SOLD, Severity.BLOCK, null)));

        assertThatThrownBy(() -> guard.check(anyContext(), Set.of(RuleCode.PROPERTY_RENT_MARKED_SOLD)))
                .isInstanceOf(WorkflowRuleBlockedException.class);
    }

    @Test
    void throwsWarningWhenNotAcknowledged() {
        WorkflowGuard guard = new WorkflowGuard(List.of(
                alwaysFiring(RuleCode.PROPERTY_REOPENED, Severity.WARN, null)));

        assertThatThrownBy(() -> guard.check(anyContext(), Set.of()))
                .isInstanceOf(WorkflowRuleWarningException.class);
    }

    @Test
    void returnsCascadesWhenAcknowledged() {
        CascadeAction cascade = new CascadeAction(
                CascadeType.CANCEL_VIEWINGS, "workflow.cascade.cancelViewings", List.of());
        WorkflowGuard guard = new WorkflowGuard(List.of(
                alwaysFiring(RuleCode.PROPERTY_SOLD_WITH_OPEN_VIEWINGS, Severity.WARN, cascade)));

        List<CascadeAction> cascades =
                guard.check(anyContext(), Set.of(RuleCode.PROPERTY_SOLD_WITH_OPEN_VIEWINGS));

        assertThat(cascades).containsExactly(cascade);
    }

    @Test
    void ignoresRulesForOtherContextTypes() {
        WorkflowGuard guard = new WorkflowGuard(List.of(
                alwaysFiring(RuleCode.PROPERTY_REOPENED, Severity.WARN, null)));

        ViewingChange otherContext = new ViewingChange(null, null, null, null);

        assertThat(guard.check(otherContext, Set.of())).isEmpty();
    }

    @Test
    void blockWinsOverUnacknowledgedWarning() {
        WorkflowGuard guard = new WorkflowGuard(List.of(
                alwaysFiring(RuleCode.PROPERTY_REOPENED, Severity.WARN, null),
                alwaysFiring(RuleCode.PROPERTY_RENT_MARKED_SOLD, Severity.BLOCK, null)));

        assertThatThrownBy(() -> guard.check(anyContext(), Set.of()))
                .isInstanceOf(WorkflowRuleBlockedException.class);
    }
}
```

- [ ] **Step 6: Test laufen lassen — er muss fehlschlagen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=WorkflowGuardTest
```
Erwartet: Kompilierfehler „cannot find symbol: class WorkflowGuard".

- [ ] **Step 7: `WorkflowGuard` implementieren**

```java
package com.marklerapp.crm.rules;

import com.marklerapp.crm.exception.WorkflowRuleBlockedException;
import com.marklerapp.crm.exception.WorkflowRuleWarningException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * Wertet alle fuer eine Aenderung zustaendigen Regeln aus.
 *
 * <p>Spring injiziert jede als {@code @Component} registrierte {@link WorkflowRule} —
 * eine neue Regel wird dadurch allein durch ihre Existenz aktiv, ohne Registrierungsliste,
 * die man zu pflegen vergisst.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WorkflowGuard {

    private final List<WorkflowRule> rules;

    /**
     * @return die Kaskaden der quittierten Warnungen, die der Aufrufer in derselben
     *         Transaktion ausfuehren muss
     * @throws WorkflowRuleBlockedException bei fachlich unmoeglicher Aenderung
     * @throws WorkflowRuleWarningException bei nicht quittierter Warnung
     */
    public List<CascadeAction> check(RuleContext context, Set<RuleCode> acknowledged) {
        Set<RuleCode> ack = acknowledged == null ? Set.of() : acknowledged;

        List<RuleViolation> violations = rules.stream()
                .filter(rule -> rule.supports(context))
                .map(rule -> rule.evaluate(context))
                .flatMap(Optional::stream)
                .toList();

        List<RuleViolation> blocking = violations.stream()
                .filter(v -> v.severity() == Severity.BLOCK)
                .toList();
        if (!blocking.isEmpty()) {
            log.debug("Workflow blocked: {}", blocking.stream().map(RuleViolation::code).toList());
            throw new WorkflowRuleBlockedException(blocking);
        }

        List<RuleViolation> unacknowledged = violations.stream()
                .filter(v -> !ack.contains(v.code()))
                .toList();
        if (!unacknowledged.isEmpty()) {
            throw new WorkflowRuleWarningException(unacknowledged);
        }

        return violations.stream()
                .map(RuleViolation::cascade)
                .filter(Objects::nonNull)
                .toList();
    }
}
```

- [ ] **Step 8: Test laufen lassen — er muss bestehen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=WorkflowGuardTest
```
Erwartet: 5 Tests, alle grün.

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/marklerapp/crm/rules backend/src/main/java/com/marklerapp/crm/exception backend/src/test/java/com/marklerapp/crm/rules
git commit -m "Regel-Engine-Kern fuer Workflow-Guardrails (#46)"
```

---

## Task 2: HTTP-Vertrag — 422 und 409 im GlobalExceptionHandler

**Files:**
- Modify: `backend/src/main/java/com/marklerapp/crm/config/GlobalExceptionHandler.java`
- Test: `backend/src/test/java/com/marklerapp/crm/config/WorkflowExceptionHandlerTest.java`

**Interfaces:**
- Consumes: `WorkflowRuleBlockedException`, `WorkflowRuleWarningException`, `RuleViolation` (Task 1).
- Produces: das JSON-Format, gegen das Task 7 im Frontend programmiert — Feld `type` mit Wert `WORKFLOW_WARNING` bzw. `WORKFLOW_BLOCKED`, Feld `violations` als Liste.

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

```java
package com.marklerapp.crm.config;

import com.marklerapp.crm.exception.WorkflowRuleBlockedException;
import com.marklerapp.crm.exception.WorkflowRuleWarningException;
import com.marklerapp.crm.rules.AffectedRecord;
import com.marklerapp.crm.rules.CascadeAction;
import com.marklerapp.crm.rules.CascadeType;
import com.marklerapp.crm.rules.RuleCode;
import com.marklerapp.crm.rules.RuleViolation;
import com.marklerapp.crm.rules.Severity;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class WorkflowExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    @SuppressWarnings("unchecked")
    void warningBecomes409WithFullPayload() {
        UUID viewingId = UUID.randomUUID();
        RuleViolation violation = RuleViolation
                .of(RuleCode.PROPERTY_SOLD_WITH_OPEN_VIEWINGS, Severity.WARN)
                .withParams(Map.of("count", 3))
                .withAffected(List.of(new AffectedRecord("VIEWING", viewingId, "12.08. 14:00 - Mueller")))
                .withCascade(new CascadeAction(
                        CascadeType.CANCEL_VIEWINGS, "workflow.cascade.cancelViewings", List.of(viewingId)));

        ResponseEntity<Map<String, Object>> response =
                handler.handleWorkflowWarning(new WorkflowRuleWarningException(List.of(violation)));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("type", "WORKFLOW_WARNING");

        List<Map<String, Object>> violations = (List<Map<String, Object>>) response.getBody().get("violations");
        assertThat(violations).hasSize(1);
        assertThat(violations.get(0))
                .containsEntry("code", "PROPERTY_SOLD_WITH_OPEN_VIEWINGS")
                .containsEntry("severity", "WARN")
                .containsEntry("messageKey", "workflow.rule.propertySoldWithOpenViewings")
                .containsEntry("params", Map.of("count", 3));

        List<Map<String, Object>> affected = (List<Map<String, Object>>) violations.get(0).get("affected");
        assertThat(affected.get(0)).containsEntry("type", "VIEWING").containsEntry("id", viewingId);

        Map<String, Object> cascade = (Map<String, Object>) violations.get(0).get("cascade");
        assertThat(cascade)
                .containsEntry("action", "CANCEL_VIEWINGS")
                .containsEntry("messageKey", "workflow.cascade.cancelViewings");
    }

    @Test
    void blockBecomes422() {
        ResponseEntity<Map<String, Object>> response = handler.handleWorkflowBlocked(
                new WorkflowRuleBlockedException(List.of(
                        RuleViolation.of(RuleCode.PROPERTY_RENT_MARKED_SOLD, Severity.BLOCK))));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody()).containsEntry("type", "WORKFLOW_BLOCKED");
    }

    @Test
    @SuppressWarnings("unchecked")
    void cascadeIsAbsentWhenRuleHasNone() {
        ResponseEntity<Map<String, Object>> response = handler.handleWorkflowWarning(
                new WorkflowRuleWarningException(List.of(
                        RuleViolation.of(RuleCode.PROPERTY_REOPENED, Severity.WARN))));

        List<Map<String, Object>> violations = (List<Map<String, Object>>) response.getBody().get("violations");
        assertThat(violations.get(0)).doesNotContainKey("cascade");
    }
}
```

- [ ] **Step 2: Test laufen lassen — er muss fehlschlagen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=WorkflowExceptionHandlerTest
```
Erwartet: „cannot find symbol: method handleWorkflowWarning".

- [ ] **Step 3: Handler ergänzen**

In `GlobalExceptionHandler.java` die Importe `com.marklerapp.crm.exception.WorkflowRuleBlockedException`, `...WorkflowRuleWarningException`, `com.marklerapp.crm.rules.RuleViolation`, `java.util.LinkedHashMap`, `java.util.List` ergänzen und anfügen:

```java
    /**
     * Fachlich unmoegliche Aenderung. Bewusst ohne Wiederholungsmoeglichkeit —
     * acknowledgedRules aendert daran nichts.
     */
    @ExceptionHandler(WorkflowRuleBlockedException.class)
    public ResponseEntity<Map<String, Object>> handleWorkflowBlocked(WorkflowRuleBlockedException ex) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(workflowBody("WORKFLOW_BLOCKED", ex.getViolations()));
    }

    /**
     * Quittierbare Warnung. Das Frontend zeigt den Dialog und wiederholt denselben
     * Request mit gesetztem acknowledgedRules.
     */
    @ExceptionHandler(WorkflowRuleWarningException.class)
    public ResponseEntity<Map<String, Object>> handleWorkflowWarning(WorkflowRuleWarningException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(workflowBody("WORKFLOW_WARNING", ex.getViolations()));
    }

    private Map<String, Object> workflowBody(String type, List<RuleViolation> violations) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", type);
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("violations", violations.stream().map(this::violationBody).toList());
        return body;
    }

    private Map<String, Object> violationBody(RuleViolation violation) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("code", violation.code().name());
        item.put("severity", violation.severity().name());
        item.put("messageKey", violation.messageKey());
        item.put("params", violation.params());
        item.put("affected", violation.affected().stream()
                .map(a -> Map.<String, Object>of("type", a.type(), "id", a.id(), "label", a.label()))
                .toList());
        if (violation.cascade() != null) {
            item.put("cascade", Map.<String, Object>of(
                    "action", violation.cascade().action().name(),
                    "messageKey", violation.cascade().messageKey(),
                    "ids", violation.cascade().ids()));
        }
        return item;
    }
```

- [ ] **Step 4: Test laufen lassen — er muss bestehen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=WorkflowExceptionHandlerTest
```
Erwartet: 3 Tests grün.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/marklerapp/crm/config/GlobalExceptionHandler.java backend/src/test/java/com/marklerapp/crm/config/WorkflowExceptionHandlerTest.java
git commit -m "HTTP-Vertrag fuer Workflow-Guardrails: 422 und 409 mit Verstoss-Payload (#46)"
```

---

## Task 3: Die vier Objektregeln

**Files:**
- Create: `backend/src/main/java/com/marklerapp/crm/rules/property/{RentMarkedSoldRule,SoldWithOpenViewingsRule,PropertyReopenedRule,ReservedWithoutViewingRule}.java`
- Test: `backend/src/test/java/com/marklerapp/crm/rules/property/PropertyRulesTest.java`

**Interfaces:**
- Consumes: `TypedWorkflowRule<PropertyStatusChange>`, `RuleViolation.of/withParams/withAffected/withCascade`, `PropertyStatusChange(property, targetStatus, scheduledViewings, completedViewingCount)`.
- Produces: vier `@Component`-Bohnen, die Spring automatisch in `WorkflowGuard` injiziert.

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

```java
package com.marklerapp.crm.rules.property;

import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.ListingType;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.entity.Viewing;
import com.marklerapp.crm.rules.CascadeType;
import com.marklerapp.crm.rules.PropertyStatusChange;
import com.marklerapp.crm.rules.RuleCode;
import com.marklerapp.crm.rules.RuleViolation;
import com.marklerapp.crm.rules.Severity;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PropertyRulesTest {

    private static Property property(ListingType listingType, PropertyStatus status) {
        Property p = new Property();
        p.setId(UUID.randomUUID());
        p.setListingType(listingType);
        p.setStatus(status);
        return p;
    }

    private static Viewing scheduledViewing(String clientLastName, LocalDateTime date) {
        Client client = new Client();
        client.setFirstName("Max");
        client.setLastName(clientLastName);

        Viewing v = new Viewing();
        v.setId(UUID.randomUUID());
        v.setClient(client);
        v.setViewingDate(date);
        v.setStatus(Viewing.ViewingStatus.SCHEDULED);
        return v;
    }

    // ---- RentMarkedSoldRule ----

    @Test
    void rentMarkedSoldBlocks() {
        Optional<RuleViolation> v = new RentMarkedSoldRule().check(new PropertyStatusChange(
                property(ListingType.RENT, PropertyStatus.AVAILABLE), PropertyStatus.SOLD, List.of(), 0L));

        assertThat(v).isPresent();
        assertThat(v.get().code()).isEqualTo(RuleCode.PROPERTY_RENT_MARKED_SOLD);
        assertThat(v.get().severity()).isEqualTo(Severity.BLOCK);
    }

    @Test
    void saleMarkedRentedBlocks() {
        assertThat(new RentMarkedSoldRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.AVAILABLE), PropertyStatus.RENTED, List.of(), 0L)))
                .isPresent();
    }

    @Test
    void rentMarkedRentedIsFine() {
        assertThat(new RentMarkedSoldRule().check(new PropertyStatusChange(
                property(ListingType.RENT, PropertyStatus.AVAILABLE), PropertyStatus.RENTED, List.of(), 0L)))
                .isEmpty();
    }

    @Test
    void unknownListingTypeIsNotBlocked() {
        assertThat(new RentMarkedSoldRule().check(new PropertyStatusChange(
                property(null, PropertyStatus.AVAILABLE), PropertyStatus.SOLD, List.of(), 0L)))
                .isEmpty();
    }

    // ---- SoldWithOpenViewingsRule ----

    @Test
    void soldWithOpenViewingsWarnsAndOffersCascade() {
        Viewing a = scheduledViewing("Mueller", LocalDateTime.of(2026, 8, 12, 14, 0));
        Viewing b = scheduledViewing("Schmidt", LocalDateTime.of(2026, 8, 13, 10, 0));

        Optional<RuleViolation> result = new SoldWithOpenViewingsRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.AVAILABLE), PropertyStatus.SOLD, List.of(a, b), 0L));

        assertThat(result).isPresent();
        RuleViolation v = result.get();
        assertThat(v.severity()).isEqualTo(Severity.WARN);
        assertThat(v.params()).containsEntry("count", 2);
        assertThat(v.affected()).hasSize(2);
        assertThat(v.affected().get(0).type()).isEqualTo("VIEWING");
        assertThat(v.affected().get(0).label()).contains("Mueller");
        assertThat(v.cascade().action()).isEqualTo(CascadeType.CANCEL_VIEWINGS);
        assertThat(v.cascade().ids()).containsExactly(a.getId(), b.getId());
    }

    @Test
    void soldWithoutOpenViewingsIsFine() {
        assertThat(new SoldWithOpenViewingsRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.AVAILABLE), PropertyStatus.SOLD, List.of(), 0L)))
                .isEmpty();
    }

    @Test
    void reservingWithOpenViewingsIsFine() {
        assertThat(new SoldWithOpenViewingsRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.AVAILABLE), PropertyStatus.RESERVED,
                List.of(scheduledViewing("Mueller", LocalDateTime.now().plusDays(1))), 0L)))
                .isEmpty();
    }

    // ---- PropertyReopenedRule ----

    @Test
    void reopeningSoldPropertyWarns() {
        Optional<RuleViolation> v = new PropertyReopenedRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.SOLD), PropertyStatus.AVAILABLE, List.of(), 0L));

        assertThat(v).isPresent();
        assertThat(v.get().code()).isEqualTo(RuleCode.PROPERTY_REOPENED);
        assertThat(v.get().severity()).isEqualTo(Severity.WARN);
    }

    @Test
    void soldToWithdrawnIsNotReopening() {
        assertThat(new PropertyReopenedRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.SOLD), PropertyStatus.WITHDRAWN, List.of(), 0L)))
                .isEmpty();
    }

    @Test
    void availableToReservedIsNotReopening() {
        assertThat(new PropertyReopenedRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.AVAILABLE), PropertyStatus.RESERVED, List.of(), 0L)))
                .isEmpty();
    }

    // ---- ReservedWithoutViewingRule ----

    @Test
    void reservingWithoutCompletedViewingWarns() {
        assertThat(new ReservedWithoutViewingRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.AVAILABLE), PropertyStatus.RESERVED, List.of(), 0L)))
                .isPresent();
    }

    @Test
    void reservingAfterCompletedViewingIsFine() {
        assertThat(new ReservedWithoutViewingRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.AVAILABLE), PropertyStatus.RESERVED, List.of(), 1L)))
                .isEmpty();
    }

    @Test
    void alreadyReservedDoesNotWarnAgain() {
        assertThat(new ReservedWithoutViewingRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.RESERVED), PropertyStatus.RESERVED, List.of(), 0L)))
                .isEmpty();
    }
}
```

- [ ] **Step 2: Test laufen lassen — er muss fehlschlagen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=PropertyRulesTest
```
Erwartet: „cannot find symbol: class RentMarkedSoldRule".

- [ ] **Step 3: Die vier Regeln implementieren**

`RentMarkedSoldRule.java`:
```java
package com.marklerapp.crm.rules.property;

import com.marklerapp.crm.entity.ListingType;
import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.rules.*;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Ein Mietobjekt ist nicht "verkauft" und ein Kaufobjekt nicht "vermietet" — das ist
 * kein unwahrscheinlicher Fall, sondern ein widerspruechlicher. Deshalb BLOCK.
 */
@Component
public class RentMarkedSoldRule extends TypedWorkflowRule<PropertyStatusChange> {

    public RentMarkedSoldRule() {
        super(PropertyStatusChange.class);
    }

    @Override
    public RuleCode code() {
        return RuleCode.PROPERTY_RENT_MARKED_SOLD;
    }

    @Override
    public Severity severity() {
        return Severity.BLOCK;
    }

    @Override
    protected Optional<RuleViolation> check(PropertyStatusChange context) {
        ListingType listingType = context.property().getListingType();
        PropertyStatus target = context.targetStatus();
        if (listingType == null || target == null) {
            return Optional.empty();
        }

        boolean contradiction = (listingType == ListingType.RENT && target == PropertyStatus.SOLD)
                || (listingType == ListingType.SALE && target == PropertyStatus.RENTED);

        return contradiction ? Optional.of(RuleViolation.of(code(), severity())) : Optional.empty();
    }
}
```

`SoldWithOpenViewingsRule.java`:
```java
package com.marklerapp.crm.rules.property;

import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.entity.Viewing;
import com.marklerapp.crm.rules.*;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class SoldWithOpenViewingsRule extends TypedWorkflowRule<PropertyStatusChange> {

    private static final DateTimeFormatter LABEL_FORMAT = DateTimeFormatter.ofPattern("dd.MM. HH:mm");

    public SoldWithOpenViewingsRule() {
        super(PropertyStatusChange.class);
    }

    @Override
    public RuleCode code() {
        return RuleCode.PROPERTY_SOLD_WITH_OPEN_VIEWINGS;
    }

    @Override
    public Severity severity() {
        return Severity.WARN;
    }

    @Override
    protected Optional<RuleViolation> check(PropertyStatusChange context) {
        PropertyStatus target = context.targetStatus();
        boolean closing = target == PropertyStatus.SOLD || target == PropertyStatus.RENTED;
        List<Viewing> open = context.scheduledViewings();

        if (!closing || open.isEmpty()) {
            return Optional.empty();
        }

        List<AffectedRecord> affected = open.stream()
                .map(v -> new AffectedRecord("VIEWING", v.getId(), label(v)))
                .toList();

        return Optional.of(RuleViolation.of(code(), severity())
                .withParams(Map.of("count", open.size()))
                .withAffected(affected)
                .withCascade(new CascadeAction(
                        CascadeType.CANCEL_VIEWINGS,
                        "workflow.cascade.cancelViewings",
                        open.stream().map(Viewing::getId).toList())));
    }

    private String label(Viewing viewing) {
        String when = viewing.getViewingDate() == null ? "?" : viewing.getViewingDate().format(LABEL_FORMAT);
        String who = viewing.getClient() == null ? "?" : viewing.getClient().getFullName();
        return when + " - " + who;
    }
}
```

`PropertyReopenedRule.java`:
```java
package com.marklerapp.crm.rules.property;

import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.rules.*;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Ein abgeschlossenes Objekt wieder in den Verkauf zu nehmen ist legitim — als Korrektur
 * eines Fehlklicks oder wenn ein Kauf platzt. Nur eben selten genug, dass eine Rueckfrage
 * mehr nuetzt als stoert.
 */
@Component
public class PropertyReopenedRule extends TypedWorkflowRule<PropertyStatusChange> {

    public PropertyReopenedRule() {
        super(PropertyStatusChange.class);
    }

    @Override
    public RuleCode code() {
        return RuleCode.PROPERTY_REOPENED;
    }

    @Override
    public Severity severity() {
        return Severity.WARN;
    }

    @Override
    protected Optional<RuleViolation> check(PropertyStatusChange context) {
        PropertyStatus current = context.property().getStatus();
        PropertyStatus target = context.targetStatus();

        boolean wasClosed = current == PropertyStatus.SOLD || current == PropertyStatus.RENTED;
        boolean becomesOpen = target == PropertyStatus.AVAILABLE || target == PropertyStatus.RESERVED;

        return wasClosed && becomesOpen
                ? Optional.of(RuleViolation.of(code(), severity()))
                : Optional.empty();
    }
}
```

`ReservedWithoutViewingRule.java`:
```java
package com.marklerapp.crm.rules.property;

import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.rules.*;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Eine Reservierung ohne je eine stattgefundene Besichtigung deutet meist darauf hin,
 * dass der Termin nicht erfasst wurde — nicht darauf, dass es ihn nicht gab.
 */
@Component
public class ReservedWithoutViewingRule extends TypedWorkflowRule<PropertyStatusChange> {

    public ReservedWithoutViewingRule() {
        super(PropertyStatusChange.class);
    }

    @Override
    public RuleCode code() {
        return RuleCode.PROPERTY_RESERVED_WITHOUT_VIEWING;
    }

    @Override
    public Severity severity() {
        return Severity.WARN;
    }

    @Override
    protected Optional<RuleViolation> check(PropertyStatusChange context) {
        boolean becomesReserved = context.targetStatus() == PropertyStatus.RESERVED
                && context.property().getStatus() != PropertyStatus.RESERVED;

        return becomesReserved && context.completedViewingCount() == 0
                ? Optional.of(RuleViolation.of(code(), severity()))
                : Optional.empty();
    }
}
```

- [ ] **Step 4: Test laufen lassen — er muss bestehen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=PropertyRulesTest
```
Erwartet: 12 Tests grün.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/marklerapp/crm/rules/property backend/src/test/java/com/marklerapp/crm/rules/property
git commit -m "Vier Objektstatus-Regeln fuer Workflow-Guardrails (#46)"
```

---

## Task 4: Die drei Besichtigungsregeln

**Files:**
- Create: `backend/src/main/java/com/marklerapp/crm/rules/viewing/{ViewingForClosedPropertyRule,ViewingCompletedInFutureRule,ViewingScheduledInPastRule}.java`
- Test: `backend/src/test/java/com/marklerapp/crm/rules/viewing/ViewingRulesTest.java`

**Interfaces:**
- Consumes: `TypedWorkflowRule<ViewingChange>`, `ViewingChange(existing, property, targetDate, targetStatus)` mit `isNew()`.
- Produces: drei `@Component`-Bohnen.

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

```java
package com.marklerapp.crm.rules.viewing;

import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.entity.Viewing;
import com.marklerapp.crm.rules.RuleCode;
import com.marklerapp.crm.rules.Severity;
import com.marklerapp.crm.rules.ViewingChange;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class ViewingRulesTest {

    private static Property property(PropertyStatus status) {
        Property p = new Property();
        p.setId(UUID.randomUUID());
        p.setStatus(status);
        return p;
    }

    private static Viewing existing() {
        Viewing v = new Viewing();
        v.setId(UUID.randomUUID());
        v.setStatus(Viewing.ViewingStatus.SCHEDULED);
        return v;
    }

    // ---- ViewingForClosedPropertyRule ----

    @Test
    void newViewingForSoldPropertyBlocks() {
        var v = new ViewingForClosedPropertyRule().check(new ViewingChange(
                null, property(PropertyStatus.SOLD),
                LocalDateTime.now().plusDays(1), Viewing.ViewingStatus.SCHEDULED));

        assertThat(v).isPresent();
        assertThat(v.get().code()).isEqualTo(RuleCode.VIEWING_FOR_CLOSED_PROPERTY);
        assertThat(v.get().severity()).isEqualTo(Severity.BLOCK);
        assertThat(v.get().affected()).singleElement()
                .satisfies(a -> assertThat(a.type()).isEqualTo("PROPERTY"));
    }

    @Test
    void newViewingForWithdrawnPropertyBlocks() {
        assertThat(new ViewingForClosedPropertyRule().check(new ViewingChange(
                null, property(PropertyStatus.WITHDRAWN),
                LocalDateTime.now().plusDays(1), Viewing.ViewingStatus.SCHEDULED)))
                .isPresent();
    }

    @Test
    void newViewingForAvailablePropertyIsFine() {
        assertThat(new ViewingForClosedPropertyRule().check(new ViewingChange(
                null, property(PropertyStatus.AVAILABLE),
                LocalDateTime.now().plusDays(1), Viewing.ViewingStatus.SCHEDULED)))
                .isEmpty();
    }

    /**
     * Wichtig: die Kaskade aus SoldWithOpenViewingsRule setzt bestehende Termine eines
     * verkauften Objekts auf CANCELLED. Wuerde diese Regel auch bei Aenderungen greifen,
     * blockierte sie die eigene Kaskade.
     */
    @Test
    void editingExistingViewingOnSoldPropertyIsFine() {
        assertThat(new ViewingForClosedPropertyRule().check(new ViewingChange(
                existing(), property(PropertyStatus.SOLD),
                LocalDateTime.now().plusDays(1), Viewing.ViewingStatus.CANCELLED)))
                .isEmpty();
    }

    // ---- ViewingCompletedInFutureRule ----

    @Test
    void completedWithFutureDateBlocks() {
        var v = new ViewingCompletedInFutureRule().check(new ViewingChange(
                existing(), property(PropertyStatus.AVAILABLE),
                LocalDateTime.now().plusDays(2), Viewing.ViewingStatus.COMPLETED));

        assertThat(v).isPresent();
        assertThat(v.get().severity()).isEqualTo(Severity.BLOCK);
    }

    @Test
    void completedWithPastDateIsFine() {
        assertThat(new ViewingCompletedInFutureRule().check(new ViewingChange(
                existing(), property(PropertyStatus.AVAILABLE),
                LocalDateTime.now().minusHours(2), Viewing.ViewingStatus.COMPLETED)))
                .isEmpty();
    }

    @Test
    void scheduledWithFutureDateIsFine() {
        assertThat(new ViewingCompletedInFutureRule().check(new ViewingChange(
                existing(), property(PropertyStatus.AVAILABLE),
                LocalDateTime.now().plusDays(2), Viewing.ViewingStatus.SCHEDULED)))
                .isEmpty();
    }

    // ---- ViewingScheduledInPastRule ----

    @Test
    void newScheduledViewingInPastWarns() {
        var v = new ViewingScheduledInPastRule().check(new ViewingChange(
                null, property(PropertyStatus.AVAILABLE),
                LocalDateTime.now().minusDays(1), Viewing.ViewingStatus.SCHEDULED));

        assertThat(v).isPresent();
        assertThat(v.get().severity()).isEqualTo(Severity.WARN);
    }

    @Test
    void newCompletedViewingInPastIsFine() {
        assertThat(new ViewingScheduledInPastRule().check(new ViewingChange(
                null, property(PropertyStatus.AVAILABLE),
                LocalDateTime.now().minusDays(1), Viewing.ViewingStatus.COMPLETED)))
                .isEmpty();
    }

    @Test
    void newScheduledViewingInFutureIsFine() {
        assertThat(new ViewingScheduledInPastRule().check(new ViewingChange(
                null, property(PropertyStatus.AVAILABLE),
                LocalDateTime.now().plusDays(1), Viewing.ViewingStatus.SCHEDULED)))
                .isEmpty();
    }
}
```

- [ ] **Step 2: Test laufen lassen — er muss fehlschlagen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=ViewingRulesTest
```
Erwartet: „cannot find symbol: class ViewingForClosedPropertyRule".

- [ ] **Step 3: Die drei Regeln implementieren**

`ViewingForClosedPropertyRule.java`:
```java
package com.marklerapp.crm.rules.viewing;

import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyStatus;
import com.marklerapp.crm.rules.*;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

/**
 * Greift bewusst nur bei Neuanlage. Bestehende Termine eines verkauften Objekts muessen
 * aenderbar bleiben — sonst blockierte diese Regel die Kaskade aus
 * {@code SoldWithOpenViewingsRule}, die genau diese Termine auf CANCELLED setzt.
 */
@Component
public class ViewingForClosedPropertyRule extends TypedWorkflowRule<ViewingChange> {

    public ViewingForClosedPropertyRule() {
        super(ViewingChange.class);
    }

    @Override
    public RuleCode code() {
        return RuleCode.VIEWING_FOR_CLOSED_PROPERTY;
    }

    @Override
    public Severity severity() {
        return Severity.BLOCK;
    }

    @Override
    protected Optional<RuleViolation> check(ViewingChange context) {
        if (!context.isNew()) {
            return Optional.empty();
        }

        Property property = context.property();
        PropertyStatus status = property.getStatus();
        boolean closed = status == PropertyStatus.SOLD
                || status == PropertyStatus.RENTED
                || status == PropertyStatus.WITHDRAWN;

        if (!closed) {
            return Optional.empty();
        }

        return Optional.of(RuleViolation.of(code(), severity())
                .withAffected(List.of(new AffectedRecord(
                        "PROPERTY", property.getId(), property.getTitle()))));
    }
}
```

`ViewingCompletedInFutureRule.java`:
```java
package com.marklerapp.crm.rules.viewing;

import com.marklerapp.crm.entity.Viewing;
import com.marklerapp.crm.rules.*;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Optional;

@Component
public class ViewingCompletedInFutureRule extends TypedWorkflowRule<ViewingChange> {

    public ViewingCompletedInFutureRule() {
        super(ViewingChange.class);
    }

    @Override
    public RuleCode code() {
        return RuleCode.VIEWING_COMPLETED_IN_FUTURE;
    }

    @Override
    public Severity severity() {
        return Severity.BLOCK;
    }

    @Override
    protected Optional<RuleViolation> check(ViewingChange context) {
        if (context.targetStatus() != Viewing.ViewingStatus.COMPLETED || context.targetDate() == null) {
            return Optional.empty();
        }

        return context.targetDate().isAfter(LocalDateTime.now())
                ? Optional.of(RuleViolation.of(code(), severity()))
                : Optional.empty();
    }
}
```

`ViewingScheduledInPastRule.java`:
```java
package com.marklerapp.crm.rules.viewing;

import com.marklerapp.crm.entity.Viewing;
import com.marklerapp.crm.rules.*;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Nur WARN: einen vergangenen Termin nachzutragen ist legitim. Wer ihn allerdings als
 * SCHEDULED statt COMPLETED nachtraegt, hat sich meist im Datum vertan.
 */
@Component
public class ViewingScheduledInPastRule extends TypedWorkflowRule<ViewingChange> {

    public ViewingScheduledInPastRule() {
        super(ViewingChange.class);
    }

    @Override
    public RuleCode code() {
        return RuleCode.VIEWING_SCHEDULED_IN_PAST;
    }

    @Override
    public Severity severity() {
        return Severity.WARN;
    }

    @Override
    protected Optional<RuleViolation> check(ViewingChange context) {
        if (!context.isNew()
                || context.targetStatus() != Viewing.ViewingStatus.SCHEDULED
                || context.targetDate() == null) {
            return Optional.empty();
        }

        return context.targetDate().isBefore(LocalDateTime.now())
                ? Optional.of(RuleViolation.of(code(), severity()))
                : Optional.empty();
    }
}
```

- [ ] **Step 4: Test laufen lassen — er muss bestehen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=ViewingRulesTest
```
Erwartet: 10 Tests grün.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/marklerapp/crm/rules/viewing backend/src/test/java/com/marklerapp/crm/rules/viewing
git commit -m "Drei Besichtigungsregeln fuer Workflow-Guardrails (#46)"
```

---

## Task 5: Übersteuerungs-Protokoll

**Files:**
- Create: `backend/src/main/resources/db/migration/V37__Create_workflow_override_log.sql`
- Create: `backend/src/main/java/com/marklerapp/crm/entity/WorkflowOverrideLog.java`
- Create: `backend/src/main/java/com/marklerapp/crm/repository/WorkflowOverrideLogRepository.java`
- Create: `backend/src/main/java/com/marklerapp/crm/service/WorkflowOverrideLogger.java`
- Test: `backend/src/test/java/com/marklerapp/crm/service/WorkflowOverrideLoggerTest.java`

**Interfaces:**
- Consumes: `RuleCode`, `CascadeAction` (Task 1).
- Produces: `WorkflowOverrideLogger.record(Set<RuleCode> acknowledged, String entityType, UUID entityId, UUID agentId)` — von Task 6 aufgerufen.

- [ ] **Step 1: Migration schreiben**

`V37__Create_workflow_override_log.sql`:
```sql
-- Protokoll uebersteuerter Workflow-Warnungen (Issue #46).
-- Zweck ist nicht Revision, sondern Regelpflege: wird eine Warnung von fast allen
-- Nutzern weggeklickt, ist die Regel falsch gewaehlt und nicht der Nutzer.
CREATE TABLE workflow_override_log (
    id          UUID PRIMARY KEY,
    rule_code   VARCHAR(64)  NOT NULL,
    entity_type VARCHAR(32)  NOT NULL,
    entity_id   UUID         NOT NULL,
    agent_id    UUID         NOT NULL,
    created_at  TIMESTAMP    NOT NULL
);

CREATE INDEX idx_workflow_override_rule_code ON workflow_override_log (rule_code);
CREATE INDEX idx_workflow_override_agent ON workflow_override_log (agent_id, created_at);
```

- [ ] **Step 2: Entity und Repository anlegen**

`WorkflowOverrideLog.java`:
```java
package com.marklerapp.crm.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "workflow_override_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkflowOverrideLog {

    @Id
    private UUID id;

    @Column(name = "rule_code", nullable = false, length = 64)
    private String ruleCode;

    @Column(name = "entity_type", nullable = false, length = 32)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @Column(name = "agent_id", nullable = false)
    private UUID agentId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
```

`WorkflowOverrideLogRepository.java`:
```java
package com.marklerapp.crm.repository;

import com.marklerapp.crm.entity.WorkflowOverrideLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface WorkflowOverrideLogRepository extends JpaRepository<WorkflowOverrideLog, UUID> {
}
```

- [ ] **Step 3: Den fehlschlagenden Test schreiben**

`WorkflowOverrideLoggerTest.java`:
```java
package com.marklerapp.crm.service;

import com.marklerapp.crm.entity.WorkflowOverrideLog;
import com.marklerapp.crm.repository.WorkflowOverrideLogRepository;
import com.marklerapp.crm.rules.RuleCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class WorkflowOverrideLoggerTest {

    @Mock
    private WorkflowOverrideLogRepository repository;

    @InjectMocks
    private WorkflowOverrideLogger logger;

    @Test
    void writesOneRowPerAcknowledgedRule() {
        UUID entityId = UUID.randomUUID();
        UUID agentId = UUID.randomUUID();

        logger.record(Set.of(RuleCode.PROPERTY_REOPENED, RuleCode.PROPERTY_RESERVED_WITHOUT_VIEWING),
                "PROPERTY", entityId, agentId);

        ArgumentCaptor<List<WorkflowOverrideLog>> captor = ArgumentCaptor.forClass(List.class);
        verify(repository).saveAll(captor.capture());

        List<WorkflowOverrideLog> saved = captor.getValue();
        assertThat(saved).hasSize(2);
        assertThat(saved).allSatisfy(row -> {
            assertThat(row.getId()).isNotNull();
            assertThat(row.getCreatedAt()).isNotNull();
            assertThat(row.getEntityType()).isEqualTo("PROPERTY");
            assertThat(row.getEntityId()).isEqualTo(entityId);
            assertThat(row.getAgentId()).isEqualTo(agentId);
        });
        assertThat(saved).extracting(WorkflowOverrideLog::getRuleCode)
                .containsExactlyInAnyOrder("PROPERTY_REOPENED", "PROPERTY_RESERVED_WITHOUT_VIEWING");
    }

    @Test
    void writesNothingWhenNothingWasAcknowledged() {
        logger.record(Set.of(), "PROPERTY", UUID.randomUUID(), UUID.randomUUID());
        verifyNoInteractions(repository);
    }

    @Test
    void toleratesNullAcknowledgementSet() {
        logger.record(null, "PROPERTY", UUID.randomUUID(), UUID.randomUUID());
        verifyNoInteractions(repository);
    }
}
```

- [ ] **Step 4: Test laufen lassen — er muss fehlschlagen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=WorkflowOverrideLoggerTest
```
Erwartet: „cannot find symbol: class WorkflowOverrideLogger".

- [ ] **Step 5: `WorkflowOverrideLogger` implementieren**

```java
package com.marklerapp.crm.service;

import com.marklerapp.crm.entity.WorkflowOverrideLog;
import com.marklerapp.crm.repository.WorkflowOverrideLogRepository;
import com.marklerapp.crm.rules.RuleCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WorkflowOverrideLogger {

    private final WorkflowOverrideLogRepository repository;

    public void record(Set<RuleCode> acknowledged, String entityType, UUID entityId, UUID agentId) {
        if (acknowledged == null || acknowledged.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        repository.saveAll(acknowledged.stream()
                .map(code -> WorkflowOverrideLog.builder()
                        .id(UUID.randomUUID())
                        .ruleCode(code.name())
                        .entityType(entityType)
                        .entityId(entityId)
                        .agentId(agentId)
                        .createdAt(now)
                        .build())
                .toList());
    }
}
```

- [ ] **Step 6: Test laufen lassen — er muss bestehen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=WorkflowOverrideLoggerTest
```
Erwartet: 3 Tests grün.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/resources/db/migration/V37__Create_workflow_override_log.sql \
        backend/src/main/java/com/marklerapp/crm/entity/WorkflowOverrideLog.java \
        backend/src/main/java/com/marklerapp/crm/repository/WorkflowOverrideLogRepository.java \
        backend/src/main/java/com/marklerapp/crm/service/WorkflowOverrideLogger.java \
        backend/src/test/java/com/marklerapp/crm/service/WorkflowOverrideLoggerTest.java
git commit -m "Protokoll uebersteuerter Workflow-Warnungen (#46)"
```

---

## Task 6: Regeln in PropertyService und ViewingService verdrahten

**Files:**
- Modify: `backend/src/main/java/com/marklerapp/crm/dto/UpdatePropertyRequest.java`
- Modify: `backend/src/main/java/com/marklerapp/crm/dto/ViewingDto.java` (`CreateRequest`, `UpdateRequest`)
- Modify: `backend/src/main/java/com/marklerapp/crm/repository/ViewingRepository.java`
- Modify: `backend/src/main/java/com/marklerapp/crm/service/PropertyService.java:120` (`updateProperty`)
- Modify: `backend/src/main/java/com/marklerapp/crm/service/ViewingService.java:44` (`createViewing`), `:84` (`updateViewing`)
- Test: `backend/src/test/java/com/marklerapp/crm/service/WorkflowGuardIntegrationTest.java`

**Interfaces:**
- Consumes: `WorkflowGuard.check(...)`, `PropertyStatusChange`, `ViewingChange`, `WorkflowOverrideLogger.record(...)`.
- Produces: das Feld `acknowledgedRules` im JSON-Body von `PUT /properties/{id}`, `POST /viewings`, `PUT /viewings/{viewingId}` — Task 7 setzt es.

> **Hinweis:** `acknowledgedRules` bricht `UpdateFieldParityTest` **nicht** — der Reflection-Scan überspringt Felder, die auf der Entität nicht existieren (`UpdateFieldParityTest.java:166`). Auch kein MapStruct-Problem: `unmappedTargetPolicy=ERROR` gilt nur für `PropertySearchCriteriaMapper`, und `PropertyMapper`/`ViewingMapper` bilden keine Request-DTOs ab.

- [ ] **Step 1: Repository-Abfragen ergänzen**

In `ViewingRepository.java` anfügen:
```java
    @Query("SELECT v FROM Viewing v JOIN FETCH v.client WHERE v.property.id = :propertyId AND v.status = :status")
    List<Viewing> findByPropertyIdAndStatus(@Param("propertyId") UUID propertyId,
                                            @Param("status") Viewing.ViewingStatus status);

    @Query("SELECT COUNT(v) FROM Viewing v WHERE v.property.id = :propertyId AND v.status = :status")
    long countByPropertyIdAndStatus(@Param("propertyId") UUID propertyId,
                                    @Param("status") Viewing.ViewingStatus status);
```
`Viewing` importieren, falls noch nicht vorhanden.

- [ ] **Step 2: DTO-Felder ergänzen**

In `UpdatePropertyRequest.java`, `ViewingDto.CreateRequest` und `ViewingDto.UpdateRequest` jeweils ergänzen (Importe `com.marklerapp.crm.rules.RuleCode`, `java.util.Set`):
```java
    /**
     * Vom Makler im Warnungsdialog quittierte Regeln (Issue #46). Kein Fachfeld —
     * wird nie auf die Entitaet kopiert.
     */
    private Set<RuleCode> acknowledgedRules;
```

- [ ] **Step 3: Den fehlschlagenden Integrationstest schreiben**

`WorkflowGuardIntegrationTest.java`:
```java
package com.marklerapp.crm.service;

import com.marklerapp.crm.dto.UpdatePropertyRequest;
import com.marklerapp.crm.dto.ViewingDto;
import com.marklerapp.crm.entity.*;
import com.marklerapp.crm.exception.WorkflowRuleBlockedException;
import com.marklerapp.crm.exception.WorkflowRuleWarningException;
import com.marklerapp.crm.mapper.*;
import com.marklerapp.crm.repository.*;
import com.marklerapp.crm.rules.*;
import com.marklerapp.crm.rules.property.*;
import com.marklerapp.crm.rules.viewing.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Prueft die Verdrahtung: laedt der Service die richtigen Nachbardaten in den Kontext,
 * und fuehrt er die Kaskade quittierter Warnungen tatsaechlich aus?
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class WorkflowGuardIntegrationTest {

    @Mock private PropertyRepository propertyRepository;
    @Mock private PropertyImageRepository propertyImageRepository;
    @Mock private ViewingRepository viewingRepository;
    @Mock private ClientRepository clientRepository;
    @Mock private AgentRepository agentRepository;
    @Mock private PropertyMapper propertyMapper;
    @Mock private PropertyImageMapper propertyImageMapper;
    @Mock private ViewingMapper viewingMapper;
    @Mock private OwnershipValidator ownershipValidator;
    @Mock private GeocodingService geocodingService;
    @Mock private WorkflowOverrideLogger overrideLogger;

    private WorkflowGuard guard;
    private PropertyService propertyService;
    private ViewingService viewingService;
    private UUID agentId;
    private Agent agent;

    @BeforeEach
    void setUp() {
        guard = new WorkflowGuard(List.of(
                new RentMarkedSoldRule(), new SoldWithOpenViewingsRule(),
                new PropertyReopenedRule(), new ReservedWithoutViewingRule(),
                new ViewingForClosedPropertyRule(), new ViewingCompletedInFutureRule(),
                new ViewingScheduledInPastRule()));

        // Argumentreihenfolge = Feldreihenfolge der Klasse (Lombok @RequiredArgsConstructor).
        // Die drei neuen Felder kommen in Schritt 5 ans Ende der Feldliste.
        propertyService = new PropertyService(
                propertyRepository, propertyImageRepository, agentRepository, clientRepository,
                propertyMapper, propertyImageMapper, ownershipValidator, geocodingService,
                viewingRepository, guard, overrideLogger);

        viewingService = new ViewingService(
                viewingRepository, clientRepository, agentRepository, propertyRepository,
                viewingMapper, ownershipValidator, guard);

        agentId = UUID.randomUUID();
        agent = new Agent();
        agent.setId(agentId);
    }

    private Property property(ListingType listingType, PropertyStatus status) {
        Property p = new Property();
        p.setId(UUID.randomUUID());
        p.setAgent(agent);
        p.setListingType(listingType);
        p.setStatus(status);
        p.setTitle("Testobjekt");
        when(propertyRepository.findById(p.getId())).thenReturn(Optional.of(p));
        when(propertyRepository.save(any(Property.class))).thenAnswer(i -> i.getArgument(0));
        return p;
    }

    private Viewing scheduledViewing(Property property) {
        Client client = new Client();
        client.setFirstName("Max");
        client.setLastName("Mueller");

        Viewing v = new Viewing();
        v.setId(UUID.randomUUID());
        v.setProperty(property);
        v.setClient(client);
        v.setViewingDate(LocalDateTime.now().plusDays(3));
        v.setStatus(Viewing.ViewingStatus.SCHEDULED);
        return v;
    }

    @Test
    void blockedRuleThrowsEvenWhenAcknowledged() {
        Property p = property(ListingType.RENT, PropertyStatus.AVAILABLE);
        UpdatePropertyRequest request = new UpdatePropertyRequest();
        request.setStatus(PropertyStatus.SOLD);
        request.setAcknowledgedRules(Set.of(RuleCode.PROPERTY_RENT_MARKED_SOLD));

        assertThatThrownBy(() -> propertyService.updateProperty(p.getId(), request, agentId))
                .isInstanceOf(WorkflowRuleBlockedException.class);

        verify(propertyRepository, never()).save(any());
    }

    @Test
    void unacknowledgedWarningThrowsAndSavesNothing() {
        Property p = property(ListingType.SALE, PropertyStatus.AVAILABLE);
        Viewing open = scheduledViewing(p);
        when(viewingRepository.findByPropertyIdAndStatus(p.getId(), Viewing.ViewingStatus.SCHEDULED))
                .thenReturn(List.of(open));

        UpdatePropertyRequest request = new UpdatePropertyRequest();
        request.setStatus(PropertyStatus.SOLD);

        assertThatThrownBy(() -> propertyService.updateProperty(p.getId(), request, agentId))
                .isInstanceOf(WorkflowRuleWarningException.class)
                .extracting(e -> ((WorkflowRuleWarningException) e).getViolations())
                .satisfies(violations -> assertThat((List<RuleViolation>) violations)
                        .extracting(RuleViolation::code)
                        .contains(RuleCode.PROPERTY_SOLD_WITH_OPEN_VIEWINGS));

        verify(propertyRepository, never()).save(any());
    }

    @Test
    void acknowledgedWarningSavesAndRunsCascade() {
        Property p = property(ListingType.SALE, PropertyStatus.AVAILABLE);
        Viewing open = scheduledViewing(p);
        when(viewingRepository.findByPropertyIdAndStatus(p.getId(), Viewing.ViewingStatus.SCHEDULED))
                .thenReturn(List.of(open));
        when(viewingRepository.findAllById(List.of(open.getId()))).thenReturn(List.of(open));

        UpdatePropertyRequest request = new UpdatePropertyRequest();
        request.setStatus(PropertyStatus.SOLD);
        request.setAcknowledgedRules(Set.of(RuleCode.PROPERTY_SOLD_WITH_OPEN_VIEWINGS));

        propertyService.updateProperty(p.getId(), request, agentId);

        assertThat(p.getStatus()).isEqualTo(PropertyStatus.SOLD);
        assertThat(open.getStatus()).isEqualTo(Viewing.ViewingStatus.CANCELLED);
        verify(viewingRepository).saveAll(List.of(open));
        verify(overrideLogger).record(
                Set.of(RuleCode.PROPERTY_SOLD_WITH_OPEN_VIEWINGS), "PROPERTY", p.getId(), agentId);
    }

    @Test
    void editWithoutStatusChangeSkipsRulesEntirely() {
        Property p = property(ListingType.RENT, PropertyStatus.AVAILABLE);

        UpdatePropertyRequest request = new UpdatePropertyRequest();
        request.setTitle("Neuer Titel");

        propertyService.updateProperty(p.getId(), request, agentId);

        verify(viewingRepository, never()).findByPropertyIdAndStatus(any(), any());
        verify(propertyRepository).save(p);
    }
}
```

- [ ] **Step 4: Test laufen lassen — er muss fehlschlagen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=WorkflowGuardIntegrationTest
```
Erwartet: Kompilierfehler wegen der fehlenden Konstruktor-Parameter.

- [ ] **Step 5: `PropertyService.updateProperty` verdrahten**

Drei Felder **ans Ende** der Feldliste hängen — nach `geocodingService` (`PropertyService.java:64`), genau in dieser Reihenfolge, damit der von Lombok erzeugte Konstruktor zur Testinstanziierung aus Schritt 3 passt:

```java
    private final ViewingRepository viewingRepository;
    private final WorkflowGuard workflowGuard;
    private final WorkflowOverrideLogger workflowOverrideLogger;
```

In `updateProperty` **vor** `updatePropertyFields(property, request)` einfügen:

```java
        // Regeln nur pruefen, wenn der Status sich tatsaechlich aendert — eine Preisaenderung
        // soll keine Statuswarnung ausloesen und keine Besichtigungen nachladen.
        List<CascadeAction> cascades = List.of();
        boolean statusChanges = request.getStatus() != null && request.getStatus() != property.getStatus();
        if (statusChanges) {
            List<Viewing> scheduled = viewingRepository.findByPropertyIdAndStatus(
                    propertyId, Viewing.ViewingStatus.SCHEDULED);
            long completed = viewingRepository.countByPropertyIdAndStatus(
                    propertyId, Viewing.ViewingStatus.COMPLETED);

            cascades = workflowGuard.check(
                    new PropertyStatusChange(property, request.getStatus(), scheduled, completed),
                    request.getAcknowledgedRules());
        }
```

Und **nach** `Property updatedProperty = propertyRepository.save(property);`:

```java
        // Kaskaden laufen in derselben Transaktion wie die Statusaenderung: ein Rollback
        // laesst weder das Objekt noch die Termine veraendert zurueck.
        applyCascades(cascades);
        if (statusChanges) {
            workflowOverrideLogger.record(
                    request.getAcknowledgedRules(), "PROPERTY", propertyId, agentId);
        }
```

Private Methode ergänzen:
```java
    private void applyCascades(List<CascadeAction> cascades) {
        for (CascadeAction cascade : cascades) {
            if (cascade.action() == CascadeType.CANCEL_VIEWINGS) {
                List<Viewing> viewings = viewingRepository.findAllById(cascade.ids());
                viewings.forEach(v -> v.setStatus(Viewing.ViewingStatus.CANCELLED));
                viewingRepository.saveAll(viewings);
            }
        }
    }
```

- [ ] **Step 6: Test laufen lassen — er muss bestehen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test -Dtest=WorkflowGuardIntegrationTest
```
Erwartet: 4 Tests grün.

- [ ] **Step 7: `ViewingService` verdrahten**

Feld `private final WorkflowGuard workflowGuard;` **ans Ende** der Feldliste hängen — nach `ownershipValidator` (`ViewingService.java:41`), passend zur Testinstanziierung aus Schritt 3.

In `createViewing`, nach der Property-Ownership-Prüfung und **vor** `Viewing.builder()`:
```java
        workflowGuard.check(
                new ViewingChange(null, property, request.getViewingDate(), Viewing.ViewingStatus.SCHEDULED),
                request.getAcknowledgedRules());
```

In `updateViewing`, nach `ownershipValidator.validateViewingOwnership(...)` und **vor** den Settern:
```java
        Viewing.ViewingStatus targetStatus =
                request.getStatus() != null ? request.getStatus() : viewing.getStatus();
        workflowGuard.check(
                new ViewingChange(viewing, viewing.getProperty(), request.getViewingDate(), targetStatus),
                request.getAcknowledgedRules());
```

- [ ] **Step 8: Zwei Testfälle für ViewingService ergänzen**

An `WorkflowGuardIntegrationTest` anfügen — `viewingService` ist bereits in `setUp()` aufgebaut:
```java
    @Test
    void newViewingForSoldPropertyIsBlocked() {
        Property p = property(ListingType.SALE, PropertyStatus.SOLD);
        Client client = new Client();
        client.setId(UUID.randomUUID());
        when(clientRepository.findById(client.getId())).thenReturn(Optional.of(client));
        when(agentRepository.findById(agentId)).thenReturn(Optional.of(agent));

        ViewingDto.CreateRequest request = new ViewingDto.CreateRequest();
        request.setClientId(client.getId());
        request.setPropertyId(p.getId());
        request.setViewingDate(LocalDateTime.now().plusDays(1));

        assertThatThrownBy(() -> viewingService.createViewing(agentId, request))
                .isInstanceOf(WorkflowRuleBlockedException.class);

        verify(viewingRepository, never()).save(any());
    }

    @Test
    void cancellingViewingOnSoldPropertyIsAllowed() {
        Property p = property(ListingType.SALE, PropertyStatus.SOLD);
        Viewing existing = scheduledViewing(p);
        when(viewingRepository.findByIdWithDetails(existing.getId())).thenReturn(Optional.of(existing));
        when(viewingRepository.save(any(Viewing.class))).thenAnswer(i -> i.getArgument(0));

        ViewingDto.UpdateRequest request = new ViewingDto.UpdateRequest();
        request.setViewingDate(existing.getViewingDate());
        request.setStatus(Viewing.ViewingStatus.CANCELLED);

        viewingService.updateViewing(agentId, existing.getId(), request);

        assertThat(existing.getStatus()).isEqualTo(Viewing.ViewingStatus.CANCELLED);
    }
```

- [ ] **Step 9: Gesamte Backend-Testsuite laufen lassen**

```bash
docker run --rm -v "$PWD/backend":/app -v "$HOME/.m2":/root/.m2 -w /app \
  maven:3.9-eclipse-temurin-17 mvn -q test
```
Erwartet: alle Tests grün, insbesondere `UpdateFieldParityTest` und `PropertyServiceTest` unverändert.

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/java backend/src/test/java
git commit -m "Workflow-Guardrails in PropertyService und ViewingService verdrahtet (#46)"
```

---

## Task 7: Frontend — Interceptor, Dialog, Übersetzungen

**Files:**
- Create: `frontend/src/app/core/workflow/workflow-violation.model.ts`
- Create: `frontend/src/app/core/workflow/workflow-guard.service.ts`
- Create: `frontend/src/app/core/interceptors/workflow-guard.interceptor.ts`
- Create: `frontend/src/app/shared/components/workflow-warning-dialog/workflow-warning-dialog.component.ts`
- Modify: `frontend/src/app/app.config.ts:21` (Interceptor registrieren)
- Modify: `frontend/src/app/app.component.ts:13` (Dialog einhängen)
- Modify: `frontend/src/styles.scss` (eine Klasse `.violation-row`)
- Modify: `frontend/src/assets/i18n/de.json`, `frontend/src/assets/i18n/en.json`

**Interfaces:**
- Consumes: das `409`-Payload aus Task 2 (`type`, `violations[].{code,severity,messageKey,params,affected,cascade}`) und das Feld `acknowledgedRules` aus Task 6.
- Produces: nichts für spätere Tasks — dies ist der Abschluss von Stufe 1.

- [ ] **Step 1: Typen anlegen**

`workflow-violation.model.ts`:
```typescript
export interface AffectedRecord {
  type: string;
  id: string;
  label: string;
}

export interface CascadeAction {
  action: string;
  messageKey: string;
  ids: string[];
}

export interface WorkflowViolation {
  code: string;
  severity: 'BLOCK' | 'WARN';
  messageKey: string;
  params: Record<string, unknown>;
  affected: AffectedRecord[];
  cascade?: CascadeAction;
}

export interface WorkflowWarningPayload {
  type: 'WORKFLOW_WARNING' | 'WORKFLOW_BLOCKED';
  violations: WorkflowViolation[];
}
```

- [ ] **Step 2: Dienst anlegen**

`workflow-guard.service.ts`:
```typescript
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { WorkflowViolation } from './workflow-violation.model';

/**
 * Vermittelt zwischen Interceptor und Dialog: der Interceptor kennt keine Komponente,
 * der Dialog kennt keinen HTTP-Request.
 */
@Injectable({ providedIn: 'root' })
export class WorkflowGuardService {
  private readonly violationsSubject = new Subject<WorkflowViolation[] | null>();
  readonly violations$ = this.violationsSubject.asObservable();

  private pendingDecision?: Subject<boolean>;

  /** Oeffnet den Dialog und liefert true, sobald der Makler bestaetigt. */
  ask(violations: WorkflowViolation[]): Observable<boolean> {
    this.pendingDecision?.complete();
    this.pendingDecision = new Subject<boolean>();
    this.violationsSubject.next(violations);
    return this.pendingDecision.asObservable();
  }

  resolve(accepted: boolean): void {
    this.violationsSubject.next(null);
    this.pendingDecision?.next(accepted);
    this.pendingDecision?.complete();
    this.pendingDecision = undefined;
  }
}
```

- [ ] **Step 3: Interceptor anlegen**

`workflow-guard.interceptor.ts`:
```typescript
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { WorkflowGuardService } from '../workflow/workflow-guard.service';
import { WorkflowWarningPayload } from '../workflow/workflow-violation.model';

/**
 * Faengt quittierbare Regelverstoesse (409) ab, zeigt den Dialog und wiederholt denselben
 * Request mit gesetztem acknowledgedRules. Dadurch braucht kein Feature-Component eigene
 * Logik — jeder heutige und kuenftige Aufruf ist automatisch abgesichert.
 */
export const workflowGuardInterceptor: HttpInterceptorFn = (req, next) => {
  const guard = inject(WorkflowGuardService);

  return next(req).pipe(
    catchError(error => {
      const payload = error instanceof HttpErrorResponse ? (error.error as WorkflowWarningPayload) : null;

      if (error.status !== 409 || payload?.type !== 'WORKFLOW_WARNING') {
        return throwError(() => error);
      }

      return guard.ask(payload.violations).pipe(
        switchMap(accepted => {
          if (!accepted) {
            return throwError(() => error);
          }

          // req.body ist unknown — der Cast ist noetig, weil der Interceptor bewusst
          // jeden Request bedient und die konkrete DTO-Form nicht kennt.
          const body = (req.body ?? {}) as Record<string, unknown>;
          const alreadyAcknowledged = (body['acknowledgedRules'] as string[]) ?? [];
          const acknowledgedRules = [
            ...new Set([...alreadyAcknowledged, ...payload.violations.map(v => v.code)])
          ];

          return next(req.clone({ body: { ...body, acknowledgedRules } }));
        })
      );
    })
  );
};
```

- [ ] **Step 4: Interceptor registrieren**

In `frontend/src/app/app.config.ts` Zeile 21 ersetzen durch:
```typescript
    provideHttpClient(withInterceptors([authInterceptor, workflowGuardInterceptor])),
```
und den Import ergänzen:
```typescript
import { workflowGuardInterceptor } from './core/interceptors/workflow-guard.interceptor';
```

- [ ] **Step 5: Klasse in `styles.scss` ergänzen**

Im Abschnitt der wiederkehrenden Bausteine (bei `.surface-card`, ca. Zeile 573) anfügen:
```scss
  /* Zeile eines betroffenen Datensatzes im Workflow-Warnungsdialog. Eigene Klasse
     statt Inline-Style, weil sie je Verstoss mehrfach vorkommt (ADR 0001). */
  .violation-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 8px;
    background: var(--bg);
    border: 1px solid var(--border);
  }
```

- [ ] **Step 6: Dialog-Komponente anlegen**

`workflow-warning-dialog.component.ts` — Styling durchgängig über Klassen und CSS-Variablen, **nicht** die Inline-Styles von `ConfirmDialogComponent` kopieren:
```typescript
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { WorkflowGuardService } from '../../../core/workflow/workflow-guard.service';
import { WorkflowViolation } from '../../../core/workflow/workflow-violation.model';

/**
 * Zeigt quittierbare Regelverstoesse samt Kaskadenvorschau. Wird einmal in AppComponent
 * eingehaengt und vom WorkflowGuardService gesteuert — kein Feature-Component bindet ihn ein.
 */
@Component({
  selector: 'app-workflow-warning-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div *ngIf="violations" class="fixed inset-0 z-[850] flex items-center justify-center p-5"
         (click)="decide(false)">
      <div class="absolute inset-0 bg-overlay"></div>
      <div class="surface-card relative w-full max-w-lg p-6 shadow-2xl" (click)="$event.stopPropagation()">

        <div class="flex items-start gap-3.5">
          <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-warning-soft">
            <i class="ri-error-warning-line text-20 text-warning"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-16 font-bold text-body mb-1.5">{{ 'workflow.dialog.title' | translate }}</h3>
            <p class="text-13 text-body-2">{{ 'workflow.dialog.intro' | translate }}</p>
          </div>
        </div>

        <div class="mt-5 flex flex-col gap-4">
          <div *ngFor="let v of violations" class="flex flex-col gap-2">
            <p class="text-13 font-semibold text-body">{{ v.messageKey | translate: v.params }}</p>

            <div *ngIf="v.affected.length" class="flex flex-col gap-1.5">
              <div *ngFor="let a of v.affected" class="violation-row">
                <i class="ri-calendar-line text-13 text-body-3"></i>
                <span class="text-12 text-body-2">{{ a.label }}</span>
              </div>
            </div>

            <p *ngIf="v.cascade" class="text-12 text-body-3">
              {{ v.cascade.messageKey | translate: { count: v.cascade.ids.length } }}
            </p>
          </div>
        </div>

        <div class="form-actions form-actions--centered mt-6">
          <button class="btn-primary" (click)="decide(true)">
            <i class="ri-check-line"></i>
            {{ 'workflow.dialog.proceed' | translate }}
          </button>
          <button class="btn-secondary" (click)="decide(false)">
            <i class="ri-close-line"></i>
            {{ 'common.cancel' | translate }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class WorkflowWarningDialogComponent implements OnInit, OnDestroy {
  violations: WorkflowViolation[] | null = null;
  private subscription?: Subscription;

  constructor(private readonly guard: WorkflowGuardService) {}

  ngOnInit(): void {
    this.subscription = this.guard.violations$.subscribe(v => (this.violations = v));
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  decide(accepted: boolean): void {
    this.guard.resolve(accepted);
  }
}
```

> Falls `bg-overlay`, `bg-warning-soft`, `text-warning` oder `text-body-3` in `tailwind.config.js` noch nicht auf CSS-Variablen verlinkt sind: die fehlende Variable in `styles.scss` definieren und in `tailwind.config.js` verlinken — **keine** Hex-Werte in die Tailwind-Config schreiben (ADR 0001).

- [ ] **Step 7: Dialog in `AppComponent` einhängen**

In `frontend/src/app/app.component.ts` das Template ersetzen durch:
```typescript
  template: `
    <!-- bg-page statt eines festen Graus: sonst ueberschreibt diese Flaeche im
         Dark Mode den --bg-Hintergrund, den styles.scss auf body setzt. -->
    <div class="min-h-screen bg-page">
      <router-outlet></router-outlet>
    </div>
    <app-workflow-warning-dialog></app-workflow-warning-dialog>
  `
```
und `WorkflowWarningDialogComponent` importieren sowie in `imports: [...]` ergänzen.

- [ ] **Step 8: Übersetzungen ergänzen**

In `frontend/src/assets/i18n/de.json` als neuen Top-Level-Schlüssel `workflow`:
```json
  "workflow": {
    "dialog": {
      "title": "Ungewöhnlicher Schritt",
      "intro": "Das ist möglich, passt aber nicht zum üblichen Ablauf. Prüf kurz, ob es so gewollt ist.",
      "proceed": "Trotzdem speichern"
    },
    "rule": {
      "propertyRentMarkedSold": "Ein Mietobjekt kann nicht als verkauft geführt werden.",
      "viewingForClosedProperty": "Für dieses Objekt sind keine Besichtigungen mehr möglich — es ist bereits abgeschlossen oder zurückgezogen.",
      "viewingCompletedInFuture": "Ein Termin in der Zukunft kann nicht als stattgefunden markiert werden.",
      "viewingScheduledInPast": "Der Termin liegt in der Vergangenheit, ist aber als geplant eingetragen. Sollte er auf „stattgefunden“ stehen?",
      "propertySoldWithOpenViewings": "Für dieses Objekt sind noch {{count}} Besichtigungen geplant.",
      "propertyReopened": "Das Objekt war bereits abgeschlossen und wird wieder in den Vertrieb genommen.",
      "propertyReservedWithoutViewing": "Reservierung ohne eine einzige stattgefundene Besichtigung — fehlt vielleicht ein Termin im System?"
    },
    "cascade": {
      "cancelViewings": "Beim Speichern werden {{count}} Termine abgesagt."
    }
  }
```

In `en.json` derselbe Baum:
```json
  "workflow": {
    "dialog": {
      "title": "Unusual step",
      "intro": "This is possible, but it does not match the usual workflow. Take a moment to check.",
      "proceed": "Save anyway"
    },
    "rule": {
      "propertyRentMarkedSold": "A rental property cannot be marked as sold.",
      "viewingForClosedProperty": "No more viewings are possible for this property — it is already closed or withdrawn.",
      "viewingCompletedInFuture": "A viewing in the future cannot be marked as completed.",
      "viewingScheduledInPast": "This viewing is in the past but marked as scheduled. Should it be 'completed'?",
      "propertySoldWithOpenViewings": "This property still has {{count}} scheduled viewings.",
      "propertyReopened": "This property was already closed and is being put back on the market.",
      "propertyReservedWithoutViewing": "Reserved without a single completed viewing — is a viewing missing from the system?"
    },
    "cascade": {
      "cancelViewings": "Saving will cancel {{count}} viewings."
    }
  }
```

- [ ] **Step 9: Lint und Tests laufen lassen**

```bash
cd frontend && npm run lint && npm test -- --watch=false
```
Erwartet: keine Lint-Fehler, bestehende Tests unverändert grün.

- [ ] **Step 10: Styling-Gate prüfen**

```bash
git diff --name-only main | grep -E '\.(html|ts)$' | xargs grep -nE \
  'class="[^"]*(bg-white|text-gray-|border-gray-)|style="[a-z-]+:[^"]*"' 2>/dev/null
```
Erwartet: keine Treffer aus den neu angelegten Dateien.

- [ ] **Step 11: Manuell prüfen**

Stack starten (`docker compose -f docker-compose.dev.yml up --build`), dann:
1. Objekt mit einer geplanten Besichtigung auf „Verkauft" setzen → Dialog nennt die Anzahl und listet den Termin, „Trotzdem speichern" schreibt den Status **und** setzt den Termin auf abgesagt.
2. Mietobjekt auf „Verkauft" setzen → Fehlermeldung ohne Bestätigungsmöglichkeit.
3. Besichtigung für ein verkauftes Objekt anlegen → abgelehnt.
4. Dark Mode einschalten und den Dialog erneut öffnen → keine hellen Restflächen.

- [ ] **Step 12: Commit**

```bash
git add frontend/src
git commit -m "Warnungsdialog und Interceptor fuer Workflow-Guardrails (#46)"
```

---

## Abschluss

- [ ] Issue #46: die sieben Stufe-1-Kästchen abhaken
- [ ] Branch pushen: `git push -u origin feature/workflow-guardrails-stufe-1`
