import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TranslateEnumPipe } from '../../../../shared/pipes/translate-enum.pipe';
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
  imports: [CommonModule, RouterLink, FormsModule, TranslateModule, TranslateEnumPipe],
  templateUrl: './property-list.component.html',
  styleUrls: ['./property-list.component.scss']
})
export class PropertyListComponent implements OnInit {
  properties: Property[] = [];
  isLoading = false;
  showFilters = false;

  // Pagination
  currentPage = 0;
  pageSize = 12;
  totalElements = 0;
  totalPages = 0;

  // Search and filters
  searchFilter: PropertySearchFilter = {};

  // Enum values for dropdowns
  propertyTypes = Object.values(PropertyType);
  listingTypes = Object.values(ListingType);
  propertyStatuses = Object.values(PropertyStatus);

  constructor(public propertyService: PropertyService) {}

  ngOnInit(): void {
    this.loadProperties();
  }

  private loadProperties(): void {
    this.isLoading = true;

    const hasFilters = Object.keys(this.searchFilter).length > 0;

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

  applyFilters(): void {
    this.currentPage = 0;
    this.loadProperties();
  }

  clearFilters(): void {
    this.searchFilter = {};
    this.currentPage = 0;
    this.loadProperties();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadProperties();
    }
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

  getStatusBadgeClass(status?: PropertyStatus): string {
    switch (status) {
      case PropertyStatus.AVAILABLE:
        return 'bg-green-100 text-green-800';
      case PropertyStatus.RESERVED:
        return 'bg-yellow-100 text-yellow-800';
      case PropertyStatus.SOLD:
        return 'bg-blue-100 text-blue-800';
      case PropertyStatus.RENTED:
        return 'bg-purple-100 text-purple-800';
      case PropertyStatus.WITHDRAWN:
        return 'bg-gray-100 text-gray-800';
      case PropertyStatus.UNDER_CONSTRUCTION:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getListingTypeBadgeClass(listingType: ListingType): string {
    switch (listingType) {
      case ListingType.SALE:
        return 'bg-indigo-100 text-indigo-800';
      case ListingType.RENT:
        return 'bg-cyan-100 text-cyan-800';
      case ListingType.LEASE:
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getPrimaryImage(property: Property): string | null {
    if (property.images && property.images.length > 0) {
      const primaryImage = property.images.find(img => img.isPrimary);
      return primaryImage?.imageUrl || property.images[0]?.imageUrl || null;
    }
    return null;
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(0, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages - 1, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(0, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  previewExpose(event: Event, propertyId: string): void {
    event.stopPropagation(); // Prevent navigation to detail page
    this.propertyService.downloadExpose(propertyId).subscribe({
      next: (expose) => {
        const pdfWindow = window.open('');
        if (pdfWindow) {
          pdfWindow.document.write(
            `<iframe width='100%' height='100%' src='data:application/pdf;base64,${expose.fileData}'></iframe>`
          );
        } else {
          alert('Failed to open preview window. Please check popup blocker settings.');
        }
      },
      error: (err) => {
        console.error('Error previewing expose:', err);
        alert('Failed to preview expose. Please try again.');
      }
    });
  }

  downloadExpose(event: Event, propertyId: string): void {
    event.stopPropagation(); // Prevent navigation to detail page
    this.propertyService.downloadExpose(propertyId).subscribe({
      next: (expose) => {
        const linkSource = `data:application/pdf;base64,${expose.fileData}`;
        const downloadLink = document.createElement('a');
        downloadLink.href = linkSource;
        downloadLink.download = expose.fileName;
        downloadLink.click();
      },
      error: (err) => {
        console.error('Error downloading expose:', err);
        alert('Failed to download expose. Please try again.');
      }
    });
  }

  /**
   * TrackBy function for *ngFor performance optimization
   */
  trackById(index: number, item: Property): string | undefined {
    return item.id;
  }
}
