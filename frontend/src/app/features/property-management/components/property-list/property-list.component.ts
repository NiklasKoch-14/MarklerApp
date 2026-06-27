import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
  PropertyService,
  Property,
  PagedResponse,
  PropertySearchFilter,
  PropertyType,
  ListingType,
  PropertyStatus
} from '../../services/property.service';

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslateModule],
  templateUrl: './property-list.component.html',
  styleUrls: ['./property-list.component.scss']
})
export class PropertyListComponent implements OnInit {
  properties: Property[] = [];
  isLoading = false;

  // Pagination
  currentPage = 0;
  pageSize = 12;
  totalElements = 0;
  totalPages = 0;

  // Filter state bound to the selects in the template
  selectedStatus = '';
  selectedType = '';
  searchFilter: PropertySearchFilter = {};

  constructor(public propertyService: PropertyService) {}

  ngOnInit(): void {
    this.loadProperties();
  }

  private loadProperties(): void {
    this.isLoading = true;

    const hasFilters = Object.keys(this.searchFilter).some(k => (this.searchFilter as any)[k]);

    const observable = hasFilters
      ? this.propertyService.searchProperties(this.searchFilter, this.currentPage, this.pageSize)
      : this.propertyService.getProperties(this.currentPage, this.pageSize);

    observable.subscribe({
      next: (response: PagedResponse<Property>) => {
        this.properties = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading properties:', error);
        this.isLoading = false;
      }
    });
  }

  onFilterChange(): void {
    this.searchFilter = {};
    if (this.selectedStatus) this.searchFilter.status = this.selectedStatus as PropertyStatus;
    if (this.selectedType) this.searchFilter.propertyType = this.selectedType as PropertyType;
    this.currentPage = 0;
    this.loadProperties();
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.loadProperties();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadProperties();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadProperties();
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

  getPrimaryImage(property: Property): string | null {
    if (property.images && property.images.length > 0) {
      const primaryImage = property.images.find(img => img.isPrimary);
      return primaryImage?.imageUrl || property.images[0]?.imageUrl || null;
    }
    return null;
  }

  trackById(index: number, item: Property): string | undefined {
    return item.id;
  }
}
