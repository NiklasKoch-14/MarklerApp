package com.marklerapp.crm.service;

import com.marklerapp.crm.dto.*;
import com.marklerapp.crm.entity.*;
import com.marklerapp.crm.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for GDPR data export functionality.
 * Handles collection and formatting of all agent data for GDPR compliance.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GdprService {

    private static final String EXPORT_VERSION = "1.0";
    private static final String DATA_CONTROLLER = "MarklerApp Real Estate CRM";
    private static final String GDPR_STATEMENT = "This export contains all personal data stored in the MarklerApp CRM system as required by GDPR Article 15 (Right of Access). The data has been exported in a structured, commonly used, and machine-readable format.";
    private static final String PURPOSE_OF_PROCESSING = "The personal data is processed for the purpose of real estate client relationship management, property portfolio management, and communication tracking for real estate agents in accordance with GDPR regulations.";

    private final AgentRepository agentRepository;
    private final ClientRepository clientRepository;
    private final PropertyRepository propertyRepository;
    private final CallNoteRepository callNoteRepository;
    private final PropertySearchCriteriaRepository searchCriteriaRepository;
    private final PropertyImageRepository propertyImageRepository;

    /**
     * Export all data for a specific agent
     */
    @Transactional(readOnly = true)
    public GdprExportResponse exportAllData(UUID agentId) {
        log.info("Starting GDPR data export for agent: {}", agentId);

        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent not found: " + agentId));

        // Collect all data
        GdprAgentData agentData = mapAgentData(agent);
        List<GdprClientData> clientsData = exportClientData(agent);
        List<GdprPropertyData> propertiesData = exportPropertyData(agent);
        List<GdprCallNoteData> callNotesData = exportCallNoteData(agent);

        // Calculate statistics
        long totalSearchCriteria = clientsData.stream()
                .filter(c -> c.getSearchCriteria() != null)
                .count();

        long totalPropertyImages = propertiesData.stream()
                .mapToLong(p -> p.getImages() != null ? p.getImages().size() : 0)
                .sum();

        GdprExportResponse.ExportStatistics statistics = GdprExportResponse.ExportStatistics.builder()
                .totalClients(clientsData.size())
                .totalProperties(propertiesData.size())
                .totalCallNotes(callNotesData.size())
                .totalSearchCriteria(totalSearchCriteria)
                .totalPropertyImages(totalPropertyImages)
                .build();

        // Build export response
        GdprExportResponse response = GdprExportResponse.builder()
                .metadata(buildMetadata())
                .agent(agentData)
                .clients(clientsData)
                .properties(propertiesData)
                .callNotes(callNotesData)
                .statistics(statistics)
                .build();

        log.info("GDPR export completed for agent: {}. Clients: {}, Properties: {}, CallNotes: {}",
                agentId, clientsData.size(), propertiesData.size(), callNotesData.size());

        return response;
    }

    /**
     * Export only client data for a specific agent
     */
    @Transactional(readOnly = true)
    public List<GdprClientData> exportClientData(UUID agentId) {
        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent not found: " + agentId));
        return exportClientData(agent);
    }

    /**
     * Export only property data for a specific agent
     */
    @Transactional(readOnly = true)
    public List<GdprPropertyData> exportPropertyData(UUID agentId) {
        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent not found: " + agentId));
        return exportPropertyData(agent);
    }

    /**
     * Export only call note data for a specific agent
     */
    @Transactional(readOnly = true)
    public List<GdprCallNoteData> exportCallNoteData(UUID agentId) {
        Agent agent = agentRepository.findById(agentId)
                .orElseThrow(() -> new RuntimeException("Agent not found: " + agentId));
        return exportCallNoteData(agent);
    }

    /**
     * Internal method to export client data
     */
    private List<GdprClientData> exportClientData(Agent agent) {
        List<Client> clients = clientRepository.findByAgent(agent);
        return clients.stream()
                .map(this::mapClientData)
                .collect(Collectors.toList());
    }

    /**
     * Internal method to export property data
     */
    private List<GdprPropertyData> exportPropertyData(Agent agent) {
        List<Property> properties = propertyRepository.findByAgentWithImages(agent);
        return properties.stream()
                .map(this::mapPropertyData)
                .collect(Collectors.toList());
    }

    /**
     * Internal method to export call note data
     */
    private List<GdprCallNoteData> exportCallNoteData(Agent agent) {
        List<CallNote> callNotes = callNoteRepository.findByAgentOrderByCallDateDesc(agent, org.springframework.data.domain.Pageable.unpaged()).getContent();
        return callNotes.stream()
                .map(this::mapCallNoteData)
                .collect(Collectors.toList());
    }

    /**
     * Map Agent entity to GDPR DTO
     */
    private GdprAgentData mapAgentData(Agent agent) {
        return GdprAgentData.builder()
                .id(agent.getId())
                .email(agent.getEmail())
                .firstName(agent.getFirstName())
                .lastName(agent.getLastName())
                .fullName(agent.getFullName())
                .phone(agent.getPhone())
                .languagePreference(agent.getLanguagePreference() != null ? agent.getLanguagePreference().toString() : null)
                .isActive(agent.isActive())
                .createdAt(agent.getCreatedAt())
                .updatedAt(agent.getUpdatedAt())
                .build();
    }

    /**
     * Map Client entity to GDPR DTO
     */
    private GdprClientData mapClientData(Client client) {
        GdprClientData.GdprSearchCriteriaData searchCriteriaData = null;

        if (client.getSearchCriteria() != null) {
            com.marklerapp.crm.entity.PropertySearchCriteria criteria = client.getSearchCriteria();
            searchCriteriaData = GdprClientData.GdprSearchCriteriaData.builder()
                    .id(criteria.getId())
                    .minSquareMeters(criteria.getMinSquareMeters())
                    .maxSquareMeters(criteria.getMaxSquareMeters())
                    .minRooms(criteria.getMinRooms())
                    .maxRooms(criteria.getMaxRooms())
                    .minBudget(criteria.getMinBudget() != null ? criteria.getMinBudget().toString() : null)
                    .maxBudget(criteria.getMaxBudget() != null ? criteria.getMaxBudget().toString() : null)
                    .preferredLocations(criteria.getPreferredLocations())
                    .propertyTypes(criteria.getPropertyTypes())
                    .additionalRequirements(criteria.getAdditionalRequirements())
                    .createdAt(criteria.getCreatedAt())
                    .updatedAt(criteria.getUpdatedAt())
                    .build();
        }

        return GdprClientData.builder()
                .id(client.getId())
                .firstName(client.getFirstName())
                .lastName(client.getLastName())
                .fullName(client.getFullName())
                .email(client.getEmail())
                .phone(client.getPhone())
                .addressStreet(client.getAddressStreet())
                .addressCity(client.getAddressCity())
                .addressPostalCode(client.getAddressPostalCode())
                .addressCountry(client.getAddressCountry())
                .formattedAddress(client.getFormattedAddress())
                .gdprConsentGiven(client.isGdprConsentGiven())
                .gdprConsentDate(client.getGdprConsentDate())
                .searchCriteria(searchCriteriaData)
                .createdAt(client.getCreatedAt())
                .updatedAt(client.getUpdatedAt())
                .build();
    }

    /**
     * Map Property entity to GDPR DTO
     */
    private GdprPropertyData mapPropertyData(Property property) {
        List<GdprPropertyData.GdprPropertyImageData> imagesData = null;

        if (property.getImages() != null && !property.getImages().isEmpty()) {
            imagesData = property.getImages().stream()
                    .map(this::mapPropertyImageData)
                    .collect(Collectors.toList());
        }

        return GdprPropertyData.builder()
                .id(property.getId())
                .title(property.getTitle())
                .description(property.getDescription())
                .propertyType(property.getPropertyType() != null ? property.getPropertyType().toString() : null)
                .listingType(property.getListingType() != null ? property.getListingType().toString() : null)
                .status(property.getStatus() != null ? property.getStatus().toString() : null)
                .addressStreet(property.getAddressStreet())
                .addressHouseNumber(property.getAddressHouseNumber())
                .addressCity(property.getAddressCity())
                .addressPostalCode(property.getAddressPostalCode())
                .addressState(property.getAddressState())
                .addressCountry(property.getAddressCountry())
                .addressDistrict(property.getAddressDistrict())
                .formattedAddress(property.getFormattedAddress())
                .livingAreaSqm(property.getLivingAreaSqm() != null ? property.getLivingAreaSqm().toString() : null)
                .totalAreaSqm(property.getTotalAreaSqm() != null ? property.getTotalAreaSqm().toString() : null)
                .plotAreaSqm(property.getPlotAreaSqm() != null ? property.getPlotAreaSqm().toString() : null)
                .rooms(property.getRooms() != null ? property.getRooms().toString() : null)
                .bedrooms(property.getBedrooms())
                .bathrooms(property.getBathrooms())
                .floors(property.getFloors())
                .floorNumber(property.getFloorNumber())
                .constructionYear(property.getConstructionYear())
                .lastRenovationYear(property.getLastRenovationYear())
                .price(property.getPrice() != null ? property.getPrice().toString() : null)
                .pricePerSqm(property.getPricePerSqm() != null ? property.getPricePerSqm().toString() : null)
                .additionalCosts(property.getAdditionalCosts() != null ? property.getAdditionalCosts().toString() : null)
                .heatingCosts(property.getHeatingCosts() != null ? property.getHeatingCosts().toString() : null)
                .commission(property.getCommission() != null ? property.getCommission().toString() : null)
                .hasElevator(property.getHasElevator())
                .hasBalcony(property.getHasBalcony())
                .hasTerrace(property.getHasTerrace())
                .hasGarden(property.getHasGarden())
                .hasGarage(property.getHasGarage())
                .hasParking(property.getHasParking())
                .hasBasement(property.getHasBasement())
                .hasAttic(property.getHasAttic())
                .isBarrierFree(property.getIsBarrierFree())
                .petsAllowed(property.getPetsAllowed())
                .furnished(property.getFurnished())
                .energyEfficiencyClass(property.getEnergyEfficiencyClass())
                .energyConsumptionKwh(property.getEnergyConsumptionKwh() != null ? property.getEnergyConsumptionKwh().toString() : null)
                .heatingType(property.getHeatingType() != null ? property.getHeatingType().toString() : null)
                .availableFrom(property.getAvailableFrom())
                .contactPhone(property.getContactPhone())
                .contactEmail(property.getContactEmail())
                .virtualTourUrl(property.getVirtualTourUrl())
                .notes(property.getNotes())
                .dataProcessingConsent(property.getDataProcessingConsent())
                .consentDate(property.getConsentDate())
                .images(imagesData)
                .createdAt(property.getCreatedAt())
                .updatedAt(property.getUpdatedAt())
                .build();
    }

    /**
     * Map PropertyImage entity to GDPR DTO
     */
    private GdprPropertyData.GdprPropertyImageData mapPropertyImageData(PropertyImage image) {
        return GdprPropertyData.GdprPropertyImageData.builder()
                .id(image.getId())
                .filename(image.getFilename())
                .originalFilename(image.getOriginalFilename())
                .filePath(image.getFilePath())
                .contentType(image.getContentType())
                .fileSize(image.getFileSize())
                .formattedFileSize(image.getFormattedFileSize())
                .title(image.getTitle())
                .description(image.getDescription())
                .altText(image.getAltText())
                .width(image.getWidth())
                .height(image.getHeight())
                .isPrimary(image.getIsPrimary())
                .sortOrder(image.getSortOrder())
                .imageType(image.getImageType() != null ? image.getImageType().toString() : null)
                .createdAt(image.getCreatedAt())
                .updatedAt(image.getUpdatedAt())
                .build();
    }

    /**
     * Map CallNote entity to GDPR DTO
     */
    private GdprCallNoteData mapCallNoteData(CallNote callNote) {
        return GdprCallNoteData.builder()
                .id(callNote.getId())
                .clientId(callNote.getClient() != null ? callNote.getClient().getId() : null)
                .clientFullName(callNote.getClient() != null ? callNote.getClient().getFullName() : null)
                .callDate(callNote.getCallDate())
                .durationMinutes(callNote.getDurationMinutes())
                .callType(callNote.getCallType() != null ? callNote.getCallType().toString() : null)
                .subject(callNote.getSubject())
                .notes(callNote.getNotes())
                .followUpRequired(callNote.getFollowUpRequired())
                .followUpDate(callNote.getFollowUpDate())
                .propertiesDiscussed(callNote.getPropertiesDiscussed())
                .outcome(callNote.getOutcome() != null ? callNote.getOutcome().toString() : null)
                .createdAt(callNote.getCreatedAt())
                .updatedAt(callNote.getUpdatedAt())
                .build();
    }

    /**
     * Build export metadata
     */
    private GdprExportResponse.ExportMetadata buildMetadata() {
        return GdprExportResponse.ExportMetadata.builder()
                .exportTimestamp(LocalDateTime.now())
                .exportVersion(EXPORT_VERSION)
                .dataController(DATA_CONTROLLER)
                .gdprStatement(GDPR_STATEMENT)
                .purposeOfProcessing(PURPOSE_OF_PROCESSING)
                .build();
    }
}
