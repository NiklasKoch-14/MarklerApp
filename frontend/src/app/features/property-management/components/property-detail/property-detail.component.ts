import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  PropertyService,
  Property,
  PropertyImage,
  PropertyStatus,
  PropertyType,
  ListingType,
  HeatingType
} from '../../services/property.service';
import { FileAttachmentManagerComponent } from '../../../../shared/components/file-attachment-manager/file-attachment-manager.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { FormsModule } from '@angular/forms';
import { ViewingService, ViewingSummary, ViewingStatus } from '../../../viewing-management/services/viewing.service';
import { ViewingAddDialogComponent } from '../../../viewing-management/components/viewing-add-dialog/viewing-add-dialog.component';
import { PropertyMatchingService } from '../../services/property-matching.service';
import { ClientMatchResult, MatchWeights } from '../../models/property-match.model';
import { MatchScorePopoverComponent } from '../match-breakdown/match-score-popover.component';
import { LocationPickerMapComponent, SecondaryMarker } from '../../../../shared/components/location-picker-map/location-picker-map.component';
import { ClientService } from '../../../client-management/services/client.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-property-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, FileAttachmentManagerComponent, LoadingSpinnerComponent, ViewingAddDialogComponent, ConfirmDialogComponent, LocationPickerMapComponent, MatchScorePopoverComponent],
  templateUrl: './property-detail.component.html',
  styleUrls: ['./property-detail.component.scss']
})
export class PropertyDetailComponent implements OnInit {
  property: Property | null = null;
  isLoading = false;
  isDeleting = false;
  showDeletePropertyConfirm = false;
  pageError = '';
  isGeocoding = false;
  isLoadingExpose = false;
  selectedImage: PropertyImage | null = null;
  selectedImageIndex = 0;

  showStatusDropdown = false;
  isUpdatingStatus = false;
  readonly allStatuses = Object.values(PropertyStatus);

  viewings: ViewingSummary[] = [];
  isLoadingViewings = false;
  showViewingDialog = false;

  isEditingNotes = false;
  notesDraft = '';
  isSavingNotes = false;

  matchingClients: ClientMatchResult[] = [];
  isLoadingMatchingClients = false;
  /** Gewichte, mit denen der Backend-Score tatsaechlich gerechnet wurde */
  matchingClientWeights?: MatchWeights;
  /** Alle übrigen Objekte (blau) und alle Kunden-Suchstandorte (rot) — das aktuelle
   * Objekt selbst ist der grüne Haupt-Pin und darf hier nicht doppelt auftauchen. */
  mapMarkers: SecondaryMarker[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public propertyService: PropertyService,
    private viewingService: ViewingService,
    private propertyMatchingService: PropertyMatchingService,
    private clientService: ClientService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const propertyId = this.route.snapshot.paramMap.get('id');
    if (propertyId) {
      this.loadProperty(propertyId);
      this.loadViewings(propertyId);
      this.loadMatchingClients(propertyId);
      this.loadMapMarkers(propertyId);
    }
  }

  /**
   * Auf der Objektseite zeigt die Karte den gesamten Bestand: wo liegt dieses Objekt
   * im Verhältnis zu meinen anderen Objekten, und welche Kunden suchen in der Nähe.
   * Größe 1000: ein Agent hat realistisch weit weniger Datensätze; erspart Paging.
   */
  private loadMapMarkers(currentPropertyId: string): void {
    forkJoin({
      properties: this.propertyService.getProperties(0, 1000).pipe(catchError(() => of(null))),
      clients: this.clientService.getClients(0, 1000).pipe(catchError(() => of(null)))
    }).subscribe(({ properties, clients }) => {
      const propertyMarkers: SecondaryMarker[] = (properties?.content ?? [])
        .filter(p => p.id !== currentPropertyId && p.latitude != null && p.longitude != null)
        .map(p => ({ latitude: p.latitude!, longitude: p.longitude!, label: p.title, role: 'property' as const }));

      const searchMarkers: SecondaryMarker[] = (clients?.content ?? [])
        .filter(c => c.searchCriteria?.latitude != null && c.searchCriteria?.longitude != null)
        .map(c => ({
          latitude: c.searchCriteria!.latitude!,
          longitude: c.searchCriteria!.longitude!,
          label: `${c.firstName} ${c.lastName} · ${c.searchCriteria!.searchRadiusKm ?? 10} km`,
          role: 'search' as const
        }));

      this.mapMarkers = [...propertyMarkers, ...searchMarkers];
    });
  }

