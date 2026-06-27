import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
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
import { FormsModule } from '@angular/forms';
import { ViewingService, ViewingSummary, ViewingStatus } from '../../../viewing-management/services/viewing.service';
import { ViewingAddDialogComponent } from '../../../viewing-management/components/viewing-add-dialog/viewing-add-dialog.component';
import { PropertyNoteService, PropertyNoteResponse, NoteCategory } from '../../services/property-note.service';

@Component({
  selector: 'app-property-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, FileAttachmentManagerComponent, LoadingSpinnerComponent, ViewingAddDialogComponent],
  templateUrl: './property-detail.component.html',
  styleUrls: ['./property-detail.component.scss']
})
export class PropertyDetailComponent implements OnInit {
  property: Property | null = null;
  isLoading = false;
  isDeleting = false;
  isLoadingExpose = false;
  selectedImage: PropertyImage | null = null;
  selectedImageIndex = 0;

  viewings: ViewingSummary[] = [];
  isLoadingViewings = false;
  showViewingDialog = false;

  propertyNotes: PropertyNoteResponse[] = [];
  isLoadingNotes = false;
  newNoteText = '';
  newNoteCategory: NoteCategory = NoteCategory.GENERAL;
  isSavingNote = false;
  NoteCategory = NoteCategory;

  noteCategoryLabels: Record<NoteCategory, string> = {
    [NoteCategory.GENERAL]: 'Allgemein',
    [NoteCategory.SELLER_INFO]: 'Verkäufer-Info',
    [NoteCategory.PRICE_NOTE]: 'Preis-Notiz',
    [NoteCategory.VIEWING_NOTE]: 'Besichtigungs-Notiz',
    [NoteCategory.LEGAL_NOTE]: 'Rechtliches'
  };

  noteCategoryColors: Record<NoteCategory, string> = {
    [NoteCategory.GENERAL]:      'var(--color-gray-soft)',
    [NoteCategory.SELLER_INFO]:  'var(--color-amber-soft)',
    [NoteCategory.PRICE_NOTE]:   'var(--color-success-soft)',
    [NoteCategory.VIEWING_NOTE]: 'var(--color-blue-soft)',
    [NoteCategory.LEGAL_NOTE]:   'var(--color-error-soft)',
  };

  noteCategories = Object.values(NoteCategory);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public propertyService: PropertyService,
    private viewingService: ViewingService,
    private propertyNoteService: PropertyNoteService
  ) {}

  ngOnInit(): void {
    const propertyId = this.route.snapshot.paramMap.get('id');
    if (propertyId) {
      this.loadProperty(propertyId);
      this.loadViewings(propertyId);
      this.loadNotes(propertyId);
    }
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

  private loadNotes(propertyId: string): void {
    this.isLoadingNotes = true;
    this.propertyNoteService.getNotesByProperty(propertyId).subscribe({
      next: (notes) => {
        this.propertyNotes = notes;
        this.isLoadingNotes = false;
      },
      error: () => { this.isLoadingNotes = false; }
    });
  }

  saveNote(): void {
    if (!this.newNoteText.trim() || !this.property?.id || this.isSavingNote) return;
    this.isSavingNote = true;
    this.propertyNoteService.createNote({
      propertyId: this.property.id,
      content: this.newNoteText.trim(),
      category: this.newNoteCategory
    }).subscribe({
      next: (note) => {
        this.propertyNotes = [note, ...this.propertyNotes];
        this.newNoteText = '';
        this.newNoteCategory = NoteCategory.GENERAL;
        this.isSavingNote = false;
      },
      error: () => { this.isSavingNote = false; }
    });
  }

  deleteNote(noteId: string): void {
    if (!confirm('Notiz löschen?')) return;
    this.propertyNoteService.deleteNote(noteId).subscribe({
      next: () => {
        this.propertyNotes = this.propertyNotes.filter(n => n.id !== noteId);
      }
    });
  }

  deleteProperty(): void {
    if (this.property && confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      this.isDeleting = true;
      this.propertyService.deleteProperty(this.property.id!).subscribe({
        next: () => {
          this.router.navigate(['/properties']);
        },
        error: (error) => {
          console.error('Error deleting property:', error);
          this.isDeleting = false;
          alert('Failed to delete property. Please try again.');
        }
      });
    }
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
      case PropertyStatus.AVAILABLE:          return 'rgba(220,252,231,0.95)';
      case PropertyStatus.RESERVED:           return 'rgba(254,243,199,0.95)';
      case PropertyStatus.SOLD:               return 'rgba(219,234,254,0.95)';
      case PropertyStatus.RENTED:             return 'rgba(237,233,254,0.95)';
      case PropertyStatus.UNDER_CONSTRUCTION: return 'rgba(254,243,199,0.95)';
      default:                                return 'rgba(243,244,246,0.95)';
    }
  }

  getStatusColor(status?: PropertyStatus): string {
    switch (status) {
      case PropertyStatus.AVAILABLE:          return '#16a34a';
      case PropertyStatus.RESERVED:           return '#d97706';
      case PropertyStatus.SOLD:               return '#2563eb';
      case PropertyStatus.RENTED:             return '#7c3aed';
      case PropertyStatus.UNDER_CONSTRUCTION: return '#d97706';
      default:                                return '#6b7280';
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
        alert('Failed to preview expose. Please try again.');
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
        alert('Failed to download expose. Please try again.');
        this.isLoadingExpose = false;
      }
    });
  }
}
