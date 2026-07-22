import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import * as L from 'leaflet';
import { GeocodingService, GeocodingSuggestion } from '../../services/geocoding.service';

// Leaflet's default marker icon references image paths that break once bundled by
// the Angular build. angular.json copies leaflet/dist/images to assets/leaflet/ at
// build time — point the default icon there instead.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png'
});

const GERMANY_CENTER: L.LatLngTuple = [51.1657, 10.4515];

/**
 * Farbe kodiert durchgängig *was* ein Pin ist, nicht wo er liegt: rot = Suchstandort
 * eines Kunden, blau = Immobilie, grün = die gerade geöffnete Immobilie. Damit liest
 * sich jede Karte gleich, egal ob sie aus dem Kunden- oder dem Objektkontext kommt.
 */
export type MapMarkerRole = 'search' | 'property' | 'currentProperty';

export const MAP_MARKER_COLORS: Record<MapMarkerRole, string> = {
  search: '#dc2626',
  property: '#2563eb',
  currentProperty: '#16a34a'
};

export interface SecondaryMarker {
  latitude: number;
  longitude: number;
  label: string;
  /** Default 'property' — der mit Abstand häufigste Fall. */
  role?: MapMarkerRole;
}

/**
 * Reusable Leaflet map for the location feature (Issue #19): a draggable pin with an
 * optional radius circle. Read-only mode (property-detail: show where a property is)
 * vs interactive mode (client-form: pick a search center + radius) share this one
 * component so map styling/behavior stays consistent between the two contexts.
 */
