import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CallNotesService, BulkSummary } from '../../services/call-notes.service';
import { ClientService } from '../../../client-management/services/client.service';
import { TranslateEnumPipe } from '../../../../shared/pipes/translate-enum.pipe';

@Component({
  selector: 'app-call-summary',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    TranslateModule,
    TranslateEnumPipe
  ],
  template: `
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-semibold text-gray-900">
              {{ 'call-notes.communication-summary' | translate }}
            </h1>
            <p class="mt-1 text-sm text-gray-600" *ngIf="clientName">
              {{ 'call-notes.client' | translate }}: {{ clientName }}
            </p>
          </div>
          <div class="flex items-center space-x-3">
            <button
              type="button"
              [routerLink]="['/call-notes/client', clientId, 'new']"
              class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              {{ 'call-notes.add-call-note' | translate }}
            </button>
            <button
              type="button"
              [routerLink]="['/call-notes/client', clientId]"
              class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              {{ 'call-notes.view-all-notes' | translate }}
            </button>
          </div>
        </div>
      </div>

      <!-- Summary Statistics -->
      <div *ngIf="bulkSummary" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.013 8.013 0 01-2.919-.594l-2.252.637a1 1 0 01-1.194-1.194l.637-2.252A8.013 8.013 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"></path>
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">{{ 'call-notes.total-notes' | translate }}</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ bulkSummary.totalCallNotes }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">{{ 'call-notes.last-contact' | translate }}</dt>
                  <dd class="text-lg font-medium text-gray-900">
                    {{ bulkSummary.lastCallDate ? formatDate(bulkSummary.lastCallDate) : ('common.never' | translate) }}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <svg class="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">{{ 'call-notes.pending-follow-ups' | translate }}</dt>
                  <dd class="text-lg font-medium text-gray-900">{{ bulkSummary.pendingFollowUps }}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white overflow-hidden shadow rounded-lg">
          <div class="p-5">
            <div class="flex items-center">
              <div class="flex-shrink-0">
                <div [ngClass]="getOutcomeIconClass(bulkSummary.lastOutcome)" class="h-6 w-6 rounded-full flex items-center justify-center">
                  <svg class="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 8 8">
                    <circle cx="4" cy="4" r="3"></circle>
                  </svg>
                </div>
              </div>
              <div class="ml-5 w-0 flex-1">
                <dl>
                  <dt class="text-sm font-medium text-gray-500 truncate">{{ 'call-notes.last-outcome' | translate }}</dt>
                  <dd class="text-lg font-medium text-gray-900">
                    {{ bulkSummary.lastOutcome ? (bulkSummary.lastOutcome | translateEnum:'callOutcome') : ('common.none' | translate) }}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Summary Generation -->
      <div class="bg-white shadow rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900 mb-6">
            {{ 'call-notes.generate-summary' | translate }}
          </h3>

          <!-- Summary Type Selection -->
          <div class="mb-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                type="button"
                (click)="generateQuickSummary()"
                [disabled]="generating"
                class="relative p-4 border border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <div class="text-center">
                  <svg class="mx-auto h-6 w-6 text-indigo-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  <span class="text-sm font-medium text-gray-900">{{ 'call-notes.quick-summary' | translate }}</span>
                  <p class="text-xs text-gray-500 mt-1">{{ 'call-notes.quick-summary-desc' | translate }}</p>
                </div>
              </button>

              <button
                type="button"
                (click)="generateDetailedSummary()"
                [disabled]="generating"
                class="relative p-4 border border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <div class="text-center">
                  <svg class="mx-auto h-6 w-6 text-indigo-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  <span class="text-sm font-medium text-gray-900">{{ 'call-notes.detailed-summary' | translate }}</span>
                  <p class="text-xs text-gray-500 mt-1">{{ 'call-notes.detailed-summary-desc' | translate }}</p>
                </div>
              </button>

              <button
                type="button"
                (click)="generateTimelineSummary()"
                [disabled]="generating"
                class="relative p-4 border border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <div class="text-center">
                  <svg class="mx-auto h-6 w-6 text-indigo-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span class="text-sm font-medium text-gray-900">{{ 'call-notes.timeline-summary' | translate }}</span>
                  <p class="text-xs text-gray-500 mt-1">{{ 'call-notes.timeline-summary-desc' | translate }}</p>
                </div>
              </button>

              <button
                type="button"
                (click)="showPeriodForm = true"
                [disabled]="generating"
                class="relative p-4 border border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                <div class="text-center">
                  <svg class="mx-auto h-6 w-6 text-indigo-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  <span class="text-sm font-medium text-gray-900">{{ 'call-notes.period-summary' | translate }}</span>
                  <p class="text-xs text-gray-500 mt-1">{{ 'call-notes.period-summary-desc' | translate }}</p>
                </div>
              </button>
            </div>
          </div>

          <!-- Period Summary Form -->
          <div *ngIf="showPeriodForm" class="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <form [formGroup]="periodForm" class="flex flex-col sm:flex-row sm:items-end gap-4">
              <div class="flex-1">
                <label for="startDate" class="block text-sm font-medium text-gray-700">
                  {{ 'call-notes.start-date' | translate }}
                </label>
                <input
                  type="date"
                  id="startDate"
                  formControlName="startDate"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              </div>
              <div class="flex-1">
                <label for="endDate" class="block text-sm font-medium text-gray-700">
                  {{ 'call-notes.end-date' | translate }}
                </label>
                <input
                  type="date"
                  id="endDate"
                  formControlName="endDate"
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
              </div>
              <div class="flex space-x-2">
                <button
                  type="button"
                  (click)="generatePeriodSummary()"
                  [disabled]="!periodForm.valid || generating"
                  class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                  {{ 'common.generate' | translate }}
                </button>
                <button
                  type="button"
                  (click)="showPeriodForm = false; periodForm.reset()"
                  class="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  {{ 'common.cancel' | translate }}
                </button>
              </div>
            </form>
          </div>

          <!-- Generation Status -->
          <div *ngIf="generating" class="mb-6 text-center">
            <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
            <p class="text-sm text-gray-600">{{ 'call-notes.generating-summary' | translate }}</p>
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

          <!-- Generated Summary -->
          <div *ngIf="generatedSummary" class="border border-gray-200 rounded-lg">
            <div class="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h4 class="text-sm font-medium text-gray-900">
                {{ currentSummaryType | translate }}
              </h4>
              <div class="flex space-x-2">
                <button
                  type="button"
                  (click)="copySummaryToClipboard()"
                  [disabled]="copying"
                  class="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                  <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                  {{ copying ? ('common.copying' | translate) : ('common.copy' | translate) }}
                </button>
                <button
                  type="button"
                  (click)="downloadSummary()"
                  class="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  <svg class="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  {{ 'common.download' | translate }}
                </button>
              </div>
            </div>
            <div class="p-4">
              <div class="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{{ generatedSummary }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Copy Success Toast -->
      <div *ngIf="copySuccess" class="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50">
        {{ 'call-notes.copied-to-clipboard' | translate }}
      </div>
    </div>
  `
})
export class CallSummaryComponent implements OnInit, OnDestroy {
  clientId: string | null = null;
  clientName: string | null = null;
  bulkSummary: BulkSummary | null = null;

