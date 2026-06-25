import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ClientService, Client, PagedResponse } from '../../services/client.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, LoadingSpinnerComponent],
  styles: [`
    .client-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow); cursor:pointer; transition:box-shadow 0.15s, border-color 0.15s; display:flex; flex-direction:column; }
    .client-card:hover { border-color:var(--primary); box-shadow:0 4px 16px rgba(20,40,45,0.12); }
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

          <!-- Footer: DSGVO -->
          <div style="padding:10px 16px; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between;">
            <span style="font-size:12px; color:var(--text-3);">
              {{ client.addressCountry || 'DE' }}
            </span>
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

  trackById(index: number, item: Client): string | undefined {
    return item.id;
  }
}