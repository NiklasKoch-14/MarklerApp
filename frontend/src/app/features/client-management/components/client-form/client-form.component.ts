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
                placeholder="Enter first name">
              <div *ngIf="clientForm.get('firstName')?.invalid && clientForm.get('firstName')?.touched" class="form-error">
                First name is required
              </div>
            </div>

            <div>
              <label for="lastName" class="form-label">{{ 'clients.lastName' | translate }} *</label>
              <input
                type="text"
                id="lastName"
                formControlName="lastName"
                class="form-input"
                placeholder="Enter last name">
              <div *ngIf="clientForm.get('lastName')?.invalid && clientForm.get('lastName')?.touched" class="form-error">
                Last name is required
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
                placeholder="Enter email address">
              <div *ngIf="clientForm.get('email')?.invalid && clientForm.get('email')?.touched" class="form-error">
                Please enter a valid email address
              </div>
            </div>

            <div>
              <label for="phone" class="form-label">{{ 'clients.phone' | translate }}</label>
              <input
                type="tel"
                id="phone"
                formControlName="phone"
                class="form-input"
                placeholder="Enter phone number">
            </div>
          </div>

          <div>
            <label for="addressStreet" class="form-label">Street Address</label>
            <input
              type="text"
              id="addressStreet"
              formControlName="addressStreet"
              class="form-input"
              placeholder="Enter street address">
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label for="addressCity" class="form-label">{{ 'clients.city' | translate }}</label>
              <input
                type="text"
                id="addressCity"
                formControlName="addressCity"
                class="form-input"
                placeholder="Enter city">
            </div>

            <div>
              <label for="addressPostalCode" class="form-label">{{ 'clients.postalCode' | translate }}</label>
              <input
                type="text"
                id="addressPostalCode"
                formControlName="addressPostalCode"
                class="form-input"
                placeholder="12345">
              <div *ngIf="clientForm.get('addressPostalCode')?.invalid && clientForm.get('addressPostalCode')?.touched" class="form-error">
                Postal code must be 5 digits
              </div>
            </div>

            <div>
              <label for="addressCountry" class="form-label">{{ 'clients.country' | translate }}</label>
              <input
                type="text"
                id="addressCountry"
                formControlName="addressCountry"
                class="form-input"
                value="Germany">
            </div>
          </div>

          <div>
            <div class="flex items-center">
              <input
                id="gdprConsent"
                type="checkbox"
                formControlName="gdprConsentGiven"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded">
              <label for="gdprConsent" class="ml-2 block text-sm text-gray-900">
                I consent to the processing of personal data in accordance with GDPR *
              </label>
            </div>
            <div *ngIf="clientForm.get('gdprConsentGiven')?.invalid && clientForm.get('gdprConsentGiven')?.touched" class="form-error">
              GDPR consent is required
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
              {{ isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Client' : 'Create Client') }}
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
      gdprConsentGiven: [false, [Validators.requiredTrue]]
    });
  }

  ngOnInit(): void {
    this.clientId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.clientId;

    if (this.isEditMode && this.clientId) {
      this.loadClient(this.clientId);
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
          gdprConsentGiven: client.gdprConsentGiven
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

      const clientData = this.clientForm.value;

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

  cancel(): void {
    this.router.navigate(['/clients']);
  }
}