  // Summary generation
  generating = false;
  copying = false;
  copySuccess = false;
  error: string | null = null;
  generatedSummary: string | null = null;
  currentSummaryType: string = '';

  // Period form
  showPeriodForm = false;
  periodForm: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    public callNotesService: CallNotesService,
    private clientService: ClientService
  ) {
    this.periodForm = this.fb.group({
      startDate: ['', Validators.required],
      endDate: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.clientId = params.get('clientId');
      if (this.clientId) {
        this.loadClientInfo();
        this.loadBulkSummary();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadClientInfo(): void {
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

  loadBulkSummary(): void {
    if (!this.clientId) return;

    this.callNotesService.getClientCallNotesSummary(this.clientId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (summary) => {
        this.bulkSummary = summary;
      },
      error: (error) => {
        console.error('Error loading bulk summary:', error);
      }
    });
  }

  generateQuickSummary(): void {
    if (!this.clientId) return;

    this.generating = true;
    this.error = null;
    this.currentSummaryType = 'call-notes.quick-summary';

    this.callNotesService.generateQuickSummary(this.clientId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (summary) => {
        this.generatedSummary = summary;
        this.generating = false;
      },
      error: (error) => {
        console.error('Error generating quick summary:', error);
        this.error = 'Failed to generate summary';
        this.generating = false;
      }
    });
  }

  generateDetailedSummary(): void {
    if (!this.clientId) return;

    this.generating = true;
    this.error = null;
    this.currentSummaryType = 'call-notes.detailed-summary';

    this.callNotesService.generateClientSummary(this.clientId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (summary) => {
        this.generatedSummary = summary;
        this.generating = false;
      },
      error: (error) => {
        console.error('Error generating detailed summary:', error);
        this.error = 'Failed to generate summary';
        this.generating = false;
      }
    });
  }

  generateTimelineSummary(): void {
    if (!this.clientId) return;

    this.generating = true;
    this.error = null;
    this.currentSummaryType = 'call-notes.timeline-summary';

    this.callNotesService.generateTimelineSummary(this.clientId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (summary) => {
        this.generatedSummary = summary;
        this.generating = false;
      },
      error: (error) => {
        console.error('Error generating timeline summary:', error);
        this.error = 'Failed to generate summary';
        this.generating = false;
      }
    });
  }

  generatePeriodSummary(): void {
    if (!this.clientId || !this.periodForm.valid) return;

    this.generating = true;
    this.error = null;
    this.currentSummaryType = 'call-notes.period-summary';

    const { startDate, endDate } = this.periodForm.value;

    this.callNotesService.generatePeriodSummary(this.clientId, startDate, endDate).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (summary) => {
        this.generatedSummary = summary;
        this.generating = false;
        this.showPeriodForm = false;
      },
      error: (error) => {
        console.error('Error generating period summary:', error);
        this.error = 'Failed to generate summary';
        this.generating = false;
      }
    });
  }

  copySummaryToClipboard(): void {
    if (!this.generatedSummary) return;

    this.copying = true;

    try {
      navigator.clipboard.writeText(this.generatedSummary).then(() => {
        this.copying = false;
        this.copySuccess = true;
        setTimeout(() => this.copySuccess = false, 3000);
      }).catch(() => {
        // Fallback for older browsers
        this.copyToClipboardFallback(this.generatedSummary!);
      });
    } catch (err) {
      this.copyToClipboardFallback(this.generatedSummary);
    }
  }

  private copyToClipboardFallback(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      this.copying = false;
      this.copySuccess = true;
      setTimeout(() => this.copySuccess = false, 3000);
    } catch (err) {
      console.error('Failed to copy:', err);
      this.error = 'Failed to copy to clipboard';
      this.copying = false;
    } finally {
      document.body.removeChild(textArea);
    }
  }

  downloadSummary(): void {
    if (!this.generatedSummary || !this.clientName) return;

    const blob = new Blob([this.generatedSummary], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${this.clientName.replace(/\s+/g, '_')}_communication_summary_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getOutcomeIconClass(outcome: string | undefined): string {
    switch (outcome) {
      case 'INTERESTED':
        return 'bg-green-500';
      case 'NOT_INTERESTED':
        return 'bg-red-500';
      case 'SCHEDULED_VIEWING':
        return 'bg-blue-500';
      case 'OFFER_MADE':
        return 'bg-yellow-500';
      case 'DEAL_CLOSED':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  }
}