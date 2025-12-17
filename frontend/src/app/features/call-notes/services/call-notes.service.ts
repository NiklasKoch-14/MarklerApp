import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Call Note interfaces based on backend DTOs
export interface CallNote {
  id?: string;
  agentId?: string;
  agentName?: string;
  clientId: string;
  clientName?: string;
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

  constructor(private http: HttpClient) {}

  /**
   * Create a new call note
   */
  createCallNote(callNote: CallNoteCreateRequest): Observable<CallNote> {
    return this.http.post<CallNote>(this.apiUrl, callNote);
  }

  /**
   * Update an existing call note
   */
  updateCallNote(id: string, callNote: CallNoteUpdateRequest): Observable<CallNote> {
    return this.http.put<CallNote>(`${this.apiUrl}/${id}`, callNote);
  }

  /**
   * Get a specific call note by ID
   */
  getCallNote(id: string): Observable<CallNote> {
    return this.http.get<CallNote>(`${this.apiUrl}/${id}`);
  }

  /**
   * Delete a call note
   */
  deleteCallNote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get all call notes for a specific client
   */
  getCallNotesByClient(clientId: string, page: number = 0, size: number = 20): Observable<PagedResponse<CallNoteSummary>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PagedResponse<CallNoteSummary>>(`${this.apiUrl}/client/${clientId}`, { params });
  }

  /**
   * Get all call notes for the authenticated agent
   */
  getCallNotesByAgent(page: number = 0, size: number = 20): Observable<PagedResponse<CallNoteSummary>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PagedResponse<CallNoteSummary>>(this.apiUrl, { params });
  }

  /**
   * Search call notes with filters
   */
  searchCallNotes(filter: CallNoteSearchFilter, page: number = 0, size: number = 20): Observable<PagedResponse<CallNoteSummary>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.post<PagedResponse<CallNoteSummary>>(`${this.apiUrl}/search`, filter, { params });
  }

  /**
   * Get follow-up reminders
   */
  getFollowUpReminders(): Observable<FollowUpReminder[]> {
    return this.http.get<FollowUpReminder[]>(`${this.apiUrl}/follow-ups`);
  }

  /**
   * Get overdue follow-ups
   */
  getOverdueFollowUps(): Observable<FollowUpReminder[]> {
    return this.http.get<FollowUpReminder[]>(`${this.apiUrl}/follow-ups/overdue`);
  }

  /**
   * Get call notes summary for a specific client
   */
  getClientCallNotesSummary(clientId: string): Observable<BulkSummary> {
    return this.http.get<BulkSummary>(`${this.apiUrl}/client/${clientId}/summary`);
  }

  // === SUMMARY GENERATION ENDPOINTS ===

  /**
   * Generate comprehensive communication summary for a client
   */
  generateClientSummary(clientId: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/client/${clientId}/summary/detailed`, { responseType: 'text' });
  }

  /**
   * Generate quick summary for a client
   */
  generateQuickSummary(clientId: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/client/${clientId}/summary/quick`, { responseType: 'text' });
  }

  /**
   * Generate timeline summary for a client
   */
  generateTimelineSummary(clientId: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/client/${clientId}/summary/timeline`, { responseType: 'text' });
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
    });
  }

  // === UTILITY METHODS ===

  /**
   * Format call type for display
   */
  formatCallType(type: CallType): string {
    switch (type) {
      case CallType.PHONE_INBOUND:
        return 'Incoming Call';
      case CallType.PHONE_OUTBOUND:
        return 'Outgoing Call';
      case CallType.EMAIL:
        return 'Email';
      case CallType.MEETING:
        return 'Meeting';
      case CallType.OTHER:
        return 'Other';
      default:
        return type;
    }
  }

  /**
   * Format call outcome for display
   */
  formatCallOutcome(outcome: CallOutcome): string {
    switch (outcome) {
      case CallOutcome.INTERESTED:
        return 'Interested';
      case CallOutcome.NOT_INTERESTED:
        return 'Not Interested';
      case CallOutcome.SCHEDULED_VIEWING:
        return 'Viewing Scheduled';
      case CallOutcome.OFFER_MADE:
        return 'Offer Made';
      case CallOutcome.DEAL_CLOSED:
        return 'Deal Closed';
      default:
        return outcome;
    }
  }

  /**
   * Get call type options for forms
   */
  getCallTypeOptions(): { value: CallType, label: string }[] {
    return Object.values(CallType).map(type => ({
      value: type,
      label: this.formatCallType(type)
    }));
  }

  /**
   * Get call outcome options for forms
   */
  getCallOutcomeOptions(): { value: CallOutcome, label: string }[] {
    return Object.values(CallOutcome).map(outcome => ({
      value: outcome,
      label: this.formatCallOutcome(outcome)
    }));
  }
}