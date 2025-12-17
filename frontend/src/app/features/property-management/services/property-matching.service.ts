import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PropertyMatchRequest, PropertyMatchResponse } from '../models/property-match.model';

/**
 * Service for property-client matching operations
 */
@Injectable({
  providedIn: 'root'
})
export class PropertyMatchingService {
  private readonly apiUrl = `${environment.apiUrl}/property-matching`;

  constructor(private http: HttpClient) {}

  /**
   * Find properties that match a client's search criteria
   */
  findMatchingPropertiesForClient(clientId: string, request?: Partial<PropertyMatchRequest>): Observable<PropertyMatchResponse> {
    const matchRequest: PropertyMatchRequest = {
      clientId,
      ...request
    };

    return this.http.post<PropertyMatchResponse>(`${this.apiUrl}/find-properties`, matchRequest);
  }

  /**
   * Find clients interested in a specific property
   */
  findMatchingClientsForProperty(propertyId: string, request?: Partial<PropertyMatchRequest>): Observable<PropertyMatchResponse> {
    const matchRequest: PropertyMatchRequest = {
      propertyId,
      ...request
    };

    return this.http.post<PropertyMatchResponse>(`${this.apiUrl}/find-clients`, matchRequest);
  }

  /**
   * Find properties matching custom criteria
   */
  findMatchingPropertiesByCustomCriteria(request: PropertyMatchRequest): Observable<PropertyMatchResponse> {
    return this.http.post<PropertyMatchResponse>(`${this.apiUrl}/find-properties`, request);
  }

  /**
   * Get match score between a specific property and client
   */
  getMatchScore(propertyId: string, clientId: string): Observable<{ matchScore: number; scoreBreakdown: any }> {
    return this.http.get<{ matchScore: number; scoreBreakdown: any }>(
      `${this.apiUrl}/score/${propertyId}/${clientId}`
    );
  }

  /**
   * Get default match request with recommended settings
   */
  getDefaultMatchRequest(): PropertyMatchRequest {
    return {
      matchThreshold: 70,
      maxResults: 50,
      exactLocationMatch: false,
      allowBudgetFlexibility: true,
      allowFeatureFlexibility: true,
      priceWeight: 30,
      locationWeight: 25,
      areaWeight: 20,
      roomWeight: 15,
      featureWeight: 10,
      sortBy: 'matchScore',
      sortDirection: 'DESC',
      includeContacted: true,
      includeUnavailable: false
    };
  }

  /**
   * Create match request for client
   */
  createMatchRequestForClient(clientId: string, options?: Partial<PropertyMatchRequest>): PropertyMatchRequest {
    return {
      ...this.getDefaultMatchRequest(),
      clientId,
      ...options
    };
  }

  /**
   * Create match request for property
   */
  createMatchRequestForProperty(propertyId: string, options?: Partial<PropertyMatchRequest>): PropertyMatchRequest {
    return {
      ...this.getDefaultMatchRequest(),
      propertyId,
      ...options
    };
  }

  /**
   * Validate match request
   */
  validateMatchRequest(request: PropertyMatchRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check that exactly one matching mode is specified
    const modeCount = [request.clientId, request.propertyId, request.customCriteria]
      .filter(m => m !== undefined && m !== null).length;

    if (modeCount === 0) {
      errors.push('At least one matching mode must be specified (clientId, propertyId, or customCriteria)');
    } else if (modeCount > 1) {
      errors.push('Only one matching mode can be specified at a time');
    }

    // Validate threshold
    if (request.matchThreshold !== undefined) {
      if (request.matchThreshold < 0 || request.matchThreshold > 100) {
        errors.push('Match threshold must be between 0 and 100');
      }
    }

    // Validate max results
    if (request.maxResults !== undefined) {
      if (request.maxResults < 1 || request.maxResults > 500) {
        errors.push('Max results must be between 1 and 500');
      }
    }

    // Validate weights
    if (request.priceWeight !== undefined && (request.priceWeight < 0 || request.priceWeight > 100)) {
      errors.push('Price weight must be between 0 and 100');
    }
    if (request.locationWeight !== undefined && (request.locationWeight < 0 || request.locationWeight > 100)) {
      errors.push('Location weight must be between 0 and 100');
    }
    if (request.areaWeight !== undefined && (request.areaWeight < 0 || request.areaWeight > 100)) {
      errors.push('Area weight must be between 0 and 100');
    }
    if (request.roomWeight !== undefined && (request.roomWeight < 0 || request.roomWeight > 100)) {
      errors.push('Room weight must be between 0 and 100');
    }
    if (request.featureWeight !== undefined && (request.featureWeight < 0 || request.featureWeight > 100)) {
      errors.push('Feature weight must be between 0 and 100');
    }

    // Validate sort by
    const validSortBy = ['matchScore', 'price', 'createdAt', 'livingAreaSqm', 'rooms'];
    if (request.sortBy && !validSortBy.includes(request.sortBy)) {
      errors.push(`Sort by must be one of: ${validSortBy.join(', ')}`);
    }

    // Validate sort direction
    const validSortDirection = ['ASC', 'DESC', 'asc', 'desc'];
    if (request.sortDirection && !validSortDirection.includes(request.sortDirection)) {
      errors.push('Sort direction must be ASC or DESC');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get human-readable match score description
   */
  getMatchScoreDescription(score: number, language: 'de' | 'en' = 'en'): string {
    const descriptions = {
      en: {
        excellent: 'Excellent Match',
        good: 'Good Match',
        fair: 'Fair Match',
        poor: 'Poor Match'
      },
      de: {
        excellent: 'Ausgezeichnete Übereinstimmung',
        good: 'Gute Übereinstimmung',
        fair: 'Mäßige Übereinstimmung',
        poor: 'Geringe Übereinstimmung'
      }
    };

    const lang = descriptions[language];

    if (score >= 80) return lang.excellent;
    if (score >= 60) return lang.good;
    if (score >= 40) return lang.fair;
    return lang.poor;
  }

  /**
   * Get match score color class
   */
  getMatchScoreColorClass(score: number): string {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  }
}
