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
    <div>
      <div class="page-header">
        <div>
          <div class="page-subtitle">{{ 'navigation.clients' | translate }}</div>
          <h1 class="page-title">{{ isEditMode ? ('clients.edit' | translate) : ('clients.add' | translate) }}</h1>
        </div>
      </div>

      <form [formGroup]="clientForm" (ngSubmit)="onSubmit()">
        <div style="display:flex; gap:24px; align-items:flex-start;">

          <!-- Left: form sections -->
          <div style="flex:2; min-width:0; display:flex; flex-direction:column; gap:20px;">

            <!-- Kontaktdaten -->
            <div class="widget-card">
              <div class="widget-header">
                <i class="ph-fill ph-user" style="font-size:18px; color:var(--primary);"></i>
                <h3 class="widget-title">{{ 'clients.contactData' | translate }}</h3>
              </div>
              <div style="padding:20px; display:flex; flex-direction:column; gap:16px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
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
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
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
                <div>
                  <label class="form-label">{{ 'clients.street' | translate }}</label>
                  <input type="text" formControlName="addressStreet" class="form-input"
                    [placeholder]="'clients.streetPlaceholder' | translate">
                </div>
                <div style="display:grid; grid-template-columns:120px 1fr 1fr; gap:16px;">
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
            <div class="widget-card">
              <button type="button" (click)="toggleSearchCriteria()"
                style="width:100%; display:flex; align-items:center; gap:10px; padding:15px 18px; background:none; border:none; border-bottom:1px solid var(--border); cursor:pointer; text-align:left;">
                <i class="ph-fill ph-magnifying-glass" style="font-size:18px; color:var(--primary);"></i>
                <h3 class="widget-title" style="margin:0; flex:1;">{{ 'clients.propertySearchCriteria' | translate }}</h3>
                <i [class]="'ph ph-caret-' + (searchCriteriaExpanded ? 'up' : 'down')"
                   style="font-size:16px; color:var(--text-3);"></i>
              </button>
              <div *ngIf="searchCriteriaExpanded" [formGroup]="searchCriteriaGroup"
                   style="padding:20px; display:flex; flex-direction:column; gap:16px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
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
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
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
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
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
                <div>
                  <label class="form-label">{{ 'clients.searchCriteria.preferredLocations' | translate }}</label>
                  <input type="text" formControlName="preferredLocations" class="form-input"
                    [placeholder]="'clients.searchCriteria.preferredLocationsPlaceholder' | translate">
                  <p style="margin-top:5px; font-size:12px; color:var(--text-3);">{{ 'clients.searchCriteria.preferredLocationsHint' | translate }}</p>
                </div>
                <div>
                  <label class="form-label">{{ 'clients.searchCriteria.propertyTypes' | translate }}</label>
                  <input type="text" formControlName="propertyTypes" class="form-input"
                    [placeholder]="'clients.searchCriteria.propertyTypesPlaceholder' | translate">
                  <p style="margin-top:5px; font-size:12px; color:var(--text-3);">{{ 'clients.searchCriteria.propertyTypesHint' | translate }}</p>
                </div>
                <div>
                  <label class="form-label">{{ 'clients.searchCriteria.additionalRequirements' | translate }}</label>
                  <textarea formControlName="additionalRequirements" rows="4" class="form-textarea"
                    [placeholder]="'clients.searchCriteria.additionalRequirementsPlaceholder' | translate"></textarea>
                </div>
              </div>
            </div>

            <!-- DSGVO -->
            <div class="widget-card">
              <div class="widget-header">
                <i class="ph-fill ph-shield-check" style="font-size:18px; color:var(--primary);"></i>
                <h3 class="widget-title">DSGVO</h3>
              </div>
              <div style="padding:20px;">
                <label style="display:flex; align-items:flex-start; gap:12px; cursor:pointer;">
                  <input type="checkbox" formControlName="gdprConsentGiven"
                    style="width:18px; height:18px; margin-top:2px; accent-color:var(--primary); cursor:pointer; flex-shrink:0;">
                  <span style="font-size:14px; color:var(--text); line-height:1.5;">{{ 'clients.gdprConsentText' | translate }}</span>
                </label>
                <div *ngIf="clientForm.get('gdprConsentGiven')?.invalid && clientForm.get('gdprConsentGiven')?.touched" class="form-error" style="margin-top:8px;">
                  {{ 'clients.gdprConsentRequired' | translate }}
                </div>
              </div>
            </div>

            <!-- Error -->
            <div *ngIf="errorMessage" style="background:#fef2f5; border:1px solid #f5c2cc; border-radius:10px; padding:14px 16px;">
              <p style="margin:0; color:#b23a55; font-size:14px; font-weight:500;">{{ errorMessage }}</p>
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

          </div>

          <!-- Right: hints -->
          <div style="width:300px; flex-shrink:0;">
            <div class="widget-card" style="position:sticky; top:20px;">
              <div class="widget-header">
                <i class="ph-fill ph-lightbulb" style="font-size:18px; color:#c07a1e;"></i>
                <h3 class="widget-title">{{ 'clients.hints.title' | translate }}</h3>
              </div>
              <div style="padding:18px; display:flex; flex-direction:column; gap:14px;">
                <div style="display:flex; gap:10px; align-items:flex-start;">
                  <i class="ph ph-check-circle" style="color:#1f8a5b; font-size:18px; flex-shrink:0; margin-top:1px;"></i>
                  <p style="margin:0; font-size:13px; color:var(--text-2); line-height:1.5;">{{ 'clients.hints.gdpr' | translate }}</p>
                </div>
                <div style="display:flex; gap:10px; align-items:flex-start;">
                  <i class="ph ph-check-circle" style="color:#1f8a5b; font-size:18px; flex-shrink:0; margin-top:1px;"></i>
                  <p style="margin:0; font-size:13px; color:var(--text-2); line-height:1.5;">{{ 'clients.hints.searchCriteria' | translate }}</p>
                </div>
                <div style="display:flex; gap:10px; align-items:flex-start;">
                  <i class="ph ph-check-circle" style="color:#1f8a5b; font-size:18px; flex-shrink:0; margin-top:1px;"></i>
                  <p style="margin:0; font-size:13px; color:var(--text-2); line-height:1.5;">{{ 'clients.hints.matching' | translate }}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </form>
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
      this.searchCriteriaExpanded = true;
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
      error: () => {
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

    const preferredLocations = criteria.preferredLocations
      ? criteria.preferredLocations.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
      : [];

    const propertyTypes = criteria.propertyTypes
      ? criteria.propertyTypes.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
      : [];

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
