import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ClientService, Client, PipelineStage, SellerPipelineStage, ClientType, LeadSource } from '../../services/client.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EnumTranslationService } from '../../../../shared/services/enum-translation.service';
import { TranslateEnumPipe } from '../../../../shared/pipes/translate-enum.pipe';

type SortKey = 'name' | 'stage' | 'lastContact';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, LoadingSpinnerComponent, TranslateEnumPipe],
  styles: [`
    .toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:16px; }
    .search-box { position:relative; flex:1; min-width:220px; max-width:340px; }
    .search-box input { width:100%; padding:9px 12px 9px 36px; border:1px solid var(--border); border-radius:10px; background:var(--surface); color:var(--text); font-size:14px; font-family:inherit; box-sizing:border-box; }
    .search-box input:focus { outline:none; border-color:var(--primary); }
    .search-box > i { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-3); font-size:16px; }
    .seg { display:inline-flex; background:var(--surface-2); border:1px solid var(--border); border-radius:10px; padding:2px; gap:2px; }
    .seg button { border:none; background:none; padding:6px 11px; border-radius:8px; font-size:13px; font-weight:600; color:var(--text-2); cursor:pointer; font-family:inherit; white-space:nowrap; }
    .seg button.active { background:var(--surface); color:var(--text); box-shadow:var(--shadow); }
    .type-select { padding:8px 12px; border:1px solid var(--border); border-radius:10px; background:var(--surface); color:var(--text); font-size:13px; font-weight:600; font-family:inherit; cursor:pointer; }
    .type-select:focus { outline:none; border-color:var(--primary); }
    .result-count { font-size:13px; color:var(--text-3); margin-left:auto; white-space:nowrap; }

    .table-wrap { overflow-x:auto; border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow); }
    table.data { width:100%; border-collapse:separate; border-spacing:0; background:var(--surface); min-width:720px; }
    table.data thead th { text-align:left; font-size:12px; font-weight:600; color:var(--text-3); text-transform:uppercase; letter-spacing:0.03em; padding:11px 14px; border-bottom:1px solid var(--border); background:var(--surface-2); white-space:nowrap; }
    table.data th.sortable { cursor:pointer; user-select:none; }
    table.data th.sortable:hover { color:var(--text); }
    table.data th .sort-caret { font-size:11px; margin-left:3px; }
    table.data tbody tr { cursor:pointer; transition:background 0.12s; }
    table.data tbody tr:hover { background:var(--surface-2); }
    table.data tbody td { padding:10px 14px; border-bottom:1px solid var(--border); font-size:13px; color:var(--text-2); vertical-align:middle; }
    table.data tbody tr:last-child td { border-bottom:none; }
    table.data tbody tr.overdue { background:color-mix(in srgb,#b23a55 3%,var(--surface)); }

    .avatar { width:34px; height:34px; border-radius:50%; background:var(--primary); display:inline-flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; color:#fff; flex-shrink:0; letter-spacing:0.4px; }
    .client-cell { display:flex; align-items:center; gap:11px; }
    .client-name { font-weight:600; font-size:14px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .client-city { font-size:12px; color:var(--text-3); margin-top:1px; }
    .truncate { max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

    /* Pipeline stage — the ONLY color-coded badge in the row */
    .pill-stage { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:20px; border:none; cursor:pointer; font-size:11px; font-weight:600; font-family:inherit; }
    .stage-opt:hover { background:var(--surface-2) !important; }

    /* Last contact — muted by default, red only when overdue (actionable) */
    .contact-cell { display:flex; align-items:center; gap:6px; white-space:nowrap; }
    .contact-cell.od { color:#b23a55; font-weight:600; }

    /* Consent — subtle icon, no colored pill (demoted per design audit) */
    .consent-icon { font-size:17px; }
    .consent-icon.ok { color:var(--text-3); }
    .consent-icon.missing { color:var(--color-warning); }

    @media (max-width:900px) { .hide-md { display:none !important; } }
  `],
  template: `
    <div style="padding:28px 32px;">
      <!-- Header -->
      <div class="page-header" style="margin-bottom:20px;">
        <div>
          <h1 class="page-title">{{ 'clients.title' | translate }}</h1>
          <p style="font-size:14px; color:var(--text-2); margin-top:4px;">{{ 'clients.listDescription' | translate }}</p>
        </div>
        <div style="display:flex; gap:10px;">
          <a routerLink="/clients/import" class="btn-secondary">
            <i class="ri-upload-2-line"></i>
            {{ 'clients.importCsv' | translate }}
          </a>
          <a routerLink="/clients/new" class="btn-primary">
            <i class="ri-user-add-line"></i>
            {{ 'clients.addClient' | translate }}
          </a>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" style="text-align:center; padding:48px 0;">
        <app-loading-spinner size="lg"></app-loading-spinner>
        <p style="font-size:14px; color:var(--text-3);">{{ 'common.loading' | translate }}</p>
      </div>

      <!-- Empty State (no clients at all) -->
      <div *ngIf="!isLoading && allClients.length === 0"
        style="text-align:center; padding:56px 24px; background:var(--surface); border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow);">
        <i class="ri-group-line" style="font-size:48px; color:var(--text-3); display:block; margin-bottom:12px;"></i>
        <h3 style="font-size:15px; font-weight:600; color:var(--text); margin:0 0 6px;">{{ 'clients.noClientsFound' | translate }}</h3>
        <p style="font-size:13px; color:var(--text-2); margin:0 0 20px;">{{ 'clients.addFirstClient' | translate }}</p>
        <a routerLink="/clients/new" class="btn-primary" style="display:inline-flex;">
          <i class="ri-user-add-line"></i>
          {{ 'clients.addClient' | translate }}
        </a>
      </div>

      <!-- Toolbar + Table -->
      <ng-container *ngIf="!isLoading && allClients.length > 0">
        <div class="toolbar">
          <div class="search-box">
            <i class="ri-search-line"></i>
            <input type="text" [(ngModel)]="searchTerm" (ngModelChange)="applyView()"
                   [placeholder]="'clients.searchPlaceholder' | translate" />
          </div>

          <div class="seg">
            <button [class.active]="stageFilter === 'ALL'" (click)="setStageFilter('ALL')">
              {{ 'clients.allStages' | translate }}
            </button>
            <button *ngFor="let s of stageOptions"
                    [class.active]="stageFilter === s.value"
                    (click)="setStageFilter(s.value)">
              {{ s.labelKey | translate }}
            </button>
          </div>

          <select class="type-select" [(ngModel)]="typeFilter" (ngModelChange)="applyView()">
            <option value="ALL">{{ 'clients.allTypes' | translate }}</option>
            <option *ngFor="let t of typeOptions" [value]="t.value">{{ t.labelKey | translate }}</option>
          </select>

          <select class="type-select" [(ngModel)]="leadSourceFilter" (ngModelChange)="applyView()"
                  [title]="'clients.leadSourceFilterHint' | translate">
            <option value="ALL">{{ 'clients.allLeadSources' | translate }}</option>
            <option *ngFor="let s of leadSourceOptions" [value]="s">{{ s | translateEnum:'leadSource' }}</option>
            <option value="NONE">{{ 'clients.leadSourceNone' | translate }}</option>
          </select>

          <select class="type-select" [(ngModel)]="consentFilter" (ngModelChange)="applyView()"
                  [title]="'clients.marketingConsentFilterHint' | translate">
            <option value="ALL">{{ 'clients.marketingConsentFilter.ALL' | translate }}</option>
            <option value="GIVEN">{{ 'clients.marketingConsentFilter.GIVEN' | translate }}</option>
            <option value="MISSING">{{ 'clients.marketingConsentFilter.MISSING' | translate }}</option>
          </select>

          <label style="display:flex; align-items:center; gap:6px; font-size:13px; color:var(--text-2); cursor:pointer; user-select:none; white-space:nowrap;"
                 [title]="'clients.incompleteFilterHint' | translate">
            <input type="checkbox" [(ngModel)]="incompleteOnly" (ngModelChange)="applyView()" style="cursor:pointer;">
            {{ 'clients.incompleteFilter' | translate }}
          </label>

          <span class="result-count">{{ 'clients.resultCount' | translate:{ count: filtered.length } }}</span>
        </div>

        <!-- No filter matches -->
        <div *ngIf="filtered.length === 0"
          style="text-align:center; padding:44px 24px; background:var(--surface); border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow);">
          <i class="ri-filter-3-line" style="font-size:36px; color:var(--text-3); display:block; margin-bottom:10px;"></i>
          <p style="font-size:14px; color:var(--text-2); margin:0 0 14px;">{{ 'clients.noMatchingClients' | translate }}</p>
          <button (click)="clearFilters()" class="btn-secondary" style="display:inline-flex;">
            {{ 'clients.clearFilters' | translate }}
          </button>
        </div>

        <div *ngIf="filtered.length > 0" class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th class="sortable" (click)="toggleSort('name')">
                  {{ 'clients.col.client' | translate }}
                  <i *ngIf="sortKey === 'name'" class="sort-caret"
                     [class.ri-arrow-up-s-line]="sortDir === 'asc'" [class.ri-arrow-down-s-line]="sortDir === 'desc'"></i>
                </th>
                <th class="hide-md">{{ 'clients.col.type' | translate }}</th>
                <th class="hide-md">{{ 'clients.col.searching' | translate }}</th>
                <th class="sortable" (click)="toggleSort('stage')">
                  {{ 'clients.col.stage' | translate }}
                  <i *ngIf="sortKey === 'stage'" class="sort-caret"
                     [class.ri-arrow-up-s-line]="sortDir === 'asc'" [class.ri-arrow-down-s-line]="sortDir === 'desc'"></i>
                </th>
                <th class="sortable" (click)="toggleSort('lastContact')">
                  {{ 'clients.col.lastContact' | translate }}
                  <i *ngIf="sortKey === 'lastContact'" class="sort-caret"
                     [class.ri-arrow-up-s-line]="sortDir === 'asc'" [class.ri-arrow-down-s-line]="sortDir === 'desc'"></i>
                </th>
                <th style="text-align:center;">{{ 'clients.col.consent' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let client of filtered; trackBy: trackById"
                  [routerLink]="['/clients', client.id]"
                  [class.overdue]="isOverdue(client)">

                <!-- Kunde -->
                <td>
                  <div class="client-cell">
                    <div class="avatar">{{ getInitials(client) }}</div>
                    <div style="min-width:0;">
                      <div class="client-name">{{ client.firstName }} {{ client.lastName }}</div>
                      <div class="client-city">{{ client.addressCity || '—' }}</div>
                    </div>
                  </div>
                </td>

                <!-- Typ -->
                <td class="hide-md">{{ client.clientType ? ('clients.type.' + client.clientType | translate) : '—' }}</td>

                <!-- Sucht -->
                <td class="hide-md"><div class="truncate">{{ getSearchSummary(client) }}</div></td>

                <!-- Phase (inline stage picker, the only colored badge) -->
                <td (click)="$event.stopPropagation(); $event.preventDefault()">
                  <button class="pill-stage" (click)="toggleStagePicker(client.id!, $event)"
                          [style.background]="getStageBg(currentStageOf(client))"
                          [style.color]="getStageColor(currentStageOf(client))">
                    {{ currentStageOf(client) | translateEnum:enumNameFor(client) }}
                    <i class="ri-arrow-down-s-line" style="font-size:10px;"></i>
                  </button>
                </td>

                <!-- Zuletzt kontaktiert -->
                <td>
                  <div class="contact-cell" [class.od]="isOverdue(client)">
                    <i [class.ri-time-line]="!isOverdue(client)" [class.ri-alert-line]="isOverdue(client)" style="font-size:13px;"></i>
                    {{ lastContactLabel(client) }}
                  </div>
                </td>

                <!-- DSGVO — subtle icon only -->
                <td style="text-align:center;">
                  <i *ngIf="client.gdprConsentGiven" class="ri-shield-check-line consent-icon ok"
                     [title]="'clients.consent' | translate"></i>
                  <i *ngIf="!client.gdprConsentGiven" class="ri-shield-line consent-icon missing"
                     [title]="'clients.gdprPending' | translate"></i>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Stage picker overlay — fixed so it escapes the table's overflow clip -->
        <ng-container *ngIf="activeStagePicker as pickerId">
          <div (click)="activeStagePicker = null" style="position:fixed; inset:0; z-index:199;"></div>
          <div style="position:fixed; z-index:200; background:var(--surface); border:1px solid var(--border); border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,.16); min-width:170px; overflow:hidden;"
               [style.top.px]="pickerTop" [style.left.px]="pickerLeft">
            <button *ngFor="let s of pickerStages"
                    (click)="setStage(pickerId, s.value, $event)"
                    class="stage-opt"
                    style="width:100%; text-align:left; padding:9px 13px; border:none; background:none; cursor:pointer; font-size:13px; font-weight:500;"
                    [style.color]="getStageColor(s.value)">
              {{ s.value | translateEnum:(pickerClient ? enumNameFor(pickerClient) : 'pipelineStage') }}
            </button>
          </div>
        </ng-container>
      </ng-container>
    </div>
  `
})
export class ClientListComponent implements OnInit {
  allClients: Client[] = [];
  filtered: Client[] = [];
  isLoading = false;
  activeStagePicker: string | null = null;
  pickerTop = 0;
  pickerLeft = 0;

