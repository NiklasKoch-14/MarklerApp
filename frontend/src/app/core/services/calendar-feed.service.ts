import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CalendarSubscription {
  token: string;
  /** Relativ zur API-Basis; die absolute URL baut dieser Service. */
  feedPath: string;
}

/**
 * ICS-Kalenderabo der Besichtigungen (Issue #34).
 *
 * Read-only und einseitig: der Makler abonniert den Feed in seinem Kalender,
 * es gibt keine Schreibrichtung.
 */
@Injectable({ providedIn: 'root' })
export class CalendarFeedService {
  private readonly apiUrl = `${environment.apiUrl}/calendar`;

  constructor(private http: HttpClient) {}

  /** Abo-Daten; der Token wird serverseitig beim ersten Aufruf erzeugt. */
  getSubscription(): Observable<{ token: string; feedUrl: string }> {
    return this.http.get<CalendarSubscription>(`${this.apiUrl}/subscription`).pipe(
      map(s => this.withAbsoluteUrl(s))
    );
  }

  /** Neuen Link erzeugen — der alte wird damit ungültig. */
  rotate(): Observable<{ token: string; feedUrl: string }> {
    return this.http.post<CalendarSubscription>(`${this.apiUrl}/subscription/rotate`, {}).pipe(
      map(s => this.withAbsoluteUrl(s))
    );
  }

  /**
   * Der Server liefert nur den Pfad — hinter Railways Proxy kennt er seine
   * öffentliche Adresse nicht zuverlässig. Die Basis kennt das Frontend.
   */
  private withAbsoluteUrl(s: CalendarSubscription): { token: string; feedUrl: string } {
    return { token: s.token, feedUrl: `${environment.apiUrl}${s.feedPath}` };
  }
}
