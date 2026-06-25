import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ClientService, Client } from '../../services/client.service';
import { CallNotesService, CallNoteSummary, BulkSummary, PagedResponse, CallNoteCreateRequest, CallType, CallOutcome } from '../../../call-notes/services/call-notes.service';
import { TranslateEnumPipe } from '../../../../shared/pipes/translate-enum.pipe';
import { FileAttachmentManagerComponent } from '../../../../shared/components/file-attachment-manager/file-attachment-manager.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, TranslateEnumPipe, FileAttachmentManagerComponent, LoadingSpinnerComponent],
  template: `
    <div class="p-6">
      <div *ngIf="isLoading" class="text-center py-8">
        <app-loading-spinner size="lg"></app-loading-spinner>
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

        <!-- ── Follow-up Kontakt-Panel ─────────────────────── -->
        <div *ngIf="showContactPanel"
             style="border-left:4px solid #d9534f; background:var(--surface,#fff);
                    border-radius:12px; padding:20px 24px; margin-top:20px;
                    box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:16px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <i class="ph-fill ph-warning" style="color:#d9534f; font-size:20px; flex-shrink:0;"></i>
              <div>
                <div style="font-size:12px; font-weight:700; color:#d9534f; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:2px;">Follow-up fällig</div>
                <div style="font-size:15px; font-weight:600; color:var(--text);">{{ followUpSubject }}</div>
              </div>
            </div>
            <button (click)="dismissContactPanel()"
                    style="background:none; border:none; cursor:pointer; padding:4px; color:var(--text-3); font-size:18px; line-height:1;">
              <i class="ph ph-x"></i>
            </button>
          </div>

          <!-- Kontakt-Buttons -->
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;">
            <a *ngIf="client.phone" [href]="'tel:' + client.phone"
               style="display:inline-flex; align-items:center; gap:8px; padding:10px 18px;
                      background:var(--primary,#2f6b7a); color:#fff; border-radius:8px;
                      font-size:14px; font-weight:600; text-decoration:none;">
              <i class="ph-bold ph-phone" style="font-size:16px;"></i>
              {{ client.phone }}
            </a>
            <a *ngIf="client.email" [href]="'mailto:' + client.email"
               style="display:inline-flex; align-items:center; gap:8px; padding:10px 18px;
                      background:transparent; color:var(--primary,#2f6b7a);
                      border:1.5px solid var(--primary,#2f6b7a); border-radius:8px;
                      font-size:14px; font-weight:600; text-decoration:none;">
              <i class="ph-bold ph-envelope" style="font-size:16px;"></i>
              E-Mail
            </a>
            <span *ngIf="!client.phone && !client.email"
                  style="font-size:13px; color:var(--text-3); align-self:center;">
              Keine Kontaktdaten hinterlegt —
              <a [routerLink]="['/clients', client.id, 'edit']" style="color:var(--primary);">Jetzt ergänzen</a>
            </span>
          </div>

          <!-- Schnelle Gesprächsnotiz -->
          <div style="border-top:1px solid var(--border); padding-top:16px;">
            <div style="font-size:13px; font-weight:600; color:var(--text-2); margin-bottom:10px;">
              Kontakt direkt notieren
            </div>
            <textarea [(ngModel)]="quickNoteText"
                      placeholder="Kurze Notiz zum Gespräch..."
                      rows="2"
                      style="width:100%; padding:10px 12px; border:1.5px solid var(--border);
                             border-radius:8px; font-size:14px; color:var(--text);
                             background:var(--input-bg,#f9f9f9); resize:vertical;
                             font-family:inherit; margin-bottom:10px; box-sizing:border-box;">
            </textarea>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <select [(ngModel)]="quickNoteOutcome"
                      style="padding:8px 12px; border:1.5px solid var(--border); border-radius:8px;
                             font-size:13px; color:var(--text); background:var(--input-bg,#f9f9f9);
                             cursor:pointer;">
                <option value="">Ergebnis wählen…</option>
                <option value="INTERESTED">Interessiert</option>
                <option value="NOT_INTERESTED">Kein Interesse</option>
                <option value="SCHEDULED_VIEWING">Besichtigung vereinbart</option>
                <option value="OFFER_MADE">Angebot gemacht</option>
                <option value="DEAL_CLOSED">Abschluss</option>
              </select>
              <button (click)="saveQuickNote()"
                      [disabled]="isSavingNote || !quickNoteText.trim()"
                      style="padding:8px 18px; background:var(--primary,#2f6b7a); color:#fff;
                             border:none; border-radius:8px; font-size:13px; font-weight:600;
                             cursor:pointer; opacity:1; transition:opacity 0.15s;"
                      [style.opacity]="(isSavingNote || !quickNoteText.trim()) ? '0.5' : '1'">
                <i class="ph ph-check" style="margin-right:4px;"></i>
                {{ isSavingNote ? 'Wird gespeichert…' : 'Notiz speichern' }}
              </button>
            </div>
          </div>
        </div>
        <!-- ── Ende Kontakt-Panel ──────────────────────────── -->

        <!-- ── Kontakt-Überblick ─────────────────────────────── -->
        <div style="margin-top:20px; background:var(--surface,#fff); border:1.5px solid var(--border);
                    border-radius:12px; padding:20px 24px;">
          <!-- Title -->
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
            <i class="ph-fill ph-chat-circle-text" style="font-size:18px; color:var(--primary);"></i>
            <span style="font-size:15px; font-weight:700; color:var(--text);">Kontakthistorie</span>
          </div>

          <!-- Loading -->
          <app-loading-spinner *ngIf="isLoadingCallNotes && !callNotesSummary" size="sm"></app-loading-spinner>

          <!-- Stats chips -->
          <div *ngIf="callNotesSummary" style="display:flex; gap:10px; flex-wrap:wrap;">
            <span style="display:inline-flex; align-items:center; gap:5px; padding:5px 12px;
                         background:rgba(47,107,122,0.1); border-radius:20px;">
              <i class="ph ph-phone" style="font-size:13px; color:var(--primary);"></i>
              <strong style="font-size:13px; color:var(--primary);">{{ callNotesSummary.totalCallNotes }}</strong>
              <span style="font-size:12px; color:var(--text-2);">Gespräche</span>
            </span>
            <span style="display:inline-flex; align-items:center; gap:5px; padding:5px 12px;
                         background:rgba(0,0,0,0.04); border-radius:20px;">
              <i class="ph ph-calendar-blank" style="font-size:13px; color:var(--text-3);"></i>
              <span style="font-size:12px; color:var(--text-2);">
                {{ callNotesSummary.lastCallDate ? (callNotesSummary.lastCallDate | date:'dd.MM.yy') : 'Noch kein Kontakt' }}
              </span>
            </span>
            <span *ngIf="callNotesSummary.pendingFollowUps > 0"
                  style="display:inline-flex; align-items:center; gap:5px; padding:5px 12px;
                         background:rgba(192,122,30,0.12); border-radius:20px;">
              <i class="ph ph-clock-countdown" style="font-size:13px; color:#c07a1e;"></i>
              <strong style="font-size:13px; color:#c07a1e;">{{ callNotesSummary.pendingFollowUps }}</strong>
              <span style="font-size:12px; color:#c07a1e;">offene Follow-ups</span>
            </span>
            <span *ngIf="callNotesSummary.lastOutcome"
                  style="display:inline-flex; align-items:center; gap:5px; padding:5px 12px;
                         background:rgba(0,0,0,0.04); border-radius:20px;">
              <i class="ph ph-flag" style="font-size:13px; color:var(--text-3);"></i>
              <span style="font-size:12px; color:var(--text-2);">{{ callNotesSummary.lastOutcome | translateEnum:'callOutcome' }}</span>
            </span>
          </div>

          <!-- Mini-timeline: last 3 notes -->
          <div *ngIf="recentCallNotes.length > 0"
               style="border-top:1px solid var(--border); margin-top:14px; padding-top:14px;">
            <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em;
                        color:var(--text-3); margin-bottom:10px;">Letzte Kontakte</div>
            <div *ngFor="let note of previewCallNotes; let last = last"
                 style="display:flex; align-items:center; gap:10px;"
                 [style.margin-bottom]="last ? '0' : '8px'">
              <span style="font-size:12px; color:var(--text-3); white-space:nowrap; min-width:38px;">
                {{ note.callDate | date:'dd.MM' }}
              </span>
              <div style="width:26px; height:26px; border-radius:50%;
                          background:rgba(0,0,0,0.05); display:flex; align-items:center;
                          justify-content:center; flex-shrink:0;">
                <i [class]="getCallTypeIcon(note.callType)" style="font-size:12px; color:var(--text-3);"></i>
              </div>
              <span style="flex:1; font-size:13px; color:var(--text);
                           white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                {{ note.subject }}
              </span>
              <span *ngIf="note.outcome"
                    [ngClass]="getOutcomeClass(note.outcome)"
                    style="font-size:11px; font-weight:600; padding:2px 8px;
                           border-radius:10px; white-space:nowrap; flex-shrink:0;">
                {{ note.outcome | translateEnum:'callOutcome' }}
              </span>
            </div>
          </div>

          <!-- Empty state -->
          <div *ngIf="!isLoadingCallNotes && !callNotesSummary"
               style="color:var(--text-3); font-size:13px; text-align:center; padding:8px 0;">
            Noch keine Kontakthistorie vorhanden.
          </div>
        </div>
        <!-- ── Ende Kontakt-Überblick ────────────────────────── -->

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
                  <div *ngIf="hasAddress()">
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ 'clients.address' | translate }}</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ getAddressSummary() }}</dd>
                  </div>
                </dl>
                <!-- GDPR compliance indicator -->
                <div style="margin-top:14px; padding-top:12px; border-top:1px solid var(--border);
                            display:flex; align-items:center; gap:6px;">
                  <i [class]="client.gdprConsentGiven ? 'ph ph-shield-check' : 'ph ph-shield-warning'"
                     [style.color]="client.gdprConsentGiven ? '#1f8a5b' : '#b23a55'"
                     style="font-size:13px; flex-shrink:0;"></i>
                  <span style="font-size:11px; color:var(--text-3);">
                    DSGVO
                    {{ client.gdprConsentGiven ? 'Einwilligung erteilt' : 'Kein Einverständnis' }}
                    <ng-container *ngIf="client.gdprConsentGiven && client.gdprConsentDate">
                      · {{ client.gdprConsentDate | date:'dd.MM.yy' }}
                    </ng-container>
                  </span>
                </div>
              </div>
            </div>

            <!-- Search Criteria -->
            <div class="card lg:col-span-2" *ngIf="client.searchCriteria">
              <div class="card-header flex items-center justify-between">
                <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">{{ 'clients.propertySearchCriteria' | translate }}</h3>
                <a [routerLink]="['/clients', client.id, 'edit']" class="btn btn-outline btn-sm">
                  {{ 'clients.editSearchCriteria' | translate }}
                </a>
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
            </div>
            <div class="card-body">
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
                       class="border border-gray-200 rounded-lg p-4">
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
                            {{ note.outcome | translateEnum:'callOutcome' }}
                          </span>
                        </div>
                        <div class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {{ note.callType | translateEnum:'callType' }} •
                          {{ note.callDate | date:'short' }}
                          <span *ngIf="note.followUpDate"> • {{ 'clients.followUpBy' | translate }} {{ note.followUpDate | date:'short' }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
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
              </div>

              <!-- Loading Call Notes -->
              <div *ngIf="isLoadingCallNotes" class="text-center py-6">
                <app-loading-spinner></app-loading-spinner>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ 'clients.loadingCallNotes' | translate }}</p>
              </div>
            </div>
          </div>

          <!-- File Attachments Section -->
          <div class="card mt-8">
            <div class="card-header">
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                {{ 'attachments.sectionTitle' | translate }}
              </h3>
            </div>
            <div class="card-body">
              <app-file-attachment-manager
                entityType="client"
                [entityId]="client.id!"
              ></app-file-attachment-manager>
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

  // Follow-up contact panel
  showContactPanel = false;
  followUpSubject = '';
  quickNoteText = '';
  quickNoteOutcome = '';
  isSavingNote = false;

  // Call Notes
  recentCallNotes: CallNoteSummary[] = [];
  previewCallNotes: CallNoteSummary[] = [];
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

    const action = this.route.snapshot.queryParamMap.get('action');
    if (action === 'contact') {
      this.showContactPanel = true;
      this.followUpSubject = this.route.snapshot.queryParamMap.get('subject') ?? '';
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
        this.previewCallNotes = response.content.slice(0, 3);
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

  dismissContactPanel(): void {
    this.showContactPanel = false;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }

  saveQuickNote(): void {
    if (!this.client?.id || !this.quickNoteText.trim()) return;
    this.isSavingNote = true;

    const request: CallNoteCreateRequest = {
      clientId: this.client.id,
      callDate: new Date().toISOString(),
      callType: CallType.PHONE_OUTBOUND,
      subject: this.followUpSubject || 'Follow-up Kontakt',
      notes: this.quickNoteText.trim(),
      followUpRequired: false,
      outcome: (this.quickNoteOutcome as CallOutcome) || undefined
    };

    this.callNotesService.createCallNote(request).subscribe({
      next: () => {
        this.isSavingNote = false;
        this.loadCallNotes(this.client!.id!);
        this.dismissContactPanel();
      },
      error: () => {
        this.isSavingNote = false;
      }
    });
  }

  hasAddress(): boolean {
    return !!(this.client?.addressStreet || this.client?.addressCity ||
              this.client?.addressPostalCode || this.client?.addressCountry);
  }

  getAddressSummary(): string {
    if (!this.client) return '';
    const parts = [this.client.addressCity, this.client.addressPostalCode].filter(Boolean);
    return parts.length ? parts.join(', ') : (this.client.addressStreet ?? '');
  }

  getCallTypeIcon(callType: CallType): string {
    switch (callType) {
      case CallType.PHONE_INBOUND:  return 'ph ph-phone-incoming';
      case CallType.PHONE_OUTBOUND: return 'ph ph-phone-outgoing';
      case CallType.EMAIL:          return 'ph ph-envelope';
      case CallType.MEETING:        return 'ph ph-handshake';
      default:                      return 'ph ph-chat-circle';
    }
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
}