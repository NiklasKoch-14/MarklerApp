import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

export enum ClientType {
  BUYER  = 'BUYER',
  RENTER = 'RENTER',
  SELLER = 'SELLER',
}

export enum FinancingStatus {
  UNKNOWN          = 'UNKNOWN',
  SELF_FINANCED    = 'SELF_FINANCED',
  BANK_PRE_APPROVED = 'BANK_PRE_APPROVED',
  NEEDS_FINANCING  = 'NEEDS_FINANCING',
}

export enum MoveInTimeline {
  IMMEDIATE     = 'IMMEDIATE',
  THREE_MONTHS  = 'THREE_MONTHS',
  SIX_MONTHS    = 'SIX_MONTHS',
  ONE_YEAR      = 'ONE_YEAR',
  FLEXIBLE      = 'FLEXIBLE',
}

export enum PipelineStage {
  PROSPECT = 'PROSPECT',
  ACTIVE_SEARCH = 'ACTIVE_SEARCH',
  VIEWING = 'VIEWING',
  WON = 'WON',
  LOST = 'LOST'
}

export interface Client {
  id?: string;
  agentId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  addressStreet?: string;
  addressCity?: string;
  addressPostalCode?: string;
  addressCountry?: string;
  clientType?: ClientType;
  financingStatus?: FinancingStatus;
  moveInTimeline?: MoveInTimeline;
  pipelineStage?: PipelineStage;
  lastContactDate?: string;
  gdprConsentGiven: boolean;
  gdprConsentDate?: string;
  searchCriteria?: PropertySearchCriteria;
  createdAt?: string;
  updatedAt?: string;
  fullName?: string;
  formattedAddress?: string;
}

export interface PropertySearchCriteria {
  id?: string;
  clientId?: string;
  minSquareMeters?: number;
  maxSquareMeters?: number;
  minRooms?: number;
  maxRooms?: number;
  minBudget?: number;
  maxBudget?: number;
  minColdRent?: number;
  maxColdRent?: number;
  minWarmRent?: number;
  maxWarmRent?: number;
  preferredLocations?: string[];
  latitude?: number;
  longitude?: number;
  searchRadiusKm?: number;
  restrictToSearchRadius?: boolean;
  propertyTypes?: string[];
  additionalRequirements?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ClientStats {
  totalClients: number;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private readonly apiUrl = `${environment.apiUrl}/clients`;

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
  ) {}

  /**
   * Get all clients with pagination
   */
  getClients(page: number = 0, size: number = 20, sortBy: string = 'createdAt', sortDir: string = 'desc'): Observable<PagedResponse<Client>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.get<PagedResponse<Client>>(this.apiUrl, { params }).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Search clients
   */
  searchClients(query: string, page: number = 0, size: number = 20, sortBy: string = 'createdAt', sortDir: string = 'desc'): Observable<PagedResponse<Client>> {
    const params = new HttpParams()
      .set('q', query)
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.get<PagedResponse<Client>>(`${this.apiUrl}/search`, { params }).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Get client by ID
   */
  getClient(id: string): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/${id}`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Create new client
   */
  createClient(client: Client): Observable<Client> {
    return this.http.post<Client>(this.apiUrl, client).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Update client
   */
  updateClient(id: string, client: Client): Observable<Client> {
    return this.http.put<Client>(`${this.apiUrl}/${id}`, client).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  getClientsByStage(): Observable<Record<PipelineStage, Client[]>> {
    return this.http.get<Record<PipelineStage, Client[]>>(`${this.apiUrl}/by-stage`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  getSortedByLastContact(): Observable<Client[]> {
    return this.http.get<Client[]>(`${this.apiUrl}/sorted-by-contact`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  getClientsWithoutRecentContact(days: number = 30): Observable<Client[]> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<Client[]>(`${this.apiUrl}/without-recent-contact`, { params }).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  updatePipelineStage(id: string, stage: PipelineStage): Observable<Client> {
    const params = new HttpParams().set('stage', stage);
    return this.http.patch<Client>(`${this.apiUrl}/${id}/pipeline-stage`, null, { params }).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Delete client
   */
  deleteClient(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Soft duplicate check — existing clients with the same name or phone number.
   * Non-blocking: used to warn while a new client is being entered.
   */
  checkDuplicateClients(firstName: string, lastName: string, phone: string): Observable<Client[]> {
    let params = new HttpParams();
    if (firstName) params = params.set('firstName', firstName);
    if (lastName) params = params.set('lastName', lastName);
    if (phone) params = params.set('phone', phone);
    return this.http.get<Client[]>(`${this.apiUrl}/check-duplicate`, { params }).pipe(
      catchError(() => of([]))
    );
  }

  /**
   * Get recent clients
   */
  getRecentClients(days: number = 30): Observable<Client[]> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<Client[]>(`${this.apiUrl}/recent`, { params }).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Get client statistics
   */
  getClientStats(): Observable<ClientStats> {
    return this.http.get<ClientStats>(`${this.apiUrl}/stats`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Export client data (GDPR)
   */
  exportClientData(id: string): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/${id}/export`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Check if any clients exist for the current agent
   */
  hasClients(): Observable<boolean> {
    return this.getClientStats().pipe(
      map(stats => stats.totalClients > 0),
      catchError(err => this.errorHandler.handleError(err))
    );
  }
}