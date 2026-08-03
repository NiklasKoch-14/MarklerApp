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
                property(ListingType.RENT, PropertyStatus.AVAILABLE), PropertyStatus.SOLD,
                ListingType.RENT, List.of(), 0L));

        assertThat(v).isPresent();
        assertThat(v.get().code()).isEqualTo(RuleCode.PROPERTY_RENT_MARKED_SOLD);
        assertThat(v.get().severity()).isEqualTo(Severity.BLOCK);
    }

    @Test
    void saleMarkedRentedBlocks() {
        assertThat(new RentMarkedSoldRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.AVAILABLE), PropertyStatus.RENTED,
                ListingType.SALE, List.of(), 0L)))
                .isPresent();
    }

    @Test
    void rentMarkedRentedIsFine() {
        assertThat(new RentMarkedSoldRule().check(new PropertyStatusChange(
                property(ListingType.RENT, PropertyStatus.AVAILABLE), PropertyStatus.RENTED,
                ListingType.RENT, List.of(), 0L)))
                .isEmpty();
    }

    @Test
    void unknownListingTypeIsNotBlocked() {
        assertThat(new RentMarkedSoldRule().check(new PropertyStatusChange(
                property(null, PropertyStatus.AVAILABLE), PropertyStatus.SOLD,
                null, List.of(), 0L)))
                .isEmpty();
    }

    /**
     * Der Kontext traegt den beabsichtigten neuen Angebotstyp, nicht den alten am Objekt.
     * Ein SALE-Objekt, das per PUT gleichzeitig auf listingType=RENT und status=SOLD
     * umgestellt wird, muss anhand des Ziel-Typs geblockt werden — nicht anhand des noch
     * am Property haengenden alten SALE.
     */
    @Test
    void targetListingTypeDecidesNotCurrentPropertyListingType() {
        Optional<RuleViolation> v = new RentMarkedSoldRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.AVAILABLE), PropertyStatus.SOLD,
                ListingType.RENT, List.of(), 0L));

        assertThat(v).isPresent();
        assertThat(v.get().code()).isEqualTo(RuleCode.PROPERTY_RENT_MARKED_SOLD);
    }

    /**
     * Umgekehrter Fall: das Objekt ist bereits SOLD (targetStatus bleibt bei
     * Angebotstyp-only-Aenderungen der aktuelle Status), der Angebotstyp wechselt auf RENT.
     * targetListingType=RENT + targetStatus=SOLD ist derselbe Widerspruch wie oben.
     */
    @Test
    void listingTypeChangeAloneOnAlreadySoldPropertyBlocks() {
        Optional<RuleViolation> v = new RentMarkedSoldRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.SOLD), PropertyStatus.SOLD,
                ListingType.RENT, List.of(), 0L));

        assertThat(v).isPresent();
        assertThat(v.get().code()).isEqualTo(RuleCode.PROPERTY_RENT_MARKED_SOLD);
    }

    // ---- SoldWithOpenViewingsRule ----

    @Test
    void soldWithOpenViewingsWarnsAndOffersCascade() {
        Viewing a = scheduledViewing("Mueller", LocalDateTime.of(2026, 8, 12, 14, 0));
        Viewing b = scheduledViewing("Schmidt", LocalDateTime.of(2026, 8, 13, 10, 0));

        Optional<RuleViolation> result = new SoldWithOpenViewingsRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.AVAILABLE), PropertyStatus.SOLD,
                ListingType.SALE, List.of(a, b), 0L));

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
                property(ListingType.SALE, PropertyStatus.AVAILABLE), PropertyStatus.SOLD,
                ListingType.SALE, List.of(), 0L)))
                .isEmpty();
    }

    @Test
    void reservingWithOpenViewingsIsFine() {
        assertThat(new SoldWithOpenViewingsRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.AVAILABLE), PropertyStatus.RESERVED,
                ListingType.SALE, List.of(scheduledViewing("Mueller", LocalDateTime.now().plusDays(1))), 0L)))
                .isEmpty();
    }

    @Test
    void rentedWithOpenViewingsAlsoWarns() {
        Viewing a = scheduledViewing("Mueller", LocalDateTime.of(2026, 8, 12, 14, 0));
        Viewing b = scheduledViewing("Schmidt", LocalDateTime.of(2026, 8, 13, 10, 0));

        Optional<RuleViolation> result = new SoldWithOpenViewingsRule().check(new PropertyStatusChange(
                property(ListingType.RENT, PropertyStatus.AVAILABLE), PropertyStatus.RENTED,
                ListingType.RENT, List.of(a, b), 0L));

        assertThat(result).isPresent();
        RuleViolation v = result.get();
        assertThat(v.severity()).isEqualTo(Severity.WARN);
        assertThat(v.params()).containsEntry("count", 2);
        assertThat(v.affected()).hasSize(2);
        assertThat(v.cascade().action()).isEqualTo(CascadeType.CANCEL_VIEWINGS);
        assertThat(v.cascade().ids()).containsExactly(a.getId(), b.getId());
    }

    // ---- PropertyReopenedRule ----

    @Test
    void reopeningSoldPropertyWarns() {
        Optional<RuleViolation> v = new PropertyReopenedRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.SOLD), PropertyStatus.AVAILABLE,
                ListingType.SALE, List.of(), 0L));

        assertThat(v).isPresent();
        assertThat(v.get().code()).isEqualTo(RuleCode.PROPERTY_REOPENED);
        assertThat(v.get().severity()).isEqualTo(Severity.WARN);
    }

    @Test
    void soldToWithdrawnIsNotReopening() {
        assertThat(new PropertyReopenedRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.SOLD), PropertyStatus.WITHDRAWN,
                ListingType.SALE, List.of(), 0L)))
                .isEmpty();
    }

    @Test
    void availableToReservedIsNotReopening() {
        assertThat(new PropertyReopenedRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.AVAILABLE), PropertyStatus.RESERVED,
                ListingType.SALE, List.of(), 0L)))
                .isEmpty();
    }

    @Test
    void soldToSoldIsNotReopening() {
        assertThat(new PropertyReopenedRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.SOLD), PropertyStatus.SOLD,
                ListingType.SALE, List.of(), 0L)))
                .isEmpty();
    }

    // ---- ReservedWithoutViewingRule ----

    @Test
    void reservingWithoutCompletedViewingWarns() {
        assertThat(new ReservedWithoutViewingRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.AVAILABLE), PropertyStatus.RESERVED,
                ListingType.SALE, List.of(), 0L)))
                .isPresent();
    }

    @Test
    void reservingAfterCompletedViewingIsFine() {
        assertThat(new ReservedWithoutViewingRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.AVAILABLE), PropertyStatus.RESERVED,
                ListingType.SALE, List.of(), 1L)))
                .isEmpty();
    }

    @Test
    void alreadyReservedDoesNotWarnAgain() {
        assertThat(new ReservedWithoutViewingRule().check(new PropertyStatusChange(
                property(ListingType.SALE, PropertyStatus.RESERVED), PropertyStatus.RESERVED,
                ListingType.SALE, List.of(), 0L)))
                .isEmpty();
    }
}
