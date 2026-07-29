import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type SearchHitType = 'CLIENT' | 'PROPERTY' | 'NOTE';

export interface SearchHit {
  id: string;
  type: SearchHitType;
  title: string;
  subtitle?: string | null;
  /** Notes only: excerpt around the match. */
  snippet?: string | null;
  /** Notes only: the client whose detail page the hit navigates to. */
  clientId?: string | null;
  /** Notes only: call date. */
  date?: string | null;
}

export interface SearchResults {
  query: string;
  totalHits: number;
  clients: SearchHit[];
  properties: SearchHit[];
  notes: SearchHit[];
}

export const EMPTY_SEARCH_RESULTS: SearchResults = {
  query: '',
  totalHits: 0,
  clients: [],
  properties: [],
  notes: []
};

/** Shortest term the backend answers for — mirrors SearchService.MIN_QUERY_LENGTH. */
export const MIN_SEARCH_TERM_LENGTH = 2;

/**
 * Global search across clients, properties and call notes — the data source of the
 * command palette. Results are scoped to the authenticated agent by the backend.
 */
@Injectable({ providedIn: 'root' })
export class GlobalSearchService {

  private readonly apiUrl = `${environment.apiUrl}/search`;

  constructor(private http: HttpClient) {}

  search(term: string): Observable<SearchResults> {
    return this.http.get<SearchResults>(this.apiUrl, {
      params: new HttpParams().set('q', term)
    });
  }
}
