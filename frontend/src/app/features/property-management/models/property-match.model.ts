import { Property } from './property.model';
import { PropertySearchCriteria } from './property-search.model';

/**
 * Property Match Request interface matching backend PropertyMatchRequest
 */
export interface PropertyMatchRequest {
  // Matching Mode
  clientId?: string;
  propertyId?: string;
  customCriteria?: PropertySearchCriteria;

  // Matching Parameters
  matchThreshold?: number;
  maxResults?: number;
  exactLocationMatch?: boolean;
  allowBudgetFlexibility?: boolean;
  allowFeatureFlexibility?: boolean;

  // Weighting Configuration
  priceWeight?: number;
  locationWeight?: number;
  areaWeight?: number;
  roomWeight?: number;
  featureWeight?: number;

  // Sorting and Filtering
  sortBy?: string;
  sortDirection?: string;
  includeContacted?: boolean;
  includeUnavailable?: boolean;
}

/**
 * Match Score Breakdown interface
 */
export interface MatchScoreBreakdown {
  priceScore?: number;
  locationScore?: number;
  areaScore?: number;
  roomScore?: number;
  featureScore?: number;
  typeScore?: number;
  additionalFactors?: { [key: string]: number };
}

/**
 * Property Match Result interface
 */
export interface PropertyMatchResult {
  property: Property;
  matchScore: number;
  scoreBreakdown?: MatchScoreBreakdown;
  matchReasons?: string[];
  mismatchReasons?: string[];
  previouslyContacted?: boolean;
  viewCount?: number;
}

/**
 * Client Match Result interface
 */
export interface ClientMatchResult {
  client: any; // ClientDto interface from client-management
  matchScore: number;
  scoreBreakdown?: MatchScoreBreakdown;
  matchReasons?: string[];
  mismatchReasons?: string[];
  previouslyContacted?: boolean;
  viewCount?: number;
  lastContactDate?: string;
}

/**
 * Property Match Response interface matching backend PropertyMatchResponse
 */
export interface PropertyMatchResponse {
  properties?: PropertyMatchResult[];
  clients?: ClientMatchResult[];
  totalMatches?: number;
  returnedMatches?: number;
  matchThreshold?: number;
  executionTimeMs?: number;
}
