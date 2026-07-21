import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Person-related (Art. 15) GDPR export for a single client — distinct from the
 * agent-wide export under /gdpr/export, which dumps the agent's entire client book.
 */
@Injectable({
  providedIn: 'root'
})
export class GdprExportService {
  private readonly apiUrl = `${environment.apiUrl}/gdpr`;

  constructor(private http: HttpClient) {}

  exportClientDataAsPdf(clientId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/clients/${clientId}/export/pdf`, { responseType: 'blob' });
  }

  exportClientDataAsJson(clientId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/clients/${clientId}/export`, { responseType: 'blob' });
  }
}
