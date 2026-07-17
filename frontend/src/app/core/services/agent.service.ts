import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AgentProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  languagePreference: 'DE' | 'EN';
  fullName: string;
  googleLinked: boolean;
  passwordSet: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private readonly apiUrl = `${environment.apiUrl}/agents`;

  constructor(private http: HttpClient) {}

  /**
   * Load the authenticated agent's profile. Read fresh rather than from the cached
   * login response, which predates any later account change (e.g. linking Google).
   */
  getMe(): Observable<AgentProfile> {
    return this.http.get<AgentProfile>(`${this.apiUrl}/me`);
  }
}
