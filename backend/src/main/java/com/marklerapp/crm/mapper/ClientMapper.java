package com.marklerapp.crm.mapper;

import com.marklerapp.crm.dto.ClientDto;
import com.marklerapp.crm.entity.Client;
import org.mapstruct.BeanMapping;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;

import java.util.List;

/**
 * MapStruct mapper for Client entity and ClientDto conversions.
 *
 * <p>This mapper handles bidirectional mapping between Client entities and ClientDtos,
 * including nested PropertySearchCriteria and computed fields like fullName and formattedAddress.</p>
 *
 * <p>Usage:
 * <pre>
 * {@code
 * @Autowired
 * private ClientMapper clientMapper;
 *
 * ClientDto dto = clientMapper.toDto(client);
 * Client entity = clientMapper.toEntity(dto, agent);
 * }
 * </pre>
 * </p>
 *
 * @see Client
 * @see ClientDto
 * @see PropertySearchCriteriaMapper
 */
@Mapper(componentModel = "spring", uses = {PropertySearchCriteriaMapper.class})
public interface ClientMapper {

    /**
     * Convert Client entity to ClientDto.
     * Maps all basic fields, nested search criteria, and computes fullName and formattedAddress.
     *
     * @param client the client entity
     * @return the client DTO
     */
    @Mapping(target = "agentId", source = "agent.id")
    @Mapping(target = "fullName", expression = "java(client.getFullName())")
    @Mapping(target = "formattedAddress", expression = "java(client.getFormattedAddress())")
    ClientDto toDto(Client client);

    /**
     * Convert ClientDto to Client entity.
     * Ignores computed fields, agent relationship, and audit timestamps.
     * The agent must be set separately after mapping.
     *
     * <p>searchCriteria is intentionally ignored here: ClientService creates/updates it
     * through a separate explicit save that sets the owning-side client_id (see
     * ClientService#createSearchCriteria). Auto-mapping it onto the entity would let
     * clientRepository.save() cascade an insert of the mapped-by side without client_id
     * ever being set, which fails the NOT NULL constraint on property_search_criteria.</p>
     *
     * <p>nullValuePropertyMappingStrategy=IGNORE: without it, MapStruct calls every setter
     * unconditionally, so a null clientType/financingStatus/moveInTimeline/pipelineStage
     * on the incoming DTO (client-form only ever sends clientType) overwrites the entity's
     * own {@code @Builder.Default} values with null — those columns are NOT NULL, so
     * creation fails with a generic "Required field is missing" for a field the create
     * form never even shows. IGNORE leaves the entity's defaults in place whenever the
     * DTO simply didn't specify a value.</p>
     *
     * @param dto the client DTO
     * @return the client entity
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "agent", ignore = true)
    @Mapping(target = "searchCriteria", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @BeanMapping(builder = @Builder(disableBuilder = true),
                 nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    Client toEntity(ClientDto dto);

    /**
     * Convert list of Client entities to list of ClientDtos.
     *
     * @param clients the list of client entities
     * @return the list of client DTOs
     */
    List<ClientDto> toDtoList(List<Client> clients);
}