@Component({
  selector: 'app-location-picker-map',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div *ngIf="!readOnly" style="position:relative;">
        <input type="text"
               class="form-input"
               [placeholder]="'location.searchPlaceholder' | translate"
               [(ngModel)]="searchQuery"
               (ngModelChange)="onSearchInput($event)"
               (focus)="searchFocused = true"
               (blur)="onSearchBlur()"
               autocomplete="off">
        <div *ngIf="searchFocused && suggestions.length > 0"
             style="position:absolute;top:100%;left:0;right:0;z-index:20;margin-top:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);max-height:220px;overflow-y:auto;">
          <button *ngFor="let suggestion of suggestions" type="button"
                  (mousedown)="selectSuggestion(suggestion)"
                  style="display:block;width:100%;text-align:left;padding:9px 12px;border:none;background:none;cursor:pointer;font-size:13px;color:var(--text);border-bottom:1px solid var(--border);">
            {{ suggestion.label }}
          </button>
        </div>
      </div>

      <div #mapContainer style="height:260px;overflow:hidden;" [style.border-radius]="mapBorderRadius" [class.location-picker-map--interactive]="!readOnly"></div>

      <div *ngIf="!readOnly && showRadiusControl && hasPin" style="display:flex;align-items:center;gap:10px;">
        <label style="font-size:12px;color:var(--text-2);white-space:nowrap;">{{ 'location.radiusLabel' | translate }}</label>
        <input type="range" min="1" max="100" [(ngModel)]="radiusKm" (ngModelChange)="onRadiusChange($event)" style="flex:1;">
        <span style="font-size:13px;font-weight:600;color:var(--text);min-width:52px;text-align:right;">{{ radiusKm }} km</span>
      </div>

      <p *ngIf="!readOnly && !hasPin" style="margin:0;font-size:12px;color:var(--text-3);">
        {{ 'location.noPinHint' | translate }}
      </p>
    </div>
  `
})
export class LocationPickerMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() latitude?: number;
  @Input() longitude?: number;
  @Input() radiusKm = 10;
  @Input() readOnly = false;
  @Input() showRadiusControl = true;
  /** CSS border-radius for the map's own container — override when it's embedded flush
   * against a card edge (e.g. '0' when a parent already clips corners via overflow:hidden,
   * or '0 0 12px 12px' when it should visually continue straight from content above it). */
  @Input() mapBorderRadius = '12px';
  @Input() secondaryMarkers: SecondaryMarker[] = [];
  /** Rolle des Haupt-Pins — im Kundenkontext der Suchstandort, auf einer Objektseite
   * die Immobilie selbst. Steuert nur die Farbe, nicht das Verhalten. */
  @Input() pinRole: MapMarkerRole = 'search';

  @Output() locationChange = new EventEmitter<{ latitude: number; longitude: number }>();
  @Output() radiusChangeEvent = new EventEmitter<number>();

  @ViewChild('mapContainer') mapContainerRef!: ElementRef<HTMLDivElement>;

  searchQuery = '';
  searchFocused = false;
  suggestions: GeocodingSuggestion[] = [];

  private map?: L.Map;
  private marker?: L.Marker;
  private circle?: L.Circle;
  private secondaryLayer?: L.LayerGroup;
  private viewInitialized = false;
  private search$ = new Subject<string>();

  constructor(private geocodingService: GeocodingService) {
    this.search$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap(query => this.geocodingService.search(query))
      )
      .subscribe(results => {
        this.suggestions = results;
        // Auto-place the pin at the best match once results come back — Nominatim
        // already ranks by relevance, so requiring an explicit click on top of the
        // debounce would just be a second wait for the common case. The dropdown
        // stays open so a wrong best-guess can still be corrected with one click.
        if (results.length > 0) {
          this.setPin(results[0].latitude, results[0].longitude);
          this.fitToContent();
        }
      });
  }

  get hasPin(): boolean {
    return this.latitude != null && this.longitude != null;
  }

  ngAfterViewInit(): void {
    const center: L.LatLngTuple = this.hasPin ? [this.latitude!, this.longitude!] : GERMANY_CENTER;
    this.map = L.map(this.mapContainerRef.nativeElement, {
      zoomControl: true,
      dragging: true,
      scrollWheelZoom: !this.readOnly
    }).setView(center, this.hasPin ? 13 : 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    if (this.hasPin) {
      this.renderPin();
      this.fitToContent();
    }

    this.renderSecondaryMarkers();

    if (!this.readOnly) {
      this.map.on('click', (event: L.LeafletMouseEvent) => {
        this.setPin(event.latlng.lat, event.latlng.lng);
      });
    }

    this.viewInitialized = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewInitialized || !this.map) {
      return;
    }
    if (changes['latitude'] || changes['longitude']) {
      if (this.hasPin) {
        this.renderPin();
        this.fitToContent();
      }
    }
    if (changes['radiusKm'] && this.circle) {
      this.circle.setRadius(this.radiusKm * 1000);
      this.fitToContent();
    }
    if (changes['pinRole'] && this.marker) {
      this.marker.setIcon(this.buildPinIcon());
    }
    if (changes['secondaryMarkers']) {
      // Bewusst ohne fitToContent: der Ausschnitt gehört dem Haupt-Pin (bzw. seinem
      // Radius). Sekundäre Pins liegen mit auf der Karte und werden beim manuellen
      // Rauszoomen sichtbar — sie dürfen den Fokus aber nicht wegziehen.
      this.renderSecondaryMarkers();
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  onSearchInput(query: string): void {
    this.search$.next(query);
  }

  onSearchBlur(): void {
    // Delay so a click on a suggestion (mousedown) registers before the list unmounts.
    setTimeout(() => (this.searchFocused = false), 150);
  }

  selectSuggestion(suggestion: GeocodingSuggestion): void {
    this.setPin(suggestion.latitude, suggestion.longitude);
    this.fitToContent();
    this.searchQuery = suggestion.label;
    this.suggestions = [];
  }

  onRadiusChange(radiusKm: number): void {
    this.circle?.setRadius(radiusKm * 1000);
    this.fitToContent();
    this.radiusChangeEvent.emit(radiusKm);
  }

  /**
   * Zoom/center the map so the current content is actually visible on load or after a
   * change — a fixed zoom level looked fine for a lone pin but left large search radii
   * clipped outside the viewport, forcing a manual zoom-out every time.
   */
  private fitToContent(): void {
    if (!this.map || !this.hasPin) {
      return;
    }
    if (this.showRadiusControl && this.circle) {
      this.map.fitBounds(this.circle.getBounds(), { padding: [24, 24] });
    } else {
      this.map.setView([this.latitude!, this.longitude!], 13);
    }
  }

  private setPin(latitude: number, longitude: number): void {
    this.latitude = latitude;
    this.longitude = longitude;
    this.renderPin();
    this.locationChange.emit({ latitude, longitude });
  }

  /**
   * Sekundäre Pins (z. B. Immobilien im Suchradius) leben in einer eigenen LayerGroup,
   * damit ein kompletter Neuaufbau bei jeder Änderung den Such-Pin nicht berührt.
   * CircleMarker statt Icon-Marker: klar vom Such-Pin unterscheidbar und ohne
   * zusätzliche Icon-Assets im Build.
   */
  private renderSecondaryMarkers(): void {
    if (!this.map) {
      return;
    }
    if (!this.secondaryLayer) {
      this.secondaryLayer = L.layerGroup().addTo(this.map);
    }
    this.secondaryLayer.clearLayers();
    for (const marker of this.secondaryMarkers ?? []) {
      L.circleMarker([marker.latitude, marker.longitude], {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: MAP_MARKER_COLORS[marker.role ?? 'property'],
        fillOpacity: 0.9
      })
        .bindTooltip(marker.label)
        .addTo(this.secondaryLayer);
    }
  }

  private renderPin(): void {
    if (!this.map || !this.hasPin) {
      return;
    }
    const position: L.LatLngTuple = [this.latitude!, this.longitude!];

    if (!this.marker) {
      this.marker = L.marker(position, { draggable: !this.readOnly, icon: this.buildPinIcon() }).addTo(this.map);
      if (!this.readOnly) {
        this.marker.on('dragend', () => {
          const pos = this.marker!.getLatLng();
          this.setPin(pos.lat, pos.lng);
        });
      }
    } else {
      this.marker.setLatLng(position);
      this.marker.setIcon(this.buildPinIcon());
    }

    if (this.showRadiusControl) {
      if (!this.circle) {
        this.circle = L.circle(position, {
          radius: this.radiusKm * 1000,
          color: this.resolveAccentColor(),
          fillOpacity: 0.08
        }).addTo(this.map);
      } else {
        this.circle.setLatLng(position);
      }
    }
  }

  /**
   * Inline-SVG statt Leaflets Standard-PNG: das PNG gibt es nur in Blau, und ein
   * eingefärbtes Icon pro Rolle als zusätzliches Asset auszuliefern lohnt für drei
   * Farben nicht. className:'' unterdrückt Leaflets weißen divIcon-Kasten.
   */
  private buildPinIcon(): L.DivIcon {
    const color = MAP_MARKER_COLORS[this.pinRole];
    return L.divIcon({
      className: '',
      html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="-1 -1 28 38" aria-hidden="true">
          <path d="M13 0a13 13 0 0 0-13 13c0 9.5 13 23 13 23s13-13.5 13-23A13 13 0 0 0 13 0z"
                fill="${color}" stroke="#ffffff" stroke-width="2"/>
          <circle cx="13" cy="13" r="4.5" fill="#ffffff"/>
        </svg>`,
      iconSize: [28, 38],
      iconAnchor: [14, 37],
      tooltipAnchor: [0, -32]
    });
  }

  /**
   * Leaflet's SVG renderer sets path colors as plain attributes, which don't resolve
   * CSS custom properties — resolve --primary to its computed value so the radius
   * circle matches the app's theme (and stays correct across light/dark) instead of
   * hardcoding a color that could drift from the design system.
   */
  private resolveAccentColor(): string {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
    return value || '#2563eb';
  }
}
