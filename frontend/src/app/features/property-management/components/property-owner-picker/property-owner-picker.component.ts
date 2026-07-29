import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import {
  Client,
  ClientService,
  ClientType,
  LegalBasis
} from '../../../client-management/services/client.service';
import { PropertyOwner } from '../../services/property.service';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';

/**
 * Eigentümer-Auswahl für das Immobilienformular (Issue #37).
 *
 * Ersetzt die drei Freitextfelder durch die Verknüpfung mit einem echten Kunden. Gesucht
 * wird über den bestehenden Kunden-Suchendpunkt, Verkäufer stehen oben — ein Eigentümer,
 * der schon als Käufer erfasst ist, bleibt trotzdem auffindbar, statt hinter einem harten
 * SELLER-Filter zu verschwinden.
 *
 * Die Neuanlage nutzt bewusst die vorhandene Dublettenprüfung aus der Kundenanlage
 * (Issue #11) statt einer zweiten, abweichenden Prüfung.
 */
@Component({
  selector: 'app-property-owner-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <!-- Ausgewählter Eigentümer -->
    <div *ngIf="selectedOwner"
         style="display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);">
      <div style="width:36px;height:36px;border-radius:10px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <i class="ri-user-line" style="font-size:17px;color:var(--primary);"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:14px;font-weight:600;color:var(--text);">{{ ownerLabel(selectedOwner) }}</div>
        <div style="font-size:12px;color:var(--text-3);">{{ contactLine(selectedOwner) || ('properties.owner.noContactData' | translate) }}</div>
      </div>
      <div class="form-actions" style="gap:8px;">
        <button type="button" class="btn-secondary" style="height:34px;padding:0 12px;font-size:13px;"
                (click)="startSearch()">
          <i class="ri-pencil-line"></i>{{ 'properties.owner.change' | translate }}
        </button>
        <button type="button" class="btn-secondary" style="height:34px;padding:0 12px;font-size:13px;"
                (click)="clearOwner()">
          <i class="ri-close-line"></i>{{ 'properties.owner.remove' | translate }}
        </button>
      </div>
    </div>

    <!-- Suche -->
    <div *ngIf="!selectedOwner && !isCreating">
      <div style="position:relative;">
        <i class="ri-search-line"
           style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:15px;color:var(--text-3);"></i>
        <input type="text"
               class="form-input"
               style="padding-left:36px;"
               [ngModel]="searchTerm"
               (ngModelChange)="onSearchTermChange($event)"
               [placeholder]="'properties.owner.searchPlaceholder' | translate">
      </div>

      <div *ngIf="isSearching" style="padding:10px 2px;font-size:13px;color:var(--text-3);">
        {{ 'common.loading' | translate }}
      </div>

      <div *ngIf="!isSearching && results.length > 0"
           style="margin-top:8px;display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto;">
        <button *ngFor="let c of results" type="button"
                (click)="selectClient(c)"
                style="display:flex;align-items:center;gap:10px;padding:9px 11px;border:1px solid var(--border);border-radius:10px;background:var(--surface);text-align:left;cursor:pointer;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:var(--text);">{{ ownerLabel(c) }}</div>
            <div style="font-size:11px;color:var(--text-3);">{{ contactLine(c) }}</div>
          </div>
          <span *ngIf="c.clientType === 'SELLER'"
                style="font-size:10px;font-weight:700;color:var(--primary);background:var(--accent-soft);padding:2px 7px;border-radius:8px;flex-shrink:0;">
            {{ 'properties.owner.sellerBadge' | translate }}
          </span>
        </button>
      </div>

      <p *ngIf="!isSearching && searchTerm.trim().length >= 2 && results.length === 0"
         style="margin:8px 0 0;font-size:13px;color:var(--text-3);">
        {{ 'properties.owner.noResults' | translate }}
      </p>

      <div class="form-actions" style="margin-top:12px;">
        <button type="button" class="btn-secondary" (click)="startCreate()">
          <i class="ri-add-line"></i>{{ 'properties.owner.createNew' | translate }}
        </button>
      </div>
    </div>

    <!-- Neuanlage -->
    <div *ngIf="isCreating"
         style="padding:14px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);">
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px;">
        {{ 'properties.owner.createTitle' | translate }}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="ownerFirstName" class="form-label text-sm">{{ 'clients.firstName' | translate }}</label>
          <input type="text" id="ownerFirstName" class="form-input"
                 [ngModel]="draft.firstName" (ngModelChange)="onDraftNameChange('firstName', $event)">
        </div>
        <div>
          <label for="ownerLastName" class="form-label text-sm">{{ 'clients.lastName' | translate }}</label>
          <input type="text" id="ownerLastName" class="form-input"
                 [ngModel]="draft.lastName" (ngModelChange)="onDraftNameChange('lastName', $event)">
        </div>
        <div>
          <label for="ownerEmail" class="form-label text-sm">{{ 'clients.email' | translate }}</label>
          <input type="email" id="ownerEmail" class="form-input" [(ngModel)]="draft.email">
        </div>
        <div>
          <label for="ownerPhone" class="form-label text-sm">{{ 'clients.phone' | translate }}</label>
          <input type="tel" id="ownerPhone" class="form-input"
                 [ngModel]="draft.phone" (ngModelChange)="onDraftNameChange('phone', $event)">
        </div>
      </div>

      <!-- Dublettenwarnung aus der Kundenanlage (#11), nicht blockierend -->
      <div *ngIf="duplicateWarnings.length > 0"
           style="margin-top:12px;padding:10px 12px;border:1px solid var(--color-warning);border-radius:10px;background:var(--color-warning-soft);">
        <div style="font-size:13px;font-weight:700;color:var(--color-warning);margin-bottom:4px;">
          {{ 'clients.duplicateWarningTitle' | translate }}
        </div>
        <button *ngFor="let d of duplicateWarnings" type="button" (click)="selectClient(d)"
                style="display:block;width:100%;text-align:left;font-size:13px;color:var(--text-2);background:none;border:none;padding:2px 0;cursor:pointer;">
          {{ ownerLabel(d) }}<ng-container *ngIf="contactLine(d)"> · {{ contactLine(d) }}</ng-container>
          — {{ 'properties.owner.useExisting' | translate }}
        </button>
      </div>

      <p *ngIf="createError" class="form-error" style="margin-top:10px;">{{ createError }}</p>

      <p style="margin:10px 0 0;font-size:12px;color:var(--text-3);">
        {{ 'properties.owner.legalBasisHint' | translate }}
      </p>

      <div class="form-actions" style="margin-top:12px;">
        <button type="button" class="btn-primary" [disabled]="!canCreate() || isSaving" (click)="createOwner()">
          <i class="ri-check-line"></i>{{ 'properties.owner.createConfirm' | translate }}
        </button>
        <button type="button" class="btn-secondary" (click)="cancelCreate()">
          <i class="ri-close-line"></i>{{ 'common.cancel' | translate }}
        </button>
      </div>
    </div>
  `
})
export class PropertyOwnerPickerComponent implements OnInit, OnDestroy {
  /** Bereits verknüpfter Eigentümer beim Öffnen im Bearbeitungsmodus. */
  @Input() owner?: PropertyOwner | null;

  /** Client-ID des gewählten Eigentümers, oder null wenn die Zuordnung entfernt wurde. */
  @Output() ownerIdChange = new EventEmitter<string | null>();

  selectedOwner: Client | PropertyOwner | null = null;
  searchTerm = '';
  results: Client[] = [];
  isSearching = false;

  isCreating = false;
  isSaving = false;
  createError = '';
  draft: Client = { firstName: '', lastName: '', email: '', phone: '', gdprConsentGiven: false };
  duplicateWarnings: Client[] = [];

  private searchInput$ = new Subject<string>();
  private duplicateInput$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  constructor(
    private clientService: ClientService,
    private errorHandler: ErrorHandlerService
  ) {}

  ngOnInit(): void {
    this.selectedOwner = this.owner ?? null;

    this.searchInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => this.runSearch(term));

    this.duplicateInput$.pipe(
      debounceTime(400),
      takeUntil(this.destroy$)
    ).subscribe(() => this.checkForDuplicates());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ownerLabel(client: Client | PropertyOwner): string {
    return client.fullName || `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim();
  }

  contactLine(client: Client | PropertyOwner): string {
    return [client.email, client.phone].filter(Boolean).join(' · ');
  }

  onSearchTermChange(term: string): void {
    this.searchTerm = term;
    this.searchInput$.next(term);
  }

  private runSearch(term: string): void {
    const trimmed = term.trim();
    if (trimmed.length < 2) {
      this.results = [];
      this.isSearching = false;
      return;
    }

    this.isSearching = true;
    this.clientService.searchClients(trimmed, 0, 20).subscribe({
      next: page => {
        // Verkäufer zuerst: sie sind der erwartete Treffer, alles andere bleibt erreichbar.
        this.results = [...page.content].sort((a, b) =>
          Number(b.clientType === ClientType.SELLER) - Number(a.clientType === ClientType.SELLER));
        this.isSearching = false;
      },
      error: () => {
        this.results = [];
        this.isSearching = false;
      }
    });
  }

  selectClient(client: Client): void {
    this.selectedOwner = client;
    this.isCreating = false;
    this.results = [];
    this.searchTerm = '';
    this.ownerIdChange.emit(client.id ?? null);
  }

  startSearch(): void {
    this.selectedOwner = null;
    this.isCreating = false;
    this.ownerIdChange.emit(null);
  }

  clearOwner(): void {
    this.selectedOwner = null;
    this.isCreating = false;
    this.searchTerm = '';
    this.results = [];
    this.ownerIdChange.emit(null);
  }

  startCreate(): void {
    this.isCreating = true;
    this.createError = '';
    this.duplicateWarnings = [];
    // Der eingetippte Suchbegriff ist meistens schon der Name — nicht zweimal tippen lassen.
    const parts = this.searchTerm.trim().split(/\s+/).filter(Boolean);
    this.draft = {
      firstName: parts.length > 1 ? parts.slice(0, -1).join(' ') : (parts[0] ?? ''),
      lastName: parts.length > 1 ? parts[parts.length - 1] : '',
      email: '',
      phone: '',
      gdprConsentGiven: false
    };
    if (this.draft.firstName && this.draft.lastName) {
      this.duplicateInput$.next();
    }
  }

  cancelCreate(): void {
    this.isCreating = false;
    this.createError = '';
    this.duplicateWarnings = [];
  }

  onDraftNameChange(field: 'firstName' | 'lastName' | 'phone', value: string): void {
    this.draft[field] = value;
    this.duplicateInput$.next();
  }

  private checkForDuplicates(): void {
    const { firstName, lastName, phone } = this.draft;
    const hasName = !!firstName?.trim() && !!lastName?.trim();
    if (!hasName && !phone?.trim()) {
      this.duplicateWarnings = [];
      return;
    }
    this.clientService.checkDuplicateClients(firstName ?? '', lastName ?? '', phone ?? '')
      .subscribe(matches => (this.duplicateWarnings = matches));
  }

  canCreate(): boolean {
    return !!this.draft.firstName?.trim() && !!this.draft.lastName?.trim();
  }

  createOwner(): void {
    if (!this.canCreate() || this.isSaving) {
      return;
    }
    this.isSaving = true;
    this.createError = '';

    // Rechtsgrundlage Art. 6(1)(b) DSGVO, keine Einwilligung: Eigentümerdaten werden zur
    // Anbahnung des Maklervertrags erhoben — das Häkchen wäre hier eine Formalie.
    const payload: Client = {
      firstName: this.draft.firstName.trim(),
      lastName: this.draft.lastName.trim(),
      email: this.draft.email?.trim() || undefined,
      phone: this.draft.phone?.trim() || undefined,
      clientType: ClientType.SELLER,
      legalBasis: LegalBasis.CONTRACT_INITIATION,
      gdprConsentGiven: false
    };

    this.clientService.createClient(payload).subscribe({
      next: created => {
        this.isSaving = false;
        this.selectClient(created);
      },
      error: err => {
        this.isSaving = false;
        this.createError = this.errorHandler.getUserMessage(err);
      }
    });
  }
}
