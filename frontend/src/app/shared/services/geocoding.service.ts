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

/** Strukturierte Adressbestandteile (Issue #29). Alle Felder optional — der Geocoder
 *  liefert je nach Ort unterschiedlich viel, ein Stadtteil existiert nicht überall. */
export interface AddressLookup {
  road?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface AddressLookupQuery {
  postalCode?: string | null;
  city?: string | null;
  street?: string | null;
  houseNumber?: string | null;
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

  /**
   * Strukturierte Adressbestandteile für die Formular-Vervollständigung (Issue #29).
   * Nur Deutschland — international gilt weder das 5-Ziffern-Format noch die Annahme,
   * dass eine PLZ den Ort bestimmt.
   *
   * Fail-soft wie der Rest des Service: bei jedem Fehler `null`, das Formular
   * bleibt normal ausfüllbar.
   */
  lookupAddress(query: AddressLookupQuery): Observable<AddressLookup | null> {
    let params = new HttpParams();
    if (query.postalCode) params = params.set('postalCode', query.postalCode);
    if (query.city) params = params.set('city', query.city);
    if (query.street) params = params.set('street', query.street);
    if (query.houseNumber) params = params.set('houseNumber', query.houseNumber);
    if (params.keys().length === 0) return of(null);

    return this.http.get<AddressLookup>(`${this.apiUrl}/address`, { params }).pipe(
      // 204 kommt als null durch — der Server hat nichts gefunden.
      map(result => result ?? null),
      catchError(() => of(null))
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
