import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ClientService, Client } from '../../services/client.service';
import { CallNotesService, CallNoteSummary, BulkSummary, PagedResponse, AiSummary } from '../../../call-notes/services/call-notes.service';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="p-6">
      <div *ngIf="isLoading" class="text-center py-8">
        <div class="spinner h-8 w-8 mx-auto"></div>
        <p class="mt-2 text-sm text-gray-500">{{ 'clients.loadingDetails' | translate }}</p>
      </div>

      <div *ngIf="!isLoading && client">
        <div class="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ client.firstName }} {{ client.lastName }}</h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ 'clients.details' | translate }}</p>
          </div>
          <div class="mt-4 sm:mt-0 sm:ml-4">
            <a [routerLink]="['/clients', client.id, 'edit']" class="btn btn-primary">
              {{ 'clients.editClient' | translate }}
            </a>
          </div>
        </div>

        <div class="mt-8">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Personal Information -->
            <div class="card">
              <div class="card-header">
                <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">{{ 'clients.personalInformation' | translate }}</h3>
              </div>
              <div class="card-body">
                <dl class="space-y-4">
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ 'clients.name' | translate }}</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ client.firstName }} {{ client.lastName }}</dd>
                  </div>
                  <div *ngIf="client.email">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ 'clients.email' | translate }}</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ client.email }}</dd>
                  </div>
                  <div *ngIf="client.phone">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ 'clients.phone' | translate }}</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ client.phone }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ 'clients.gdprConsent' | translate }}</dt>
                    <dd class="mt-1">
                      <span *ngIf="client.gdprConsentGiven" class="badge badge-success">✓ {{ 'clients.gdprConsentGiven' | translate }}</span>
                      <span *ngIf="!client.gdprConsentGiven" class="badge badge-error">✗ {{ 'common.no' | translate }} {{ 'clients.consent' | translate }}</span>
                    </dd>
                  </div>
                  <div *ngIf="client.gdprConsentDate">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ 'clients.consentDate' | translate }}</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ client.gdprConsentDate | date:'medium' }}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Address Information -->
            <div class="card">
              <div class="card-header">
                <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">{{ 'clients.address' | translate }}</h3>
              </div>
              <div class="card-body">
                <div *ngIf="hasAddress(); else noAddress">
                  <dl class="space-y-4">
                    <div *ngIf="client.addressStreet">
                      <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ 'clients.street' | translate }}</dt>
                      <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ client.addressStreet }}</dd>
                    </div>
                    <div *ngIf="client.addressCity">
                      <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ 'clients.city' | translate }}</dt>
                      <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ client.addressCity }}</dd>
                    </div>
                    <div *ngIf="client.addressPostalCode">
                      <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ 'clients.postalCode' | translate }}</dt>
                      <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ client.addressPostalCode }}</dd>
                    </div>
                    <div *ngIf="client.addressCountry">
                      <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ 'clients.country' | translate }}</dt>
                      <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ client.addressCountry }}</dd>
                    </div>
                  </dl>
                </div>
                <ng-template #noAddress>
                  <p class="text-sm text-gray-500 dark:text-gray-400">{{ 'clients.noAddress' | translate }}</p>
                </ng-template>
              </div>
            </div>

            <!-- Search Criteria -->
            <div class="card lg:col-span-2" *ngIf="client.searchCriteria">
              <div class="card-header">
                <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">{{ 'clients.propertySearchCriteria' | translate }}</h3>
              </div>
              <div class="card-body">
                <dl class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div *ngIf="client.searchCriteria.minSquareMeters || client.searchCriteria.maxSquareMeters">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ 'clients.sizeSqm' | translate }}</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {{ client.searchCriteria.minSquareMeters || ('clients.anyMin' | translate) }} - {{ client.searchCriteria.maxSquareMeters || ('clients.anyMax' | translate) }}
                    </dd>
                  </div>
                  <div *ngIf="client.searchCriteria.minRooms || client.searchCriteria.maxRooms">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ 'clients.rooms' | translate }}</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {{ client.searchCriteria.minRooms || ('clients.anyMin' | translate) }} - {{ client.searchCriteria.maxRooms || ('clients.anyMax' | translate) }}
                    </dd>
                  </div>
                  <div *ngIf="client.searchCriteria.minBudget || client.searchCriteria.maxBudget">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ 'clients.budgetEur' | translate }}</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {{ client.searchCriteria.minBudget || ('clients.anyMin' | translate) }} - {{ client.searchCriteria.maxBudget || ('clients.anyMax' | translate) }}
                    </dd>
                  </div>
                  <div *ngIf="client.searchCriteria.preferredLocations && client.searchCriteria.preferredLocations.length > 0" class="md:col-span-2">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ 'clients.preferredLocations' | translate }}</dt>
                    <dd class="mt-1">
                      <span *ngFor="let location of client.searchCriteria.preferredLocations; let last = last"
                            class="inline-block">
                        <span class="badge badge-primary">{{ location }}</span>
                        <span *ngIf="!last" class="mr-1"></span>
                      </span>
                    </dd>
                  </div>
                  <div *ngIf="client.searchCriteria.propertyTypes && client.searchCriteria.propertyTypes.length > 0">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ 'clients.propertyTypes' | translate }}</dt>
                    <dd class="mt-1">
                      <span *ngFor="let type of client.searchCriteria.propertyTypes; let last = last"
                            class="inline-block">
                        <span class="badge badge-primary">{{ type }}</span>
                        <span *ngIf="!last" class="mr-1"></span>
                      </span>
                    </dd>
                  </div>
                  <div *ngIf="client.searchCriteria.additionalRequirements" class="md:col-span-3">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ 'clients.additionalRequirements' | translate }}</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ client.searchCriteria.additionalRequirements }}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          <!-- Call Notes Section -->
          <div class="card mt-8">
            <div class="card-header flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">{{ 'clients.recentCallNotes' | translate }}</h3>
              <div class="flex items-center space-x-2">
                <button *ngIf="!aiSummary && callNotesSummary && callNotesSummary.totalCallNotes > 0"
                        (click)="generateAiSummary()"
                        [disabled]="isLoadingAi"
                        class="btn btn-outline btn-sm">
                  <svg *ngIf="!isLoadingAi" class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  <span *ngIf="isLoadingAi" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-1"></span>
                  {{ isLoadingAi ? ('call-notes.ai-summary.generating' | translate) : ('call-notes.ai-summary.generate' | translate) }}
                </button>
                <a [routerLink]="['/call-notes/client', client.id, 'summary']"
                   class="btn btn-outline btn-sm">
                  {{ 'clients.viewSummary' | translate }}
                </a>
                <a [routerLink]="['/call-notes/client', client.id, 'new']"
                   class="btn btn-primary btn-sm">
                  {{ 'clients.addCallNote' | translate }}
                </a>
              </div>
            </div>
            <div class="card-body">
              <!-- AI Summary Section -->
              <div *ngIf="aiSummary && aiSummary.available" class="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <div class="flex items-start justify-between mb-2">
                  <div class="flex items-center">
                    <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{{ 'call-notes.ai-summary.title' | translate }}</h4>
                  </div>
                  <button (click)="aiSummary = null" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
                <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{{ aiSummary.summary }}</p>
                <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {{ 'call-notes.ai-summary.based-on' | translate }} {{ aiSummary.callNotesCount }} {{ 'call-notes.title' | translate }}
                  <span *ngIf="aiSummary.generatedAt"> • {{ aiSummary.generatedAt | date:'short' }}</span>
                </div>
              </div>

              <!-- AI Error -->
              <div *ngIf="aiError" class="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div class="flex items-start">
                  <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                  <div class="flex-1">
                    <p class="text-sm text-yellow-800 dark:text-yellow-200">{{ aiError }}</p>
                  </div>
                  <button (click)="aiError = null" class="text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-300">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <!-- Call Notes Summary Stats -->
              <div *ngIf="callNotesSummary" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ callNotesSummary.totalCallNotes }}</div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">{{ 'clients.totalNotes' | translate }}</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ callNotesSummary.pendingFollowUps }}</div>
                  <div class="text-sm text-gray-500 dark:text-gray-400">{{ 'clients.pendingFollowUps' | translate }}</div>
                </div>
                <div class="text-center">
                  <div class="text-sm text-gray-500 dark:text-gray-400">{{ 'clients.lastContact' | translate }}</div>
                  <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ callNotesSummary.lastCallDate ? (callNotesSummary.lastCallDate | date:'short') : ('common.never' | translate) }}
                  </div>
                </div>
              </div>

              <!-- Recent Call Notes -->
              <div *ngIf="recentCallNotes.length > 0">
                <div class="space-y-4">
                  <div *ngFor="let note of recentCallNotes"
                       class="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors cursor-pointer"
                       [routerLink]="['/call-notes', note.id]">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center space-x-2">
                          <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ note.subject }}</h4>
                          <span *ngIf="note.followUpRequired"
                                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            {{ 'clients.followUpRequired' | translate }}
                          </span>
                          <span *ngIf="note.outcome"
                                [ngClass]="getOutcomeClass(note.outcome)"
                                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">
                            {{ callNotesService.formatCallOutcome(note.outcome) }}
                          </span>
                        </div>
                        <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {{ callNotesService.formatCallType(note.callType) }} •
                          {{ note.callDate | date:'short' }}
                          <span *ngIf="note.followUpDate"> • {{ 'clients.followUpBy' | translate }} {{ note.followUpDate | date:'short' }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- View All Link -->
                <div class="mt-4 text-center">
                  <a [routerLink]="['/call-notes/client', client.id]"
                     class="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                    {{ 'clients.viewAllCallNotes' | translate }} ({{ callNotesSummary?.totalCallNotes || 0 }})
                    <svg class="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  </a>
                </div>
              </div>

              <!-- No Call Notes -->
              <div *ngIf="recentCallNotes.length === 0 && !isLoadingCallNotes" class="text-center py-6">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.013 8.013 0 01-2.919-.594l-2.252.637a1 1 0 01-1.194-1.194l.637-2.252A8.013 8.013 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                </svg>
                <h4 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">{{ 'clients.noCallNotes' | translate }}</h4>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ 'clients.callNotesDescription' | translate }}</p>
                <div class="mt-4">
                  <a [routerLink]="['/call-notes/client', client.id, 'new']"
                     class="btn btn-primary">
                    {{ 'clients.addFirstCallNote' | translate }}
                  </a>
                </div>
              </div>

              <!-- Loading Call Notes -->
              <div *ngIf="isLoadingCallNotes" class="text-center py-6">
                <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ 'clients.loadingCallNotes' | translate }}</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-8 flex justify-between">
            <a routerLink="/clients" class="btn btn-outline">
              ← {{ 'clients.backToClients' | translate }}
            </a>
            <div class="space-x-3">
              <button (click)="deleteClient()" class="btn btn-danger" [disabled]="isDeleting">
                {{ isDeleting ? ('clients.deleting' | translate) : ('clients.delete' | translate) }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="!isLoading && !client" class="text-center py-8">
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ 'clients.notFound' | translate }}</p>
        <a routerLink="/clients" class="text-primary-600 hover:text-primary-900 text-sm font-medium">{{ 'clients.backToClients' | translate }}</a>
      </div>
    </div>
  `
})
export class ClientDetailComponent implements OnInit {
  client: Client | null = null;
  isLoading = false;
  isDeleting = false;

  // Call Notes
  recentCallNotes: CallNoteSummary[] = [];
  callNotesSummary: BulkSummary | null = null;
  isLoadingCallNotes = false;

  // AI Summary
  aiSummary: AiSummary | null = null;
  isLoadingAi = false;
  aiError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientService: ClientService,
    public callNotesService: CallNotesService
  ) {}

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id');
    if (clientId) {
      this.loadClient(clientId);
      this.loadCallNotes(clientId);
    }
  }

  private loadClient(id: string): void {
    this.isLoading = true;
    this.clientService.getClient(id).subscribe({
      next: (client) => {
        this.client = client;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading client:', error);
        this.isLoading = false;
      }
    });
  }

  private loadCallNotes(clientId: string): void {
    this.isLoadingCallNotes = true;

    // Load recent call notes (last 5)
    this.callNotesService.getCallNotesByClient(clientId, 0, 5).subscribe({
      next: (response: PagedResponse<CallNoteSummary>) => {
        this.recentCallNotes = response.content;
        this.isLoadingCallNotes = false;
      },
      error: (error) => {
        console.error('Error loading call notes:', error);
        this.isLoadingCallNotes = false;
      }
    });

    // Load call notes summary
    this.callNotesService.getClientCallNotesSummary(clientId).subscribe({
      next: (summary: BulkSummary) => {
        this.callNotesSummary = summary;
      },
      error: (error) => {
        console.error('Error loading call notes summary:', error);
      }
    });
  }

  hasAddress(): boolean {
    return !!(this.client?.addressStreet || this.client?.addressCity ||
              this.client?.addressPostalCode || this.client?.addressCountry);
  }

  getOutcomeClass(outcome: string): string {
    switch (outcome) {
      case 'INTERESTED':
        return 'bg-green-100 text-green-800';
      case 'NOT_INTERESTED':
        return 'bg-red-100 text-red-800';
      case 'SCHEDULED_VIEWING':
        return 'bg-blue-100 text-blue-800';
      case 'OFFER_MADE':
        return 'bg-yellow-100 text-yellow-800';
      case 'DEAL_CLOSED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  deleteClient(): void {
    if (this.client && confirm(this.getTranslation('clients.deleteConfirm'))) {
      this.isDeleting = true;
      this.clientService.deleteClient(this.client.id!).subscribe({
        next: () => {
          this.router.navigate(['/clients']);
        },
        error: (error) => {
          console.error('Error deleting client:', error);
          this.isDeleting = false;
          alert(this.getTranslation('clients.deleteError'));
        }
      });
    }
  }

  private getTranslation(key: string): string {
    // This is a simple helper - in production you'd inject TranslateService
    // For now, return English fallback
    const translations: Record<string, string> = {
      'clients.deleteConfirm': 'Are you sure you want to delete this client? This action cannot be undone.',
      'clients.deleteError': 'Failed to delete client. Please try again.'
    };
    return translations[key] || key;
  }

  generateAiSummary(): void {
    if (!this.client?.id) return;

    this.isLoadingAi = true;
    this.aiError = null;

    this.callNotesService.generateAiSummary(this.client.id).subscribe({
      next: (summary: AiSummary) => {
        this.aiSummary = summary;
        this.isLoadingAi = false;
        if (!summary.available) {
          this.aiError = summary.summary;
        }
      },
      error: (error) => {
        console.error('Error generating AI summary:', error);
        this.isLoadingAi = false;
        this.aiError = 'Failed to generate AI summary. Please try again.';
      }
    });
  }
}