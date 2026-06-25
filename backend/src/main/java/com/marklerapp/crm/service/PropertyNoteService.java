package com.marklerapp.crm.service;

import com.marklerapp.crm.config.GlobalExceptionHandler.ResourceNotFoundException;
import com.marklerapp.crm.dto.PropertyNoteDto;
import com.marklerapp.crm.entity.Agent;
import com.marklerapp.crm.entity.Property;
import com.marklerapp.crm.entity.PropertyNote;
import com.marklerapp.crm.mapper.PropertyNoteMapper;
import com.marklerapp.crm.repository.AgentRepository;
import com.marklerapp.crm.repository.PropertyNoteRepository;
import com.marklerapp.crm.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PropertyNoteService {

    private final PropertyNoteRepository propertyNoteRepository;
    private final PropertyRepository propertyRepository;
    private final AgentRepository agentRepository;
    private final PropertyNoteMapper propertyNoteMapper;
    private final OwnershipValidator ownershipValidator;

    @Transactional
    public PropertyNoteDto.Response createNote(UUID agentId, PropertyNoteDto.CreateRequest request) {
        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent not found: " + agentId));

        Property property = propertyRepository.findById(request.getPropertyId())
                .orElseThrow(() -> new ResourceNotFoundException("Property not found: " + request.getPropertyId()));
        try {
            ownershipValidator.validatePropertyOwnership(property, agentId);
        } catch (AccessDeniedException e) {
            throw new IllegalArgumentException("Property does not belong to the specified agent");
        }

        PropertyNote note = PropertyNote.builder()
                .agent(agent)
                .property(property)
                .content(request.getContent())
                .category(request.getCategory() != null ? request.getCategory() : PropertyNote.NoteCategory.GENERAL)
                .build();

        PropertyNote saved = propertyNoteRepository.save(note);
        log.info("Property note {} created for property {}", saved.getId(), property.getId());
        return propertyNoteMapper.toResponse(saved);
    }

    @Transactional
    public void deleteNote(UUID agentId, UUID noteId) {
        PropertyNote note = propertyNoteRepository.findByIdWithDetails(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Property note not found: " + noteId));

        if (!note.getAgent().getId().equals(agentId)) {
            throw new AccessDeniedException("You don't have permission to delete this note");
        }

        propertyNoteRepository.delete(note);
        log.info("Property note {} deleted by agent {}", noteId, agentId);
    }

    @Transactional(readOnly = true)
    public List<PropertyNoteDto.Response> getNotesByProperty(UUID agentId, UUID propertyId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property not found: " + propertyId));
        ownershipValidator.validatePropertyOwnership(property, agentId);

        List<PropertyNote> notes = propertyNoteRepository.findByPropertyOrderByCreatedAtDesc(property);
        return propertyNoteMapper.toResponseList(notes);
    }
}