  searchTerm = '';
  stageFilter: PipelineStage | 'ALL' = 'ALL';
  typeFilter: ClientType | 'ALL' = 'ALL';
  leadSourceFilter: LeadSource | 'ALL' | 'NONE' = 'ALL';
  consentFilter: 'ALL' | 'GIVEN' | 'MISSING' = 'ALL';
  incompleteOnly = false;
  sortKey: SortKey = 'lastContact';
  sortDir: SortDir = 'desc';

  readonly stageOptions = [
    { value: PipelineStage.PROSPECT,      labelKey: 'clients.stage.PROSPECT' },
    { value: PipelineStage.ACTIVE_SEARCH, labelKey: 'clients.stage.ACTIVE_SEARCH' },
    { value: PipelineStage.VIEWING,       labelKey: 'clients.stage.VIEWING' },
    { value: PipelineStage.WON,           labelKey: 'clients.stage.WON' },
    { value: PipelineStage.LOST,          labelKey: 'clients.stage.LOST' },
  ];

  /** Akquise-Stufen der Verkäufer (Issue #38) — der Stufen-Picker zeigt je Kunde nur eine der beiden Listen. */
  readonly sellerStageOptions = [
    { value: SellerPipelineStage.LEAD },
    { value: SellerPipelineStage.VALUATION },
    { value: SellerPipelineStage.PITCH },
    { value: SellerPipelineStage.MANDATE },
    { value: SellerPipelineStage.SOLD },
    { value: SellerPipelineStage.LOST },
  ];

