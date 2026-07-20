import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateEnumPipe } from '../../../../shared/pipes/translate-enum.pipe';
import {
  PropertyService,
  Property,
  PagedResponse,
  PropertySearchFilter,
  PropertyType,
  PropertyStatus
} from '../../services/property.service';

type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslateModule, TranslateEnumPipe],
  templateUrl: './property-list.component.html',
  styleUrls: ['./property-list.component.scss']
})
export class PropertyListComponent implements OnInit, OnDestroy {
  properties: Property[] = [];
  isLoading = false;

  // Pagination
  currentPage = 0;
  pageSize = 20;
  totalElements = 0;
  totalPages = 0;

  // Filter / search / sort state
  searchQuery = '';
  selectedStatus = '';
  selectedType = '';
  searchFilter: PropertySearchFilter = {};
  sortBy = 'createdAt';
  sortDir: SortDir = 'desc';

  private searchTimer?: ReturnType<typeof setTimeout>;

  constructor(
    public propertyService: PropertyService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadProperties();
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchTimer);
  }

  private loadProperties(): void {
    this.isLoading = true;

    const hasFilters = Object.keys(this.searchFilter).some(k => (this.searchFilter as any)[k]);

    const observable = hasFilters
      ? this.propertyService.searchProperties(this.searchFilter, this.currentPage, this.pageSize, this.sortBy, this.sortDir)
      : this.propertyService.getProperties(this.currentPage, this.pageSize, this.sortBy, this.sortDir);

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

  /** Rebuild the filter object from the bound controls (search + status + type). */
  private rebuildFilter(): void {
    this.searchFilter = {};
    const q = this.searchQuery.trim();
    if (q) this.searchFilter.query = q;
    if (this.selectedStatus) this.searchFilter.status = this.selectedStatus as PropertyStatus;
    if (this.selectedType) this.searchFilter.propertyType = this.selectedType as PropertyType;
  }

  onSearchInput(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.rebuildFilter();
      this.currentPage = 0;
      this.loadProperties();
    }, 350);
  }

  onFilterChange(): void {
    this.rebuildFilter();
    this.currentPage = 0;
    this.loadProperties();
  }

  clearAll(): void {
    this.searchQuery = '';
    this.selectedStatus = '';
    this.selectedType = '';
    this.searchFilter = {};
    this.currentPage = 0;
    this.loadProperties();
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchQuery.trim() || this.selectedStatus || this.selectedType);
  }

  toggleSort(field: string): void {
    if (this.sortBy === field) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortDir = field === 'title' ? 'asc' : 'desc';
    }
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

  // Status is the single color-coded badge for a property (mirrors pipeline stage for clients)
  getStatusBg(status?: PropertyStatus): string {
    switch (status) {
      case PropertyStatus.AVAILABLE:          return 'var(--accent-soft)';
      case PropertyStatus.RESERVED:           return 'var(--color-warning-soft)';
      case PropertyStatus.SOLD:               return 'var(--color-success-soft)';
      case PropertyStatus.RENTED:             return 'var(--color-success-soft)';
      case PropertyStatus.UNDER_CONSTRUCTION: return 'var(--color-warning-soft)';
      default:                                return 'var(--surface-2)';
    }
  }

  getStatusColor(status?: PropertyStatus): string {
    switch (status) {
      case PropertyStatus.AVAILABLE:          return 'var(--primary)';
      case PropertyStatus.RESERVED:           return 'var(--color-warning)';
      case PropertyStatus.SOLD:               return 'var(--color-success)';
      case PropertyStatus.RENTED:             return 'var(--color-success)';
      case PropertyStatus.UNDER_CONSTRUCTION: return 'var(--color-warning)';
      default:                                return 'var(--text-3)';
    }
  }

  getPrimaryImage(property: Property): string | null {
    if (property.images && property.images.length > 0) {
      const primaryImage = property.images.find(img => img.isPrimary);
      return primaryImage?.imageUrl || property.images[0]?.imageUrl || null;
    }
    return null;
  }

  daysOnMarket(property: Property): number | null {
    if (!property.createdAt) return null;
    const ms = Date.now() - new Date(property.createdAt).getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }

  daysOnMarketLabel(property: Property): string {
    const d = this.daysOnMarket(property);
    if (d === null) return '—';
    if (d === 0) return this.translate.instant('properties.today');
    return this.translate.instant('properties.daysOnMarketValue').replace('{{days}}', String(d));
  }

  specsLabel(property: Property): string {
    const parts: string[] = [];
    if (property.livingAreaSqm) parts.push(`${property.livingAreaSqm} m²`);
    if (property.rooms) parts.push(`${property.rooms} ${this.translate.instant('properties.roomsShort')}`);
    return parts.join(' · ') || '—';
  }

  trackById(index: number, item: Property): string | undefined {
    return item.id;
  }
}
