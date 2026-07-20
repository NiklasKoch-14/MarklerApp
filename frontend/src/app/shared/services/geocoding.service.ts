import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface GeocodingSuggestion {
  label: string;
  latitude: number;
  longitude: number;
}

/**
 * Thin wrapper around the backend's Nominatim proxy — the map picker's search box
 * never calls a third-party geocoder directly (see GeocodingController on the backend).
 * Fails soft on purpose: this only powers an autocomplete box, so a network hiccup
 * should just show no suggestions rather than surface an error or break the next keystroke.
 */
@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private readonly apiUrl = `${environment.apiUrl}/geocoding`;

  constructor(private http: HttpClient) {}

  search(query: string): Observable<GeocodingSuggestion[]> {
    if (!query || query.trim().length === 0) {
      return of([]);
    }
    const params = new HttpParams().set('q', query);
    return this.http.get<GeocodingSuggestion[]>(`${this.apiUrl}/search`, { params }).pipe(
      catchError(() => of([]))
    );
  }

  /** Human-readable label for a coordinate pair, or null if it can't be resolved. */
  reverse(latitude: number, longitude: number): Observable<string | null> {
    const params = new HttpParams().set('lat', latitude.toString()).set('lng', longitude.toString());
    return this.http.get<GeocodingSuggestion>(`${this.apiUrl}/reverse`, { params }).pipe(
      map(result => result?.label ?? null),
      catchError(() => of(null))
    );
  }
}
