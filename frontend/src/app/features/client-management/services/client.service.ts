import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

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
  preferredLocations?: string[];
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

  /**
   * Delete client
   */
  deleteClient(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(err => this.errorHandler.handleError(err))
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