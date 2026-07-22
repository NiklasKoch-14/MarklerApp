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
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';


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
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, DatePipe, ConfirmDialogComponent, DragDropModule],
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
            <i class="ri-user-add-fill" style="font-size:15px;"></i>
            {{ 'dashboard.newCustomer' | translate }}
          </button>
          <button class="btn-secondary" [routerLink]="['/properties/new']">
            <i class="ri-building-2-fill" style="font-size:15px;"></i>
            {{ 'dashboard.newObject' | translate }}
          </button>
        </div>
      </div>

      <!-- Aktions-Zeile: was brennt heute? -->
      @if (!allClear) {
        <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
          <!-- 1) Überfällige Rückrufe — schlagen alles -->
          <button (click)="focusActivityTab('followups')"
                  style="flex:1; min-width:150px; display:flex; align-items:center; gap:13px; padding:15px 17px;
                         border-radius:14px; cursor:pointer; text-align:left; font-family:inherit;
                         box-shadow:var(--shadow); transition:transform .1s;"
                  [style.background]="overdueCount > 0 ? 'var(--color-error-soft)' : 'var(--surface)'"
                  [style.border]="overdueCount > 0 ? '1px solid var(--color-error)' : '1px solid var(--border)'">
            <i class="ri-phone-fill" style="font-size:23px;"
               [style.color]="overdueCount > 0 ? 'var(--color-error)' : 'var(--text-3)'"></i>
            <div>
              <div style="font-size:23px; font-weight:800; line-height:1; font-variant-numeric:tabular-nums;"
                   [style.color]="overdueCount > 0 ? 'var(--color-error)' : 'var(--text)'">{{ overdueCount }}</div>
              <div style="font-size:12px; font-weight:600; color:var(--text-2); margin-top:4px;">Rückrufe überfällig</div>
            </div>
          </button>

          <!-- 2) Besichtigungen heute -->
          <button (click)="focusSection('sec-today-viewings')"
                  style="flex:1; min-width:150px; display:flex; align-items:center; gap:13px; padding:15px 17px;
                         background:var(--surface); border:1px solid var(--border); border-radius:14px; cursor:pointer;
                         text-align:left; font-family:inherit; box-shadow:var(--shadow); transition:transform .1s;">
            <i class="ri-door-open-fill" style="font-size:23px; color:var(--color-warning);"></i>
            <div>
              <div style="font-size:23px; font-weight:800; line-height:1; font-variant-numeric:tabular-nums; color:var(--text);">{{ todayViewingRows.length }}</div>
              <div style="font-size:12px; font-weight:600; color:var(--text-2); margin-top:4px;">Besichtigungen heute</div>
            </div>
          </button>

          <!-- 3) Kunden lange nicht gehört -->
          <button (click)="focusActivityTab('stale')"
                  style="flex:1; min-width:150px; display:flex; align-items:center; gap:13px; padding:15px 17px;
                         background:var(--surface); border:1px solid var(--border); border-radius:14px; cursor:pointer;
                         text-align:left; font-family:inherit; box-shadow:var(--shadow); transition:transform .1s;">
            <i class="ri-hourglass-fill" style="font-size:23px;"
               [style.color]="staleClientRows.length > 0 ? 'var(--color-warning)' : 'var(--text-3)'"></i>
            <div>
              <div style="font-size:23px; font-weight:800; line-height:1; font-variant-numeric:tabular-nums;"
                   [style.color]="staleClientRows.length > 0 ? 'var(--color-warning)' : 'var(--text)'">{{ staleClientRows.length }}</div>
              <div style="font-size:12px; font-weight:600; color:var(--text-2); margin-top:4px;">Kunden lange nicht gehört</div>
            </div>
          </button>
        </div>
      }

      <!-- Positiver Zustand: nichts brennt (nur wenn es überhaupt schon Daten zum Abarbeiten gab) -->
      @if (allClear && hasAnyClients && !loading) {
        <div style="display:flex; align-items:center; gap:13px; margin-bottom:20px; padding:16px 18px;
                    background:var(--color-success-soft); border:1px solid var(--color-success); border-radius:14px;">
          <i class="ri-checkbox-circle-fill" style="font-size:26px; color:var(--color-success);"></i>
          <div>
            <div style="font-size:15px; font-weight:700; color:var(--text);">{{ 'dashboard.allClearTitle' | translate }}</div>
            <div style="font-size:13px; color:var(--text-2);">{{ 'dashboard.allClearMessage' | translate }}</div>
          </div>
        </div>
      }

      <!-- Echt leerer Account: kein "alles erledigt", sondern ein klarer erster Schritt -->
      @if (allClear && !hasAnyClients && !loading) {
        <div style="display:flex; align-items:center; gap:13px; margin-bottom:20px; padding:16px 18px;
                    background:var(--accent-soft); border:1px solid var(--primary); border-radius:14px;">
          <i class="ri-flag-line" style="font-size:26px; color:var(--primary);"></i>
          <div style="flex:1;">
            <div style="font-size:15px; font-weight:700; color:var(--text);">{{ 'dashboard.emptyStateTitle' | translate }}</div>
            <div style="font-size:13px; color:var(--text-2);">{{ 'dashboard.emptyStateMessage' | translate }}</div>
          </div>
          <a routerLink="/clients/new"
             style="flex-shrink:0; padding:9px 16px; background:var(--primary); color:#fff; border-radius:10px;
                    font-size:13px; font-weight:600; text-decoration:none; white-space:nowrap;">
            {{ 'clients.addFirstClient' | translate }}
          </a>
        </div>
      }

      <!-- Heutige Besichtigungen — Tagesagenda, immer als erstes sichtbar -->
      <div id="sec-today-viewings" class="widget-card" style="margin-bottom:20px; scroll-margin-top:16px;">
        <div class="widget-header">
          <i class="ri-door-open-fill" style="color:var(--color-warning); font-size:18px;"></i>
          <h3 class="widget-title">Heutige Besichtigungen</h3>
          @if (todayViewingRows.length > 0) {
            <span style="background:color-mix(in srgb,var(--color-warning) 14%,var(--surface)); color:var(--color-warning);
                         font-size:12px; font-weight:700; padding:3px 9px; border-radius:20px;
                         font-variant-numeric:tabular-nums;">{{ todayViewingRows.length }}</span>
          }
        </div>

        @if (todayViewingRows.length === 0 && !loading) {
          <div style="padding:11px 18px 13px; display:flex; align-items:center; gap:10px; color:var(--text-3); font-size:13px;">
            <i class="ri-calendar-line" style="font-size:16px;"></i>
            <span>Keine Besichtigungen heute geplant</span>
          </div>
        }

        @if (todayViewingRows.length > 0) {
          <div style="display:flex; gap:12px; padding:4px 18px 16px; overflow-x:auto;">
            @for (v of todayViewingRows; track v.id) {
              <div style="min-width:210px; background:var(--surface-2); border:1px solid var(--border);
                          border-radius:10px; padding:12px 14px; transition:box-shadow .15s; flex-shrink:0; display:flex; flex-direction:column; gap:0;">
                <div [routerLink]="['/clients', v.clientId]" style="cursor:pointer;">
                  <div style="font-size:20px; font-weight:800; color:var(--color-warning); font-variant-numeric:tabular-nums; line-height:1; margin-bottom:8px;">
                    {{ v.timeFmt }}
                  </div>
                  <div style="display:flex; align-items:center; gap:7px; margin-bottom:5px;">
                    <div style="width:26px; height:26px; border-radius:50%; background:color-mix(in srgb,var(--color-warning) 12%,var(--surface));
                                color:var(--color-warning); display:flex; align-items:center; justify-content:center;
                                font-weight:700; font-size:11px; flex-shrink:0;">
                      {{ v.initials }}
                    </div>
                    <span style="font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ v.clientName }}</span>
                  </div>
                  <div style="font-size:12px; color:var(--text-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:8px;">
                    <i class="ri-building-2-line" style="font-size:11px;"></i>
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
                            style="flex:1; min-height:44px; padding:11px 14px; border:1.5px solid var(--color-success); border-radius:7px;
                                   background:none; color:var(--color-success); font-size:13px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:5px;">
                      <i class="ri-check-line" style="font-size:14px;"></i> Erledigt
                    </button>
                    <button (click)="quickCancelViewing(v, $event)"
                            style="min-width:44px; min-height:44px; padding:11px 14px; border:1.5px solid var(--border); border-radius:7px;
                                   background:none; color:var(--text-3); font-size:13px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;" title="Absagen">
                      <i class="ri-close-line"></i>
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
            <i class="ri-grid-line" style="font-size:15px;"></i>
            {{ 'dashboard.tabCards' | translate }}
          </button>
          <button class="view-tab" [class.active]="view === 'pipeline'" (click)="view = 'pipeline'">
            <i class="ri-kanban-view" style="font-size:15px;"></i>
            {{ 'dashboard.tabPipeline' | translate }}
          </button>
        </div>
      </div>

      <!-- Cards view -->
      @if (view === 'cards') {
        <!-- Eine Card, drei Reiter (Follow-ups / Aktivitaet / stille Kunden). Die Zaehler
             sitzen auf den Reitern, damit das Zusammenlegen nicht die Information kostet,
             ob hinter einem geschlossenen Reiter ueberhaupt etwas liegt. -->
        <div id="sec-activity" class="widget-card" style="scroll-margin-top:16px;">
          <div class="widget-header" style="gap:6px; flex-wrap:wrap;">
            <div class="view-tabs">
              @for (tab of activityTabs; track tab.key) {
                <button class="view-tab" [class.active]="activityTab === tab.key" (click)="activityTab = tab.key">
                  <i [class]="tab.icon" style="font-size:15px;" [style.color]="activityTab === tab.key ? tab.color : ''"></i>
                  {{ tab.labelKey | translate }}
                  @if (tabCount(tab.key) > 0) {
                    <span style="font-size:11px; font-weight:700; padding:1px 7px; border-radius:20px;
                                 font-variant-numeric:tabular-nums;"
                          [style.background]="'color-mix(in srgb,' + tab.color + ' 14%,var(--surface))'"
                          [style.color]="tab.color">{{ tabCount(tab.key) }}</span>
                  }
                </button>
              }
            </div>
            <div style="flex:1;"></div>
            <button [routerLink]="[activeTabMeta.link]"
                    style="background:none; border:none; color:var(--primary); font-size:13px;
                           font-weight:600; cursor:pointer;">
              {{ 'dashboard.viewAll' | translate }}
            </button>
          </div>

          @if (activityTab === 'followups') {

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
                               cursor:pointer; white-space:nowrap; flex-shrink:0; display:inline-flex; align-items:center; gap:5px;">
                  <i class="ri-check-line" style="font-size:12px;"></i> Erledigt
                </button>
                <button class="btn-icon" [routerLink]="['/clients', f.clientId]"
                        title="{{ 'dashboard.openCustomer' | translate }}">
                  <i class="ri-arrow-right-line"></i>
                </button>
              </div>
            }

            @if (followUps.length === 0 && !loading) {
              <div style="padding:40px 18px; text-align:center; color:var(--text-3);">
                <i class="ri-checkbox-circle-line" style="font-size:32px; color:#1f8a5b;"></i>
                <div style="margin-top:10px; font-size:14px; font-weight:500;">
                  {{ 'dashboard.noFollowups' | translate }}
                </div>
              </div>
            }
          }

          @if (activityTab === 'activity') {

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
                <i class="ri-discuss-line" style="font-size:32px;"></i>
                <div style="margin-top:10px; font-size:14px; font-weight:500;">
                  {{ 'dashboard.noActivity' | translate }}
                </div>
              </div>
            }
          }

          @if (activityTab === 'stale') {

          @if (staleClientRows.length === 0 && !loading) {
            <div style="padding:32px 18px; text-align:center; color:var(--text-3);">
              <i class="ri-checkbox-circle-line" style="font-size:28px; color:var(--color-success);"></i>
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
                         style="width:44px; height:44px; display:flex; align-items:center; justify-content:center;
                                border:1.5px solid var(--primary); border-radius:7px; color:var(--primary);
                                font-size:14px; text-decoration:none;" title="Anrufen">
                        <i class="ri-phone-line"></i>
                      </a>
                    }
                    <button (click)="confirmSetInactive(c.id, c.name, $event)"
                            style="width:44px; height:44px; display:flex; align-items:center; justify-content:center;
                                   border:1.5px solid var(--border); border-radius:7px; background:none;
                                   color:var(--text-3); font-size:14px; cursor:pointer;" title="{{ 'dashboard.markInactiveConfirm' | translate }}">
                      <i class="ri-user-minus-line"></i>
                    </button>
                  </div>
                </div>
              }
            </div>
          }

          }
        </div>

      }

      <!-- Pipeline view -->
      @if (view === 'pipeline') {
        <div style="display:flex; justify-content:flex-end; margin-bottom:10px;">
          <label style="display:flex; align-items:center; gap:6px; font-size:13px; color:var(--text-2); cursor:pointer; user-select:none;">
            <input type="checkbox" [(ngModel)]="showClosedStages" style="cursor:pointer;">
            {{ 'dashboard.showClosedStages' | translate }}
          </label>
        </div>
        <div class="pipeline-grid">
          @for (col of pipelineCols; track col.stage) {
            @if (!col.closed || showClosedStages) {
              <div style="background:var(--surface-2); border:1px solid var(--border); border-radius:14px; padding:6px;">
                <div style="display:flex; align-items:center; gap:8px; padding:11px 12px 2px;">
                  <span style="width:9px; height:9px; border-radius:50%;" [style.background]="col.color"></span>
                  <span style="font-size:13px; font-weight:700; flex:1; color:var(--text);">{{ col.label }}</span>
                  <span style="font-size:12px; font-weight:700; color:var(--text-3); font-variant-numeric:tabular-nums;">
                    {{ col.items.length }}
                  </span>
                </div>
                @if (columnCommission(col.items) > 0) {
                  <div style="padding:0 12px 9px 29px; font-size:11.5px; color:var(--text-3); font-variant-numeric:tabular-nums;">
                    {{ 'dashboard.pipelineValue' | translate }}: <strong style="color:var(--text-2);">{{ formatCommission(columnCommission(col.items)) }}</strong>
                  </div>
                } @else {
                  <div style="padding-bottom:9px;"></div>
                }
                <div [id]="'pipeline-col-' + col.stage"
                     cdkDropList
                     [cdkDropListData]="col.items"
                     [cdkDropListConnectedTo]="dropListIds"
                     (cdkDropListDropped)="onCardDropped($event, col.stage)"
                     style="min-height:44px;">
                  @for (it of col.items; track it.clientId) {
                    <div cdkDrag [cdkDragData]="it" [routerLink]="['/clients', it.clientId]"
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
                        @if (it.expectedCommission) {
                          <span style="margin-left:auto; font-weight:700; color:var(--text-2); font-variant-numeric:tabular-nums;">
                            {{ formatCommission(it.expectedCommission) }}
                          </span>
                        }
                      </div>
                    </div>
                  }
                  @if (col.items.length === 0) {
                    <div style="padding:14px 12px; font-size:12px; color:var(--text-3); text-align:center;">—</div>
                  }
                </div>
              </div>
            }
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
                           color:#fff;font-size:13px;font-weight:600;cursor:pointer;
                           display:inline-flex;align-items:center;justify-content:center;gap:6px;"
                    [style.opacity]="isSubmittingFollowUp ? '0.6' : '1'">
              <i class="ri-check-line" *ngIf="!isSubmittingFollowUp" style="font-size:14px;"></i>
              {{ isSubmittingFollowUp ? 'Speichern...' : 'Als erledigt speichern' }}
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
                    [style.background]="viewingPopoverFeedback === 'LIKED' ? 'var(--color-success-soft)' : 'var(--surface-2)'"
                    [style.border-color]="viewingPopoverFeedback === 'LIKED' ? 'var(--color-success)' : 'var(--border)'"
                    [style.color]="viewingPopoverFeedback === 'LIKED' ? 'var(--color-success)' : 'var(--text-2)'"
                    style="flex:1;padding:8px 10px;border-radius:8px;border:1.5px solid;cursor:pointer;font-size:13px;font-weight:500;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
              <i class="ri-thumb-up-line" style="font-size:15px;"></i> Gefällt
            </button>
            <button (click)="viewingPopoverFeedback = viewingPopoverFeedback === 'NEUTRAL' ? null : 'NEUTRAL'"
                    [style.background]="viewingPopoverFeedback === 'NEUTRAL' ? 'var(--color-warning-soft)' : 'var(--surface-2)'"
                    [style.border-color]="viewingPopoverFeedback === 'NEUTRAL' ? 'var(--color-warning)' : 'var(--border)'"
                    [style.color]="viewingPopoverFeedback === 'NEUTRAL' ? 'var(--color-warning)' : 'var(--text-2)'"
                    style="flex:1;padding:8px 10px;border-radius:8px;border:1.5px solid;cursor:pointer;font-size:13px;font-weight:500;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
              <i class="ri-emotion-normal-line" style="font-size:15px;"></i> Neutral
            </button>
            <button (click)="viewingPopoverFeedback = viewingPopoverFeedback === 'DISLIKED' ? null : 'DISLIKED'"
                    [style.background]="viewingPopoverFeedback === 'DISLIKED' ? 'var(--color-error-soft)' : 'var(--surface-2)'"
                    [style.border-color]="viewingPopoverFeedback === 'DISLIKED' ? 'var(--color-error)' : 'var(--border)'"
                    [style.color]="viewingPopoverFeedback === 'DISLIKED' ? 'var(--color-error)' : 'var(--text-2)'"
                    style="flex:1;padding:8px 10px;border-radius:8px;border:1.5px solid;cursor:pointer;font-size:13px;font-weight:500;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
              <i class="ri-thumb-down-line" style="font-size:15px;"></i> Nicht
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
                           color:#fff;font-size:13px;font-weight:600;cursor:pointer;
                           display:inline-flex;align-items:center;justify-content:center;gap:6px;"
                    [style.opacity]="isUpdatingViewing ? '0.6' : '1'">
              <i class="ri-check-line" *ngIf="!isUpdatingViewing" style="font-size:14px;"></i>
              {{ isUpdatingViewing ? 'Speichern...' : 'Als erledigt speichern' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ── Als-inaktiv-markieren Bestätigung ───────────────────── -->
    <app-confirm-dialog
      [open]="pendingInactiveClient !== null"
      [danger]="false"
      icon="ri-user-minus-line"
      [title]="'dashboard.markInactiveTitle' | translate"
      [message]="pendingInactiveClient ? ('dashboard.markInactiveMessage' | translate:{ name: pendingInactiveClient.name }) : ''"
      [confirmLabel]="'dashboard.markInactiveConfirm' | translate"
      [busy]="isMarkingInactive"
      (cancel)="cancelSetInactive()"
      (confirm)="setClientInactive()">
    </app-confirm-dialog>
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  view: 'cards' | 'pipeline' = 'cards';

  /** Follow-ups zuerst: das ist die Liste, aus der Arbeit entsteht — die beiden anderen
   *  Reiter sind Nachschlagen, nicht Handeln. */
  activityTab: 'followups' | 'activity' | 'stale' = 'followups';

  readonly activityTabs = [
    { key: 'followups' as const, labelKey: 'dashboard.openFollowups',  icon: 'ri-notification-fill', color: '#c07a1e',            link: '/notifications' },
    { key: 'activity'  as const, labelKey: 'dashboard.recentActivity', icon: 'ri-history-line',      color: 'var(--primary)',      link: '/notifications' },
    { key: 'stale'     as const, labelKey: 'dashboard.staleClients',   icon: 'ri-user-minus-fill',   color: 'var(--color-warning)', link: '/clients' },
  ];

  get activeTabMeta() {
    return this.activityTabs.find(t => t.key === this.activityTab) ?? this.activityTabs[0];
  }

  /** Die Aktivitaetsliste bekommt bewusst keinen Zaehler: sie ist immer gefuellt und
   *  eine Zahl daneben wuerde Dringlichkeit suggerieren, wo keine ist. */
  tabCount(key: 'followups' | 'activity' | 'stale'): number {
    if (key === 'followups') return this.followUps.length;
    if (key === 'stale') return this.staleClientRows.length;
    return 0;
  }
  loading = true;

  followUps: FollowUpRow[] = [];
  recentActivity: ActivityRow[] = [];
  todayViewingRows: ViewingRow[] = [];
  staleClientRows: { id: string; name: string; initials: string; daysSince: string; phone?: string }[] = [];
  pendingInactiveClient: { id: string; name: string } | null = null;
  isMarkingInactive = false;

  pipelineCols: { stage: PipelineStage; label: string; color: string; closed: boolean; items: any[] }[] = [];
  showClosedStages = false;
  isMovingCard = false;

  /** Überfällige Rückrufe — die dringendste Zahl der Aktions-Zeile. */
  get overdueCount(): number {
    return this.followUps.filter(f => f.isOverdue).length;
  }

  /** Nichts brennt: keine überfälligen Rückrufe, keine Besichtigungen heute, keine liegengebliebenen Kunden. */
  get allClear(): boolean {
    return this.overdueCount === 0 && this.todayViewingRows.length === 0 && this.staleClientRows.length === 0;
  }

  /** Unterscheidet "wirklich abgearbeitet" von "noch nie Daten angelegt" — sonst wirkt ein
   *  brandneuer, leerer Account mit denselben Erfolgsmeldungen wie ein erfahrener Nutzer,
   *  der seinen Tag durchgearbeitet hat. */
  get hasAnyClients(): boolean {
    return this.pipelineCols.some(col => col.items.length > 0) || this.recentActivity.length > 0;
  }

  /** Aktions-Zeile klickbar: zur passenden Sektion springen (in Cards-Ansicht, da manche Widgets nur dort liegen). */
  focusSection(id: string): void {
    this.view = 'cards';
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  /**
   * Die KPI-Kacheln sprangen frueher zu je einem eigenen Widget. Seit alle drei Listen
   * in einer Card mit Reitern liegen, reicht Scrollen nicht mehr — der passende Reiter
   * muss mit aufgehen, sonst landet man auf der Card und sieht die falsche Liste.
   */
  focusActivityTab(tab: 'followups' | 'activity' | 'stale'): void {
    this.activityTab = tab;
    this.focusSection('sec-activity');
  }

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
      notes:          this.callNotesService.getCallNotesByAgent(0, 10).pipe(catchError(() => of({ content: [], totalElements: 0 }))),
      followUps:      this.callNotesService.getFollowUpReminders().pipe(catchError(() => of([]))),
      todayViewings:  this.viewingService.getTodaysViewings().pipe(catchError(() => of([]))),
      clientsByStage: this.clientService.getClientsByStage().pipe(catchError(() => of({}))),
      staleClients:   this.clientService.getClientsWithoutRecentContact(30).pipe(catchError(() => of([]))),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe(({ notes, followUps, todayViewings, clientsByStage, staleClients }) => {
      this.loading = false;

      this.buildTodayViewings(todayViewings as ViewingSummary[]);
      this.buildStaleClients(staleClients as any[]);
      this.buildFollowUps(followUps as FollowUpReminder[]);
      this.buildActivity((notes as any).content ?? []);
      this.buildPipelineFromStages(clientsByStage as Record<PipelineStage, any[]>);
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
        dueLabel: r.isOverdue ? 'Überfällig' : dueLabel,
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

  get dropListIds(): string[] {
    return this.pipelineCols.map(c => 'pipeline-col-' + c.stage);
  }

  /** Drag&Drop between Kanban columns — persists the new stage, reloads from the server on failure. */
  onCardDropped(event: CdkDragDrop<any[]>, targetStage: PipelineStage): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }
    const item = event.previousContainer.data[event.previousIndex];
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
    this.clientService.updatePipelineStage(item.clientId, targetStage).subscribe({
      error: () => this.loadData()
    });
  }

  private buildPipelineFromStages(clientsByStage: Record<PipelineStage, any[]>): void {
    const stageMeta: { stage: PipelineStage; label: string; color: string; closed: boolean }[] = [
      { stage: PipelineStage.PROSPECT,      label: 'Interessent',    color: 'var(--stage-prospect)',      closed: false },
      { stage: PipelineStage.ACTIVE_SEARCH, label: 'Aktive Suche',   color: 'var(--stage-active-search)', closed: false },
      { stage: PipelineStage.VIEWING,       label: 'Besichtigung',   color: 'var(--stage-viewing)',       closed: false },
      { stage: PipelineStage.WON,           label: 'Gewonnen',       color: 'var(--stage-won)',           closed: true },
      { stage: PipelineStage.LOST,          label: 'Verloren',       color: 'var(--stage-lost)',          closed: true },
    ];

    this.pipelineCols = stageMeta.map(meta => {
      const clients = clientsByStage[meta.stage] ?? [];
      return {
        stage: meta.stage,
        label: meta.label,
        color: meta.color,
        closed: meta.closed,
        items: clients.map((c: any) => {
          const nameParts = ((c.firstName ?? '') + ' ' + (c.lastName ?? '')).trim().split(' ');
          const initials = nameParts.slice(0, 2).map((p: string) => p.charAt(0).toUpperCase()).join('');
          return {
            clientId: c.id,
            customerName: (c.firstName ?? '') + ' ' + (c.lastName ?? ''),
            initials,
            subject: c.searchCriteria?.additionalRequirements ?? (c.addressCity ? c.addressCity : ''),
            typeIcon: 'ri-user-line',
            dateFmt: c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) : '',
            expectedCommission: c.expectedCommission ?? null,
          };
        }),
      };
    });
  }

  /**
   * Summe der geschaetzten Provisionen einer Spalte (Issue #22). Karten ohne
   * gepflegten Wert zaehlen als 0 — eine Spalte ohne jeden Wert liefert 0 und
   * blendet die Anzeige im Template aus, statt ein irrefuehrendes "0 €" zu zeigen.
   */
  columnCommission(items: { expectedCommission?: number | null }[]): number {
    return items.reduce((sum, item) => sum + (item.expectedCommission ?? 0), 0);
  }

  formatCommission(value: number): string {
    const locale = (this.translate.currentLang || 'de') === 'de' ? 'de-DE' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0
    }).format(value);
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
      case CallType.PHONE_INBOUND:  return 'ri-phone-line';
      case CallType.PHONE_OUTBOUND: return 'ri-phone-line';
      case CallType.EMAIL:          return 'ri-mail-line';
      case CallType.MEETING:        return 'ri-shake-hands-line';
      default:                      return 'ri-chat-4-line';
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

  confirmSetInactive(clientId: string, name: string, event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.pendingInactiveClient = { id: clientId, name };
  }

  cancelSetInactive(): void {
    this.pendingInactiveClient = null;
  }

  setClientInactive(): void {
    if (!this.pendingInactiveClient) return;
    this.isMarkingInactive = true;
    this.clientService.updatePipelineStage(this.pendingInactiveClient.id, PipelineStage.LOST).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.isMarkingInactive = false;
      this.pendingInactiveClient = null;
      this.loadData();
    });
  }
}
