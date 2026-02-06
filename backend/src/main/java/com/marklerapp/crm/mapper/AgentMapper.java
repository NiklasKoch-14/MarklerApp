package com.marklerapp.crm.mapper;

import com.marklerapp.crm.dto.AgentDto;
import com.marklerapp.crm.entity.Agent;
import org.mapstruct.BeanMapping;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

/**
 * MapStruct mapper for Agent entity and AgentDto conversions.
 *
 * <p>This mapper handles bidirectional mapping between Agent entities and AgentDtos,
 * including computed fields like fullName.</p>
 *
 * <p>Usage:
 * <pre>
 * {@code
 * @Autowired
 * private AgentMapper agentMapper;
 *
 * AgentDto dto = agentMapper.toDto(agent);
 * Agent entity = agentMapper.toEntity(dto);
 * }
 * </pre>
 * </p>
 *
 * @see Agent
 * @see AgentDto
 */
@Mapper(componentModel = "spring")
public interface AgentMapper {

    /**
     * Convert Agent entity to AgentDto.
     * Maps all basic fields and computes fullName from firstName and lastName.
     *
     * @param agent the agent entity
     * @return the agent DTO
     */
    @Mapping(target = "fullName", ignore = true)
    @BeanMapping(builder = @Builder(disableBuilder = true))
    AgentDto toDto(Agent agent);

    /**
     * Convert AgentDto to Agent entity.
     * Ignores computed fields and audit timestamps.
     *
     * @param dto the agent DTO
     * @return the agent entity
     */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @BeanMapping(builder = @Builder(disableBuilder = true))
    Agent toEntity(AgentDto dto);

    /**
     * Convert list of Agent entities to list of AgentDtos.
     *
     * @param agents the list of agent entities
     * @return the list of agent DTOs
     */
    List<AgentDto> toDtoList(List<Agent> agents);
}
