import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import {
  CallNotesService,
  CallNote,
  CallType,
  CallOutcome,
  CallNoteCreateRequest,
  CallNoteUpdateRequest,
  PropertySummary
} from '../../services/call-notes.service';
import { ClientService } from '../../../client-management/services/client.service';
import { TranslateEnumPipe } from '../../../../shared/pipes/translate-enum.pipe';

@Component({
  selector: 'app-call-note-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    TranslateEnumPipe
  ],
  template: `
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-gray-900">
              {{ isEditing ? ('call-notes.edit-call-note' | translate) : ('call-notes.new-call-note' | translate) }}
            </h1>
            <p class="mt-1 text-sm text-gray-600" *ngIf="clientName">
              {{ 'call-notes.client' | translate }}: {{ clientName }}
            </p>
          </div>
          <div class="flex space-x-3">
            <button
              type="button"
              (click)="goBack()"
              class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              {{ 'common.cancel' | translate }}
            </button>
            <button
              type="button"
              (click)="onSubmit()"
              [disabled]="!callNoteForm.valid || saving"
              class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
              <span *ngIf="saving" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              {{ saving ? ('common.saving' | translate) : (isEditing ? ('common.save' | translate) : ('call-notes.create-note' | translate)) }}
            </button>
          </div>
        </div>
      </div>

      <!-- Error Alert -->
      <div *ngIf="error" class="mb-6 rounded-md bg-red-50 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">{{ error }}</h3>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form [formGroup]="callNoteForm" class="space-y-8 bg-white shadow rounded-lg p-6">
        <!-- Basic Information -->
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            {{ 'call-notes.basic-information' | translate }}
          </h3>

          <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <!-- Client Selection (if not pre-selected) -->
            <div *ngIf="!clientId" class="sm:col-span-2">
              <label for="client" class="block text-sm font-medium text-gray-700">
                {{ 'call-notes.client' | translate }} *
              </label>
              <select
                id="client"
                formControlName="clientId"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                [class.border-red-300]="callNoteForm.get('clientId')?.invalid && callNoteForm.get('clientId')?.touched">
                <option value="">{{ 'call-notes.select-client' | translate }}</option>
                <option *ngFor="let client of clients" [value]="client.id">
                  {{ client.firstName }} {{ client.lastName }}
                </option>
              </select>
              <p *ngIf="callNoteForm.get('clientId')?.invalid && callNoteForm.get('clientId')?.touched"
                 class="mt-1 text-sm text-red-600">
                {{ 'validation.required' | translate }}
              </p>
            </div>

            <!-- Property Selection (Optional) -->
            <div class="sm:col-span-2">
              <label for="property" class="block text-sm font-medium text-gray-700">
                {{ 'call-notes.property' | translate }}
              </label>
              <select
                id="property"
                formControlName="propertyId"
                (change)="onPropertyChange($event)"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                <option value="">{{ 'call-notes.select-property' | translate }}</option>
                <option *ngFor="let property of properties" [value]="property.id">
                  {{ property.title }} - {{ property.address }}
                </option>
              </select>
              <p *ngIf="!selectedProperty" class="mt-1 text-sm text-gray-500">
                {{ 'call-notes.property-help' | translate }}
              </p>
              <!-- Selected Property Details -->
              <div *ngIf="selectedProperty" class="mt-2 p-3 bg-indigo-50 rounded-md border border-indigo-200">
                <div class="flex items-start">
                  <svg class="mt-0.5 h-5 w-5 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                  </svg>
                  <div class="ml-2 flex-1">
                    <p class="text-sm font-medium text-indigo-900">{{ selectedProperty.title }}</p>
                    <p class="text-sm text-indigo-700">{{ selectedProperty.address }}</p>
                    <p class="text-xs text-indigo-600 mt-1">
                      {{ selectedProperty.propertyType | translateEnum:'propertyTypes' }} • {{ selectedProperty.listingType | translateEnum:'listingType' }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Call Type -->
            <div>
              <label for="callType" class="block text-sm font-medium text-gray-700">
                {{ 'call-notes.call-type' | translate }} *
              </label>
              <select
                id="callType"
                formControlName="callType"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                [class.border-red-300]="callNoteForm.get('callType')?.invalid && callNoteForm.get('callType')?.touched">
                <option value="">{{ 'call-notes.select-call-type' | translate }}</option>
                <option *ngFor="let option of callTypeOptions" [value]="option">
                  {{ option | translateEnum:'callType' }}
                </option>
              </select>
              <p *ngIf="callNoteForm.get('callType')?.invalid && callNoteForm.get('callType')?.touched"
                 class="mt-1 text-sm text-red-600">
                {{ 'validation.required' | translate }}
              </p>
            </div>

            <!-- Call Date -->
            <div>
              <label for="callDate" class="block text-sm font-medium text-gray-700">
                {{ 'call-notes.call-date' | translate }} *
              </label>
              <input
                type="datetime-local"
                id="callDate"
                formControlName="callDate"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                [class.border-red-300]="callNoteForm.get('callDate')?.invalid && callNoteForm.get('callDate')?.touched">
              <p *ngIf="callNoteForm.get('callDate')?.invalid && callNoteForm.get('callDate')?.touched"
                 class="mt-1 text-sm text-red-600">
                {{ 'validation.required' | translate }}
              </p>
            </div>

            <!-- Duration -->
            <div>
              <label for="durationMinutes" class="block text-sm font-medium text-gray-700">
                {{ 'call-notes.duration-minutes' | translate }}
              </label>
              <input
                type="number"
                id="durationMinutes"
                formControlName="durationMinutes"
                min="1"
                max="600"
                [placeholder]="'call-notes.duration-placeholder' | translate"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
            </div>

            <!-- Outcome -->
            <div>
              <label for="outcome" class="block text-sm font-medium text-gray-700">
                {{ 'call-notes.outcome' | translate }}
              </label>
              <select
                id="outcome"
                formControlName="outcome"
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                <option value="">{{ 'call-notes.select-outcome' | translate }}</option>
                <option *ngFor="let option of outcomeOptions" [value]="option">
                  {{ option | translateEnum:'callOutcome' }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <!-- Call Details -->
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            {{ 'call-notes.call-details' | translate }}
          </h3>

          <!-- Subject -->
          <div class="mb-6">
            <label for="subject" class="block text-sm font-medium text-gray-700">
              {{ 'call-notes.subject' | translate }} *
            </label>
            <input
              type="text"
              id="subject"
              formControlName="subject"
              maxlength="200"
              [placeholder]="'call-notes.subject-placeholder' | translate"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              [class.border-red-300]="callNoteForm.get('subject')?.invalid && callNoteForm.get('subject')?.touched">
            <p *ngIf="callNoteForm.get('subject')?.invalid && callNoteForm.get('subject')?.touched"
               class="mt-1 text-sm text-red-600">
              <span *ngIf="callNoteForm.get('subject')?.errors?.['required']">{{ 'validation.required' | translate }}</span>
              <span *ngIf="callNoteForm.get('subject')?.errors?.['minlength']">{{ 'validation.min-length' | translate: {min: 5} }}</span>
            </p>
            <p class="mt-1 text-sm text-gray-500">
              {{ callNoteForm.get('subject')?.value?.length || 0 }}/200 {{ 'common.characters' | translate }}
            </p>
          </div>

          <!-- Notes -->
          <div class="mb-6">
            <label for="notes" class="block text-sm font-medium text-gray-700">
              {{ 'call-notes.notes' | translate }} *
            </label>
            <textarea
              id="notes"
              formControlName="notes"
              rows="6"
              maxlength="5000"
              [placeholder]="'call-notes.notes-placeholder' | translate"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              [class.border-red-300]="callNoteForm.get('notes')?.invalid && callNoteForm.get('notes')?.touched"></textarea>
            <p *ngIf="callNoteForm.get('notes')?.invalid && callNoteForm.get('notes')?.touched"
               class="mt-1 text-sm text-red-600">
              <span *ngIf="callNoteForm.get('notes')?.errors?.['required']">{{ 'validation.required' | translate }}</span>
              <span *ngIf="callNoteForm.get('notes')?.errors?.['minlength']">{{ 'validation.min-length' | translate: {min: 10} }}</span>
            </p>
            <p class="mt-1 text-sm text-gray-500">
              {{ callNoteForm.get('notes')?.value?.length || 0 }}/5000 {{ 'common.characters' | translate }}
            </p>
          </div>

          <!-- Properties Discussed -->
          <div>
            <label for="propertiesDiscussed" class="block text-sm font-medium text-gray-700">
              {{ 'call-notes.properties-discussed' | translate }}
            </label>
            <textarea
              id="propertiesDiscussed"
              formControlName="propertiesDiscussed"
              rows="3"
              [placeholder]="'call-notes.properties-placeholder' | translate"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"></textarea>
            <p class="mt-1 text-sm text-gray-500">
              {{ 'call-notes.properties-help' | translate }}
            </p>
          </div>
        </div>

        <!-- Follow-up -->
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            {{ 'call-notes.follow-up' | translate }}
          </h3>

          <!-- Follow-up Required -->
          <div class="mb-6">
            <div class="relative flex items-start">
              <div class="flex items-center h-5">
                <input
                  id="followUpRequired"
                  type="checkbox"
                  formControlName="followUpRequired"
                  class="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded">
              </div>
              <div class="ml-3 text-sm">
                <label for="followUpRequired" class="font-medium text-gray-700">
                  {{ 'call-notes.follow-up-required' | translate }}
                </label>
                <p class="text-gray-500">{{ 'call-notes.follow-up-help' | translate }}</p>
              </div>
            </div>
          </div>

          <!-- Follow-up Date -->
          <div *ngIf="callNoteForm.get('followUpRequired')?.value">
            <label for="followUpDate" class="block text-sm font-medium text-gray-700">
              {{ 'call-notes.follow-up-date' | translate }} *
            </label>
            <input
              type="date"
              id="followUpDate"
              formControlName="followUpDate"
              [min]="getTomorrowDate()"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              [class.border-red-300]="callNoteForm.get('followUpDate')?.invalid && callNoteForm.get('followUpDate')?.touched">
            <p *ngIf="callNoteForm.get('followUpDate')?.invalid && callNoteForm.get('followUpDate')?.touched"
               class="mt-1 text-sm text-red-600">
              {{ 'validation.required' | translate }}
            </p>
          </div>
        </div>

        <!-- Form Actions (Mobile) -->
        <div class="sm:hidden border-t border-gray-200 pt-6">
          <div class="flex space-x-3">
            <button
              type="button"
              (click)="goBack()"
              class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              {{ 'common.cancel' | translate }}
            </button>
            <button
              type="button"
              (click)="onSubmit()"
              [disabled]="!callNoteForm.valid || saving"
              class="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
              <span *ngIf="saving" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
              {{ saving ? ('common.saving' | translate) : (isEditing ? ('common.save' | translate) : ('call-notes.create-note' | translate)) }}
            </button>
          </div>
        </div>
      </form>

      <!-- Delete Button (for editing mode) -->
      <div *ngIf="isEditing && callNoteId" class="mt-6 border-t border-gray-200 pt-6">
        <button
          type="button"
          (click)="confirmDelete()"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
          <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          {{ 'call-notes.delete-note' | translate }}
        </button>
      </div>

      <!-- Delete Confirmation Modal -->
      <div *ngIf="showDeleteConfirm" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="fixed inset-0 transition-opacity" (click)="cancelDelete()">
            <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
          </div>

          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 class="text-lg leading-6 font-medium text-gray-900">
                    {{ 'call-notes.delete-confirm-title' | translate }}
                  </h3>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500">
                      {{ 'call-notes.delete-confirm-message' | translate }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                (click)="deleteCallNote()"
                [disabled]="deleting"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                <span *ngIf="deleting" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                {{ deleting ? ('common.deleting' | translate) : ('common.delete' | translate) }}
              </button>
              <button
                type="button"
                (click)="cancelDelete()"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                {{ 'common.cancel' | translate }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CallNoteFormComponent implements OnInit, OnDestroy {
  callNoteForm: FormGroup;
  loading = false;
  saving = false;
  deleting = false;
  error: string | null = null;

  // Route parameters
  callNoteId: string | null = null;
  clientId: string | null = null;
  isEditing = false;

  // Data
  clients: any[] = [];
  properties: PropertySummary[] = [];
  selectedProperty: PropertySummary | null = null;
  clientName: string | null = null;
  callTypeOptions = this.callNotesService.getCallTypeOptions();
  outcomeOptions = this.callNotesService.getCallOutcomeOptions();

  // Delete confirmation
  showDeleteConfirm = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private callNotesService: CallNotesService,
    private clientService: ClientService
  ) {
    this.callNoteForm = this.fb.group({
      clientId: ['', Validators.required],
      propertyId: [''],
      callType: ['', Validators.required],
      callDate: ['', Validators.required],
      durationMinutes: [null],
      subject: ['', [Validators.required, Validators.minLength(5)]],
      notes: ['', [Validators.required, Validators.minLength(10)]],
      outcome: [''],
      propertiesDiscussed: [''],
      followUpRequired: [false],
      followUpDate: ['']
    });
  }

  ngOnInit(): void {
    // Load properties for dropdown
    this.loadProperties();

    this.route.paramMap.subscribe(params => {
      this.callNoteId = params.get('id');
      this.clientId = params.get('clientId');
      this.isEditing = !!this.callNoteId;

      if (this.clientId) {
        this.callNoteForm.patchValue({ clientId: this.clientId });
        this.callNoteForm.get('clientId')?.disable();
        this.loadClientName();
      } else {
        this.loadClients();
      }

      if (this.isEditing && this.callNoteId) {
        this.loadCallNote();
      } else {
        // Set default call date to now
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        this.callNoteForm.patchValue({
          callDate: now.toISOString().slice(0, 16)
        });
      }
    });

    // Setup follow-up validation
    this.callNoteForm.get('followUpRequired')?.valueChanges.subscribe(required => {
      const followUpDateControl = this.callNoteForm.get('followUpDate');
      if (required) {
        followUpDateControl?.setValidators(Validators.required);
      } else {
        followUpDateControl?.clearValidators();
        followUpDateControl?.setValue('');
      }
      followUpDateControl?.updateValueAndValidity();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCallNote(): void {
    if (!this.callNoteId) return;

    this.loading = true;
    this.callNotesService.getCallNote(this.callNoteId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (callNote: CallNote) => {
        this.callNoteForm.patchValue({
          clientId: callNote.clientId,
          propertyId: callNote.propertyId || '',
          callType: callNote.callType,
          callDate: new Date(callNote.callDate).toISOString().slice(0, 16),
          durationMinutes: callNote.durationMinutes,
          subject: callNote.subject,
          notes: callNote.notes,
          outcome: callNote.outcome || '',
          propertiesDiscussed: callNote.propertiesDiscussed || '',
          followUpRequired: callNote.followUpRequired || false,
          followUpDate: callNote.followUpDate ? new Date(callNote.followUpDate).toISOString().split('T')[0] : ''
        });

        if (callNote.clientId && !this.clientId) {
          this.callNoteForm.get('clientId')?.disable();
          this.clientId = callNote.clientId;
          this.loadClientName();
        }

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading call note:', error);
        this.error = 'Failed to load call note';
        this.loading = false;
      }
    });
  }

  loadClients(): void {
    this.clientService.getClients().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.clients = response.content;
      },
      error: (error) => {
        console.error('Error loading clients:', error);
      }
    });
  }

  loadClientName(): void {
    if (!this.clientId) return;

    this.clientService.getClient(this.clientId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (client) => {
        this.clientName = `${client.firstName} ${client.lastName}`;
      },
      error: (error) => {
        console.error('Error loading client:', error);
      }
    });
  }

  loadProperties(): void {
    this.callNotesService.getAgentProperties().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (properties) => {
        this.properties = properties;
        // Update selected property if form already has a propertyId
        const currentPropertyId = this.callNoteForm.get('propertyId')?.value;
        if (currentPropertyId) {
          this.selectedProperty = properties.find(p => p.id === currentPropertyId) || null;
        }
      },
      error: (error) => {
        console.error('Error loading properties:', error);
      }
    });
  }

  onPropertyChange(event: any): void {
    const propertyId = event.target.value;
    this.selectedProperty = this.properties.find(p => p.id === propertyId) || null;
  }

  onSubmit(): void {
    if (this.callNoteForm.invalid || this.saving) return;

    this.saving = true;
    this.error = null;

    const formValue = { ...this.callNoteForm.value };

    // Handle disabled clientId field
    if (this.clientId && this.callNoteForm.get('clientId')?.disabled) {
      formValue.clientId = this.clientId;
    }

    if (this.isEditing && this.callNoteId) {
      this.updateCallNote(formValue);
    } else {
      this.createCallNote(formValue);
    }
  }

  createCallNote(formValue: any): void {
    const request: CallNoteCreateRequest = {
      clientId: formValue.clientId,
      propertyId: formValue.propertyId || undefined,
      callType: formValue.callType,
      callDate: new Date(formValue.callDate).toISOString(),
      durationMinutes: formValue.durationMinutes || undefined,
      subject: formValue.subject,
      notes: formValue.notes,
      outcome: formValue.outcome || undefined,
      propertiesDiscussed: formValue.propertiesDiscussed || undefined,
      followUpRequired: formValue.followUpRequired,
      followUpDate: formValue.followUpDate ? new Date(formValue.followUpDate).toISOString() : undefined
    };

    this.callNotesService.createCallNote(request).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (callNote) => {
        this.saving = false;
        this.goBack();
      },
      error: (error) => {
        console.error('Error creating call note:', error);
        this.error = 'Failed to create call note';
        this.saving = false;
      }
    });
  }

  updateCallNote(formValue: any): void {
    if (!this.callNoteId) return;

    const request: CallNoteUpdateRequest = {
      propertyId: formValue.propertyId || undefined,
      callType: formValue.callType,
      callDate: new Date(formValue.callDate).toISOString(),
      durationMinutes: formValue.durationMinutes || undefined,
      subject: formValue.subject,
      notes: formValue.notes,
      outcome: formValue.outcome || undefined,
      propertiesDiscussed: formValue.propertiesDiscussed || undefined,
      followUpRequired: formValue.followUpRequired,
      followUpDate: formValue.followUpDate ? new Date(formValue.followUpDate).toISOString() : undefined
    };

    this.callNotesService.updateCallNote(this.callNoteId, request).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (callNote) => {
        this.saving = false;
        this.goBack();
      },
      error: (error) => {
        console.error('Error updating call note:', error);
        this.error = 'Failed to update call note';
        this.saving = false;
      }
    });
  }

  confirmDelete(): void {
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  deleteCallNote(): void {
    if (!this.callNoteId) return;

    this.deleting = true;
    this.callNotesService.deleteCallNote(this.callNoteId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.deleting = false;
        this.showDeleteConfirm = false;
        this.goBack();
      },
      error: (error) => {
        console.error('Error deleting call note:', error);
        this.error = 'Failed to delete call note';
        this.deleting = false;
        this.showDeleteConfirm = false;
      }
    });
  }

  getTomorrowDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  goBack(): void {
    if (this.clientId) {
      this.router.navigate(['/call-notes/client', this.clientId]);
    } else {
      this.router.navigate(['/call-notes']);
    }
  }
}