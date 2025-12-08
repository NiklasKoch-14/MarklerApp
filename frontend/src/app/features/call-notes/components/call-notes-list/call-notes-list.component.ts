import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { CallNotesService, CallNoteSummary, CallType, CallOutcome, CallNoteSearchFilter, PagedResponse } from '../../services/call-notes.service';

@Component({
  selector: 'app-call-notes-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TranslateModule
  ],
  template: `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <h1 class="text-2xl font-semibold text-gray-900">
            {{ clientId ? ('call-notes.client-call-notes' | translate) : ('call-notes.all-call-notes' | translate) }}
          </h1>
          <p class="mt-2 text-sm text-gray-700" *ngIf="clientId">
            {{ ('call-notes.showing-client-notes' | translate) }}
          </p>
          <p class="mt-2 text-sm text-gray-700" *ngIf="!clientId">
            {{ ('call-notes.all-notes-description' | translate) }}
          </p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            [routerLink]="clientId ? ['/call-notes/client', clientId, 'new'] : ['/call-notes/new']"
            class="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto">
            {{ 'call-notes.add-call-note' | translate }}
          </button>
        </div>
      </div>

      <!-- Client Summary Link -->
      <div class="mt-4" *ngIf="clientId">
        <a
          [routerLink]="['/call-notes/client', clientId, 'summary']"
          class="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-900">
          {{ 'call-notes.view-summary' | translate }}
          <svg class="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </a>
      </div>

      <!-- Search and Filters -->
      <div class="mt-6 bg-white shadow rounded-lg p-6" [formGroup]="searchForm">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Search Term -->
          <div>
            <label for="searchTerm" class="block text-sm font-medium text-gray-700">
              {{ 'call-notes.search' | translate }}
            </label>
            <input
              type="text"
              id="searchTerm"
              formControlName="searchTerm"
              [placeholder]="'call-notes.search-placeholder' | translate"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
          </div>

          <!-- Call Type Filter -->
          <div>
            <label for="callType" class="block text-sm font-medium text-gray-700">
              {{ 'call-notes.call-type' | translate }}
            </label>
            <select
              id="callType"
              formControlName="callType"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option value="">{{ 'common.all' | translate }}</option>
              <option *ngFor="let option of callTypeOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Outcome Filter -->
          <div>
            <label for="outcome" class="block text-sm font-medium text-gray-700">
              {{ 'call-notes.outcome' | translate }}
            </label>
            <select
              id="outcome"
              formControlName="outcome"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option value="">{{ 'common.all' | translate }}</option>
              <option *ngFor="let option of outcomeOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- Follow-up Filter -->
          <div>
            <label for="followUpRequired" class="block text-sm font-medium text-gray-700">
              {{ 'call-notes.follow-up' | translate }}
            </label>
            <select
              id="followUpRequired"
              formControlName="followUpRequired"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              <option value="">{{ 'common.all' | translate }}</option>
              <option value="true">{{ 'call-notes.follow-up-required' | translate }}</option>
              <option value="false">{{ 'call-notes.no-follow-up' | translate }}</option>
            </select>
          </div>
        </div>

        <div class="mt-4 flex justify-end space-x-3">
          <button
            type="button"
            (click)="clearFilters()"
            class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            {{ 'common.clear' | translate }}
          </button>
          <button
            type="button"
            (click)="applyFilters()"
            class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
            {{ 'common.search' | translate }}
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="mt-8 text-center">
        <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        <p class="mt-2 text-sm text-gray-500">{{ 'common.loading' | translate }}</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && callNotes.length === 0" class="mt-8 text-center">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.013 8.013 0 01-2.919-.594l-2.252.637a1 1 0 01-1.194-1.194l.637-2.252A8.013 8.013 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">{{ 'call-notes.no-call-notes' | translate }}</h3>
        <p class="mt-1 text-sm text-gray-500">{{ 'call-notes.get-started' | translate }}</p>
        <div class="mt-6">
          <button
            type="button"
            [routerLink]="clientId ? ['/call-notes/client', clientId, 'new'] : ['/call-notes/new']"
            class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
            {{ 'call-notes.add-first-note' | translate }}
          </button>
        </div>
      </div>

      <!-- Call Notes List -->
      <div *ngIf="!loading && callNotes.length > 0" class="mt-8">
        <div class="bg-white shadow overflow-hidden sm:rounded-md">
          <ul role="list" class="divide-y divide-gray-200">
            <li *ngFor="let callNote of callNotes">
              <div class="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer"
                   [routerLink]="['/call-notes', callNote.id]">
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <!-- Call Type Icon -->
                    <div class="flex-shrink-0">
                      <div [ngClass]="getCallTypeIconClass(callNote.callType)"
                           class="h-8 w-8 rounded-full flex items-center justify-center">
                        <svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path [attr.d]="getCallTypeIconPath(callNote.callType)"></path>
                        </svg>
                      </div>
                    </div>

                    <!-- Call Details -->
                    <div class="ml-4">
                      <div class="flex items-center">
                        <p class="text-sm font-medium text-gray-900">{{ callNote.subject }}</p>
                        <span *ngIf="callNote.followUpRequired"
                              class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {{ 'call-notes.follow-up-required' | translate }}
                        </span>
                        <span *ngIf="callNote.outcome"
                              [ngClass]="getOutcomeClass(callNote.outcome)"
                              class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">
                          {{ callNotesService.formatCallOutcome(callNote.outcome) }}
                        </span>
                      </div>
                      <div class="mt-2 flex items-center text-sm text-gray-500">
                        <p *ngIf="!clientId">{{ callNote.clientName }} • </p>
                        <p>{{ callNotesService.formatCallType(callNote.callType) }}</p>
                        <span class="mx-2">•</span>
                        <time>{{ formatDate(callNote.callDate) }}</time>
                      </div>
                    </div>
                  </div>

                  <!-- Follow-up Date -->
                  <div *ngIf="callNote.followUpDate" class="flex items-center text-sm text-gray-500">
                    <svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    {{ 'call-notes.follow-up-by' | translate }}: {{ formatDate(callNote.followUpDate) }}
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <!-- Pagination -->
        <div *ngIf="totalPages > 1" class="mt-6 flex items-center justify-between">
          <div class="flex-1 flex justify-between sm:hidden">
            <button
              [disabled]="currentPage === 0"
              (click)="previousPage()"
              class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
              {{ 'common.previous' | translate }}
            </button>
            <button
              [disabled]="currentPage === totalPages - 1"
              (click)="nextPage()"
              class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
              {{ 'common.next' | translate }}
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-gray-700">
                {{ 'common.showing' | translate }}
                <span class="font-medium">{{ (currentPage * pageSize) + 1 }}</span>
                {{ 'common.to' | translate }}
                <span class="font-medium">{{ Math.min((currentPage + 1) * pageSize, totalElements) }}</span>
                {{ 'common.of' | translate }}
                <span class="font-medium">{{ totalElements }}</span>
                {{ 'common.results' | translate }}
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  [disabled]="currentPage === 0"
                  (click)="previousPage()"
                  class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                  <span class="sr-only">{{ 'common.previous' | translate }}</span>
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>

                <button
                  *ngFor="let page of getVisiblePages()"
                  [disabled]="page === '...'"
                  (click)="page !== '...' && goToPage(+page - 1)"
                  [ngClass]="{
                    'bg-indigo-50 border-indigo-500 text-indigo-600': +page - 1 === currentPage,
                    'bg-white border-gray-300 text-gray-500 hover:bg-gray-50': +page - 1 !== currentPage && page !== '...',
                    'bg-white border-gray-300 text-gray-400 cursor-not-allowed': page === '...'
                  }"
                  class="relative inline-flex items-center px-4 py-2 border text-sm font-medium">
                  {{ page }}
                </button>

                <button
                  [disabled]="currentPage === totalPages - 1"
                  (click)="nextPage()"
                  class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">
                  <span class="sr-only">{{ 'common.next' | translate }}</span>
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class CallNotesListComponent implements OnInit, OnDestroy {
  callNotes: CallNoteSummary[] = [];
  loading = false;
  error: string | null = null;

  // Pagination
  currentPage = 0;
  pageSize = 20;
  totalElements = 0;
  totalPages = 0;

  // Filters
  searchForm: FormGroup;
  callTypeOptions = this.callNotesService.getCallTypeOptions();
  outcomeOptions = this.callNotesService.getCallOutcomeOptions();

  // Route params
  clientId: string | null = null;

  private destroy$ = new Subject<void>();

  // Math reference for template
  Math = Math;

  constructor(
    public callNotesService: CallNotesService,
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.searchForm = this.fb.group({
      searchTerm: [''],
      callType: [''],
      outcome: [''],
      followUpRequired: ['']
    });
  }

  ngOnInit(): void {
    // Get client ID from route if available
    this.route.paramMap.subscribe(params => {
      this.clientId = params.get('clientId');
      this.loadCallNotes();
    });

    // Setup search form debouncing
    this.searchForm.valueChanges.pipe(
      takeUntil(this.destroy$),
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      if (this.hasActiveFilters()) {
        this.applyFilters();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCallNotes(): void {
    this.loading = true;
    this.error = null;

    const loadFn = this.clientId
      ? this.callNotesService.getCallNotesByClient(this.clientId, this.currentPage, this.pageSize)
      : this.callNotesService.getCallNotesByAgent(this.currentPage, this.pageSize);

    loadFn.pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: PagedResponse<CallNoteSummary>) => {
        this.callNotes = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading call notes:', error);
        this.error = 'Failed to load call notes';
        this.loading = false;
      }
    });
  }

  applyFilters(): void {
    this.loading = true;
    this.currentPage = 0;

    const filter: CallNoteSearchFilter = {
      ...this.searchForm.value,
      clientId: this.clientId || undefined
    };

    // Clean up empty values
    Object.keys(filter).forEach(key => {
      if (filter[key as keyof CallNoteSearchFilter] === '' || filter[key as keyof CallNoteSearchFilter] === null) {
        delete filter[key as keyof CallNoteSearchFilter];
      }
    });

    // Convert string boolean to boolean
    if ((filter.followUpRequired as any) === 'true') {
      filter.followUpRequired = true;
    } else if ((filter.followUpRequired as any) === 'false') {
      filter.followUpRequired = false;
    } else {
      delete filter.followUpRequired;
    }

    this.callNotesService.searchCallNotes(filter, this.currentPage, this.pageSize).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: PagedResponse<CallNoteSummary>) => {
        this.callNotes = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error searching call notes:', error);
        this.error = 'Failed to search call notes';
        this.loading = false;
      }
    });
  }

  clearFilters(): void {
    this.searchForm.reset();
    this.currentPage = 0;
    this.loadCallNotes();
  }

  hasActiveFilters(): boolean {
    const values = this.searchForm.value;
    return Object.values(values).some(value => value && value !== '');
  }

  // Pagination methods
  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.hasActiveFilters() ? this.applyFilters() : this.loadCallNotes();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.hasActiveFilters() ? this.applyFilters() : this.loadCallNotes();
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.hasActiveFilters() ? this.applyFilters() : this.loadCallNotes();
  }

  getVisiblePages(): (string | number)[] {
    const pages: (string | number)[] = [];
    const maxVisible = 7;
    const halfVisible = Math.floor(maxVisible / 2);

    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, this.currentPage + 1 - halfVisible);
      let end = Math.min(this.totalPages, start + maxVisible - 1);

      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) {
          pages.push('...');
        }
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < this.totalPages) {
        if (end < this.totalPages - 1) {
          pages.push('...');
        }
        pages.push(this.totalPages);
      }
    }

    return pages;
  }

  // Utility methods
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getCallTypeIconClass(callType: CallType): string {
    switch (callType) {
      case CallType.PHONE_INBOUND:
        return 'bg-green-500';
      case CallType.PHONE_OUTBOUND:
        return 'bg-blue-500';
      case CallType.EMAIL:
        return 'bg-purple-500';
      case CallType.MEETING:
        return 'bg-orange-500';
      case CallType.OTHER:
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  }

  getCallTypeIconPath(callType: CallType): string {
    switch (callType) {
      case CallType.PHONE_INBOUND:
      case CallType.PHONE_OUTBOUND:
        return 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z';
      case CallType.EMAIL:
        return 'M3 8l7.89 7.89a1 1 0 001.42 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';
      case CallType.MEETING:
        return 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z';
      default:
        return 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.013 8.013 0 01-2.919-.594l-2.252.637a1 1 0 01-1.194-1.194l.637-2.252A8.013 8.013 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z';
    }
  }

  getOutcomeClass(outcome: CallOutcome): string {
    switch (outcome) {
      case CallOutcome.INTERESTED:
        return 'bg-green-100 text-green-800';
      case CallOutcome.NOT_INTERESTED:
        return 'bg-red-100 text-red-800';
      case CallOutcome.SCHEDULED_VIEWING:
        return 'bg-blue-100 text-blue-800';
      case CallOutcome.OFFER_MADE:
        return 'bg-yellow-100 text-yellow-800';
      case CallOutcome.DEAL_CLOSED:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
}