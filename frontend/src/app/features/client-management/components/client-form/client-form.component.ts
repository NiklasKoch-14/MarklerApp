import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ClientService, Client } from '../../services/client.service';
import { LocationPickerMapComponent, SecondaryMarker } from '../../../../shared/components/location-picker-map/location-picker-map.component';
import { PropertyType, PropertyService, Property } from '../../../property-management/services/property.service';
import { filterWithinRadius } from '../../../../shared/utils/geo.util';
import { TranslateEnumPipe } from '../../../../shared/pipes/translate-enum.pipe';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';

@Component({
  selector: 'app-client-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, RouterLink, LocationPickerMapComponent, TranslateEnumPipe],
  template: `
    <div>
      <div class="page-header">
        <div>
          <div class="page-subtitle">{{ 'navigation.clients' | translate }}</div>
          <h1 class="page-title">{{ isEditMode ? ('clients.edit' | translate) : ('clients.add' | translate) }}</h1>
          <p style="font-size:14px; color:var(--text-2); margin-top:4px;">
            {{ isEditMode ? ('clients.editSubtitle' | translate) : ('clients.addSubtitle' | translate) }}
          </p>
        </div>
      </div>

      <div class="form-layout">
        <form [formGroup]="clientForm" (ngSubmit)="onSubmit()" style="display:flex; flex-direction:column; gap:20px; min-width:0;">

            <!-- Kontaktdaten -->
            <div class="widget-card" id="section-contact">
              <div class="widget-header">
                <h3 class="widget-title">{{ 'clients.contactData' | translate }}</h3>
                <div style="position:relative; margin-left:auto;">
                  <button type="button" (click)="toggleHint('contact')"
                    style="width:22px; height:22px; border-radius:50%; border:1.5px solid var(--text-3); background:none; color:var(--text-3); font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; flex-shrink:0; transition:border-color 0.15s, color 0.15s;"
                    [style.border-color]="activeHint === 'contact' ? 'var(--primary)' : 'var(--text-3)'"
                    [style.color]="activeHint === 'contact' ? 'var(--primary)' : 'var(--text-3)'">?</button>
                  <div *ngIf="activeHint === 'contact'"
                    style="position:absolute; right:0; top:30px; background:var(--surface); border:1px solid var(--border); border-radius:10px; box-shadow:0 4px 16px rgba(20,40,45,0.12); padding:12px 14px; width:280px; z-index:100;">
                    <p style="margin:0; font-size:13px; color:var(--text-2); line-height:1.5;">{{ 'clients.hints.matching' | translate }}</p>
                  </div>
                </div>
              </div>
              <div style="padding:20px; display:flex; flex-direction:column; gap:16px;">
                <div class="form-grid-2">
                  <div>
                    <label class="form-label">{{ 'clients.firstName' | translate }} *</label>
                    <input type="text" formControlName="firstName" class="form-input"
                      [placeholder]="'clients.firstNamePlaceholder' | translate">
                    <div *ngIf="clientForm.get('firstName')?.invalid && clientForm.get('firstName')?.touched" class="form-error">
                      {{ 'clients.firstNameRequired' | translate }}
                    </div>
                  </div>
                  <div>
                    <label class="form-label">{{ 'clients.lastName' | translate }} *</label>
                    <input type="text" formControlName="lastName" class="form-input"
                      [placeholder]="'clients.lastNamePlaceholder' | translate">
                    <div *ngIf="clientForm.get('lastName')?.invalid && clientForm.get('lastName')?.touched" class="form-error">
                      {{ 'clients.lastNameRequired' | translate }}
                    </div>
                  </div>
                </div>
                <div class="form-grid-2">
                  <div>
                    <label class="form-label">{{ 'clients.email' | translate }}</label>
                    <input type="email" formControlName="email" class="form-input"
                      [placeholder]="'clients.emailPlaceholder' | translate">
                    <div *ngIf="clientForm.get('email')?.invalid && clientForm.get('email')?.touched" class="form-error">
                      {{ 'clients.emailInvalid' | translate }}
                    </div>
                  </div>
                  <div>
                    <label class="form-label">{{ 'clients.phone' | translate }}</label>
                    <input type="tel" formControlName="phone" class="form-input"
                      [placeholder]="'clients.phonePlaceholder' | translate">
                  </div>
                </div>

                <!-- Dubletten-Warnung: nicht blockierend, direkt bei den Feldern die sie ausgelöst haben -->
                <div *ngIf="duplicateWarnings.length > 0"
                     style="background:var(--color-warning-soft); border:1px solid var(--color-warning); border-radius:10px; padding:12px 14px; display:flex; gap:10px; align-items:flex-start;">
                  <i class="ri-alert-line" style="font-size:16px; color:var(--color-warning); flex-shrink:0; margin-top:1px;"></i>
                  <div style="flex:1;">
                    <div style="font-size:13px; font-weight:600; color:var(--text); margin-bottom:4px;">
                      {{ 'clients.duplicateWarningTitle' | translate }}
                    </div>
                    <div *ngFor="let d of duplicateWarnings" style="font-size:13px; color:var(--text-2); margin-bottom:2px;">
                      <a [routerLink]="['/clients', d.id]" target="_blank" style="color:var(--primary); font-weight:600; text-decoration:none;">
                        {{ d.firstName }} {{ d.lastName }}
                      </a>
                      <span *ngIf="d.phone"> · {{ d.phone }}</span>
                      <span *ngIf="d.email"> · {{ d.email }}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label class="form-label">{{ 'clients.street' | translate }}</label>
                  <input type="text" formControlName="addressStreet" class="form-input"
                    [placeholder]="'clients.streetPlaceholder' | translate">
                </div>
                <div class="form-grid-plz">
                  <div>
                    <label class="form-label">{{ 'clients.postalCode' | translate }}</label>
                    <input type="text" formControlName="addressPostalCode" class="form-input"
                      [placeholder]="'clients.postalCodePlaceholder' | translate">
                    <div *ngIf="clientForm.get('addressPostalCode')?.invalid && clientForm.get('addressPostalCode')?.touched" class="form-error">
                      {{ 'clients.postalCodeInvalid' | translate }}
                    </div>
                  </div>
                  <div>
                    <label class="form-label">{{ 'clients.city' | translate }}</label>
                    <input type="text" formControlName="addressCity" class="form-input"
                      [placeholder]="'clients.cityPlaceholder' | translate">
                  </div>
                  <div>
                    <label class="form-label">{{ 'clients.country' | translate }}</label>
                    <input type="text" formControlName="addressCountry" class="form-input">
                  </div>
                </div>
              </div>
            </div>

            <!-- Suchkriterien -->
            <div class="widget-card" id="section-search">
              <button type="button" (click)="toggleSearchCriteria()"
                style="width:100%; display:flex; align-items:center; gap:10px; padding:15px 18px; background:none; border:none; border-bottom:1px solid var(--border); cursor:pointer; text-align:left;">
                <h3 class="widget-title" style="margin:0; flex:1;">{{ 'clients.propertySearchCriteria' | translate }}</h3>
                <div style="position:relative;" (click)="$event.stopPropagation()">
                  <button type="button" (click)="toggleHint('search')"
                    style="width:22px; height:22px; border-radius:50%; border:1.5px solid var(--text-3); background:none; color:var(--text-3); font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; transition:border-color 0.15s, color 0.15s;"
                    [style.border-color]="activeHint === 'search' ? 'var(--primary)' : 'var(--text-3)'"
                    [style.color]="activeHint === 'search' ? 'var(--primary)' : 'var(--text-3)'">?</button>
                  <div *ngIf="activeHint === 'search'"
                    style="position:absolute; right:0; top:30px; background:var(--surface); border:1px solid var(--border); border-radius:10px; box-shadow:0 4px 16px rgba(20,40,45,0.12); padding:12px 14px; width:280px; z-index:100;">
                    <p style="margin:0; font-size:13px; color:var(--text-2); line-height:1.5;">{{ 'clients.hints.searchCriteria' | translate }}</p>
                  </div>
                </div>
                <i [class]="'ri-arrow-' + (searchCriteriaExpanded ? 'up' : 'down') + '-s-line'"
                   style="font-size:16px; color:var(--text-3);"></i>
              </button>
              <div *ngIf="searchCriteriaExpanded" style="padding:20px 20px 0; display:flex; flex-direction:column; gap:16px;">
                <div>
                  <label class="form-label">{{ 'clients.clientType' | translate }}</label>
                  <select [formControl]="clientTypeControl" class="form-select">
                    <option value="BUYER">{{ 'clients.clientTypeBuyer' | translate }}</option>
                    <option value="RENTER">{{ 'clients.clientTypeRenter' | translate }}</option>
                    <option value="SELLER">{{ 'clients.clientTypeSeller' | translate }}</option>
                  </select>
                  <p style="margin-top:5px; font-size:12px; color:var(--text-3);">{{ 'clients.clientTypeHint' | translate }}</p>
                </div>
              </div>
              <div *ngIf="searchCriteriaExpanded" [formGroup]="searchCriteriaGroup"
                   style="padding:0 20px 20px; display:flex; flex-direction:column; gap:16px;">
                <div class="form-grid-2">
                  <div>
                    <label class="form-label">{{ 'clients.searchCriteria.minSquareMeters' | translate }}</label>
                    <input type="number" formControlName="minSquareMeters" min="0" class="form-input"
                      [placeholder]="'clients.searchCriteria.minSquareMetersPlaceholder' | translate">
                  </div>
                  <div>
                    <label class="form-label">{{ 'clients.searchCriteria.maxSquareMeters' | translate }}</label>
                    <input type="number" formControlName="maxSquareMeters" min="0" class="form-input"
                      [placeholder]="'clients.searchCriteria.maxSquareMetersPlaceholder' | translate">
                  </div>
                </div>
                <div *ngIf="searchCriteriaGroup.hasError('squareMetersRange')" class="form-error">
                  {{ 'clients.searchCriteria.minMaxError' | translate }}
                </div>
                <div class="form-grid-2">
                  <div>
                    <label class="form-label">{{ 'clients.searchCriteria.minRooms' | translate }}</label>
                    <input type="number" formControlName="minRooms" min="0" step="0.5" class="form-input"
                      [placeholder]="'clients.searchCriteria.minRoomsPlaceholder' | translate">
                  </div>
                  <div>
                    <label class="form-label">{{ 'clients.searchCriteria.maxRooms' | translate }}</label>
                    <input type="number" formControlName="maxRooms" min="0" step="0.5" class="form-input"
                      [placeholder]="'clients.searchCriteria.maxRoomsPlaceholder' | translate">
                  </div>
                </div>
                <div *ngIf="searchCriteriaGroup.hasError('roomsRange')" class="form-error">
                  {{ 'clients.searchCriteria.minMaxError' | translate }}
                </div>
                <ng-container *ngIf="!isRenter">
                  <div class="form-grid-2">
                    <div>
                      <label class="form-label">{{ 'clients.searchCriteria.minBudget' | translate }}</label>
                      <div style="position:relative;">
                        <input type="number" formControlName="minBudget" min="0" class="form-input" style="padding-right:46px;"
                          [placeholder]="'clients.searchCriteria.minBudgetPlaceholder' | translate">
                        <span style="position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:13px; font-weight:600; color:var(--text-3);">EUR</span>
                      </div>
                    </div>
                    <div>
                      <label class="form-label">{{ 'clients.searchCriteria.maxBudget' | translate }}</label>
                      <div style="position:relative;">
                        <input type="number" formControlName="maxBudget" min="0" class="form-input" style="padding-right:46px;"
                          [placeholder]="'clients.searchCriteria.maxBudgetPlaceholder' | translate">
                        <span style="position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:13px; font-weight:600; color:var(--text-3);">EUR</span>
                      </div>
                    </div>
                  </div>
                  <div *ngIf="searchCriteriaGroup.hasError('budgetRange')" class="form-error">
                    {{ 'clients.searchCriteria.minMaxError' | translate }}
                  </div>
                </ng-container>
                <ng-container *ngIf="isRenter">
                  <div class="form-grid-2">
                    <div>
                      <label class="form-label">{{ 'clients.searchCriteria.minColdRent' | translate }}</label>
                      <div style="position:relative;">
                        <input type="number" formControlName="minColdRent" min="0" class="form-input" style="padding-right:46px;"
                          [placeholder]="'clients.searchCriteria.minColdRentPlaceholder' | translate">
                        <span style="position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:13px; font-weight:600; color:var(--text-3);">EUR</span>
                      </div>
                    </div>
                    <div>
                      <label class="form-label">{{ 'clients.searchCriteria.maxColdRent' | translate }}</label>
                      <div style="position:relative;">
                        <input type="number" formControlName="maxColdRent" min="0" class="form-input" style="padding-right:46px;"
                          [placeholder]="'clients.searchCriteria.maxColdRentPlaceholder' | translate">
                        <span style="position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:13px; font-weight:600; color:var(--text-3);">EUR</span>
                      </div>
                    </div>
                  </div>
                  <div *ngIf="searchCriteriaGroup.hasError('coldRentRange')" class="form-error">
                    {{ 'clients.searchCriteria.minMaxError' | translate }}
                  </div>
                  <div class="form-grid-2">
                    <div>
                      <label class="form-label">{{ 'clients.searchCriteria.minWarmRent' | translate }}</label>
                      <div style="position:relative;">
                        <input type="number" formControlName="minWarmRent" min="0" class="form-input" style="padding-right:46px;"
                          [placeholder]="'clients.searchCriteria.minWarmRentPlaceholder' | translate">
                        <span style="position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:13px; font-weight:600; color:var(--text-3);">EUR</span>
                      </div>
                    </div>
                    <div>
                      <label class="form-label">{{ 'clients.searchCriteria.maxWarmRent' | translate }}</label>
                      <div style="position:relative;">
                        <input type="number" formControlName="maxWarmRent" min="0" class="form-input" style="padding-right:46px;"
                          [placeholder]="'clients.searchCriteria.maxWarmRentPlaceholder' | translate">
                        <span style="position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:13px; font-weight:600; color:var(--text-3);">EUR</span>
                      </div>
                    </div>
                  </div>
                  <div *ngIf="searchCriteriaGroup.hasError('warmRentRange')" class="form-error">
                    {{ 'clients.searchCriteria.minMaxError' | translate }}
                  </div>
                </ng-container>
                <div>
                  <label class="form-label">{{ 'clients.searchCriteria.preferredLocations' | translate }}</label>
                  <app-location-picker-map
                    [latitude]="searchCriteriaGroup.get('latitude')?.value"
                    [longitude]="searchCriteriaGroup.get('longitude')?.value"
                    [radiusKm]="searchCriteriaGroup.get('searchRadiusKm')?.value || 10"
                    [secondaryMarkers]="radiusPropertyMarkers"
                    (locationChange)="onSearchLocationChange($event)"
                    (radiusChangeEvent)="onSearchRadiusChange($event)">
                  </app-location-picker-map>
                  <p *ngIf="radiusPropertyMarkers.length > 0" style="margin-top:6px; font-size:12px; color:var(--text-2);">
                    <i class="ri-map-pin-2-fill" style="color:#2563eb;"></i>
                    {{ 'location.propertiesInRadius' | translate:{ count: radiusPropertyMarkers.length } }}
                  </p>
                  <label style="display:flex; align-items:center; gap:8px; margin-top:10px; font-size:13px; color:var(--text-2); cursor:pointer;">
                    <input type="checkbox" formControlName="restrictToSearchRadius">
                    {{ 'clients.searchCriteria.restrictToRadius' | translate }}
                  </label>
                  <p style="margin-top:5px; font-size:12px; color:var(--text-3);">{{ 'clients.searchCriteria.restrictToRadiusHint' | translate }}</p>
                </div>
                <div>
                  <label class="form-label">{{ 'clients.searchCriteria.propertyTypes' | translate }}</label>
                  <div style="display:flex; flex-wrap:wrap; gap:7px;">
                    <button type="button" *ngFor="let pt of propertyTypeOptions"
                      (click)="togglePropertyType(pt)"
                      style="padding:6px 13px; border-radius:20px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; transition:background 0.12s, color 0.12s, border-color 0.12s;"
                      [style.background]="isPropertyTypeSelected(pt) ? 'var(--primary)' : 'var(--surface-2)'"
                      [style.color]="isPropertyTypeSelected(pt) ? '#fff' : 'var(--text-2)'"
                      [style.border]="isPropertyTypeSelected(pt) ? '1px solid var(--primary)' : '1px solid var(--border)'">
                      {{ pt | translateEnum:'propertyType' }}
                    </button>
                  </div>
                  <p style="margin-top:8px; font-size:12px; color:var(--text-3);">{{ 'clients.searchCriteria.propertyTypesHint' | translate }}</p>
                </div>
                <div>
                  <label class="form-label">{{ 'clients.searchCriteria.additionalRequirements' | translate }}</label>
                  <textarea formControlName="additionalRequirements" rows="4" class="form-textarea"
                    [placeholder]="'clients.searchCriteria.additionalRequirementsPlaceholder' | translate"></textarea>
                </div>
              </div>
            </div>

            <!-- DSGVO -->
            <div class="widget-card" id="section-gdpr">
              <div class="widget-header">
                <h3 class="widget-title">{{ 'clients.gdprSectionTitle' | translate }}</h3>
                <div style="position:relative; margin-left:auto;">
                  <button type="button" (click)="toggleHint('dsgvo')"
                    style="width:22px; height:22px; border-radius:50%; border:1.5px solid var(--text-3); background:none; color:var(--text-3); font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; transition:border-color 0.15s, color 0.15s;"
                    [style.border-color]="activeHint === 'dsgvo' ? 'var(--primary)' : 'var(--text-3)'"
                    [style.color]="activeHint === 'dsgvo' ? 'var(--primary)' : 'var(--text-3)'">?</button>
                  <div *ngIf="activeHint === 'dsgvo'"
                    style="position:absolute; right:0; top:30px; background:var(--surface); border:1px solid var(--border); border-radius:10px; box-shadow:0 4px 16px rgba(20,40,45,0.12); padding:12px 14px; width:280px; z-index:100;">
                    <p style="margin:0; font-size:13px; color:var(--text-2); line-height:1.5;">{{ 'clients.hints.gdpr' | translate }}</p>
                  </div>
                </div>
              </div>
              <div style="padding:20px; display:flex; flex-direction:column; gap:18px;">
                <div>
                  <label class="form-label">{{ 'clients.legalBasis.label' | translate }}</label>
                  <select formControlName="legalBasis" class="form-select">
                    <option value="CONTRACT_INITIATION">{{ 'clients.legalBasis.contractInitiation' | translate }}</option>
                    <option value="LEGITIMATE_INTEREST">{{ 'clients.legalBasis.legitimateInterest' | translate }}</option>
                  </select>
                  <p style="margin-top:5px; font-size:12px; color:var(--text-3);">{{ 'clients.legalBasis.hint' | translate }}</p>
                </div>
                <label style="display:flex; align-items:flex-start; gap:12px; cursor:pointer;">
                  <input type="checkbox" formControlName="gdprConsentGiven"
                    style="width:18px; height:18px; margin-top:2px; accent-color:var(--primary); cursor:pointer; flex-shrink:0;">
                  <span style="font-size:14px; color:var(--text); line-height:1.5;">{{ 'clients.gdprConsentText' | translate }}</span>
                </label>
              </div>
            </div>

            <!-- Error -->
            <div *ngIf="errorMessage" style="background:var(--color-error-soft); border:1px solid var(--color-error); border-radius:10px; padding:14px 16px;">
              <p style="margin:0; color:var(--color-error); font-size:14px; font-weight:500;">{{ errorMessage }}</p>
            </div>

            <!-- Actions -->
            <div style="display:flex; justify-content:flex-end; gap:10px; padding-bottom:32px;">
              <button type="button" (click)="cancel()" class="btn-secondary">
                {{ 'common.cancel' | translate }}
              </button>
              <button type="submit" [disabled]="!clientForm.valid || isLoading" class="btn-primary">
                {{ isLoading ? (isEditMode ? ('clients.updating' | translate) : ('clients.creating' | translate)) : (isEditMode ? ('clients.updateClient' | translate) : ('clients.createClient' | translate)) }}
              </button>
            </div>

        </form>

        <!-- Context rail: live summary + section jump-nav -->
        <aside class="form-aside">
          <div class="widget-card">
            <div class="widget-header">
              <i class="ri-user-3-line" style="font-size:16px; color:var(--text-3);"></i>
              <h3 class="widget-title">{{ 'common.overview' | translate }}</h3>
            </div>
            <div style="padding:20px; display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center;">
              <div class="form-summary-avatar">{{ initials }}</div>
              <div>
                <div style="font-size:15px; font-weight:700; color:var(--text);">{{ fullName || ('clients.newClientPlaceholder' | translate) }}</div>
                <div *ngIf="clientForm.get('addressCity')?.value" style="font-size:12px; color:var(--text-3); margin-top:2px;">
                  <i class="ri-map-pin-line"></i> {{ clientForm.get('addressCity')?.value }}
                </div>
              </div>
              <span style="display:inline-flex; align-items:center; padding:4px 10px; border-radius:20px; background:var(--accent-soft); color:var(--primary); font-size:12px; font-weight:600;">
                {{ clientTypeLabelKey | translate }}
              </span>
            </div>
          </div>

          <div class="widget-card">
            <div class="widget-header">
              <h3 class="widget-title">{{ 'common.sections' | translate }}</h3>
            </div>
            <nav class="form-nav-list">
              <button type="button" class="form-nav-item" [class.active]="activeSection === 'contact'" (click)="goToSection('contact')">
                <i class="ri-contacts-line"></i>{{ 'clients.contactData' | translate }}
              </button>
              <button type="button" class="form-nav-item" [class.active]="activeSection === 'search'" (click)="goToSection('search')">
                <i class="ri-search-2-line"></i>{{ 'clients.propertySearchCriteria' | translate }}
              </button>
              <button type="button" class="form-nav-item" [class.active]="activeSection === 'gdpr'" (click)="goToSection('gdpr')">
                <i class="ri-shield-check-line"></i>{{ 'clients.gdprSectionTitle' | translate }}
              </button>
            </nav>
          </div>
        </aside>
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
  activeHint: string | null = null;
  activeSection: 'contact' | 'search' | 'gdpr' = 'contact';
  duplicateWarnings: Client[] = [];

  private agentProperties: Property[] = [];
  radiusPropertyMarkers: SecondaryMarker[] = [];

  constructor(
    private fb: FormBuilder,
    private clientService: ClientService,
    private router: Router,
    private route: ActivatedRoute,
    private errorHandler: ErrorHandlerService,
    private propertyService: PropertyService
  ) {
    this.clientForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.email]],
      phone: [''],
      addressStreet: [''],
      addressCity: [''],
      addressPostalCode: ['', [Validators.pattern('^[0-9]{5}$')]],
      addressCountry: ['Deutschland'],
      clientType: ['BUYER'],
      legalBasis: ['CONTRACT_INITIATION', [Validators.required]],
      gdprConsentGiven: [false],
      searchCriteria: this.fb.group({
        minSquareMeters: [null, [Validators.min(0)]],
        maxSquareMeters: [null, [Validators.min(0)]],
        minRooms: [null, [Validators.min(0)]],
        maxRooms: [null, [Validators.min(0)]],
        minBudget: [null, [Validators.min(0)]],
        maxBudget: [null, [Validators.min(0)]],
        minColdRent: [null, [Validators.min(0)]],
        maxColdRent: [null, [Validators.min(0)]],
        minWarmRent: [null, [Validators.min(0)]],
        maxWarmRent: [null, [Validators.min(0)]],
        preferredLocations: [''],
        latitude: [null],
        longitude: [null],
        searchRadiusKm: [10],
        restrictToSearchRadius: [true],
        propertyTypes: [[] as string[]],
        additionalRequirements: ['']
      }, { validators: this.rangeValidator })
    });
  }

  readonly propertyTypeOptions = Object.values(PropertyType);

  get isRenter(): boolean {
    return this.clientForm.get('clientType')?.value === 'RENTER';
  }

  isPropertyTypeSelected(type: string): boolean {
    const current: string[] = this.searchCriteriaGroup.get('propertyTypes')?.value || [];
    return current.includes(type);
  }

  togglePropertyType(type: string): void {
    const control = this.searchCriteriaGroup.get('propertyTypes');
    const current: string[] = control?.value || [];
    const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
    control?.setValue(next);
  }

  get clientTypeControl() {
    return this.clientForm.get('clientType') as FormControl;
  }

  get fullName(): string {
    const firstName = this.clientForm.get('firstName')?.value?.trim() || '';
    const lastName = this.clientForm.get('lastName')?.value?.trim() || '';
    return `${firstName} ${lastName}`.trim();
  }

  get initials(): string {
    const firstName = this.clientForm.get('firstName')?.value?.trim() || '';
    const lastName = this.clientForm.get('lastName')?.value?.trim() || '';
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    return initials || '?';
  }

  get clientTypeLabelKey(): string {
    const type = (this.clientForm.get('clientType')?.value || 'BUYER') as string;
    const suffix = type.charAt(0) + type.slice(1).toLowerCase();
    return `clients.clientType${suffix}`;
  }

  /** Expand (if needed) and scroll to a form section from the context rail. */
  goToSection(section: 'contact' | 'search' | 'gdpr'): void {
    this.activeSection = section;
    if (section === 'search') {
      this.searchCriteriaExpanded = true;
    }
    setTimeout(() => {
      document.getElementById(`section-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.clientId;

    if (this.isEditMode && this.clientId) {
      this.loadClient(this.clientId);
      this.searchCriteriaExpanded = true;
    } else {
      this.watchForDuplicates();
    }

    // Größe 1000: ein Agent hat realistisch weit weniger Objekte; erspart Paging-Logik hier.
    this.propertyService.getProperties(0, 1000).subscribe({
      next: page => {
        this.agentProperties = page.content;
        this.updateRadiusPropertyMarkers();
      },
      error: () => {
        // Karte funktioniert ohne Immobilien-Pins weiter — Fehler hier nicht blockierend.
        this.agentProperties = [];
      }
    });
  }

  private updateRadiusPropertyMarkers(): void {
    const criteria = this.searchCriteriaGroup;
    const lat = criteria.get('latitude')?.value;
    const lng = criteria.get('longitude')?.value;
    const radiusKm = criteria.get('searchRadiusKm')?.value ?? 10;

    if (lat == null || lng == null) {
      this.radiusPropertyMarkers = [];
      return;
    }
    // Immer neues Array zuweisen, damit ngOnChanges der Map-Komponente feuert.
    this.radiusPropertyMarkers = filterWithinRadius(this.agentProperties, lat, lng, radiusKm)
      .map(p => ({ latitude: p.latitude!, longitude: p.longitude!, label: p.title }));
  }

  /** Non-blocking duplicate-lead check while a new client is being entered (create mode only). */
  private watchForDuplicates(): void {
    this.clientForm.get('lastName')!.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => this.checkForDuplicates());

    this.clientForm.get('phone')!.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => this.checkForDuplicates());
  }

  private checkForDuplicates(): void {
    const firstName = this.clientForm.get('firstName')?.value?.trim() || '';
    const lastName = this.clientForm.get('lastName')?.value?.trim() || '';
    const phone = this.clientForm.get('phone')?.value?.trim() || '';

    if (!(firstName && lastName) && !phone) {
      this.duplicateWarnings = [];
      return;
    }

    this.clientService.checkDuplicateClients(firstName, lastName, phone).subscribe(matches => {
      this.duplicateWarnings = matches;
    });
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
          clientType: client.clientType || 'BUYER',
          legalBasis: client.legalBasis || 'CONTRACT_INITIATION',
          gdprConsentGiven: client.gdprConsentGiven,
          searchCriteria: {
            minSquareMeters: client.searchCriteria?.minSquareMeters || null,
            maxSquareMeters: client.searchCriteria?.maxSquareMeters || null,
            minRooms: client.searchCriteria?.minRooms || null,
            maxRooms: client.searchCriteria?.maxRooms || null,
            minBudget: client.searchCriteria?.minBudget || null,
            maxBudget: client.searchCriteria?.maxBudget || null,
            minColdRent: client.searchCriteria?.minColdRent || null,
            maxColdRent: client.searchCriteria?.maxColdRent || null,
            minWarmRent: client.searchCriteria?.minWarmRent || null,
            maxWarmRent: client.searchCriteria?.maxWarmRent || null,
            preferredLocations: client.searchCriteria?.preferredLocations?.join(', ') || '',
            latitude: client.searchCriteria?.latitude ?? null,
            longitude: client.searchCriteria?.longitude ?? null,
            searchRadiusKm: client.searchCriteria?.searchRadiusKm ?? 10,
            restrictToSearchRadius: client.searchCriteria?.restrictToSearchRadius ?? true,
            propertyTypes: client.searchCriteria?.propertyTypes || [],
            additionalRequirements: client.searchCriteria?.additionalRequirements || ''
          }
        });
        this.updateRadiusPropertyMarkers();
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = this.errorHandler.getUserMessage(error);
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
            this.errorMessage = this.errorHandler.getUserMessage(error);
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
            this.errorMessage = this.errorHandler.getUserMessage(error);
          }
        });
      }
    }
  }

  private prepareSearchCriteria(criteria: any): any {
    if (!criteria) return null;

    const preferredLocations = criteria.preferredLocations
      ? criteria.preferredLocations.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
      : [];

    const propertyTypes: string[] = Array.isArray(criteria.propertyTypes) ? criteria.propertyTypes : [];

    const hasAnyValue = criteria.minSquareMeters || criteria.maxSquareMeters ||
                        criteria.minRooms || criteria.maxRooms ||
                        criteria.minBudget || criteria.maxBudget ||
                        criteria.minColdRent || criteria.maxColdRent ||
                        criteria.minWarmRent || criteria.maxWarmRent ||
                        preferredLocations.length > 0 || propertyTypes.length > 0 ||
                        criteria.additionalRequirements ||
                        (criteria.latitude != null && criteria.longitude != null);

    if (!hasAnyValue) return null;

    return {
      minSquareMeters: criteria.minSquareMeters || null,
      maxSquareMeters: criteria.maxSquareMeters || null,
      minRooms: criteria.minRooms || null,
      maxRooms: criteria.maxRooms || null,
      minBudget: criteria.minBudget || null,
      maxBudget: criteria.maxBudget || null,
      minColdRent: criteria.minColdRent || null,
      maxColdRent: criteria.maxColdRent || null,
      minWarmRent: criteria.minWarmRent || null,
      maxWarmRent: criteria.maxWarmRent || null,
      preferredLocations: preferredLocations.length > 0 ? preferredLocations : null,
      latitude: criteria.latitude ?? null,
      longitude: criteria.longitude ?? null,
      searchRadiusKm: criteria.latitude != null ? (criteria.searchRadiusKm ?? 10) : null,
      restrictToSearchRadius: criteria.restrictToSearchRadius ?? true,
      propertyTypes: propertyTypes.length > 0 ? propertyTypes : null,
      additionalRequirements: criteria.additionalRequirements || null
    };
  }

  onSearchLocationChange(location: { latitude: number; longitude: number }): void {
    this.searchCriteriaGroup.patchValue(location);
    this.updateRadiusPropertyMarkers();
  }

  onSearchRadiusChange(radiusKm: number): void {
    this.searchCriteriaGroup.patchValue({ searchRadiusKm: radiusKm });
    this.updateRadiusPropertyMarkers();
  }

  rangeValidator(group: FormGroup): { [key: string]: any } | null {
    const minSquareMeters = group.get('minSquareMeters')?.value;
    const maxSquareMeters = group.get('maxSquareMeters')?.value;
    const minRooms = group.get('minRooms')?.value;
    const maxRooms = group.get('maxRooms')?.value;
    const minBudget = group.get('minBudget')?.value;
    const maxBudget = group.get('maxBudget')?.value;
    const minColdRent = group.get('minColdRent')?.value;
    const maxColdRent = group.get('maxColdRent')?.value;
    const minWarmRent = group.get('minWarmRent')?.value;
    const maxWarmRent = group.get('maxWarmRent')?.value;

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
    if (minColdRent && maxColdRent && minColdRent > maxColdRent) {
      errors.coldRentRange = true;
    }
    if (minWarmRent && maxWarmRent && minWarmRent > maxWarmRent) {
      errors.warmRentRange = true;
    }

    return Object.keys(errors).length > 0 ? errors : null;
  }

  toggleSearchCriteria(): void {
    this.searchCriteriaExpanded = !this.searchCriteriaExpanded;
  }

  toggleHint(key: string): void {
    this.activeHint = this.activeHint === key ? null : key;
  }

  get searchCriteriaGroup() {
    return this.clientForm.get('searchCriteria') as FormGroup;
  }

  cancel(): void {
    this.router.navigate(['/clients']);
  }
}
