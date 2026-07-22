package com.marklerapp.crm.service;

import com.marklerapp.crm.dto.ClientDto;
import com.marklerapp.crm.dto.UpdatePropertyRequest;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Client;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.mapper.ClientMapper;
import com.marklerapp.crm.mapper.PropertySearchCriteriaMapperImpl;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.repository.CallNoteRepository;
import com.marklerapp.crm.repository.ClientRepository;
import com.marklerapp.crm.repository.FileAttachmentRepository;
import com.marklerapp.crm.repository.PropertySearchCriteriaRepository;
import com.marklerapp.crm.repository.ViewingRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.beans.BeanInfo;
import java.beans.Introspector;
import java.beans.PropertyDescriptor;
import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Guards the remaining hand-written field-copy sites against silently dropping fields.
 *
 * <p>Whenever a field is added to both a request/DTO class and its entity, these tests
 * discover the new field pair by reflection, populate it with a distinct value, run the
 * copy site, and fail loudly if the value did not arrive on the entity. This is the
 * regression net for the "search location was never saved on client edit" bug class —
 * the mapper-based copies (PropertySearchCriteriaMapper) are already guarded at compile
 * time via unmappedTargetPolicy=ERROR.</p>
 *
 * <p>If a new shared field is intentionally NOT copied (derived, or handled by special
 * logic), add it to the exclusion list of the respective test with a short comment.</p>
 */
@ExtendWith(MockitoExtension.class)
class UpdateFieldParityTest {

    @Mock
    private ClientRepository clientRepository;
    @Mock
    private AgentRepository agentRepository;
    @Mock
    private PropertySearchCriteriaRepository searchCriteriaRepository;
    @Mock
    private CallNoteRepository callNoteRepository;
    @Mock
    private ClientMapper clientMapper;
    @Mock
    private ViewingRepository viewingRepository;
    @Mock
    private FileAttachmentRepository fileAttachmentRepository;
    @Mock
    private ClientDeletionAuditService clientDeletionAuditService;

    // ========================================
    // PropertyService.updatePropertyFields
    // ========================================

    @Test
    void updatePropertyFields_CopiesEverySharedRequestField() throws Exception {
        // updatePropertyFields only touches its two parameters, so the service's
        // collaborators are irrelevant here.
        PropertyService propertyService = new PropertyService(null, null, null, null, null, null, null);

        Property property = new Property();
        UpdatePropertyRequest request = new UpdatePropertyRequest();

        Map<String, Object> expected = populateSharedFields(request, property, Set.of());

        propertyService.updatePropertyFields(property, request);

        assertAllFieldsArrived(property, expected,
            "PropertyService.updatePropertyFields kopiert dieses Feld nicht — Setter ergänzen "
                + "oder das Feld hier bewusst ausschließen");
    }

    // ========================================
    // ClientService.updateClient (base fields)
    // ========================================

    @Test
    void updateClient_CopiesEverySharedDtoField() throws Exception {
        ClientService clientService = new ClientService(
            clientRepository, agentRepository, searchCriteriaRepository, callNoteRepository,
            clientMapper, new PropertySearchCriteriaMapperImpl(), new OwnershipValidator(),
            viewingRepository, fileAttachmentRepository, clientDeletionAuditService);

        UUID agentId = UUID.randomUUID();
        UUID clientId = UUID.randomUUID();
        Agent agent = Agent.builder().firstName("Max").lastName("Makler").email("max@example.com").build();
        agent.setId(agentId);

        Client client = Client.builder().agent(agent).firstName("Old").lastName("Old").build();
        client.setId(clientId);

        ClientDto updateRequest = ClientDto.builder().build();
        Map<String, Object> expected = populateSharedFields(updateRequest, client, Set.of(
            // Derived by the GDPR consent logic from gdprConsentGiven, never copied directly.
            "gdprConsentDate",
            // Relation, handled by updateSearchCriteria / ownership, not by field copy.
            "searchCriteria",
            // JPA auditing fields (BaseEntity) — set by the persistence layer, never from the DTO.
            "createdAt", "updatedAt"
        ));

        when(clientRepository.findById(clientId)).thenReturn(Optional.of(client));
        lenient().when(clientRepository.existsByAgentAndEmail(any(), any())).thenReturn(false);
        when(clientRepository.save(client)).thenReturn(client);
        when(clientMapper.toDto(client)).thenReturn(ClientDto.builder().build());

        clientService.updateClient(clientId, updateRequest, agentId);

        assertAllFieldsArrived(client, expected,
            "ClientService.updateClient kopiert dieses Feld nicht — Setter ergänzen "
                + "oder das Feld hier bewusst ausschließen");
    }

