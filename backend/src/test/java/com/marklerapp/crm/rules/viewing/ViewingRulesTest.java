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
