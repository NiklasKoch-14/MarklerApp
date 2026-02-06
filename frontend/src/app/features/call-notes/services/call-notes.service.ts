import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

// Call Note interfaces based on backend DTOs
export interface CallNote {
  id?: string;
  agentId?: string;
  agentName?: string;
  clientId: string;
  clientName?: string;
  propertyId?: string;
  propertyTitle?: string;
  propertyAddress?: string;
  callDate: string;
  durationMinutes?: number;
  callType: CallType;
  subject: string;
  notes: string;
  followUpRequired?: boolean;
  followUpDate?: string;
  propertiesDiscussed?: string;
  outcome?: CallOutcome;
  createdAt?: string;
  updatedAt?: string;
}

export interface CallNoteSummary {
  id?: string;
  clientId: string;
  clientName?: string;
  propertyId?: string;
  propertyTitle?: string;
  callDate: string;
  callType: CallType;
  subject: string;
  notesSummary?: string;  // Preview of notes for list view
  followUpRequired?: boolean;
  followUpDate?: string;
  outcome?: CallOutcome;
  createdAt?: string;
}

export interface CallNoteCreateRequest {
  clientId: string;
  propertyId?: string;
  callDate: string;
  durationMinutes?: number;
  callType: CallType;
  subject: string;
  notes: string;
  followUpRequired?: boolean;
  followUpDate?: string;
  propertiesDiscussed?: string;
  outcome?: CallOutcome;
}

export interface CallNoteUpdateRequest {
  propertyId?: string;
  callDate: string;
  durationMinutes?: number;
  callType: CallType;
  subject: string;
  notes: string;
  followUpRequired?: boolean;
  followUpDate?: string;
  propertiesDiscussed?: string;
  outcome?: CallOutcome;
}

export interface CallNoteSearchFilter {
  clientId?: string;
  callType?: CallType;
  outcome?: CallOutcome;
  callDateFrom?: string;
  callDateTo?: string;
  followUpRequired?: boolean;
  searchTerm?: string;
}

export interface BulkSummary {
  clientId: string;
  clientName: string;
  totalCallNotes: number;
  lastCallDate?: string;
  pendingFollowUps: number;
  mostRecentSubject?: string;
  lastOutcome?: CallOutcome;
}

export interface FollowUpReminder {
  id: string;
  clientId: string;
  clientName: string;
  subject: string;
  followUpDate: string;
  isOverdue: boolean;
  daysUntilDue: number;
}

export interface PropertySummary {
  id: string;
  title: string;
  address: string;
  propertyType: string;
  listingType: string;
}

export interface AiSummary {
  summary: string;
  generatedAt?: string;
  callNotesCount: number;
  available: boolean;
}

export enum CallType {
  PHONE_INBOUND = 'PHONE_INBOUND',
  PHONE_OUTBOUND = 'PHONE_OUTBOUND',
  EMAIL = 'EMAIL',
  MEETING = 'MEETING',
  OTHER = 'OTHER'
}

export enum CallOutcome {
  INTERESTED = 'INTERESTED',
  NOT_INTERESTED = 'NOT_INTERESTED',
  SCHEDULED_VIEWING = 'SCHEDULED_VIEWING',
  OFFER_MADE = 'OFFER_MADE',
  DEAL_CLOSED = 'DEAL_CLOSED'
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

@Injectable({
  providedIn: 'root'
})
export class CallNotesService {
  private readonly apiUrl = `${environment.apiUrl}/call-notes`;

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
  ) {}

  /**
   * Create a new call note
   */
  createCallNote(callNote: CallNoteCreateRequest): Observable<CallNote> {
    return this.http.post<CallNote>(this.apiUrl, callNote).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Update an existing call note
   */
  updateCallNote(id: string, callNote: CallNoteUpdateRequest): Observable<CallNote> {
    return this.http.put<CallNote>(`${this.apiUrl}/${id}`, callNote).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Get a specific call note by ID
   */
  getCallNote(id: string): Observable<CallNote> {
    return this.http.get<CallNote>(`${this.apiUrl}/${id}`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Delete a call note
   */
  deleteCallNote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Get all call notes for a specific client
   */
  getCallNotesByClient(clientId: string, page: number = 0, size: number = 20): Observable<PagedResponse<CallNoteSummary>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PagedResponse<CallNoteSummary>>(`${this.apiUrl}/client/${clientId}`, { params }).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Get all call notes for the authenticated agent
   */
  getCallNotesByAgent(page: number = 0, size: number = 20): Observable<PagedResponse<CallNoteSummary>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PagedResponse<CallNoteSummary>>(this.apiUrl, { params }).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Search call notes with filters
   */
  searchCallNotes(filter: CallNoteSearchFilter, page: number = 0, size: number = 20): Observable<PagedResponse<CallNoteSummary>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.post<PagedResponse<CallNoteSummary>>(`${this.apiUrl}/search`, filter, { params }).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Get follow-up reminders
   */
  getFollowUpReminders(): Observable<FollowUpReminder[]> {
    return this.http.get<FollowUpReminder[]>(`${this.apiUrl}/follow-ups`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Get overdue follow-ups
   */
  getOverdueFollowUps(): Observable<FollowUpReminder[]> {
    return this.http.get<FollowUpReminder[]>(`${this.apiUrl}/follow-ups/overdue`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Get call notes summary for a specific client
   */
  getClientCallNotesSummary(clientId: string): Observable<BulkSummary> {
    return this.http.get<BulkSummary>(`${this.apiUrl}/client/${clientId}/summary`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Get agent's properties for call note form dropdown
   */
  getAgentProperties(): Observable<PropertySummary[]> {
    return this.http.get<PropertySummary[]>(`${this.apiUrl}/properties`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  // === SUMMARY GENERATION ENDPOINTS ===

  /**
   * Generate comprehensive communication summary for a client
   */
  generateClientSummary(clientId: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/client/${clientId}/summary/detailed`, { responseType: 'text' }).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Generate quick summary for a client
   */
  generateQuickSummary(clientId: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/client/${clientId}/summary/quick`, { responseType: 'text' }).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Generate timeline summary for a client
   */
  generateTimelineSummary(clientId: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/client/${clientId}/summary/timeline`, { responseType: 'text' }).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Generate period-specific summary for a client
   */
  generatePeriodSummary(clientId: string, startDate: string, endDate: string): Observable<string> {
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http.get(`${this.apiUrl}/client/${clientId}/summary/period`, {
      params,
      responseType: 'text'
    }).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Generate AI-powered summary for a client using Ollama
   */
  generateAiSummary(clientId: string): Observable<AiSummary> {
    return this.http.post<AiSummary>(`${this.apiUrl}/client/${clientId}/ai-summary`, {}).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  // === UTILITY METHODS ===

  /**
   * Get call type options for forms
   * Returns enum values only - labels should be translated using translateEnum pipe
   */
  getCallTypeOptions(): CallType[] {
    return Object.values(CallType);
  }

  /**
   * Get call outcome options for forms
   * Returns enum values only - labels should be translated using translateEnum pipe
   */
  getCallOutcomeOptions(): CallOutcome[] {
    return Object.values(CallOutcome);
  }
}