import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ClientService } from '../../services/client.service';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  template: `
    <div class="p-6">
      <h1 class="text-xl font-semibold text-gray-900 mb-6">{{ isEditMode ? ('clients.edit' | translate) : ('clients.add' | translate) }}</h1>

      <div class="max-w-2xl">
        <form [formGroup]="clientForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label for="firstName" class="form-label">{{ 'clients.firstName' | translate }} *</label>
              <input
                type="text"
                id="firstName"
                formControlName="firstName"
                class="form-input"
                [placeholder]="'clients.firstNamePlaceholder' | translate">
              <div *ngIf="clientForm.get('firstName')?.invalid && clientForm.get('firstName')?.touched" class="form-error">
                {{ 'clients.firstNameRequired' | translate }}
              </div>
            </div>

            <div>
              <label for="lastName" class="form-label">{{ 'clients.lastName' | translate }} *</label>
              <input
                type="text"
                id="lastName"
                formControlName="lastName"
                class="form-input"
                [placeholder]="'clients.lastNamePlaceholder' | translate">
              <div *ngIf="clientForm.get('lastName')?.invalid && clientForm.get('lastName')?.touched" class="form-error">
                {{ 'clients.lastNameRequired' | translate }}
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label for="email" class="form-label">{{ 'clients.email' | translate }}</label>
              <input
                type="email"
                id="email"
                formControlName="email"
                class="form-input"
                [placeholder]="'clients.emailPlaceholder' | translate">
              <div *ngIf="clientForm.get('email')?.invalid && clientForm.get('email')?.touched" class="form-error">
                {{ 'clients.emailInvalid' | translate }}
              </div>
            </div>

            <div>
              <label for="phone" class="form-label">{{ 'clients.phone' | translate }}</label>
              <input
                type="tel"
                id="phone"
                formControlName="phone"
                class="form-input"
                [placeholder]="'clients.phonePlaceholder' | translate">
            </div>
          </div>

          <div>
            <label for="addressStreet" class="form-label">{{ 'clients.street' | translate }}</label>
            <input
              type="text"
              id="addressStreet"
              formControlName="addressStreet"
              class="form-input"
              [placeholder]="'clients.streetPlaceholder' | translate">
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label for="addressCity" class="form-label">{{ 'clients.city' | translate }}</label>
              <input
                type="text"
                id="addressCity"
                formControlName="addressCity"
                class="form-input"
                [placeholder]="'clients.cityPlaceholder' | translate">
            </div>

            <div>
              <label for="addressPostalCode" class="form-label">{{ 'clients.postalCode' | translate }}</label>
              <input
                type="text"
                id="addressPostalCode"
                formControlName="addressPostalCode"
                class="form-input"
                [placeholder]="'clients.postalCodePlaceholder' | translate">
              <div *ngIf="clientForm.get('addressPostalCode')?.invalid && clientForm.get('addressPostalCode')?.touched" class="form-error">
                {{ 'clients.postalCodeInvalid' | translate }}
              </div>
            </div>

            <div>
              <label for="addressCountry" class="form-label">{{ 'clients.country' | translate }}</label>
              <input
                type="text"
                id="addressCountry"
                formControlName="addressCountry"
                class="form-input"
                [value]="'clients.countryDefault' | translate">
            </div>
          </div>

          <div>
            <div class="flex items-center">
              <input
                id="gdprConsent"
                type="checkbox"
                formControlName="gdprConsentGiven"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded">
              <label for="gdprConsent" class="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                {{ 'clients.gdprConsentText' | translate }}
              </label>
            </div>
            <div *ngIf="clientForm.get('gdprConsentGiven')?.invalid && clientForm.get('gdprConsentGiven')?.touched" class="form-error">
              {{ 'clients.gdprConsentRequired' | translate }}
            </div>
          </div>

          <!-- Property Search Criteria Section -->
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg" [formGroup]="searchCriteriaGroup">
            <button
              type="button"
              (click)="toggleSearchCriteria()"
              class="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <span class="text-base font-medium text-gray-900 dark:text-gray-100">
                {{ 'clients.propertySearchCriteria' | translate }}
              </span>
              <svg
                class="w-5 h-5 text-gray-500 transition-transform"
                [class.rotate-180]="searchCriteriaExpanded"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>

            <div *ngIf="searchCriteriaExpanded" class="p-4 pt-0 space-y-6 border-t border-gray-200 dark:border-gray-700">
              <!-- Size Range -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="minSquareMeters" class="form-label">{{ 'clients.searchCriteria.minSquareMeters' | translate }}</label>
                  <input
                    type="number"
                    id="minSquareMeters"
                    formControlName="minSquareMeters"
                    min="0"
                    class="form-input"
                    [placeholder]="'clients.searchCriteria.minSquareMetersPlaceholder' | translate">
                </div>
                <div>
                  <label for="maxSquareMeters" class="form-label">{{ 'clients.searchCriteria.maxSquareMeters' | translate }}</label>
                  <input
                    type="number"
                    id="maxSquareMeters"
                    formControlName="maxSquareMeters"
                    min="0"
                    class="form-input"
                    [placeholder]="'clients.searchCriteria.maxSquareMetersPlaceholder' | translate">
                </div>
              </div>
              <div *ngIf="searchCriteriaGroup.hasError('squareMetersRange')" class="form-error -mt-4">
                {{ 'clients.searchCriteria.minMaxError' | translate }}
              </div>

              <!-- Rooms Range -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="minRooms" class="form-label">{{ 'clients.searchCriteria.minRooms' | translate }}</label>
                  <input
                    type="number"
                    id="minRooms"
                    formControlName="minRooms"
                    min="0"
                    step="0.5"
                    class="form-input"
                    [placeholder]="'clients.searchCriteria.minRoomsPlaceholder' | translate">
                </div>
                <div>
                  <label for="maxRooms" class="form-label">{{ 'clients.searchCriteria.maxRooms' | translate }}</label>
                  <input
                    type="number"
                    id="maxRooms"
                    formControlName="maxRooms"
                    min="0"
                    step="0.5"
                    class="form-input"
                    [placeholder]="'clients.searchCriteria.maxRoomsPlaceholder' | translate">
                </div>
              </div>
              <div *ngIf="searchCriteriaGroup.hasError('roomsRange')" class="form-error -mt-4">
                {{ 'clients.searchCriteria.minMaxError' | translate }}
              </div>

              <!-- Budget Range -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="minBudget" class="form-label">{{ 'clients.searchCriteria.minBudget' | translate }}</label>
                  <div class="relative">
                    <input
                      type="number"
                      id="minBudget"
                      formControlName="minBudget"
                      min="0"
                      class="form-input pr-12"
                      [placeholder]="'clients.searchCriteria.minBudgetPlaceholder' | translate">
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">EUR</span>
                  </div>
                </div>
                <div>
                  <label for="maxBudget" class="form-label">{{ 'clients.searchCriteria.maxBudget' | translate }}</label>
                  <div class="relative">
                    <input
                      type="number"
                      id="maxBudget"
                      formControlName="maxBudget"
                      min="0"
                      class="form-input pr-12"
                      [placeholder]="'clients.searchCriteria.maxBudgetPlaceholder' | translate">
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">EUR</span>
                  </div>
                </div>
              </div>
              <div *ngIf="searchCriteriaGroup.hasError('budgetRange')" class="form-error -mt-4">
                {{ 'clients.searchCriteria.minMaxError' | translate }}
              </div>

              <!-- Preferred Locations -->
              <div>
                <label for="preferredLocations" class="form-label">{{ 'clients.searchCriteria.preferredLocations' | translate }}</label>
                <input
                  type="text"
                  id="preferredLocations"
                  formControlName="preferredLocations"
                  class="form-input"
                  [placeholder]="'clients.searchCriteria.preferredLocationsPlaceholder' | translate">
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ 'clients.searchCriteria.preferredLocationsHint' | translate }}</p>
              </div>

              <!-- Property Types -->
              <div>
                <label for="propertyTypes" class="form-label">{{ 'clients.searchCriteria.propertyTypes' | translate }}</label>
                <input
                  type="text"
                  id="propertyTypes"
                  formControlName="propertyTypes"
                  class="form-input"
                  [placeholder]="'clients.searchCriteria.propertyTypesPlaceholder' | translate">
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ 'clients.searchCriteria.propertyTypesHint' | translate }}</p>
              </div>

              <!-- Additional Requirements -->
              <div>
                <label for="additionalRequirements" class="form-label">{{ 'clients.searchCriteria.additionalRequirements' | translate }}</label>
                <textarea
                  id="additionalRequirements"
                  formControlName="additionalRequirements"
                  rows="4"
                  class="form-input"
                  [placeholder]="'clients.searchCriteria.additionalRequirementsPlaceholder' | translate"></textarea>
              </div>
            </div>
          </div>

          <div *ngIf="errorMessage" class="rounded-md bg-error-50 p-4">
            <div class="text-sm text-error-800">{{ errorMessage }}</div>
          </div>

          <div class="flex justify-end space-x-3">
            <button
              type="button"
              (click)="cancel()"
              class="btn btn-outline">
              {{ 'common.cancel' | translate }}
            </button>
            <button
              type="submit"
              [disabled]="!clientForm.valid || isLoading"
              class="btn btn-primary">
              {{ isLoading ? (isEditMode ? ('clients.updating' | translate) : ('clients.creating' | translate)) : (isEditMode ? ('clients.updateClient' | translate) : ('clients.createClient' | translate)) }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class ClientFormComponent implements OnInit {
  clientForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  isEditMode = false;
  clientId: string | null = null;

  searchCriteriaExpanded = false;

  constructor(
    private fb: FormBuilder,
    private clientService: ClientService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.clientForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.email]],
      phone: [''],
      addressStreet: [''],
      addressCity: [''],
      addressPostalCode: ['', [Validators.pattern('^[0-9]{5}$')]],
      addressCountry: ['Germany'],
      gdprConsentGiven: [false, [Validators.requiredTrue]],
      searchCriteria: this.fb.group({
        minSquareMeters: [null, [Validators.min(0)]],
        maxSquareMeters: [null, [Validators.min(0)]],
        minRooms: [null, [Validators.min(0)]],
        maxRooms: [null, [Validators.min(0)]],
        minBudget: [null, [Validators.min(0)]],
        maxBudget: [null, [Validators.min(0)]],
        preferredLocations: [''],
        propertyTypes: [''],
        additionalRequirements: ['']
      }, { validators: this.rangeValidator })
    });
  }

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.clientId;

    if (this.isEditMode && this.clientId) {
      this.loadClient(this.clientId);
      this.searchCriteriaExpanded = true; // Expand when editing
    }
  }

  loadClient(id: string): void {
    this.isLoading = true;
    this.clientService.getClient(id).subscribe({
      next: (client) => {
        this.clientForm.patchValue({
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          addressStreet: client.addressStreet,
          addressCity: client.addressCity,
          addressPostalCode: client.addressPostalCode,
          addressCountry: client.addressCountry,
          gdprConsentGiven: client.gdprConsentGiven,
          searchCriteria: {
            minSquareMeters: client.searchCriteria?.minSquareMeters || null,
            maxSquareMeters: client.searchCriteria?.maxSquareMeters || null,
            minRooms: client.searchCriteria?.minRooms || null,
            maxRooms: client.searchCriteria?.maxRooms || null,
            minBudget: client.searchCriteria?.minBudget || null,
            maxBudget: client.searchCriteria?.maxBudget || null,
            preferredLocations: client.searchCriteria?.preferredLocations?.join(', ') || '',
            propertyTypes: client.searchCriteria?.propertyTypes?.join(', ') || '',
            additionalRequirements: client.searchCriteria?.additionalRequirements || ''
          }
        });
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load client data. Please try again.';
      }
    });
  }

  onSubmit(): void {
    if (this.clientForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      const formValue = this.clientForm.value;
      const clientData = {
        ...formValue,
        searchCriteria: this.prepareSearchCriteria(formValue.searchCriteria)
      };

      if (this.isEditMode && this.clientId) {
        this.clientService.updateClient(this.clientId, clientData).subscribe({
          next: (client) => {
            this.isLoading = false;
            this.router.navigate(['/clients', client.id]);
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Failed to update client. Please try again.';
          }
        });
      } else {
        this.clientService.createClient(clientData).subscribe({
          next: (client) => {
            this.isLoading = false;
            this.router.navigate(['/clients', client.id]);
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Failed to create client. Please try again.';
          }
        });
      }
    }
  }

  private prepareSearchCriteria(criteria: any): any {
    if (!criteria) return null;

    // Convert comma-separated strings to arrays and handle empty values
    const preferredLocations = criteria.preferredLocations
      ? criteria.preferredLocations.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
      : [];

    const propertyTypes = criteria.propertyTypes
      ? criteria.propertyTypes.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
      : [];

    // Only include searchCriteria if at least one field is filled
    const hasAnyValue = criteria.minSquareMeters || criteria.maxSquareMeters ||
                        criteria.minRooms || criteria.maxRooms ||
                        criteria.minBudget || criteria.maxBudget ||
                        preferredLocations.length > 0 || propertyTypes.length > 0 ||
                        criteria.additionalRequirements;

    if (!hasAnyValue) return null;

    return {
      minSquareMeters: criteria.minSquareMeters || null,
      maxSquareMeters: criteria.maxSquareMeters || null,
      minRooms: criteria.minRooms || null,
      maxRooms: criteria.maxRooms || null,
      minBudget: criteria.minBudget || null,
      maxBudget: criteria.maxBudget || null,
      preferredLocations: preferredLocations.length > 0 ? preferredLocations : null,
      propertyTypes: propertyTypes.length > 0 ? propertyTypes : null,
      additionalRequirements: criteria.additionalRequirements || null
    };
  }

  rangeValidator(group: FormGroup): { [key: string]: any } | null {
    const minSquareMeters = group.get('minSquareMeters')?.value;
    const maxSquareMeters = group.get('maxSquareMeters')?.value;
    const minRooms = group.get('minRooms')?.value;
    const maxRooms = group.get('maxRooms')?.value;
    const minBudget = group.get('minBudget')?.value;
    const maxBudget = group.get('maxBudget')?.value;

    const errors: any = {};

    if (minSquareMeters && maxSquareMeters && minSquareMeters > maxSquareMeters) {
      errors.squareMetersRange = true;
    }

    if (minRooms && maxRooms && minRooms > maxRooms) {
      errors.roomsRange = true;
    }

    if (minBudget && maxBudget && minBudget > maxBudget) {
      errors.budgetRange = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  toggleSearchCriteria(): void {
    this.searchCriteriaExpanded = !this.searchCriteriaExpanded;
  }

  get searchCriteriaGroup() {
    return this.clientForm.get('searchCriteria') as FormGroup;
  }

  cancel(): void {
    this.router.navigate(['/clients']);
  }
}