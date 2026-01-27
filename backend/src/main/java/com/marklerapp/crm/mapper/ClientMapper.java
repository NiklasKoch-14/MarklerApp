package com.marklerapp.crm.mapper;

import com.marklerapp.crm.dto.ClientDto;
import com.marklerapp.crm.entity.Client;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

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
     * @param dto the client DTO
     * @return the client entity
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "agent", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "callNotes", ignore = true)
    Client toEntity(ClientDto dto);

    /**
     * Convert list of Client entities to list of ClientDtos.
     *
     * @param clients the list of client entities
     * @return the list of client DTOs
     */
    List<ClientDto> toDtoList(List<Client> clients);
}
