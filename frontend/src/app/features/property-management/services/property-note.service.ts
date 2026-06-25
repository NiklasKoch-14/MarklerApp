import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

export enum NoteCategory {
  GENERAL = 'GENERAL',
  SELLER_INFO = 'SELLER_INFO',
  PRICE_NOTE = 'PRICE_NOTE',
  VIEWING_NOTE = 'VIEWING_NOTE',
  LEGAL_NOTE = 'LEGAL_NOTE'
}

export interface PropertyNoteCreateRequest {
  propertyId: string;
  content: string;
  category?: NoteCategory;
}

export interface PropertyNoteResponse {
  id: string;
  agentId: string;
  propertyId: string;
  content: string;
  category: NoteCategory;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class PropertyNoteService {
  private apiUrl = `${environment.apiUrl}/property-notes`;

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
  ) {}

  createNote(request: PropertyNoteCreateRequest): Observable<PropertyNoteResponse> {
    return this.http.post<PropertyNoteResponse>(this.apiUrl, request).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  deleteNote(noteId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${noteId}`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  getNotesByProperty(propertyId: string): Observable<PropertyNoteResponse[]> {
    return this.http.get<PropertyNoteResponse[]>(`${this.apiUrl}/property/${propertyId}`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }
}