  /** Die Stufe, die für diesen Kunden tatsächlich gilt. */
  currentStageOf(client: Client): PipelineStage | SellerPipelineStage | undefined {
    return client.clientType === ClientType.SELLER
      ? (client.sellerPipelineStage ?? SellerPipelineStage.LEAD)
      : client.pipelineStage;
  }

  enumNameFor(client: Client): string {
    return client.clientType === ClientType.SELLER ? 'sellerPipelineStage' : 'pipelineStage';
  }

  /** Der Kunde, dessen Stufen-Picker gerade offen ist — bestimmt, welche Stufen dort stehen. */
  get pickerClient(): Client | undefined {
    return this.allClients.find(c => c.id === this.activeStagePicker);
  }

  get pickerStages(): { value: PipelineStage | SellerPipelineStage }[] {
    const client = this.pickerClient;
    return client?.clientType === ClientType.SELLER ? this.sellerStageOptions : this.stageOptions;
  }

  readonly leadSourceOptions = Object.values(LeadSource);

  readonly typeOptions = [
    { value: ClientType.BUYER,  labelKey: 'clients.type.BUYER' },
    { value: ClientType.RENTER, labelKey: 'clients.type.RENTER' },
    { value: ClientType.SELLER, labelKey: 'clients.type.SELLER' },
  ];

