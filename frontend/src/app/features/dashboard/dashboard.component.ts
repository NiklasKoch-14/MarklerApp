import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { ClientService, PipelineStage } from '../client-management/services/client.service';
import { PropertyService } from '../property-management/services/property.service';
import {
  CallNotesService,
  CallNoteSummary,
  FollowUpReminder,
  CallType,
  CallOutcome,
  CallNoteCreateRequest,
} from '../call-notes/services/call-notes.service';
import { ViewingService, ViewingSummary, ViewingFeedback, ViewingStatus } from '../viewing-management/services/viewing.service';

interface StatCard {
  icon: string;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  caption: string;
  capColor: string;
}

interface FollowUpRow {
  id: string;
  clientId: string;
  customerName: string;
  customerInitials: string;
  subject: string;
  typeLabel: string;
  dueLabel: string;
  dueColor: string;
  followupFmt: string;
  isOverdue: boolean;
}

interface ActivityRow {
  typeIcon: string;
  typeColor: string;
  subject: string;
  customerName: string;
  dateFmt: string;
  resultColor: string;
}

interface ViewingRow {
  id: string;
  clientId: string;
  clientName: string;
  initials: string;
  propertyLabel: string;
  viewingDate: string;
  viewingStatus: ViewingStatus;
  timeFmt: string;
  statusLabel: string;
  statusBg: string;
  statusColor: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, DatePipe],
  template: `
    <div style="max-width:1180px; margin:0 auto;">

      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="page-subtitle">{{ todayLabel }}</div>
          <h1 class="page-title">{{ greeting }}</h1>
        </div>
        <div style="display:flex; gap:10px;">
          <button class="btn-secondary" [routerLink]="['/clients/new']">
            <i class="ph-bold ph-user-plus" style="font-size:15px;"></i>
            {{ 'dashboard.newCustomer' | translate }}
          </button>
          <button class="btn-secondary" [routerLink]="['/properties/new']">
            <i class="ph-bold ph-buildings" style="font-size:15px;"></i>
            {{ 'dashboard.newObject' | translate }}
          </button>
        </div>
      </div>

      <!-- Stat cards -->
      <div class="stat-grid" style="margin-bottom:20px;">
        @for (s of statCards; track s.label) {
          <div class="stat-card">
            <div class="stat-icon-wrap" [style.background]="s.iconBg">
              <i [class]="s.icon" [style.color]="s.iconColor"></i>
            </div>
            <div class="stat-value">{{ s.value }}</div>
            <div class="stat-label">{{ s.label }}</div>
            <div class="stat-caption" [style.color]="s.capColor">{{ s.caption }}</div>
          </div>
        }
      </div>

      <!-- Heutige Besichtigungen — Tagesagenda, immer als erstes sichtbar -->
      <div class="widget-card" style="margin-bottom:20px;">
        <div class="widget-header">
          <i class="ph-fill ph-door-open" style="color:#7c3aed; font-size:18px;"></i>
          <h3 class="widget-title">Heutige Besichtigungen</h3>
          @if (todayViewingRows.length > 0) {
            <span style="background:color-mix(in srgb,#7c3aed 14%,var(--surface)); color:#7c3aed;
                         font-size:12px; font-weight:700; padding:3px 9px; border-radius:20px;
                         font-variant-numeric:tabular-nums;">{{ todayViewingRows.length }}</span>
          }
        </div>

        @if (todayViewingRows.length === 0 && !loading) {
          <div style="padding:11px 18px 13px; display:flex; align-items:center; gap:10px; color:var(--text-3); font-size:13px;">
            <i class="ph ph-calendar-blank" style="font-size:16px;"></i>
            <span>Keine Besichtigungen heute geplant</span>
          </div>
        }

        @if (todayViewingRows.length > 0) {
          <div style="display:flex; gap:12px; padding:4px 18px 16px; overflow-x:auto;">
            @for (v of todayViewingRows; track v.id) {
              <div style="min-width:210px; background:var(--surface-2); border:1px solid var(--border);
                          border-radius:10px; padding:12px 14px; transition:box-shadow .15s; flex-shrink:0; display:flex; flex-direction:column; gap:0;">
                <div [routerLink]="['/clients', v.clientId]" style="cursor:pointer;">
                  <div style="font-size:20px; font-weight:800; color:#7c3aed; font-variant-numeric:tabular-nums; line-height:1; margin-bottom:8px;">
                    {{ v.timeFmt }}
                  </div>
                  <div style="display:flex; align-items:center; gap:7px; margin-bottom:5px;">
                    <div style="width:26px; height:26px; border-radius:50%; background:color-mix(in srgb,#7c3aed 12%,var(--surface));
                                color:#7c3aed; display:flex; align-items:center; justify-content:center;
                                font-weight:700; font-size:11px; flex-shrink:0;">
                      {{ v.initials }}
                    </div>
                    <span style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ v.clientName }}</span>
                  </div>
                  <div style="font-size:12px; color:var(--text-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:8px;">
                    <i class="ph ph-buildings" style="font-size:11px;"></i>
                    {{ v.propertyLabel }}
                  </div>
                  <span style="font-size:11px; font-weight:600; padding:2px 8px; border-radius:6px;"
                        [style.background]="v.statusBg" [style.color]="v.statusColor">
                    {{ v.statusLabel }}
                  </span>
                </div>
                @if (v.viewingStatus === 'SCHEDULED') {
                  <div style="display:flex; gap:6px; margin-top:10px;" (click)="$event.stopPropagation()">
                    <button (click)="openViewingDone(v)"
                            style="flex:1; padding:5px 8px; border:1.5px solid var(--color-success); border-radius:7px;
                                   background:none; color:var(--color-success); font-size:12px; font-weight:600; cursor:pointer;">
                      ✓ Erledigt
                    </button>
                    <button (click)="quickCancelViewing(v, $event)"
                            style="padding:5px 10px; border:1.5px solid var(--border); border-radius:7px;
                                   background:none; color:var(--text-3); font-size:12px; cursor:pointer;" title="Absagen">
                      ✗
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>

      <!-- Overview header -->
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
        <h2 style="margin:0; font-size:16px; font-weight:700; color:var(--text);">
          {{ 'dashboard.overview' | translate }}
        </h2>
        <div class="view-tabs">
          <button class="view-tab" [class.active]="view === 'cards'" (click)="view = 'cards'">
            <i class="ph ph-squares-four" style="font-size:15px;"></i>
            {{ 'dashboard.tabCards' | translate }}
          </button>
          <button class="view-tab" [class.active]="view === 'pipeline'" (click)="view = 'pipeline'">
            <i class="ph ph-kanban" style="font-size:15px;"></i>
            {{ 'dashboard.tabPipeline' | translate }}
          </button>
        </div>
      </div>

      <!-- Cards view -->
      @if (view === 'cards') {
        <div class="dash-main-grid">

          <!-- Follow-ups widget -->
          <div class="widget-card">
            <div class="widget-header">
              <i class="ph-fill ph-bell-ringing" style="color:#c07a1e; font-size:18px;"></i>
              <h3 class="widget-title">{{ 'dashboard.openFollowups' | translate }}</h3>
              <span style="background:color-mix(in srgb,#c07a1e 14%,var(--surface)); color:#c07a1e;
                           font-size:12px; font-weight:700; padding:3px 9px; border-radius:20px;
                           font-variant-numeric:tabular-nums;">{{ followUps.length }}</span>
            </div>

            @for (f of followUps.slice(0,5); track f.id) {
              <div class="followup-row">
                <div class="customer-avatar-sm">{{ f.customerInitials }}</div>
                <div style="flex:1; min-width:0;">
                  <div style="font-size:14px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    {{ f.subject }}
                  </div>
                  <div style="font-size:12px; color:var(--text-2); margin-top:2px;">
                    {{ f.customerName }}
                  </div>
                </div>
                <div style="text-align:right; flex-shrink:0;">
                  <div style="font-size:12px; font-weight:700;" [style.color]="f.dueColor">{{ f.dueLabel }}</div>
                  <div style="font-size:11px; color:var(--text-3); font-variant-numeric:tabular-nums;">
                    {{ f.followupFmt }}
                  </div>
                </div>
                <button (click)="openFollowUpDone(f, $event)"
                        style="padding:4px 10px; border:1.5px solid var(--color-success); border-radius:7px;
                               background:none; color:var(--color-success); font-size:12px; font-weight:600;
                               cursor:pointer; white-space:nowrap; flex-shrink:0;">
                  ✓ Erledigt
                </button>
                <button class="btn-icon" [routerLink]="['/clients', f.clientId]"
                        title="{{ 'dashboard.openCustomer' | translate }}">
                  <i class="ph ph-arrow-right"></i>
                </button>
              </div>
            }

            @if (followUps.length === 0 && !loading) {
              <div style="padding:40px 18px; text-align:center; color:var(--text-3);">
                <i class="ph ph-check-circle" style="font-size:32px; color:#1f8a5b;"></i>
                <div style="margin-top:10px; font-size:14px; font-weight:500;">
                  {{ 'dashboard.noFollowups' | translate }}
                </div>
              </div>
            }
          </div>

          <!-- Recent activity widget -->
          <div class="widget-card">
            <div class="widget-header">
              <i class="ph ph-clock-counter-clockwise" style="color:var(--primary); font-size:18px;"></i>
              <h3 class="widget-title">{{ 'dashboard.recentActivity' | translate }}</h3>
              <button [routerLink]="['/notifications']"
                      style="background:none; border:none; color:var(--primary); font-size:13px;
                             font-weight:600; cursor:pointer;">
                {{ 'dashboard.viewAll' | translate }}
              </button>
            </div>

            @for (a of recentActivity; track a.dateFmt + a.subject) {
              <div style="display:flex; align-items:flex-start; gap:12px; padding:13px 18px; border-bottom:1px solid var(--border);">
                <div style="width:32px; height:32px; border-radius:9px; display:flex; align-items:center;
                            justify-content:center; flex-shrink:0; font-size:15px;"
                     [style.background]="'color-mix(in srgb,' + a.typeColor + ' 12%,var(--surface))'"
                     [style.color]="a.typeColor">
                  <i [class]="a.typeIcon"></i>
                </div>
                <div style="flex:1; min-width:0;">
                  <div style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    {{ a.subject }}
                  </div>
                  <div style="font-size:12px; color:var(--text-2); margin-top:1px;">{{ a.customerName }}</div>
                </div>
                <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                  <span style="width:7px; height:7px; border-radius:50%;" [style.background]="a.resultColor"></span>
                  <span style="font-size:11px; color:var(--text-3); font-variant-numeric:tabular-nums;">{{ a.dateFmt }}</span>
                </div>
              </div>
            }

            @if (recentActivity.length === 0 && !loading) {
              <div style="padding:40px 18px; text-align:center; color:var(--text-3);">
                <i class="ph ph-chats-circle" style="font-size:32px;"></i>
                <div style="margin-top:10px; font-size:14px; font-weight:500;">
                  {{ 'dashboard.noActivity' | translate }}
                </div>
              </div>
            }
          </div>

        </div>

        <!-- Kunden ohne Kontakt >30 Tage -->
        <div class="widget-card" style="margin-top:20px;">
          <div class="widget-header">
            <i class="ph-fill ph-user-minus" style="color:var(--color-warning); font-size:18px;"></i>
            <h3 class="widget-title">Kunden ohne Kontakt &gt;30 Tage</h3>
            <span style="background:color-mix(in srgb,var(--color-warning) 14%,var(--surface)); color:var(--color-warning);
                         font-size:12px; font-weight:700; padding:3px 9px; border-radius:20px;
                         font-variant-numeric:tabular-nums;">{{ staleClientRows.length }}</span>
          </div>

          @if (staleClientRows.length === 0 && !loading) {
            <div style="padding:32px 18px; text-align:center; color:var(--text-3);">
              <i class="ph ph-check-circle" style="font-size:28px; color:var(--color-success);"></i>
              <div style="margin-top:8px; font-size:14px; font-weight:500;">Alle Kunden aktuell kontaktiert</div>
            </div>
          }

          @if (staleClientRows.length > 0) {
            <div style="padding:0 0 8px;">
              @for (c of staleClientRows; track c.id) {
                <div style="display:flex; align-items:center; gap:10px; padding:10px 18px;
                            border-bottom:1px solid var(--border);">
                  <div [routerLink]="['/clients', c.id]" style="cursor:pointer; display:flex; align-items:center; gap:10px; flex:1; min-width:0;">
                    <div style="width:32px; height:32px; border-radius:50%;
                                background:color-mix(in srgb,var(--color-warning) 12%,var(--surface));
                                color:var(--color-warning); display:flex; align-items:center; justify-content:center;
                                font-weight:700; font-size:12px; flex-shrink:0;">
                      {{ c.initials }}
                    </div>
                    <div style="flex:1; min-width:0;">
                      <div style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                        {{ c.name }}
                      </div>
                    </div>
                    <div style="font-size:12px; font-weight:700; color:var(--color-warning); flex-shrink:0;">
                      {{ c.daysSince }}
                    </div>
                  </div>
                  <div style="display:flex; gap:6px; flex-shrink:0;" (click)="$event.stopPropagation()">
                    @if (c.phone) {
                      <a [href]="'tel:' + c.phone"
                         style="width:30px; height:30px; display:flex; align-items:center; justify-content:center;
                                border:1.5px solid var(--primary); border-radius:7px; color:var(--primary);
                                font-size:14px; text-decoration:none;" title="Anrufen">
                        <i class="ph ph-phone"></i>
                      </a>
                    }
                    <button (click)="setClientInactive(c.id, $event)"
                            style="width:30px; height:30px; display:flex; align-items:center; justify-content:center;
                                   border:1.5px solid var(--border); border-radius:7px; background:none;
                                   color:var(--text-3); font-size:14px; cursor:pointer;" title="Als inaktiv markieren">
                      <i class="ph ph-user-minus"></i>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </div>

      }

      <!-- Pipeline view -->
      @if (view === 'pipeline') {
        <div class="pipeline-grid">
          @for (col of pipelineCols; track col.label) {
            <div style="background:var(--surface-2); border:1px solid var(--border); border-radius:14px; padding:6px;">
              <div style="display:flex; align-items:center; gap:8px; padding:11px 12px 10px;">
                <span style="width:9px; height:9px; border-radius:50%;" [style.background]="col.color"></span>
                <span style="font-size:13px; font-weight:700; flex:1; color:var(--text);">{{ col.label }}</span>
                <span style="font-size:12px; font-weight:700; color:var(--text-3); font-variant-numeric:tabular-nums;">
                  {{ col.items.length }}
                </span>
              </div>
              @for (it of col.items; track it.subject) {
                <div [routerLink]="['/clients', it.clientId]"
                     style="background:var(--surface); border:1px solid var(--border); border-radius:10px;
                            padding:12px; margin:5px; cursor:pointer; box-shadow:0 1px 1px rgba(20,40,45,0.03);">
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:7px;">
                    <div style="width:26px; height:26px; border-radius:50%; background:var(--accent-soft);
                                color:var(--primary); display:flex; align-items:center; justify-content:center;
                                font-weight:700; font-size:11px;">{{ it.initials }}</div>
                    <span style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden;
                                 text-overflow:ellipsis;">{{ it.customerName }}</span>
                  </div>
                  <div style="font-size:12px; color:var(--text-2); line-height:1.4; white-space:nowrap;
                               overflow:hidden; text-overflow:ellipsis;">{{ it.subject }}</div>
                  <div style="display:flex; align-items:center; gap:6px; margin-top:8px; font-size:11px; color:var(--text-3);">
                    <i [class]="it.typeIcon"></i>
                    <span>{{ it.dateFmt }}</span>
                  </div>
                </div>
              }
              @if (col.items.length === 0) {
                <div style="padding:14px 12px; font-size:12px; color:var(--text-3); text-align:center;">—</div>
              }
            </div>
          }
        </div>
      }


    </div>

    <!-- ── Follow-up Erledigt Popover ──────────────────────────── -->
    @if (activeFollowUp !== null) {
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px;"
           (click)="closeFollowUpPopover()">
        <div style="background:var(--surface);border-radius:14px;width:380px;max-width:95vw;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.3);"
             (click)="$event.stopPropagation()">
          <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:2px;">Follow-up abschließen</div>
          <div style="font-size:13px;color:var(--text-3);margin-bottom:18px;">
            {{ activeFollowUp.customerName }} · {{ activeFollowUp.subject }}
          </div>
          <div style="font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Ergebnis</div>
          <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px;">
            @for (o of followUpOutcomeOptions; track o.value) {
              <button (click)="followUpOutcome = followUpOutcome === o.value ? null : o.value"
                      [style.background]="followUpOutcome === o.value ? 'color-mix(in srgb,' + o.color + ' 14%,var(--surface))' : 'var(--surface-2)'"
                      [style.border-color]="followUpOutcome === o.value ? o.color : 'var(--border)'"
                      [style.color]="followUpOutcome === o.value ? o.color : 'var(--text-2)'"
                      style="padding:7px 12px;border-radius:8px;border:1.5px solid;cursor:pointer;font-size:13px;font-weight:500;">
                {{ o.label }}
              </button>
            }
          </div>
          <textarea [(ngModel)]="followUpNoteText" placeholder="Kurze Notiz zum Gespräch..." rows="2"
                    style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;
                           font-size:13px;color:var(--text);background:var(--surface);resize:none;
                           box-sizing:border-box;font-family:inherit;margin-bottom:16px;outline:none;"></textarea>
          <div style="display:flex;gap:10px;">
            <button (click)="closeFollowUpPopover()"
                    style="flex:1;padding:9px;border:1px solid var(--border);border-radius:8px;
                           background:var(--surface-2);color:var(--text-2);font-size:13px;cursor:pointer;">
              Abbrechen
            </button>
            <button (click)="submitFollowUpDone()"
                    [disabled]="isSubmittingFollowUp"
                    style="flex:2;padding:9px;border:none;border-radius:8px;background:var(--color-success);
                           color:#fff;font-size:13px;font-weight:600;cursor:pointer;"
                    [style.opacity]="isSubmittingFollowUp ? '0.6' : '1'">
              {{ isSubmittingFollowUp ? 'Speichern...' : '✓ Als erledigt speichern' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ── Viewing Erledigt Popover ─────────────────────────────── -->
    @if (activeViewingRow !== null) {
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px;"
           (click)="closeViewingPopover()">
        <div style="background:var(--surface);border-radius:14px;width:360px;max-width:95vw;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.3);"
             (click)="$event.stopPropagation()">
          <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:2px;">Besichtigung abschließen</div>
          <div style="font-size:13px;color:var(--text-3);margin-bottom:18px;">
            {{ activeViewingRow.clientName }} · {{ activeViewingRow.propertyLabel }}
          </div>
          <div style="font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Kundenfeedback</div>
          <div style="display:flex;gap:8px;margin-bottom:16px;">
            <button (click)="viewingPopoverFeedback = viewingPopoverFeedback === 'LIKED' ? null : 'LIKED'"
                    [style.background]="viewingPopoverFeedback === 'LIKED' ? '#f0fdf4' : 'var(--surface-2)'"
                    [style.border-color]="viewingPopoverFeedback === 'LIKED' ? '#16a34a' : 'var(--border)'"
                    [style.color]="viewingPopoverFeedback === 'LIKED' ? '#16a34a' : 'var(--text-2)'"
                    style="flex:1;padding:8px 10px;border-radius:8px;border:1.5px solid;cursor:pointer;font-size:13px;font-weight:500;">
              👍 Gefällt
            </button>
            <button (click)="viewingPopoverFeedback = viewingPopoverFeedback === 'NEUTRAL' ? null : 'NEUTRAL'"
                    [style.background]="viewingPopoverFeedback === 'NEUTRAL' ? '#fffbeb' : 'var(--surface-2)'"
                    [style.border-color]="viewingPopoverFeedback === 'NEUTRAL' ? '#d97706' : 'var(--border)'"
                    [style.color]="viewingPopoverFeedback === 'NEUTRAL' ? '#d97706' : 'var(--text-2)'"
                    style="flex:1;padding:8px 10px;border-radius:8px;border:1.5px solid;cursor:pointer;font-size:13px;font-weight:500;">
              🤷 Neutral
            </button>
            <button (click)="viewingPopoverFeedback = viewingPopoverFeedback === 'DISLIKED' ? null : 'DISLIKED'"
                    [style.background]="viewingPopoverFeedback === 'DISLIKED' ? '#fef2f2' : 'var(--surface-2)'"
                    [style.border-color]="viewingPopoverFeedback === 'DISLIKED' ? '#dc2626' : 'var(--border)'"
                    [style.color]="viewingPopoverFeedback === 'DISLIKED' ? '#dc2626' : 'var(--text-2)'"
                    style="flex:1;padding:8px 10px;border-radius:8px;border:1.5px solid;cursor:pointer;font-size:13px;font-weight:500;">
              👎 Nicht
            </button>
          </div>
          <textarea [(ngModel)]="viewingPopoverNote" placeholder="Notiz zur Besichtigung..." rows="2"
                    style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;
                           font-size:13px;color:var(--text);background:var(--surface);resize:none;
                           box-sizing:border-box;font-family:inherit;margin-bottom:16px;outline:none;"></textarea>
          <div style="display:flex;gap:10px;">
            <button (click)="closeViewingPopover()"
                    style="flex:1;padding:9px;border:1px solid var(--border);border-radius:8px;
                           background:var(--surface-2);color:var(--text-2);font-size:13px;cursor:pointer;">
              Abbrechen
            </button>
            <button (click)="setViewingStatus(activeViewingRow, 'COMPLETED')"
                    [disabled]="isUpdatingViewing"
                    style="flex:2;padding:9px;border:none;border-radius:8px;background:var(--color-success);
                           color:#fff;font-size:13px;font-weight:600;cursor:pointer;"
                    [style.opacity]="isUpdatingViewing ? '0.6' : '1'">
              {{ isUpdatingViewing ? 'Speichern...' : '✓ Als erledigt speichern' }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  view: 'cards' | 'pipeline' = 'cards';
  loading = true;

  statCards: StatCard[] = [];
  followUps: FollowUpRow[] = [];
  recentActivity: ActivityRow[] = [];
  todayViewingRows: ViewingRow[] = [];
  staleClientRows: { id: string; name: string; initials: string; daysSince: string; phone?: string }[] = [];

  pipelineCols: { label: string; color: string; items: any[] }[] = [];

  // Follow-up popover
  activeFollowUp: FollowUpRow | null = null;
  followUpNoteText = '';
  followUpOutcome: CallOutcome | null = null;
  isSubmittingFollowUp = false;

  // Viewing status popover
  activeViewingRow: ViewingRow | null = null;
  viewingPopoverFeedback: string | null = null;
  viewingPopoverNote = '';
  isUpdatingViewing = false;

  readonly followUpOutcomeOptions = [
    { value: CallOutcome.INTERESTED,        label: 'Interessiert',   color: 'var(--color-success)' },
    { value: CallOutcome.SCHEDULED_VIEWING, label: 'Besichtigung',   color: 'var(--color-viewing)' },
    { value: CallOutcome.OFFER_MADE,        label: 'Angebot gemacht', color: 'var(--color-offer)' },
    { value: CallOutcome.NOT_INTERESTED,    label: 'Kein Interesse', color: 'var(--color-error)' },
  ];

  todayLabel = '';
  greeting = '';

  private destroy$ = new Subject<void>();

  constructor(
    private clientService: ClientService,
    private propertyService: PropertyService,
    private callNotesService: CallNotesService,
    private viewingService: ViewingService,
    private translate: TranslateService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.buildDateLabel();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildDateLabel(): void {
    const now = new Date();
    const lang = this.translate.currentLang || 'de';
    const locale = lang === 'de' ? 'de-DE' : 'en-US';
    this.todayLabel = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const hour = now.getHours();
    const greetingKey = hour < 12 ? 'dashboard.greetingMorning'
                      : hour < 18 ? 'dashboard.greetingAfternoon'
                                  : 'dashboard.greetingEvening';
    this.translate.get(greetingKey).subscribe(g => this.greeting = g);
  }

  private loadData(): void {
    forkJoin({
      clientStats:    this.clientService.getClientStats().pipe(catchError(() => of({ totalClients: 0 }))),
      notes:          this.callNotesService.getCallNotesByAgent(0, 10).pipe(catchError(() => of({ content: [], totalElements: 0 }))),
      followUps:      this.callNotesService.getFollowUpReminders().pipe(catchError(() => of([]))),
      properties:     this.propertyService.getProperties(0, 1).pipe(catchError(() => of({ content: [], totalElements: 0 }))),
      todayViewings:  this.viewingService.getTodaysViewings().pipe(catchError(() => of([]))),
      clientsByStage: this.clientService.getClientsByStage().pipe(catchError(() => of({}))),
      staleClients:   this.clientService.getClientsWithoutRecentContact(30).pipe(catchError(() => of([]))),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe(({ clientStats, notes, followUps, properties, todayViewings, clientsByStage, staleClients }) => {
      this.loading = false;

      const totalClients    = clientStats.totalClients;
      const totalNotes      = (notes as any).totalElements ?? 0;
      const totalProperties = (properties as any).totalElements ?? 0;

      this.buildTodayViewings(todayViewings as ViewingSummary[]);
      this.buildStaleClients(staleClients as any[]);
      this.buildStatCards(totalClients, totalNotes, totalProperties, (followUps as FollowUpReminder[]).length);
      this.buildFollowUps(followUps as FollowUpReminder[]);
      this.buildActivity((notes as any).content ?? []);
      this.buildPipelineFromStages(clientsByStage as Record<PipelineStage, any[]>);
    });
  }

  private buildStatCards(clients: number, notes: number, properties: number, followups: number): void {
    this.translate.get([
      'dashboard.stats.clients',
      'dashboard.stats.notes',
      'dashboard.stats.properties',
      'dashboard.stats.followups',
      'dashboard.stats.activeThis',
      'dashboard.stats.thisMonth',
      'dashboard.stats.open',
    ]).subscribe(t => {
      this.statCards = [
        {
          icon: 'ph-fill ph-users',
          iconBg: 'color-mix(in srgb,var(--primary) 12%,var(--surface))',
          iconColor: 'var(--primary)',
          value: String(clients),
          label: t['dashboard.stats.clients'],
          caption: t['dashboard.stats.activeThis'],
          capColor: 'var(--color-success)',
        },
        {
          icon: 'ph-fill ph-chats-circle',
          iconBg: 'color-mix(in srgb,var(--color-viewing) 12%,var(--surface))',
          iconColor: 'var(--color-viewing)',
          value: String(notes),
          label: t['dashboard.stats.notes'],
          caption: t['dashboard.stats.thisMonth'],
          capColor: 'var(--text-3)',
        },
        {
          icon: 'ph-fill ph-buildings',
          iconBg: 'color-mix(in srgb,var(--color-success) 12%,var(--surface))',
          iconColor: 'var(--color-success)',
          value: String(properties),
          label: t['dashboard.stats.properties'],
          caption: '',
          capColor: 'var(--text-3)',
        },
        {
          icon: 'ph-fill ph-bell-ringing',
          iconBg: 'color-mix(in srgb,var(--color-warning) 12%,var(--surface))',
          iconColor: 'var(--color-warning)',
          value: String(followups),
          label: t['dashboard.stats.followups'],
          caption: t['dashboard.stats.open'],
          capColor: followups > 0 ? 'var(--color-warning)' : 'var(--color-success)',
        },
      ];
    });
  }

  private buildFollowUps(reminders: FollowUpReminder[]): void {
    const lang = this.translate.currentLang || 'de';
    const locale = lang === 'de' ? 'de-DE' : 'en-US';

    this.followUps = reminders.map(r => {
      const initials = r.clientName
        .split(' ')
        .map(p => p.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');

      const due = new Date(r.followUpDate);
      const dueLabel = due.toLocaleDateString(locale, { day: '2-digit', month: 'short' });

      return {
        id: r.id,
        clientId: r.clientId,
        customerName: r.clientName,
        customerInitials: initials,
        subject: r.subject,
        typeLabel: '',
        dueLabel: r.isOverdue ? '⚠ Überfällig' : dueLabel,
        dueColor: r.isOverdue ? 'var(--color-error)' : (r.daysUntilDue <= 2 ? 'var(--color-warning)' : 'var(--color-success)'),
        followupFmt: dueLabel,
        isOverdue: r.isOverdue,
      };
    });
  }

  private buildActivity(notes: CallNoteSummary[]): void {
    const lang = this.translate.currentLang || 'de';
    const locale = lang === 'de' ? 'de-DE' : 'en-US';

    this.recentActivity = notes.slice(0, 6).map(n => ({
      typeIcon: this.typeIcon(n.callType),
      typeColor: this.typeColor(n.callType),
      subject: n.subject,
      customerName: n.clientName ?? '',
      dateFmt: new Date(n.callDate).toLocaleDateString(locale, { day: '2-digit', month: 'short' }),
      resultColor: this.outcomeColor(n.outcome),
    }));
  }

  private buildStaleClients(clients: any[]): void {
    const now = Date.now();
    this.staleClientRows = clients.slice(0, 8).map(c => {
      const nameParts = ((c.firstName ?? '') + ' ' + (c.lastName ?? '')).trim().split(' ');
      const initials = nameParts.slice(0, 2).map((p: string) => p.charAt(0).toUpperCase()).join('');
      const updatedMs = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
      const days = Math.floor((now - updatedMs) / 86400000);
      return { id: c.id, name: (c.firstName ?? '') + ' ' + (c.lastName ?? ''), initials, daysSince: days + ' Tage', phone: c.phone ?? undefined };
    });
  }

  private buildPipelineFromStages(clientsByStage: Record<PipelineStage, any[]>): void {
    const stageMeta: { stage: PipelineStage; label: string; color: string }[] = [
      { stage: PipelineStage.PROSPECT,      label: 'Interessent',    color: 'var(--stage-prospect)' },
      { stage: PipelineStage.ACTIVE_SEARCH, label: 'Aktive Suche',   color: 'var(--stage-active-search)' },
      { stage: PipelineStage.VIEWING,       label: 'Besichtigung',   color: 'var(--stage-viewing)' },
      { stage: PipelineStage.CLOSED,        label: 'Abgeschlossen',  color: 'var(--color-success)' },
    ];

    this.pipelineCols = stageMeta.map(meta => {
      const clients = clientsByStage[meta.stage] ?? [];
      return {
        label: meta.label,
        color: meta.color,
        items: clients.map((c: any) => {
          const nameParts = ((c.firstName ?? '') + ' ' + (c.lastName ?? '')).trim().split(' ');
          const initials = nameParts.slice(0, 2).map((p: string) => p.charAt(0).toUpperCase()).join('');
          return {
            clientId: c.id,
            customerName: (c.firstName ?? '') + ' ' + (c.lastName ?? ''),
            initials,
            subject: c.searchCriteria?.additionalRequirements ?? (c.addressCity ? c.addressCity : ''),
            typeIcon: 'ph ph-user',
            dateFmt: c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : '',
          };
        }),
      };
    });
  }

  private buildTodayViewings(viewings: ViewingSummary[]): void {
    const lang = this.translate.currentLang || 'de';
    const locale = lang === 'de' ? 'de-DE' : 'en-US';
    this.todayViewingRows = viewings.map(v => {
      const parts = v.clientName.split(' ');
      const initials = parts.slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('');
      const timeFmt = new Date(v.viewingDate).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      const statusLabel = v.status === 'COMPLETED' ? 'Erledigt' : v.status === 'CANCELLED' ? 'Abgesagt' : 'Geplant';
      const statusBg    = v.status === 'COMPLETED' ? 'var(--color-success-soft)' : v.status === 'CANCELLED' ? 'var(--color-error-soft)' : 'var(--stage-viewing-bg)';
      const statusColor = v.status === 'COMPLETED' ? 'var(--color-success)' : v.status === 'CANCELLED' ? 'var(--color-error)' : 'var(--stage-viewing)';
      return { id: v.id, clientId: v.clientId, clientName: v.clientName, initials, propertyLabel: v.propertyTitle || v.propertyAddress, viewingDate: v.viewingDate, viewingStatus: v.status as ViewingStatus, timeFmt, statusLabel, statusBg, statusColor };
    });
  }

  private typeIcon(type: CallType): string {
    switch (type) {
      case CallType.PHONE_INBOUND:  return 'ph ph-phone-incoming';
      case CallType.PHONE_OUTBOUND: return 'ph ph-phone-outgoing';
      case CallType.EMAIL:          return 'ph ph-envelope-simple';
      case CallType.MEETING:        return 'ph ph-handshake';
      default:                      return 'ph ph-chat-dots';
    }
  }

  private typeColor(type: CallType): string {
    switch (type) {
      case CallType.PHONE_INBOUND:  return 'var(--primary)';
      case CallType.PHONE_OUTBOUND: return 'var(--color-viewing)';
      case CallType.EMAIL:          return 'var(--color-offer)';
      case CallType.MEETING:        return 'var(--color-closed)';
      default:                      return 'var(--text-3)';
    }
  }

  private outcomeColor(outcome?: CallOutcome): string {
    switch (outcome) {
      case CallOutcome.INTERESTED:        return 'var(--color-interested)';
      case CallOutcome.SCHEDULED_VIEWING: return 'var(--color-viewing)';
      case CallOutcome.OFFER_MADE:        return 'var(--color-offer)';
      case CallOutcome.DEAL_CLOSED:       return 'var(--color-closed)';
      case CallOutcome.NOT_INTERESTED:    return 'var(--color-not-interested)';
      default:                            return 'var(--text-3)';
    }
  }

  // ── Follow-up popover ─────────────────────────────────────────

  openFollowUpDone(followUp: FollowUpRow, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.activeFollowUp = followUp;
    this.followUpNoteText = '';
    this.followUpOutcome = null;
  }

  closeFollowUpPopover(): void {
    this.activeFollowUp = null;
    this.followUpNoteText = '';
    this.followUpOutcome = null;
  }

  submitFollowUpDone(): void {
    if (this.isSubmittingFollowUp || !this.activeFollowUp) return;
    this.isSubmittingFollowUp = true;
    const note: CallNoteCreateRequest = {
      clientId: this.activeFollowUp.clientId,
      callDate: new Date().toISOString(),
      callType: CallType.PHONE_OUTBOUND,
      subject: 'Follow-up: ' + this.activeFollowUp.subject,
      notes: this.followUpNoteText || 'Erledigt',
      outcome: this.followUpOutcome ?? undefined,
      followUpRequired: false,
    };
    this.callNotesService.createCallNote(note).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSubmittingFollowUp = false;
        this.closeFollowUpPopover();
        this.loadData();
      },
      error: () => { this.isSubmittingFollowUp = false; }
    });
  }

  // ── Viewing status popover ────────────────────────────────────

  openViewingDone(viewing: ViewingRow): void {
    this.activeViewingRow = viewing;
    this.viewingPopoverFeedback = null;
    this.viewingPopoverNote = '';
  }

  closeViewingPopover(): void {
    this.activeViewingRow = null;
    this.viewingPopoverFeedback = null;
    this.viewingPopoverNote = '';
  }

  setViewingStatus(viewing: ViewingRow, status: string): void {
    if (this.isUpdatingViewing) return;
    this.isUpdatingViewing = true;
    this.viewingService.updateViewing(viewing.id, {
      viewingDate: viewing.viewingDate,
      status: status as ViewingStatus,
      feedback: (this.viewingPopoverFeedback as ViewingFeedback | undefined) ?? undefined,
      clientNotes: this.viewingPopoverNote || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isUpdatingViewing = false;
        this.closeViewingPopover();
        this.loadData();
      },
      error: () => { this.isUpdatingViewing = false; }
    });
  }

  quickCancelViewing(viewing: ViewingRow, event: MouseEvent): void {
    event.stopPropagation();
    if (this.isUpdatingViewing) return;
    this.isUpdatingViewing = true;
    this.viewingService.updateViewing(viewing.id, {
      viewingDate: viewing.viewingDate,
      status: ViewingStatus.CANCELLED,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.isUpdatingViewing = false; this.loadData(); },
      error: () => { this.isUpdatingViewing = false; }
    });
  }

  // ── Stale clients ─────────────────────────────────────────────

  setClientInactive(clientId: string, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.clientService.updatePipelineStage(clientId, PipelineStage.CLOSED).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadData());
  }
}
