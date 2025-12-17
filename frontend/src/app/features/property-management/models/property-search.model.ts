/**
 * Property Search Criteria interface matching backend PropertySearchCriteriaDto
 */
export interface PropertySearchCriteria {
  id?: string;
  clientId?: string;
  minSquareMeters?: number;
  maxSquareMeters?: number;
  minRooms?: number;
  maxRooms?: number;
  minBudget?: number;
  maxBudget?: number;
  preferredLocations?: string[];
  propertyTypes?: string[];
  additionalRequirements?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Property Search Criteria with validation flags
 */
export interface PropertySearchCriteriaWithFlags extends PropertySearchCriteria {
  hasBudgetConstraints?: boolean;
  hasSizeConstraints?: boolean;
  hasRoomConstraints?: boolean;
}