  // Akquise- und Kaeufer-Stufen liegen auf einer gemeinsamen Skala, damit "nach Phase
  // sortieren" eine gemischte Liste nicht in zwei unsortierte Bloecke zerlegt.
  private readonly stageOrder: Record<string, number> = {
    [PipelineStage.PROSPECT]: 0,
    [SellerPipelineStage.LEAD]: 0,
    [PipelineStage.ACTIVE_SEARCH]: 1,
    [SellerPipelineStage.VALUATION]: 1,
    [PipelineStage.VIEWING]: 2,
    [SellerPipelineStage.PITCH]: 2,
    [SellerPipelineStage.MANDATE]: 3,
    [PipelineStage.WON]: 4,
    [SellerPipelineStage.SOLD]: 4,
    [PipelineStage.LOST]: 5,
  };

  constructor(
    private clientService: ClientService,
    private translate: TranslateService,
    private enumTranslation: EnumTranslationService
  ) {}

  ngOnInit(): void {
    this.loadClients();
  }

  private loadClients(): void {
    this.isLoading = true;
    this.clientService.getSortedByLastContact().subscribe({
      next: (clients: Client[]) => {
        this.allClients = clients;
        this.applyView();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading clients:', error);
        this.isLoading = false;
      }
    });
  }

  applyView(): void {
    const term = this.searchTerm.trim().toLowerCase();
    let list = this.allClients.filter(c => {
      if (this.stageFilter !== 'ALL' && this.currentStageOf(c) !== this.stageFilter) return false;
      if (this.typeFilter !== 'ALL' && c.clientType !== this.typeFilter) return false;
      if (this.leadSourceFilter === 'NONE' && c.leadSource) return false;
      if (this.leadSourceFilter !== 'ALL' && this.leadSourceFilter !== 'NONE' && c.leadSource !== this.leadSourceFilter) return false;
      if (this.consentFilter === 'GIVEN' && !c.gdprConsentGiven) return false;
      if (this.consentFilter === 'MISSING' && c.gdprConsentGiven) return false;
      if (this.incompleteOnly && !this.isIncomplete(c)) return false;
      if (term) {
        const hay = [c.firstName, c.lastName, c.email, c.phone, c.addressCity]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });

    const dir = this.sortDir === 'asc' ? 1 : -1;
    list = list.sort((a, b) => {
      let cmp = 0;
      switch (this.sortKey) {
        case 'name':
          cmp = (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName, 'de');
          break;
        case 'stage':
          cmp = (this.stageOrder[this.currentStageOf(a) ?? ''] ?? -1) - (this.stageOrder[this.currentStageOf(b) ?? ''] ?? -1);
          break;
        case 'lastContact':
          // never-contacted (null) counts as most overdue
          cmp = (this.daysSinceContact(a) ?? Number.MAX_SAFE_INTEGER) - (this.daysSinceContact(b) ?? Number.MAX_SAFE_INTEGER);
          break;
      }
      return cmp * dir;
    });

    this.filtered = list;
  }

  setStageFilter(stage: PipelineStage | 'ALL'): void {
    this.stageFilter = stage;
    this.applyView();
  }

  toggleSort(key: SortKey): void {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      // sensible default direction per column
      this.sortDir = key === 'name' ? 'asc' : 'desc';
    }
    this.applyView();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.stageFilter = 'ALL';
    this.typeFilter = 'ALL';
    this.leadSourceFilter = 'ALL';
    this.consentFilter = 'ALL';
    this.incompleteOnly = false;
    this.applyView();
  }