    // ========================================
    // Reflection helpers
    // ========================================

    /**
     * For every writable property of {@code source} that also exists on {@code target}
     * with the same name and type (simple types only), set a value that differs from the
     * target's current value and return the map of fieldName -> expected value.
     */
    private Map<String, Object> populateSharedFields(Object source, Object target,
                                                     Set<String> excludedFields) throws Exception {
        Map<String, Object> expected = new LinkedHashMap<>();
        BeanInfo sourceInfo = Introspector.getBeanInfo(source.getClass(), Object.class);
        int counter = 1;

        for (PropertyDescriptor sourcePd : sourceInfo.getPropertyDescriptors()) {
            String name = sourcePd.getName();
            if (excludedFields.contains(name) || sourcePd.getWriteMethod() == null) {
                continue;
            }
            PropertyDescriptor targetPd = findProperty(target.getClass(), name);
            if (targetPd == null || targetPd.getWriteMethod() == null || targetPd.getReadMethod() == null) {
                continue; // field does not exist on the entity — nothing to copy
            }
            Class<?> type = sourcePd.getPropertyType();
            if (!type.equals(targetPd.getPropertyType()) || !isSimpleType(type)) {
                continue;
            }

            Object currentTargetValue = targetPd.getReadMethod().invoke(target);
            Object value = distinctValue(type, name, currentTargetValue, counter++);
            if (value == null) {
                continue;
            }
            sourcePd.getWriteMethod().invoke(source, value);
            expected.put(name, value);
        }

        assertThat(expected)
            .as("Sanity check: the reflection scan must discover shared fields — "
                + "an empty result means the scan itself is broken")
            .isNotEmpty();
        return expected;
    }

    private void assertAllFieldsArrived(Object target, Map<String, Object> expected,
                                        String hint) throws Exception {
        List<String> missing = new ArrayList<>();
        for (Map.Entry<String, Object> entry : expected.entrySet()) {
            PropertyDescriptor targetPd = findProperty(target.getClass(), entry.getKey());
            Object actual = targetPd.getReadMethod().invoke(target);
            if (!entry.getValue().equals(actual)) {
                missing.add(String.format("%s (erwartet: %s, tatsächlich: %s)",
                    entry.getKey(), entry.getValue(), actual));
            }
        }
        assertThat(missing).as(hint).isEmpty();
    }

    private PropertyDescriptor findProperty(Class<?> clazz, String name) throws Exception {
        for (PropertyDescriptor pd : Introspector.getBeanInfo(clazz, Object.class).getPropertyDescriptors()) {
            if (pd.getName().equals(name)) {
                return pd;
            }
        }
        return null;
    }

    private boolean isSimpleType(Class<?> type) {
        return type.equals(String.class) || type.equals(Integer.class) || type.equals(BigDecimal.class)
            || type.equals(Boolean.class) || type.equals(boolean.class)
            || type.equals(LocalDate.class) || type.equals(LocalDateTime.class)
            || type.isEnum();
    }

    /** A value of the given type guaranteed to differ from {@code current}. */
    private Object distinctValue(Class<?> type, String name, Object current, int counter) {
        if (type.equals(String.class)) {
            // Keep it email-shaped so email fields survive potential validation.
            return name.toLowerCase().contains("email")
                ? "parity-" + counter + "@example.com"
                : "parity-" + name + "-" + counter;
        }
        if (type.equals(Integer.class)) {
            return 1000 + counter;
        }
        if (type.equals(BigDecimal.class)) {
            return new BigDecimal(2000 + counter);
        }
        if (type.equals(Boolean.class) || type.equals(boolean.class)) {
            return !Boolean.TRUE.equals(current);
        }
        if (type.equals(LocalDate.class)) {
            return LocalDate.of(2030, 1, 1).plusDays(counter);
        }
        if (type.equals(LocalDateTime.class)) {
            return LocalDateTime.of(2030, 1, 1, 12, 0).plusDays(counter);
        }
        if (type.isEnum()) {
            for (Object constant : type.getEnumConstants()) {
                if (!constant.equals(current)) {
                    return constant;
                }
            }
        }
        return null;
    }
}
