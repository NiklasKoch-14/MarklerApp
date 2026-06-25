import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';
import { PagedResponse } from '../../client-management/services/client.service';

export enum ViewingStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum ViewingFeedback {
  LIKED = 'LIKED',
  NEUTRAL = 'NEUTRAL',
  DISLIKED = 'DISLIKED'
}

export interface ViewingCreateRequest {
  clientId: string;
  propertyId: string;
  viewingDate: string;
  durationMinutes?: number;
  feedback?: ViewingFeedback;
  clientNotes?: string;
  followUpAction?: string;
}

export interface ViewingUpdateRequest {
  viewingDate: string;
  durationMinutes?: number;
  status?: ViewingStatus;
  feedback?: ViewingFeedback;
  clientNotes?: string;
  followUpAction?: string;
}

export interface ViewingResponse {
  id: string;
  agentId: string;
  clientId: string;
  clientName: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  viewingDate: string;
  durationMinutes?: number;
  status: ViewingStatus;
  feedback?: ViewingFeedback;
  clientNotes?: string;
  followUpAction?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ViewingSummary {
  id: string;
  clientId: string;
  clientName: string;
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  viewingDate: string;
  status: ViewingStatus;
  feedback?: ViewingFeedback;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ViewingService {
  private apiUrl = `${environment.apiUrl}/viewings`;

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
  ) {}

  createViewing(request: ViewingCreateRequest): Observable<ViewingResponse> {
    return this.http.post<ViewingResponse>(this.apiUrl, request).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  updateViewing(viewingId: string, request: ViewingUpdateRequest): Observable<ViewingResponse> {
    return this.http.put<ViewingResponse>(`${this.apiUrl}/${viewingId}`, request).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  deleteViewing(viewingId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${viewingId}`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  getViewing(viewingId: string): Observable<ViewingResponse> {
    return this.http.get<ViewingResponse>(`${this.apiUrl}/${viewingId}`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  getViewingsByClient(clientId: string): Observable<ViewingSummary[]> {
    return this.http.get<ViewingSummary[]>(`${this.apiUrl}/client/${clientId}`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  getViewingsByProperty(propertyId: string): Observable<ViewingSummary[]> {
    return this.http.get<ViewingSummary[]>(`${this.apiUrl}/property/${propertyId}`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  getTodaysViewings(): Observable<ViewingSummary[]> {
    return this.http.get<ViewingSummary[]>(`${this.apiUrl}/today`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }
}