  private loadProperty(id: string): void {
    this.isLoading = true;
    this.propertyService.getProperty(id).subscribe({
      next: (property) => {
        this.property = property;
        if (property.images && property.images.length > 0) {
          const primaryImage = property.images.find(img => img.isPrimary);
          this.selectedImage = primaryImage || property.images[0];
          this.selectedImageIndex = property.images.indexOf(this.selectedImage);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading property:', error);
        this.isLoading = false;
      }
    });
  }

  private loadViewings(propertyId: string): void {
    this.isLoadingViewings = true;
    this.viewingService.getViewingsByProperty(propertyId).subscribe({
      next: (viewings) => {
        this.viewings = viewings;
        this.isLoadingViewings = false;
      },
      error: () => {
        this.isLoadingViewings = false;
      }
    });
  }

  onViewingCreated(): void {
    this.showViewingDialog = false;
    const propertyId = this.route.snapshot.paramMap.get('id');
    if (propertyId) this.loadViewings(propertyId);
  }

  getViewingStatusBg(status: ViewingStatus): string {
    switch (status) {
      case ViewingStatus.COMPLETED: return 'var(--color-success-soft)';
      case ViewingStatus.CANCELLED: return 'var(--color-error-soft)';
      default: return 'var(--stage-viewing-bg)';
    }
  }

  getViewingStatusColor(status: ViewingStatus): string {
    switch (status) {
      case ViewingStatus.COMPLETED: return 'var(--color-success)';
      case ViewingStatus.CANCELLED: return 'var(--color-error)';
      default: return 'var(--stage-viewing)';
    }
  }

  private loadMatchingClients(propertyId: string): void {
    this.isLoadingMatchingClients = true;
    this.propertyMatchingService.findMatchingClientsForProperty(propertyId, { maxResults: 5, matchThreshold: 0 }).subscribe({
      next: (response) => {
        this.matchingClients = response.clients?.slice(0, 5) ?? [];
        this.matchingClientWeights = response.appliedWeights;
        this.isLoadingMatchingClients = false;
      },
      error: () => { this.isLoadingMatchingClients = false; }
    });
  }

  /** Nur die gesetzten Ausstattungsmerkmale, in der Reihenfolge des Formulars */
  visibleFeatures(): { icon: string; labelKey: string }[] {
    const p = this.property;
    if (!p) {
      return [];
    }

    return [
      { on: p.hasElevator, icon: 'ri-expand-up-down-line', labelKey: 'properties.form.hasElevator' },
      { on: p.hasBalcony, icon: 'ri-cloudy-line', labelKey: 'properties.form.hasBalcony' },
      { on: p.hasTerrace, icon: 'ri-sun-line', labelKey: 'properties.form.hasTerrace' },
      { on: p.hasGarden, icon: 'ri-tree-line', labelKey: 'properties.form.hasGarden' },
      { on: p.hasGarage, icon: 'ri-car-line', labelKey: 'properties.form.hasGarage' },
      { on: p.hasParking, icon: 'ri-parking-line', labelKey: 'properties.form.hasParking' },
      { on: p.hasBasement, icon: 'ri-archive-line', labelKey: 'properties.form.hasBasement' },
      { on: p.hasAttic, icon: 'ri-home-line', labelKey: 'properties.form.hasAttic' },
      { on: p.isBarrierFree, icon: 'ri-wheelchair-line', labelKey: 'properties.form.isBarrierFree' },
      { on: p.petsAllowed, icon: 'ri-footprint-line', labelKey: 'properties.form.petsAllowed' },
      { on: p.furnished, icon: 'ri-armchair-line', labelKey: 'properties.form.furnished' }
    ]
      .filter(feature => feature.on)
      .map(({ icon, labelKey }) => ({ icon, labelKey }));
  }

  startEditingNotes(): void {
    this.notesDraft = this.property?.notes ?? '';
    this.isEditingNotes = true;
  }

  cancelEditingNotes(): void {
    this.isEditingNotes = false;
    this.notesDraft = '';
  }

  saveNotes(): void {
    if (!this.property?.id || this.isSavingNotes) return;
    this.isSavingNotes = true;
    // Leerer Text loescht die Notiz -- '' statt null, weil updateProperty null als
    // "Feld nicht anfassen" interpretiert und die Notiz sonst stehen bliebe.
    const notes = this.notesDraft.trim();
    this.propertyService.patchProperty(this.property.id, { notes }).subscribe({
      next: (updated) => {
        this.property = { ...this.property!, notes: updated.notes };
        this.isEditingNotes = false;
        this.isSavingNotes = false;
      },
      error: () => { this.isSavingNotes = false; }
    });
  }

  updateStatus(newStatus: PropertyStatus): void {
    if (!this.property?.id || this.isUpdatingStatus || this.property.status === newStatus) {
      this.showStatusDropdown = false;
      return;
    }
    this.isUpdatingStatus = true;
    this.showStatusDropdown = false;
    this.propertyService.patchProperty(this.property.id, { status: newStatus }).subscribe({
      next: (updated) => {
        this.property = updated;
        this.isUpdatingStatus = false;
      },
      error: () => { this.isUpdatingStatus = false; }
    });
  }

  getDaysOnMarket(): number | null {
    if (!this.property?.createdAt) return null;
    const created = new Date(this.property.createdAt);
    const now = new Date();
    const diff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  deleteProperty(): void {
    if (!this.property) return;
    this.isDeleting = true;
    this.pageError = '';
    this.propertyService.deleteProperty(this.property.id!).subscribe({
      next: () => {
        this.router.navigate(['/properties']);
      },
      error: (error) => {
        console.error('Error deleting property:', error);
        this.isDeleting = false;
        this.showDeletePropertyConfirm = false;
        this.pageError = this.translate.instant('properties.deleteFailed');
      }
    });
  }

  geocodeProperty(): void {
    if (!this.property?.id) return;
    this.isGeocoding = true;
    this.pageError = '';
    this.propertyService.geocodeProperty(this.property.id).subscribe({
      next: (updated) => {
        this.property = updated;
        this.isGeocoding = false;
      },
      error: (error) => {
        console.error('Error geocoding property:', error);
        this.isGeocoding = false;
        this.pageError = this.translate.instant('properties.location.geocodeFailed');
      }
    });
  }

  selectImage(image: PropertyImage, index: number): void {
    this.selectedImage = image;
    this.selectedImageIndex = index;
  }

  nextImage(): void {
    if (this.property?.images && this.property.images.length > 0) {
      this.selectedImageIndex = (this.selectedImageIndex + 1) % this.property.images.length;
      this.selectedImage = this.property.images[this.selectedImageIndex];
    }
  }

  previousImage(): void {
    if (this.property?.images && this.property.images.length > 0) {
      this.selectedImageIndex = (this.selectedImageIndex - 1 + this.property.images.length) % this.property.images.length;
      this.selectedImage = this.property.images[this.selectedImageIndex];
    }
  }

  getStatusLabel(status?: PropertyStatus): string {
    switch (status) {
      case PropertyStatus.AVAILABLE:          return 'Verfügbar';
      case PropertyStatus.RESERVED:           return 'Reserviert';
      case PropertyStatus.SOLD:               return 'Verkauft';
      case PropertyStatus.RENTED:             return 'Vermietet';
      case PropertyStatus.WITHDRAWN:          return 'Zurückgezogen';
      case PropertyStatus.UNDER_CONSTRUCTION: return 'Im Bau';
      default:                                return status ?? '—';
    }
  }

  getStatusBg(status?: PropertyStatus): string {
    switch (status) {
      case PropertyStatus.AVAILABLE:          return 'var(--accent-soft)';
      case PropertyStatus.RESERVED:           return 'var(--color-warning-soft)';
      case PropertyStatus.SOLD:               return 'var(--color-success-soft)';
      case PropertyStatus.RENTED:             return 'var(--color-success-soft)';
      case PropertyStatus.UNDER_CONSTRUCTION: return 'var(--color-warning-soft)';
      default:                                return 'var(--color-neutral-soft)';
    }
  }

  getStatusColor(status?: PropertyStatus): string {
    switch (status) {
      case PropertyStatus.AVAILABLE:          return 'var(--primary)';
      case PropertyStatus.RESERVED:           return 'var(--color-warning)';
      case PropertyStatus.SOLD:               return 'var(--color-success)';
      case PropertyStatus.RENTED:             return 'var(--color-success)';
      case PropertyStatus.UNDER_CONSTRUCTION: return 'var(--color-warning)';
      default:                                return 'var(--color-neutral)';
    }
  }

  getPropertyTypeLabel(type?: PropertyType): string {
    switch (type) {
      case PropertyType.APARTMENT:     return 'Wohnung';
      case PropertyType.HOUSE:         return 'Haus';
      case PropertyType.TOWNHOUSE:     return 'Reihenhaus';
      case PropertyType.VILLA:         return 'Villa';
      case PropertyType.PENTHOUSE:     return 'Penthouse';
      case PropertyType.LOFT:          return 'Loft';
      case PropertyType.DUPLEX:        return 'Duplex';
      case PropertyType.STUDIO:        return 'Studio';
      case PropertyType.OFFICE:        return 'Büro';
      case PropertyType.RETAIL:        return 'Einzelhandel';
      case PropertyType.WAREHOUSE:     return 'Lager';
      case PropertyType.INDUSTRIAL:    return 'Industrie';
      case PropertyType.RESTAURANT:    return 'Restaurant';
      case PropertyType.HOTEL:         return 'Hotel';
      case PropertyType.PARKING_SPACE: return 'Stellplatz';
      case PropertyType.GARAGE:        return 'Garage';
      case PropertyType.LAND:          return 'Grundstück';
      case PropertyType.FARM:          return 'Bauernhof';
      case PropertyType.CASTLE:        return 'Schloss';
      case PropertyType.OTHER:         return 'Sonstige';
      default:                         return type ?? '—';
    }
  }

  getListingTypeLabel(type?: ListingType): string {
    switch (type) {
      case ListingType.SALE:  return 'Kauf';
      case ListingType.RENT:  return 'Miete';
      case ListingType.LEASE: return 'Pacht';
      default:                return type ?? '—';
    }
  }

  getHeatingTypeLabel(type?: HeatingType): string {
    switch (type) {
      case HeatingType.GAS:              return 'Gas';
      case HeatingType.OIL:              return 'Öl';
      case HeatingType.ELECTRIC:         return 'Strom';
      case HeatingType.HEAT_PUMP:        return 'Wärmepumpe';
      case HeatingType.DISTRICT_HEATING: return 'Fernwärme';
      case HeatingType.SOLAR:            return 'Solar';
      case HeatingType.WOOD_PELLETS:     return 'Holzpellets';
      case HeatingType.GEOTHERMAL:       return 'Erdwärme';
      case HeatingType.COAL:             return 'Kohle';
      case HeatingType.OTHER:            return 'Sonstige';
      default:                           return type ?? '—';
    }
  }

  hasFeatures(): boolean {
    return !!(
      this.property?.hasElevator ||
      this.property?.hasBalcony ||
      this.property?.hasTerrace ||
      this.property?.hasGarden ||
      this.property?.hasGarage ||
      this.property?.hasParking ||
      this.property?.hasBasement ||
      this.property?.hasAttic ||
      this.property?.isBarrierFree ||
      this.property?.petsAllowed ||
      this.property?.furnished
    );
  }

  hasEnergyInfo(): boolean {
    return !!(
      this.property?.energyEfficiencyClass ||
      this.property?.energyConsumptionKwh ||
      this.property?.heatingType
    );
  }

  printProperty(): void {
    window.print();
  }

  exportProperty(): void {
    if (this.property) {
      const dataStr = JSON.stringify(this.property, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `property-${this.property.id}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  }

  previewExpose(): void {
    if (!this.property?.id) return;

    this.isLoadingExpose = true;
    this.propertyService.downloadExpose(this.property.id).subscribe({
      next: (expose) => {
        // Open PDF in new tab
        const pdfWindow = window.open('');
        if (pdfWindow) {
          pdfWindow.document.write(
            `<iframe width='100%' height='100%' src='data:application/pdf;base64,${expose.fileData}'></iframe>`
          );
        }
        this.isLoadingExpose = false;
      },
      error: (err) => {
        console.error('Error previewing expose:', err);
        this.pageError = this.translate.instant('properties.expose.previewFailed');
        this.isLoadingExpose = false;
      }
    });
  }

  downloadExpose(): void {
    if (!this.property?.id) return;

    this.isLoadingExpose = true;
    this.propertyService.downloadExpose(this.property.id).subscribe({
      next: (expose) => {
        // Create download link
        const linkSource = `data:application/pdf;base64,${expose.fileData}`;
        const downloadLink = document.createElement('a');
        downloadLink.href = linkSource;
        downloadLink.download = expose.fileName;
        downloadLink.click();
        this.isLoadingExpose = false;
      },
      error: (err) => {
        console.error('Error downloading expose:', err);
        this.pageError = this.translate.instant('properties.expose.downloadFailed');
        this.isLoadingExpose = false;
      }
    });
  }
}
