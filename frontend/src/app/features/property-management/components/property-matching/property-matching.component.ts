import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { PropertyMatchingService } from '../../services/property-matching.service';
import { PropertyService } from '../../services/property.service';
import { PropertyMatchRequest, PropertyMatchResponse, PropertyMatchResult } from '../../models/property-match.model';

@Component({
  selector: 'app-property-matching',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule, TranslateModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Property-Client Matching</h1>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Find the best property matches for your clients
        </p>
      </div>

      <!-- Matching Form -->
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <form [formGroup]="matchingForm" (ngSubmit)="onMatch()">
          <!-- Match Mode Selection -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Matching Mode
            </label>
            <div class="flex gap-4">
              <label class="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="matchMode"
                  value="client"
                  [(ngModel)]="matchMode"
                  [ngModelOptions]="{standalone: true}"
                  class="radio radio-primary mr-2"
                />
                <span>Find Properties for Client</span>
              </label>
              <label class="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="matchMode"
                  value="property"
                  [(ngModel)]="matchMode"
                  [ngModelOptions]="{standalone: true}"
                  class="radio radio-primary mr-2"
                />
                <span>Find Clients for Property</span>
              </label>
            </div>
          </div>

          <!-- Client ID Input -->
          <div *ngIf="matchMode === 'client'" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Client ID
            </label>
            <input
              type="text"
              formControlName="clientId"
              class="input input-bordered w-full"
              placeholder="Enter client ID..."
            />
          </div>

          <!-- Property ID Input -->
          <div *ngIf="matchMode === 'property'" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Property ID
            </label>
            <input
              type="text"
              formControlName="propertyId"
              class="input input-bordered w-full"
              placeholder="Enter property ID..."
            />
          </div>

          <!-- Matching Parameters -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Match Threshold (0-100)
              </label>
              <input
                type="number"
                formControlName="matchThreshold"
                class="input input-bordered w-full"
                min="0"
                max="100"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Results
              </label>
              <input
                type="number"
                formControlName="maxResults"
                class="input input-bordered w-full"
                min="1"
                max="500"
              />
            </div>
          </div>

          <!-- Matching Options -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Matching Options
            </label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label class="flex items-center">
                <input
                  type="checkbox"
                  formControlName="exactLocationMatch"
                  class="checkbox checkbox-primary mr-2"
                />
                <span class="text-sm">Exact Location Match</span>
              </label>
              <label class="flex items-center">
                <input
                  type="checkbox"
                  formControlName="allowBudgetFlexibility"
                  class="checkbox checkbox-primary mr-2"
                />
                <span class="text-sm">Allow Budget Flexibility (+10%)</span>
              </label>
              <label class="flex items-center">
                <input
                  type="checkbox"
                  formControlName="allowFeatureFlexibility"
                  class="checkbox checkbox-primary mr-2"
                />
                <span class="text-sm">Allow Feature Flexibility</span>
              </label>
              <label class="flex items-center">
                <input
                  type="checkbox"
                  formControlName="includeContacted"
                  class="checkbox checkbox-primary mr-2"
                />
                <span class="text-sm">Include Already Contacted</span>
              </label>
            </div>
          </div>

          <!-- Weight Configuration (Advanced) -->
          <div class="mb-6">
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Matching Weights
              </label>
              <button
                type="button"
                (click)="showAdvanced = !showAdvanced"
                class="text-sm text-primary hover:underline"
              >
                {{ showAdvanced ? 'Hide' : 'Show' }} Advanced
              </button>
            </div>

            <div *ngIf="showAdvanced" class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded">
              <div>
                <label class="text-sm">Price Weight</label>
                <input type="number" formControlName="priceWeight" class="input input-sm w-full" min="0" max="100" />
              </div>
              <div>
                <label class="text-sm">Location Weight</label>
                <input type="number" formControlName="locationWeight" class="input input-sm w-full" min="0" max="100" />
              </div>
              <div>
                <label class="text-sm">Area Weight</label>
                <input type="number" formControlName="areaWeight" class="input input-sm w-full" min="0" max="100" />
              </div>
              <div>
                <label class="text-sm">Room Weight</label>
                <input type="number" formControlName="roomWeight" class="input input-sm w-full" min="0" max="100" />
              </div>
              <div>
                <label class="text-sm">Feature Weight</label>
                <input type="number" formControlName="featureWeight" class="input input-sm w-full" min="0" max="100" />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-4">
            <button type="submit" class="btn btn-primary" [disabled]="isLoading || matchingForm.invalid">
              <span *ngIf="isLoading" class="loading loading-spinner"></span>
              Find Matches
            </button>
            <button type="button" (click)="onReset()" class="btn btn-ghost">
              Reset
            </button>
            <a routerLink="/properties" class="btn btn-ghost">
              Back to Properties
            </a>
          </div>
        </form>
      </div>

      <!-- Matching Results -->
      <div *ngIf="matchResponse" class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div class="flex justify-between items-center mb-4">
          <div>
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              Match Results
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Found {{ matchResponse.totalMatches }} matches (showing {{ matchResponse.returnedMatches }})
              • Execution time: {{ matchResponse.executionTimeMs }}ms
            </p>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="text-center py-12">
          <div class="loading loading-spinner loading-lg"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">Finding matches...</p>
        </div>

        <!-- No Results -->
        <div *ngIf="!isLoading && (!matchResponse.properties || matchResponse.properties.length === 0)" class="text-center py-12">
          <p class="text-gray-600 dark:text-gray-400">No matches found.</p>
        </div>

        <!-- Property Match Results -->
        <div *ngIf="!isLoading && matchResponse.properties && matchResponse.properties.length > 0" class="space-y-4">
          <div
            *ngFor="let match of matchResponse.properties"
            class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="text-lg font-semibold">{{ match.property.title }}</h3>
                  <span
                    class="badge badge-lg"
                    [ngClass]="matchingService.getMatchScoreColorClass(match.matchScore)"
                  >
                    {{ match.matchScore }}% Match
                  </span>
                </div>

                <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {{ match.property.addressCity }} • {{ match.property.rooms }} rooms • {{ match.property.livingAreaSqm }} m²
                </p>

                <div class="flex gap-2 mb-3">
                  <span class="badge badge-sm">
                    {{ propertyService.formatListingType(match.property.listingType, currentLanguage) }}
                  </span>
                  <span class="badge badge-sm">
                    {{ propertyService.formatPropertyType(match.property.propertyType, currentLanguage) }}
                  </span>
                </div>

                <!-- Match Reasons -->
                <div *ngIf="match.matchReasons && match.matchReasons.length > 0" class="mb-2">
                  <p class="text-sm font-medium text-green-700 dark:text-green-400">Why it matches:</p>
                  <ul class="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                    <li *ngFor="let reason of match.matchReasons">{{ reason }}</li>
                  </ul>
                </div>

                <!-- Score Breakdown -->
                <div *ngIf="match.scoreBreakdown" class="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                  <div class="text-center p-2 bg-gray-100 dark:bg-gray-900 rounded">
                    <div class="font-semibold">Price</div>
                    <div>{{ match.scoreBreakdown.priceScore }}%</div>
                  </div>
                  <div class="text-center p-2 bg-gray-100 dark:bg-gray-900 rounded">
                    <div class="font-semibold">Location</div>
                    <div>{{ match.scoreBreakdown.locationScore }}%</div>
                  </div>
                  <div class="text-center p-2 bg-gray-100 dark:bg-gray-900 rounded">
                    <div class="font-semibold">Area</div>
                    <div>{{ match.scoreBreakdown.areaScore }}%</div>
                  </div>
                  <div class="text-center p-2 bg-gray-100 dark:bg-gray-900 rounded">
                    <div class="font-semibold">Rooms</div>
                    <div>{{ match.scoreBreakdown.roomScore }}%</div>
                  </div>
                  <div class="text-center p-2 bg-gray-100 dark:bg-gray-900 rounded">
                    <div class="font-semibold">Features</div>
                    <div>{{ match.scoreBreakdown.featureScore }}%</div>
                  </div>
                  <div class="text-center p-2 bg-gray-100 dark:bg-gray-900 rounded">
                    <div class="font-semibold">Type</div>
                    <div>{{ match.scoreBreakdown.typeScore }}%</div>
                  </div>
                </div>
              </div>

              <div class="flex flex-col gap-2 ml-4">
                <div class="text-right">
                  <div class="text-2xl font-bold text-primary">
                    {{ propertyService.formatPrice(match.property.price, match.property.listingType) }}
                  </div>
                </div>
                <a [routerLink]="['/properties', match.property.id]" class="btn btn-primary btn-sm">
                  View Details
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .radio:checked {
      background-color: var(--primary);
      border-color: var(--primary);
    }
  `]
})
export class PropertyMatchingComponent implements OnInit {
  matchingForm: FormGroup;
  matchMode: 'client' | 'property' = 'client';
  matchResponse: PropertyMatchResponse | null = null;
  isLoading = false;
  showAdvanced = false;
  currentLanguage = 'en';

  constructor(
    private fb: FormBuilder,
    public matchingService: PropertyMatchingService,
    public propertyService: PropertyService
  ) {
    const defaultRequest = this.matchingService.getDefaultMatchRequest();

    this.matchingForm = this.fb.group({
      clientId: [''],
      propertyId: [''],
      matchThreshold: [defaultRequest.matchThreshold],
      maxResults: [defaultRequest.maxResults],
      exactLocationMatch: [defaultRequest.exactLocationMatch],
      allowBudgetFlexibility: [defaultRequest.allowBudgetFlexibility],
      allowFeatureFlexibility: [defaultRequest.allowFeatureFlexibility],
      includeContacted: [defaultRequest.includeContacted],
      priceWeight: [defaultRequest.priceWeight],
      locationWeight: [defaultRequest.locationWeight],
      areaWeight: [defaultRequest.areaWeight],
      roomWeight: [defaultRequest.roomWeight],
      featureWeight: [defaultRequest.featureWeight]
    });
  }

  ngOnInit(): void {
    // Component initialization
  }

  onMatch(): void {
    if (this.matchingForm.invalid) {
      return;
    }

    this.isLoading = true;
    const formValue = this.matchingForm.value;

    const request: PropertyMatchRequest = {
      matchThreshold: formValue.matchThreshold,
      maxResults: formValue.maxResults,
      exactLocationMatch: formValue.exactLocationMatch,
      allowBudgetFlexibility: formValue.allowBudgetFlexibility,
      allowFeatureFlexibility: formValue.allowFeatureFlexibility,
      includeContacted: formValue.includeContacted,
      priceWeight: formValue.priceWeight,
      locationWeight: formValue.locationWeight,
      areaWeight: formValue.areaWeight,
      roomWeight: formValue.roomWeight,
      featureWeight: formValue.featureWeight,
      sortBy: 'matchScore',
      sortDirection: 'DESC'
    };

    if (this.matchMode === 'client') {
      request.clientId = formValue.clientId;
      this.matchingService.findMatchingPropertiesForClient(formValue.clientId, request).subscribe({
        next: (response) => {
          this.matchResponse = response;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error finding matches:', error);
          this.isLoading = false;
        }
      });
    } else {
      request.propertyId = formValue.propertyId;
      this.matchingService.findMatchingClientsForProperty(formValue.propertyId, request).subscribe({
        next: (response) => {
          this.matchResponse = response;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error finding matches:', error);
          this.isLoading = false;
        }
      });
    }
  }

  onReset(): void {
    const defaultRequest = this.matchingService.getDefaultMatchRequest();
    this.matchingForm.reset({
      matchThreshold: defaultRequest.matchThreshold,
      maxResults: defaultRequest.maxResults,
      exactLocationMatch: defaultRequest.exactLocationMatch,
      allowBudgetFlexibility: defaultRequest.allowBudgetFlexibility,
      allowFeatureFlexibility: defaultRequest.allowFeatureFlexibility,
      includeContacted: defaultRequest.includeContacted,
      priceWeight: defaultRequest.priceWeight,
      locationWeight: defaultRequest.locationWeight,
      areaWeight: defaultRequest.areaWeight,
      roomWeight: defaultRequest.roomWeight,
      featureWeight: defaultRequest.featureWeight
    });
    this.matchResponse = null;
  }
}