  /** "Unvollständig" = kein Kontaktweg (weder E-Mail noch Telefon) oder keine Suchkriterien hinterlegt. */
  isIncomplete(client: Client): boolean {
    return !this.hasContactMethod(client) || !this.hasSearchCriteria(client);
  }

  private hasContactMethod(client: Client): boolean {
    return !!(client.email && client.email.trim()) || !!(client.phone && client.phone.trim());
  }

  private hasSearchCriteria(client: Client): boolean {
    const sc = client.searchCriteria;
    if (!sc) return false;
    return !!(
      sc.minBudget || sc.maxBudget || sc.minRooms || sc.maxRooms ||
      sc.minSquareMeters || sc.maxSquareMeters ||
      sc.minColdRent || sc.maxColdRent || sc.minWarmRent || sc.maxWarmRent ||
      (sc.preferredLocations && sc.preferredLocations.length > 0) ||
      (sc.propertyTypes && sc.propertyTypes.length > 0) ||
      (sc.additionalRequirements && sc.additionalRequirements.trim()) ||
      (sc.latitude != null && sc.longitude != null)
    );
  }

  daysSinceContact(client: Client): number | null {
    if (!client.lastContactDate) return null;
    const ms = Date.now() - new Date(client.lastContactDate).getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  lastContactLabel(client: Client): string {
    const days = this.daysSinceContact(client);
    if (days === null) return this.tr('clients.neverContacted');
    if (days === 0) return this.tr('clients.today');
    if (days === 1) return this.tr('clients.yesterday');
    return this.tr('clients.daysAgo').replace('{{days}}', String(days));
  }

  isOverdue(client: Client): boolean {
    const days = this.daysSinceContact(client);
    return days === null || days > 21;
  }

  getInitials(client: Client): string {
    const f = client.firstName?.charAt(0)?.toUpperCase() || '';
    const l = client.lastName?.charAt(0)?.toUpperCase() || '';
    return f + l;
  }

  getSearchSummary(client: Client): string {
    const parts: string[] = [];
    const c = client.searchCriteria;
    if (c?.propertyTypes?.length) {
      const key = this.enumTranslation.getTranslationKey('propertyType', c.propertyTypes[0]);
      parts.push(this.translate.instant(key));
    }
    const fmt = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
    if (client.clientType === ClientType.RENTER) {
      if (c?.maxWarmRent) parts.push(fmt(c.maxWarmRent));
      else if (c?.maxColdRent) parts.push(fmt(c.maxColdRent));
      else if (c?.maxBudget) parts.push(fmt(c.maxBudget));
    } else if (c?.maxBudget) {
      parts.push(fmt(c.maxBudget));
    }
    return parts.join(' · ') || '—';
  }

  toggleStagePicker(clientId: string, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    if (this.activeStagePicker === clientId) {
      this.activeStagePicker = null;
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    // Flip upward if there isn't room below (dropdown ≈ 4 rows)
    const estimatedHeight = 180;
    this.pickerTop = rect.bottom + estimatedHeight > window.innerHeight
      ? rect.top - estimatedHeight - 4
      : rect.bottom + 4;
    this.pickerLeft = rect.left;
    this.activeStagePicker = clientId;
  }

  setStage(clientId: string, stage: PipelineStage | SellerPipelineStage, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.activeStagePicker = null;
    const client = this.allClients.find(c => c.id === clientId);
    if (!client) return;

    // Verkäufer laufen über die eigene Akquise-Pipeline (Issue #38) — der Käufer-Endpoint
    // weist sie ab, deshalb entscheidet der Kundentyp und nicht der Stufenwert.
    const isSeller = client.clientType === ClientType.SELLER;
    const previous = isSeller ? client.sellerPipelineStage : client.pipelineStage;
    if (isSeller) {
      client.sellerPipelineStage = stage as SellerPipelineStage;
    } else {
      client.pipelineStage = stage as PipelineStage;
    }
    this.applyView();

    const save$ = isSeller
      ? this.clientService.updateSellerPipelineStage(clientId, stage as SellerPipelineStage)
      : this.clientService.updatePipelineStage(clientId, stage as PipelineStage);
    save$.subscribe({
      error: () => {
        if (isSeller) {
          client.sellerPipelineStage = previous as SellerPipelineStage | null | undefined;
        } else {
          client.pipelineStage = previous as PipelineStage | undefined;
        }
        this.applyView();
      }
    });
  }

  /** Farbgebung je Stufe. Die Akquise-Stufen teilen die Farbskala der Käufer-Stufen,
   *  damit die Liste nicht zwei konkurrierende Farbsysteme zeigt. */
  private readonly stageAccent: Record<string, string> = {
    [PipelineStage.PROSPECT]:          'var(--stage-prospect)',
    [PipelineStage.ACTIVE_SEARCH]:     'var(--stage-active-search)',
    [PipelineStage.VIEWING]:           'var(--stage-viewing)',
    [PipelineStage.WON]:               'var(--stage-won)',
    [PipelineStage.LOST]:              'var(--stage-lost)',
    [SellerPipelineStage.LEAD]:        'var(--stage-prospect)',
    [SellerPipelineStage.VALUATION]:   'var(--stage-active-search)',
    [SellerPipelineStage.PITCH]:       'var(--stage-viewing)',
    [SellerPipelineStage.MANDATE]:     'var(--primary)',
    [SellerPipelineStage.SOLD]:        'var(--stage-won)',
  };

  getStageBg(stage?: PipelineStage | SellerPipelineStage | null): string {
    const accent = stage ? this.stageAccent[stage] : undefined;
    return accent ? `color-mix(in srgb,${accent} 14%,var(--surface))` : 'var(--surface-2)';
  }

  getStageColor(stage?: PipelineStage | SellerPipelineStage | null): string {
    return (stage ? this.stageAccent[stage] : undefined) ?? 'var(--text-3)';
  }

  trackById(index: number, item: Client): string | undefined {
    return item.id;
  }

  /** Synchronous translation lookup for values used in string composition. */
  private tr(key: string): string {
    return this.translate.instant(key);
  }
}
