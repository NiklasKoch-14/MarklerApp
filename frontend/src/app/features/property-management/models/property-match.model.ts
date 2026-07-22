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
  /** Property-type score — weighted by featureWeight, hence the name */
  featureScore?: number;
}

/**
 * The weights (whole percentages summing to 100) a match score was calculated with.
 * Echoed by the backend so the UI never has to assume the defaults.
 */
export interface MatchWeights {
  priceWeight: number;
  locationWeight: number;
  areaWeight: number;
  roomWeight: number;
  featureWeight: number;
}

export type MatchReasonCategory = 'PRICE' | 'LOCATION' | 'AREA' | 'ROOM' | 'TYPE';

/**
 * A single reason behind a score, as a translatable code plus raw params.
 * Wording lives in de.json/en.json, never in the API response.
 */
export interface MatchReason {
  code: string;
  category: MatchReasonCategory;
  params: { [key: string]: string | number };
}

/**
 * Property Match Result interface
 */
export interface PropertyMatchResult {
  property: Property;
  matchScore: number;
  scoreBreakdown?: MatchScoreBreakdown;
  matchReasons?: MatchReason[];
  mismatchReasons?: MatchReason[];
  previouslyContacted?: boolean;
  viewCount?: number;
  lastContactDate?: string;
}

/**
 * Client Match Result interface
 */
export interface ClientMatchResult {
  client: any; // ClientDto interface from client-management
  matchScore: number;
  scoreBreakdown?: MatchScoreBreakdown;
  matchReasons?: MatchReason[];
  mismatchReasons?: MatchReason[];
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
  appliedWeights?: MatchWeights;
}
