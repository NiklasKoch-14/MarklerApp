import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { PropertyService, Property, PagedResponse, PropertySearchFilter, PropertyType, ListingType, PropertyStatus } from '../../services/property.service';
import { TranslateEnumPipe } from '../../../../shared/pipes/translate-enum.pipe';

@Component({
  selector: 'app-property-search',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, TranslateModule, TranslateEnumPipe],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ 'properties.search.title' | translate }}</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {{ 'properties.search.description' | translate }}
        </p>
      </div>

      <!-- Search Form -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <form [formGroup]="searchForm" (ngSubmit)="onSearch()">
          <!-- Text Search -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ 'properties.search.query' | translate }}
            </label>
            <input
              type="text"
              formControlName="query"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              [placeholder]="'properties.search.queryPlaceholder' | translate"
            />
          </div>

          <!-- Property Type & Listing Type -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ 'properties.form.propertyType' | translate }}
              </label>
              <select formControlName="propertyType" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                <option [ngValue]="null">{{ 'properties.search.allTypes' | translate }}</option>
                <option *ngFor="let type of propertyTypes" [value]="type">
                  {{ type | translateEnum:'propertyType' }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ 'properties.form.listingType' | translate }}
              </label>
              <select formControlName="listingType" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                <option [ngValue]="null">{{ 'properties.search.allListingTypes' | translate }}</option>
                <option *ngFor="let type of listingTypes" [value]="type">
                  {{ type | translateEnum:'listingType' }}
                </option>
              </select>
            </div>
          </div>

          <!-- Status & Location -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ 'properties.form.status' | translate }}
              </label>
              <select formControlName="status" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                <option [ngValue]="null">{{ 'properties.search.allStatuses' | translate }}</option>
                <option *ngFor="let status of propertyStatuses" [value]="status">
                  {{ status | translateEnum:'propertyStatus' }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ 'properties.search.city' | translate }}
              </label>
              <input
                type="text"
                formControlName="city"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                [placeholder]="'properties.search.cityPlaceholder' | translate"
              />
            </div>
          </div>

          <!-- Price Range -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ 'properties.search.priceRange' | translate }}
            </label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="number"
                formControlName="minPrice"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                [placeholder]="'properties.search.minPrice' | translate"
                min="0"
              />
              <input
                type="number"
                formControlName="maxPrice"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                [placeholder]="'properties.search.maxPrice' | translate"
                min="0"
              />
            </div>
          </div>

          <!-- Living Area Range -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ 'properties.search.livingArea' | translate }}
            </label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="number"
                formControlName="minLivingArea"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                [placeholder]="'properties.search.minArea' | translate"
                min="0"
              />
              <input
                type="number"
                formControlName="maxLivingArea"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                [placeholder]="'properties.search.maxArea' | translate"
                min="0"
              />
            </div>
          </div>

          <!-- Room Range -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ 'properties.search.numberOfRooms' | translate }}
            </label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="number"
                formControlName="minRooms"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                [placeholder]="'properties.search.minRooms' | translate"
                min="0"
                step="0.5"
              />
              <input
                type="number"
                formControlName="maxRooms"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                [placeholder]="'properties.search.maxRooms' | translate"
                min="0"
                step="0.5"
              />
            </div>
          </div>

          <!-- Features -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ 'properties.search.features' | translate }}
            </label>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label class="flex items-center">
                <input type="checkbox" formControlName="hasElevator" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 mr-2" />
                <span class="text-sm">{{ 'properties.search.elevator' | translate }}</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" formControlName="hasBalcony" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 mr-2" />
                <span class="text-sm">{{ 'properties.search.balcony' | translate }}</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" formControlName="hasGarden" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 mr-2" />
                <span class="text-sm">{{ 'properties.search.garden' | translate }}</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" formControlName="hasParking" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 mr-2" />
                <span class="text-sm">{{ 'properties.search.parking' | translate }}</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" formControlName="petsAllowed" class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 mr-2" />
                <span class="text-sm">{{ 'properties.search.petsAllowed' | translate }}</span>
              </label>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-4">
            <button type="submit" class="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" [disabled]="isLoading">
              <span *ngIf="isLoading" class="inline-block animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
              {{ 'properties.search.searchButton' | translate }}
            </button>
            <button type="button" (click)="onReset()" class="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors">
              {{ 'common.reset' | translate }}
            </button>
            <a routerLink="/properties" class="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors">
              {{ 'common.backToList' | translate }}
            </a>
          </div>
        </form>
      </div>

      <!-- Search Results -->
      <div *ngIf="searchPerformed" class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ 'properties.search.results' | translate }} ({{ totalElements }} {{ 'properties.title' | translate | lowercase }})
          </h2>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">{{ 'properties.search.searching' | translate }}</p>
        </div>

        <!-- No Results -->
        <div *ngIf="!isLoading && properties.length === 0" class="text-center py-12">
          <p class="text-gray-600 dark:text-gray-400">{{ 'properties.search.noResults' | translate }}</p>
        </div>

        <!-- Results Grid -->
        <div *ngIf="!isLoading && properties.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div *ngFor="let property of properties; trackBy: trackById" class="bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow overflow-hidden cursor-pointer" [routerLink]="['/properties', property.id]">
            <div class="h-48 bg-gray-200 dark:bg-gray-700 relative">
              <img *ngIf="getPrimaryImage(property)" [src]="getPrimaryImage(property)" [alt]="property.title" class="w-full h-full object-cover" />
              <!-- Default House Icon when no image -->
              <div *ngIf="!getPrimaryImage(property)" class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
                <svg class="w-20 h-20 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
              </div>
            </div>
            <div class="p-4">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">{{ property.title }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                {{ property.addressCity }}, {{ property.addressPostalCode }}
              </p>
              <div class="flex gap-2 mb-3">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" [ngClass]="getListingTypeBadgeClass(property.listingType)">
                  {{ property.listingType | translateEnum:'listingType' }}
                </span>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" [ngClass]="getStatusBadgeClass(property.status)">
                  {{ (property.status || propertyStatuses[0]) | translateEnum:'propertyStatus' }}
                </span>
              </div>
              <div class="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                <span *ngIf="property.rooms">{{ property.rooms }} {{ 'common.rooms' | translate }}</span>
                <span *ngIf="property.livingAreaSqm">{{ property.livingAreaSqm }} m²</span>
              </div>
              <div class="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                <span class="text-xl font-bold text-primary-600 dark:text-primary-400">
                  {{ propertyService.formatPrice(property.price, property.listingType) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div *ngIf="!isLoading && totalPages > 1" class="flex justify-center mt-6">
          <nav class="inline-flex rounded-md shadow-sm -space-x-px">
            <button
              (click)="previousPage()"
              [disabled]="currentPage === 0"
              class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
              <span class="sr-only">{{ 'common.previous' | translate }}</span>
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"></path>
              </svg>
            </button>
            <button
              *ngFor="let page of getPageNumbers()"
              (click)="goToPage(page)"
              [class.bg-primary-50]="page === currentPage"
              [class.border-primary-500]="page === currentPage"
              [class.text-primary-600]="page === currentPage"
              [class.dark:bg-primary-900]="page === currentPage"
              [class.dark:text-primary-300]="page === currentPage"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              {{ page + 1 }}
            </button>
            <button
              (click)="nextPage()"
              [disabled]="currentPage >= totalPages - 1"
              class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
              <span class="sr-only">{{ 'common.next' | translate }}</span>
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path>
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .checkbox:checked {
      background-color: var(--primary);
      border-color: var(--primary);
    }
  `]
})
export class PropertySearchComponent implements OnInit {
  searchForm: FormGroup;
  properties: Property[] = [];
  isLoading = false;
  searchPerformed = false;
  currentLanguage = 'en';

  // Pagination
  currentPage = 0;
  pageSize = 12;
  totalElements = 0;
  totalPages = 0;

  // Enum values
  propertyTypes = Object.values(PropertyType);
  listingTypes = Object.values(ListingType);
  propertyStatuses = Object.values(PropertyStatus);

  constructor(
    private fb: FormBuilder,
    public propertyService: PropertyService,
    private router: Router
  ) {
    this.searchForm = this.fb.group({
      query: [''],
      propertyType: [null],
      listingType: [null],
      status: [null],
      city: [''],
      minPrice: [null],
      maxPrice: [null],
      minLivingArea: [null],
      maxLivingArea: [null],
      minRooms: [null],
      maxRooms: [null],
      hasElevator: [false],
      hasBalcony: [false],
      hasGarden: [false],
      hasParking: [false],
      petsAllowed: [false]
    });
  }

  ngOnInit(): void {
    // Component initialization
  }

  onSearch(): void {
    this.currentPage = 0;
    this.searchPerformed = true;
    this.loadProperties();
  }

  onReset(): void {
    this.searchForm.reset({
      hasElevator: false,
      hasBalcony: false,
      hasGarden: false,
      hasParking: false,
      petsAllowed: false
    });
    this.properties = [];
    this.searchPerformed = false;
    this.totalElements = 0;
    this.totalPages = 0;
  }

  private loadProperties(): void {
    this.isLoading = true;

    const filter: PropertySearchFilter = {};
    const formValue = this.searchForm.value;

    // Build filter object
    if (formValue.query) filter.query = formValue.query;
    if (formValue.propertyType) filter.propertyType = formValue.propertyType;
    if (formValue.listingType) filter.listingType = formValue.listingType;
    if (formValue.status) filter.status = formValue.status;
    if (formValue.city) filter.city = formValue.city;
    if (formValue.minPrice) filter.minPrice = formValue.minPrice;
    if (formValue.maxPrice) filter.maxPrice = formValue.maxPrice;
    if (formValue.minLivingArea) filter.minLivingArea = formValue.minLivingArea;
    if (formValue.maxLivingArea) filter.maxLivingArea = formValue.maxLivingArea;
    if (formValue.minRooms) filter.minRooms = formValue.minRooms;
    if (formValue.maxRooms) filter.maxRooms = formValue.maxRooms;
    if (formValue.hasElevator) filter.hasElevator = true;
    if (formValue.hasBalcony) filter.hasBalcony = true;
    if (formValue.hasGarden) filter.hasGarden = true;
    if (formValue.hasParking) filter.hasParking = true;
    if (formValue.petsAllowed) filter.petsAllowed = true;

    this.propertyService.searchProperties(filter, this.currentPage, this.pageSize).subscribe({
      next: (response: PagedResponse<Property>) => {
        this.properties = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error searching properties:', error);
        this.isLoading = false;
      }
    });
  }

  getPrimaryImage(property: Property): string | null {
    if (property.images && property.images.length > 0) {
      const primaryImage = property.images.find(img => img.isPrimary);
      return primaryImage?.imageUrl || property.images[0]?.imageUrl || null;
    }
    return null;
  }

  getStatusBadgeClass(status?: PropertyStatus): string {
    switch (status) {
      case PropertyStatus.AVAILABLE: return 'bg-green-100 text-green-800';
      case PropertyStatus.RESERVED: return 'bg-yellow-100 text-yellow-800';
      case PropertyStatus.SOLD: return 'bg-blue-100 text-blue-800';
      case PropertyStatus.RENTED: return 'bg-purple-100 text-purple-800';
      case PropertyStatus.WITHDRAWN: return 'bg-gray-100 text-gray-800';
      case PropertyStatus.UNDER_CONSTRUCTION: return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getListingTypeBadgeClass(listingType: ListingType): string {
    switch (listingType) {
      case ListingType.SALE: return 'bg-indigo-100 text-indigo-800';
      case ListingType.RENT: return 'bg-cyan-100 text-cyan-800';
      case ListingType.LEASE: return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  /**
   * TrackBy function for *ngFor performance optimization
   */
  trackById(index: number, item: Property): string | undefined {
    return item.id;
  }
}
