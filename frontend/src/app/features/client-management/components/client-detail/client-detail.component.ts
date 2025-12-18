import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ClientService, Client } from '../../services/client.service';
import { CallNotesService, CallNoteSummary, BulkSummary, PagedResponse } from '../../../call-notes/services/call-notes.service';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="p-6">
      <div *ngIf="isLoading" class="text-center py-8">
        <div class="spinner h-8 w-8 mx-auto"></div>
        <p class="mt-2 text-sm text-gray-500">Loading client details...</p>
      </div>

      <div *ngIf="!isLoading && client">
        <div class="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">{{ client.firstName }} {{ client.lastName }}</h1>
            <p class="mt-1 text-sm text-gray-500">Client Details</p>
          </div>
          <div class="mt-4 sm:mt-0 sm:ml-4">
            <a [routerLink]="['/clients', client.id, 'edit']" class="btn btn-primary">
              Edit Client
            </a>
          </div>
        </div>

        <div class="mt-8">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Personal Information -->
            <div class="card">
              <div class="card-header">
                <h3 class="text-lg font-medium text-gray-900">Personal Information</h3>
              </div>
              <div class="card-body">
                <dl class="space-y-4">
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Name</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ client.firstName }} {{ client.lastName }}</dd>
                  </div>
                  <div *ngIf="client.email">
                    <dt class="text-sm font-medium text-gray-500">Email</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ client.email }}</dd>
                  </div>
                  <div *ngIf="client.phone">
                    <dt class="text-sm font-medium text-gray-500">Phone</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ client.phone }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">GDPR Consent</dt>
                    <dd class="mt-1">
                      <span *ngIf="client.gdprConsentGiven" class="badge badge-success">✓ {{ 'clients.gdprConsentGiven' | translate }}</span>
                      <span *ngIf="!client.gdprConsentGiven" class="badge badge-error">✗ {{ 'common.no' | translate }} {{ 'clients.consent' | translate }}</span>
                    </dd>
                  </div>
                  <div *ngIf="client.gdprConsentDate">
                    <dt class="text-sm font-medium text-gray-500">Consent Date</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ client.gdprConsentDate | date:'medium' }}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Address Information -->
            <div class="card">
              <div class="card-header">
                <h3 class="text-lg font-medium text-gray-900">Address</h3>
              </div>
              <div class="card-body">
                <div *ngIf="hasAddress(); else noAddress">
                  <dl class="space-y-4">
                    <div *ngIf="client.addressStreet">
                      <dt class="text-sm font-medium text-gray-500">Street</dt>
                      <dd class="mt-1 text-sm text-gray-900">{{ client.addressStreet }}</dd>
                    </div>
                    <div *ngIf="client.addressCity">
                      <dt class="text-sm font-medium text-gray-500">City</dt>
                      <dd class="mt-1 text-sm text-gray-900">{{ client.addressCity }}</dd>
                    </div>
                    <div *ngIf="client.addressPostalCode">
                      <dt class="text-sm font-medium text-gray-500">Postal Code</dt>
                      <dd class="mt-1 text-sm text-gray-900">{{ client.addressPostalCode }}</dd>
                    </div>
                    <div *ngIf="client.addressCountry">
                      <dt class="text-sm font-medium text-gray-500">Country</dt>
                      <dd class="mt-1 text-sm text-gray-900">{{ client.addressCountry }}</dd>
                    </div>
                  </dl>
                </div>
                <ng-template #noAddress>
                  <p class="text-sm text-gray-500">No address information provided.</p>
                </ng-template>
              </div>
            </div>

            <!-- Search Criteria -->
            <div class="card lg:col-span-2" *ngIf="client.searchCriteria">
              <div class="card-header">
                <h3 class="text-lg font-medium text-gray-900">Property Search Criteria</h3>
              </div>
              <div class="card-body">
                <dl class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div *ngIf="client.searchCriteria.minSquareMeters || client.searchCriteria.maxSquareMeters">
                    <dt class="text-sm font-medium text-gray-500">Size (sqm)</dt>
                    <dd class="mt-1 text-sm text-gray-900">
                      {{ client.searchCriteria.minSquareMeters || 'Any' }} - {{ client.searchCriteria.maxSquareMeters || 'Any' }}
                    </dd>
                  </div>
                  <div *ngIf="client.searchCriteria.minRooms || client.searchCriteria.maxRooms">
                    <dt class="text-sm font-medium text-gray-500">Rooms</dt>
                    <dd class="mt-1 text-sm text-gray-900">
                      {{ client.searchCriteria.minRooms || 'Any' }} - {{ client.searchCriteria.maxRooms || 'Any' }}
                    </dd>
                  </div>
                  <div *ngIf="client.searchCriteria.minBudget || client.searchCriteria.maxBudget">
                    <dt class="text-sm font-medium text-gray-500">Budget (EUR)</dt>
                    <dd class="mt-1 text-sm text-gray-900">
                      {{ client.searchCriteria.minBudget || 'Any' }} - {{ client.searchCriteria.maxBudget || 'Any' }}
                    </dd>
                  </div>
                  <div *ngIf="client.searchCriteria.preferredLocations && client.searchCriteria.preferredLocations.length > 0" class="md:col-span-2">
                    <dt class="text-sm font-medium text-gray-500">Preferred Locations</dt>
                    <dd class="mt-1">
                      <span *ngFor="let location of client.searchCriteria.preferredLocations; let last = last"
                            class="inline-block">
                        <span class="badge badge-primary">{{ location }}</span>
                        <span *ngIf="!last" class="mr-1"></span>
                      </span>
                    </dd>
                  </div>
                  <div *ngIf="client.searchCriteria.propertyTypes && client.searchCriteria.propertyTypes.length > 0">
                    <dt class="text-sm font-medium text-gray-500">Property Types</dt>
                    <dd class="mt-1">
                      <span *ngFor="let type of client.searchCriteria.propertyTypes; let last = last"
                            class="inline-block">
                        <span class="badge badge-primary">{{ type }}</span>
                        <span *ngIf="!last" class="mr-1"></span>
                      </span>
                    </dd>
                  </div>
                  <div *ngIf="client.searchCriteria.additionalRequirements" class="md:col-span-3">
                    <dt class="text-sm font-medium text-gray-500">Additional Requirements</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ client.searchCriteria.additionalRequirements }}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          <!-- Call Notes Section -->
          <div class="card mt-8">
            <div class="card-header flex items-center justify-between">
              <h3 class="text-lg font-medium text-gray-900">Recent Call Notes</h3>
              <div class="flex items-center space-x-2">
                <a [routerLink]="['/call-notes/client', client.id, 'summary']"
                   class="btn btn-outline btn-sm">
                  View Summary
                </a>
                <a [routerLink]="['/call-notes/client', client.id, 'new']"
                   class="btn btn-primary btn-sm">
                  Add Call Note
                </a>
              </div>
            </div>
            <div class="card-body">
              <!-- Call Notes Summary Stats -->
              <div *ngIf="callNotesSummary" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-900">{{ callNotesSummary.totalCallNotes }}</div>
                  <div class="text-sm text-gray-500">Total Notes</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-gray-900">{{ callNotesSummary.pendingFollowUps }}</div>
                  <div class="text-sm text-gray-500">Pending Follow-ups</div>
                </div>
                <div class="text-center">
                  <div class="text-sm text-gray-500">Last Contact</div>
                  <div class="text-sm font-medium text-gray-900">
                    {{ callNotesSummary.lastCallDate ? (callNotesSummary.lastCallDate | date:'short') : 'Never' }}
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
                          <h4 class="text-sm font-medium text-gray-900">{{ note.subject }}</h4>
                          <span *ngIf="note.followUpRequired"
                                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Follow-up Required
                          </span>
                          <span *ngIf="note.outcome"
                                [ngClass]="getOutcomeClass(note.outcome)"
                                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium">
                            {{ callNotesService.formatCallOutcome(note.outcome) }}
                          </span>
                        </div>
                        <div class="mt-1 text-sm text-gray-500">
                          {{ callNotesService.formatCallType(note.callType) }} •
                          {{ note.callDate | date:'short' }}
                          <span *ngIf="note.followUpDate"> • Follow up by {{ note.followUpDate | date:'short' }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- View All Link -->
                <div class="mt-4 text-center">
                  <a [routerLink]="['/call-notes/client', client.id]"
                     class="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-900">
                    View All Call Notes ({{ callNotesSummary?.totalCallNotes || 0 }})
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
                <h4 class="mt-2 text-sm font-medium text-gray-900">No call notes yet</h4>
                <p class="mt-1 text-sm text-gray-500">Get started by documenting your first interaction with this client.</p>
                <div class="mt-4">
                  <a [routerLink]="['/call-notes/client', client.id, 'new']"
                     class="btn btn-primary">
                    Add First Call Note
                  </a>
                </div>
              </div>

              <!-- Loading Call Notes -->
              <div *ngIf="isLoadingCallNotes" class="text-center py-6">
                <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                <p class="mt-2 text-sm text-gray-500">Loading call notes...</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-8 flex justify-between">
            <a routerLink="/clients" class="btn btn-outline">
              ← Back to Clients
            </a>
            <div class="space-x-3">
              <button (click)="deleteClient()" class="btn btn-danger" [disabled]="isDeleting">
                {{ isDeleting ? 'Deleting...' : 'Delete Client' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="!isLoading && !client" class="text-center py-8">
        <p class="text-sm text-gray-500">Client not found.</p>
        <a routerLink="/clients" class="text-primary-600 hover:text-primary-900 text-sm font-medium">Back to Clients</a>
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
    if (this.client && confirm('Are you sure you want to delete this client? This action cannot be undone.')) {
      this.isDeleting = true;
      this.clientService.deleteClient(this.client.id!).subscribe({
        next: () => {
          this.router.navigate(['/clients']);
        },
        error: (error) => {
          console.error('Error deleting client:', error);
          this.isDeleting = false;
          alert('Failed to delete client. Please try again.');
        }
      });
    }
  }
}