import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TaskCompleteRequest, TaskCreateRequest, TaskSummary } from '../../shared/models/task.model';

/**
 * Aufgaben und Erinnerungen (Issue #33). Eine Aufgabe steht fuer sich; der Bezug
 * auf Kunde oder Objekt ist optional, und die aus einer Gespraechsnotiz gespiegelte
 * Aufgabe unterscheidet sich hier durch nichts von einer frei angelegten.
 */
@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly base = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  /** Tagesliste: offen und faellig bis einschliesslich heute. */
  getDue(): Observable<TaskSummary[]> {
    return this.http.get<TaskSummary[]>(`${this.base}/due`);
  }

  getByClient(clientId: string): Observable<TaskSummary[]> {
    return this.http.get<TaskSummary[]>(`${this.base}/client/${clientId}`);
  }

  getByProperty(propertyId: string): Observable<TaskSummary[]> {
    return this.http.get<TaskSummary[]>(`${this.base}/property/${propertyId}`);
  }

  create(req: TaskCreateRequest): Observable<TaskSummary> {
    return this.http.post<TaskSummary>(this.base, req);
  }

  update(id: string, req: Partial<TaskCreateRequest>): Observable<TaskSummary> {
    return this.http.put<TaskSummary>(`${this.base}/${id}`, req);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /** Ohne Body wird nur abgehakt, mit Body entsteht zusaetzlich eine Gespraechsnotiz. */
  complete(id: string, body?: TaskCompleteRequest): Observable<TaskSummary> {
    return this.http.post<TaskSummary>(`${this.base}/${id}/complete`, body ?? null);
  }

  postpone(id: string, dueDate: string): Observable<TaskSummary> {
    return this.http.post<TaskSummary>(`${this.base}/${id}/postpone`, { dueDate });
  }
}
