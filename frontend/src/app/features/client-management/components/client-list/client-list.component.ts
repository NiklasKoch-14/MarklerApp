import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ClientService, Client, PagedResponse, PipelineStage } from '../../services/client.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, LoadingSpinnerComponent],
  styles: [`
    .client-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow); cursor:pointer; transition:box-shadow 0.15s, border-color 0.15s; display:flex; flex-direction:column; }
    .client-card:hover { border-color:var(--primary); box-shadow:0 4px 16px rgba(20,40,45,0.12); }
    .stage-opt:hover { background:var(--surface-2) !important; }
  `],
  template: `
    <div style="padding:28px 32px;">
      <!-- Header -->
      <div class="page-header" style="margin-bottom:24px;">
        <div>
          <h1 class="page-title">{{ 'clients.title' | translate }}</h1>
          <p style="font-size:14px; color:var(--text-2); margin-top:4px;">{{ 'clients.listDescription' | translate }}</p>
        </div>
        <a routerLink="/clients/new" class="btn-primary">
          <i class="ph ph-user-plus"></i>
          {{ 'clients.addClient' | translate }}
        </a>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" style="text-align:center; padding:48px 0;">
        <app-loading-spinner size="lg"></app-loading-spinner>
        <p style="font-size:14px; color:var(--text-3);">{{ 'common.loading' | translate }}</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!isLoading && clients.length === 0"
        style="text-align:center; padding:56px 24px; background:var(--surface); border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow);">
        <i class="ph ph-users" style="font-size:48px; color:var(--text-3); display:block; margin-bottom:12px;"></i>
        <h3 style="font-size:15px; font-weight:600; color:var(--text); margin:0 0 6px;">{{ 'clients.noClientsFound' | translate }}</h3>
        <p style="font-size:13px; color:var(--text-2); margin:0 0 20px;">{{ 'clients.addFirstClient' | translate }}</p>
        <a routerLink="/clients/new" class="btn-primary" style="display:inline-flex;">
          <i class="ph ph-user-plus"></i>
          {{ 'clients.addClient' | translate }}
        </a>
      </div>

      <!-- Card Grid -->
      <div *ngIf="!isLoading && clients.length > 0"
        style="display:grid; grid-template-columns:repeat(3,1fr); gap:16px;">
        <div *ngFor="let client of clients; trackBy: trackById"
          [routerLink]="['/clients', client.id]"
          class="client-card">

          <!-- Card Header: Avatar + Name + Chevron -->
          <div style="display:flex; align-items:center; gap:12px; padding:16px 16px 12px;">
            <div style="width:42px; height:42px; border-radius:50%; background:var(--accent-soft); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; color:var(--primary); flex-shrink:0; letter-spacing:0.5px;">
              {{ getInitials(client) }}
            </div>
            <div style="flex:1; min-width:0; overflow:hidden;">
              <div style="font-weight:700; font-size:14px; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                {{ client.firstName }} {{ client.lastName }}
              </div>
              <div style="font-size:12px; color:var(--text-3); margin-top:1px;">{{ client.addressCity || '—' }}</div>
            </div>
            <i class="ph ph-caret-right" style="color:var(--text-3); font-size:16px; flex-shrink:0;"></i>
          </div>

          <!-- Contact Info -->
          <div style="padding:0 16px 12px; display:flex; flex-direction:column; gap:7px; flex:1;">
            <div *ngIf="client.phone" style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-2);">
              <i class="ph ph-phone" style="color:var(--text-3); font-size:14px; flex-shrink:0;"></i>
              <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ client.phone }}</span>
            </div>
            <div *ngIf="client.email" style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-2);">
              <i class="ph ph-envelope" style="color:var(--text-3); font-size:14px; flex-shrink:0;"></i>
              <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ client.email }}</span>
            </div>
            <div *ngIf="client.searchCriteria" style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-2);">
              <i class="ph ph-buildings" style="color:var(--text-3); font-size:14px; flex-shrink:0;"></i>
              <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ getSearchSummary(client) }}</span>
            </div>
          </div>

          <!-- Footer: Stage + DSGVO -->
          <div style="padding:10px 16px; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:8px;">
            <!-- Stage badge with dropdown -->
            <div style="position:relative;" (click)="$event.stopPropagation(); $event.preventDefault()">
              <button (click)="toggleStagePicker(client.id!, $event)"
                      [style.background]="getStageBg(client.pipelineStage)"
                      [style.color]="getStageColor(client.pipelineStage)"
                      style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;border:none;cursor:pointer;font-size:11px;font-weight:600;">
                {{ getStageLabel(client.pipelineStage) }}
                <i class="ph ph-caret-down" style="font-size:10px;"></i>
              </button>
              <div *ngIf="activeStagePicker === client.id"
                   style="position:absolute;bottom:100%;left:0;margin-bottom:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.14);z-index:100;min-width:170px;overflow:hidden;">
                <div *ngIf="activeStagePicker === client.id" (click)="activeStagePicker = null"
                     style="position:fixed;inset:0;z-index:99;"></div>
                <button *ngFor="let s of stageOptions"
                        (click)="setStage(client.id!, s.value, $event)"
                        class="stage-opt"
                        style="width:100%;text-align:left;padding:8px 13px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:500;position:relative;z-index:100;"
                        [style.color]="getStageColor(s.value)">
                  {{ s.label }}
                </button>
              </div>
            </div>
            <span *ngIf="client.gdprConsentGiven"
              style="display:flex; align-items:center; gap:4px; font-size:12px; font-weight:600; color:#1f8a5b;">
              <i class="ph ph-shield-check"></i>
              {{ 'clients.consent' | translate }}
            </span>
            <span *ngIf="!client.gdprConsentGiven"
              style="display:flex; align-items:center; gap:4px; font-size:12px; font-weight:600; color:#b23a55;">
              <i class="ph ph-shield-warning"></i>
              {{ 'clients.gdprPending' | translate }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ClientListComponent implements OnInit {
  clients: Client[] = [];
  isLoading = false;
  activeStagePicker: string | null = null;

  readonly stageOptions = [
    { value: PipelineStage.PROSPECT,      label: 'Interessent' },
    { value: PipelineStage.ACTIVE_SEARCH, label: 'Aktive Suche' },
    { value: PipelineStage.VIEWING,       label: 'Besichtigung' },
    { value: PipelineStage.OFFER,         label: 'Angebot' },
    { value: PipelineStage.CLOSED,        label: 'Abgeschlossen' },
    { value: PipelineStage.INACTIVE,      label: 'Inaktiv' },
  ];

  constructor(private clientService: ClientService) {}

  ngOnInit(): void {
    this.loadClients();
  }

  private loadClients(): void {
    this.isLoading = true;
    this.clientService.getClients(0, 50).subscribe({
      next: (response: PagedResponse<Client>) => {
        this.clients = response.content;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading clients:', error);
        this.isLoading = false;
      }
    });
  }

  getInitials(client: Client): string {
    const f = client.firstName?.charAt(0)?.toUpperCase() || '';
    const l = client.lastName?.charAt(0)?.toUpperCase() || '';
    return f + l;
  }

  getSearchSummary(client: Client): string {
    const c = client.searchCriteria;
    if (!c) return '';
    const parts: string[] = [];
    if (c.propertyTypes?.length) parts.push(c.propertyTypes[0]);
    if (c.maxBudget) parts.push(new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(c.maxBudget));
    return parts.join(' · ');
  }

  toggleStagePicker(clientId: string, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.activeStagePicker = this.activeStagePicker === clientId ? null : clientId;
  }

  setStage(clientId: string, stage: PipelineStage, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.activeStagePicker = null;
    const client = this.clients.find(c => c.id === clientId);
    if (client) client.pipelineStage = stage;
    this.clientService.updatePipelineStage(clientId, stage).subscribe({
      error: () => { if (client) client.pipelineStage = undefined; }
    });
  }

  getStageBg(stage?: PipelineStage): string {
    switch (stage) {
      case PipelineStage.PROSPECT:      return 'color-mix(in srgb,var(--stage-prospect) 14%,var(--surface))';
      case PipelineStage.ACTIVE_SEARCH: return 'color-mix(in srgb,var(--stage-active-search) 14%,var(--surface))';
      case PipelineStage.VIEWING:       return 'color-mix(in srgb,var(--stage-viewing) 14%,var(--surface))';
      case PipelineStage.OFFER:         return 'color-mix(in srgb,var(--stage-offer) 14%,var(--surface))';
      case PipelineStage.CLOSED:        return 'color-mix(in srgb,var(--color-success) 14%,var(--surface))';
      case PipelineStage.INACTIVE:      return 'var(--surface-2)';
      default:                          return 'var(--surface-2)';
    }
  }

  getStageColor(stage?: PipelineStage): string {
    switch (stage) {
      case PipelineStage.PROSPECT:      return 'var(--stage-prospect)';
      case PipelineStage.ACTIVE_SEARCH: return 'var(--stage-active-search)';
      case PipelineStage.VIEWING:       return 'var(--stage-viewing)';
      case PipelineStage.OFFER:         return 'var(--stage-offer)';
      case PipelineStage.CLOSED:        return 'var(--color-success)';
      case PipelineStage.INACTIVE:      return 'var(--text-3)';
      default:                          return 'var(--text-3)';
    }
  }

  getStageLabel(stage?: PipelineStage): string {
    return this.stageOptions.find(s => s.value === stage)?.label ?? 'Kein Stage';
  }

  trackById(index: number, item: Client): string | undefined {
    return item.id;
  }
}