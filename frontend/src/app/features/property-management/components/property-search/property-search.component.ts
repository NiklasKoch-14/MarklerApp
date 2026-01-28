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
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Advanced Property Search</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Search properties with advanced filtering options
        </p>
      </div>

      <!-- Search Form -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <form [formGroup]="searchForm" (ngSubmit)="onSearch()">
          <!-- Text Search -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Query
            </label>
            <input
              type="text"
              formControlName="query"
              class="input input-bordered w-full"
              placeholder="Search by title, description, or address..."
            />
          </div>

          <!-- Property Type & Listing Type -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Property Type
              </label>
              <select formControlName="propertyType" class="select select-bordered w-full">
                <option [ngValue]="null">All Types</option>
                <option *ngFor="let type of propertyTypes" [value]="type">
                  {{ type | translateEnum:'propertyType' }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Listing Type
              </label>
              <select formControlName="listingType" class="select select-bordered w-full">
                <option [ngValue]="null">All Listing Types</option>
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
                Status
              </label>
              <select formControlName="status" class="select select-bordered w-full">
                <option [ngValue]="null">All Statuses</option>
                <option *ngFor="let status of propertyStatuses" [value]="status">
                  {{ status | translateEnum:'propertyStatus' }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                City
              </label>
              <input
                type="text"
                formControlName="city"
                class="input input-bordered w-full"
                placeholder="Enter city name..."
              />
            </div>
          </div>

          <!-- Price Range -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Price Range
            </label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="number"
                formControlName="minPrice"
                class="input input-bordered w-full"
                placeholder="Min Price"
                min="0"
              />
              <input
                type="number"
                formControlName="maxPrice"
                class="input input-bordered w-full"
                placeholder="Max Price"
                min="0"
              />
            </div>
          </div>

          <!-- Living Area Range -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Living Area (sqm)
            </label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="number"
                formControlName="minLivingArea"
                class="input input-bordered w-full"
                placeholder="Min Area"
                min="0"
              />
              <input
                type="number"
                formControlName="maxLivingArea"
                class="input input-bordered w-full"
                placeholder="Max Area"
                min="0"
              />
            </div>
          </div>

          <!-- Room Range -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Number of Rooms
            </label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="number"
                formControlName="minRooms"
                class="input input-bordered w-full"
                placeholder="Min Rooms"
                min="0"
                step="0.5"
              />
              <input
                type="number"
                formControlName="maxRooms"
                class="input input-bordered w-full"
                placeholder="Max Rooms"
                min="0"
                step="0.5"
              />
            </div>
          </div>

          <!-- Features -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Features
            </label>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label class="flex items-center">
                <input type="checkbox" formControlName="hasElevator" class="checkbox checkbox-primary mr-2" />
                <span class="text-sm">Elevator</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" formControlName="hasBalcony" class="checkbox checkbox-primary mr-2" />
                <span class="text-sm">Balcony</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" formControlName="hasGarden" class="checkbox checkbox-primary mr-2" />
                <span class="text-sm">Garden</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" formControlName="hasParking" class="checkbox checkbox-primary mr-2" />
                <span class="text-sm">Parking</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" formControlName="petsAllowed" class="checkbox checkbox-primary mr-2" />
                <span class="text-sm">Pets Allowed</span>
              </label>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-4">
            <button type="submit" class="btn btn-primary" [disabled]="isLoading">
              <span *ngIf="isLoading" class="loading loading-spinner"></span>
              Search Properties
            </button>
            <button type="button" (click)="onReset()" class="btn btn-ghost">
              Reset Filters
            </button>
            <a routerLink="/properties" class="btn btn-ghost">
              Back to List
            </a>
          </div>
        </form>
      </div>

      <!-- Search Results -->
      <div *ngIf="searchPerformed" class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Search Results ({{ totalElements }} properties)
          </h2>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="text-center py-12">
          <div class="loading loading-spinner loading-lg"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">Searching properties...</p>
        </div>

        <!-- No Results -->
        <div *ngIf="!isLoading && properties.length === 0" class="text-center py-12">
          <p class="text-gray-600 dark:text-gray-400">No properties found matching your criteria.</p>
        </div>

        <!-- Results Grid -->
        <div *ngIf="!isLoading && properties.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div *ngFor="let property of properties" class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
            <figure class="h-48">
              <img [src]="getPrimaryImage(property)" [alt]="property.title" class="w-full h-full object-cover" />
            </figure>
            <div class="card-body">
              <h3 class="card-title text-lg">{{ property.title }}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">{{ property.addressCity }}</p>
              <div class="flex gap-2 my-2">
                <span class="badge badge-sm" [ngClass]="getListingTypeBadgeClass(property.listingType)">
                  {{ property.listingType | translateEnum:'listingType' }}
                </span>
                <span class="badge badge-sm" [ngClass]="getStatusBadgeClass(property.status)">
                  {{ (property.status || propertyStatuses[0]) | translateEnum:'propertyStatus' }}
                </span>
              </div>
              <div class="flex justify-between items-center text-sm">
                <span>{{ property.rooms }} rooms</span>
                <span>{{ property.livingAreaSqm }} m²</span>
              </div>
              <div class="card-actions justify-between items-center mt-4">
                <span class="text-xl font-bold text-primary">
                  {{ propertyService.formatPrice(property.price, property.listingType) }}
                </span>
                <a [routerLink]="['/properties', property.id]" class="btn btn-primary btn-sm">
                  View Details
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div *ngIf="!isLoading && totalPages > 1" class="flex justify-center mt-6">
          <div class="join">
            <button class="join-item btn" (click)="previousPage()" [disabled]="currentPage === 0">«</button>
            <button
              *ngFor="let page of getPageNumbers()"
              class="join-item btn"
              [class.btn-active]="page === currentPage"
              (click)="goToPage(page)"
            >
              {{ page + 1 }}
            </button>
            <button class="join-item btn" (click)="nextPage()" [disabled]="currentPage >= totalPages - 1">»</button>
          </div>
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

  getPrimaryImage(property: Property): string {
    if (property.images && property.images.length > 0) {
      const primaryImage = property.images.find(img => img.isPrimary);
      return primaryImage?.imageUrl || property.images[0]?.imageUrl || '/assets/placeholder-property.jpg';
    }
    return '/assets/placeholder-property.jpg';
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
}
