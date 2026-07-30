import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';
import {
  ViewingService,
  ViewingSummary,
  ViewingStatus,
  ViewingFeedback,
  ViewingUpdateRequest
} from '../../services/viewing.service';
import { PagedResponse } from '../../../client-management/services/client.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { TranslateEnumPipe } from '../../../../shared/pipes/translate-enum.pipe';

type ViewMode = 'agenda' | 'week';
type RangeFilter = 'UPCOMING' | 'WEEK' | 'MONTH' | 'PAST' | 'ALL';
type StatusFilter = 'ALL' | ViewingStatus;

interface ViewingRow {
  id: string;
  clientId: string;
  clientName: string;
  initials: string;
  propertyLabel: string;
  date: Date;
  timeFmt: string;
  dayFmt: string;
  status: ViewingStatus;
  feedback?: ViewingFeedback;
}

interface AgendaGroup {
  key: string;
  labelKey: string;
  rows: ViewingRow[];
}

interface WeekDay {
  key: string;
  weekdayFmt: string;
  dateFmt: string;
  isToday: boolean;
  rows: ViewingRow[];
}

/** Past window scanned for viewings whose feedback was never recorded. */
const OPEN_FEEDBACK_DAYS = 90;

const EMPTY_PAGE: PagedResponse<ViewingSummary> = {
  content: [], totalElements: 0, totalPages: 0, size: 0, number: 0, first: true, last: true, empty: true
};

@Component({
  selector: 'app-viewing-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, TranslateModule,
    LoadingSpinnerComponent, ConfirmDialogComponent, TranslateEnumPipe
  ],
  styles: [`
    .toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:18px}
    .seg{display:inline-flex;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:2px;gap:2px}
    .seg button{border:none;background:none;padding:6px 11px;border-radius:8px;font-size:13px;font-weight:600;color:var(--text-2);cursor:pointer;font-family:inherit;white-space:nowrap}
    .seg button.active{background:var(--surface);color:var(--text);box-shadow:var(--shadow)}
    .range-select{padding:8px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);font-size:13px;font-weight:600;font-family:inherit;cursor:pointer}
    .result-count{font-size:13px;color:var(--text-3);margin-left:auto;white-space:nowrap}
    .group{margin-bottom:22px}
    .group-head{display:flex;align-items:center;gap:9px;margin-bottom:10px}
    .group-head h2{margin:0;font-size:14px;font-weight:700;color:var(--text)}
    .group-head span{font-size:12px;font-weight:700;color:var(--text-3);font-variant-numeric:tabular-nums}
    .v-row{display:flex;align-items:center;gap:14px;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow);margin-bottom:8px;cursor:pointer}
    .v-row:hover{border-color:var(--primary)}
    .v-row.cancelled{opacity:.62}
    .v-row.attention{border-color:var(--color-warning);background:color-mix(in srgb,var(--color-warning) 5%,var(--surface))}
    .v-time{min-width:62px}
    .hhmm{font-size:17px;font-weight:800;color:var(--text);font-variant-numeric:tabular-nums;line-height:1.1}
    .day{font-size:11px;font-weight:600;color:var(--text-3);white-space:nowrap}
    .v-main{flex:1;min-width:0}
    .v-avatar{width:26px;height:26px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
    .v-name{font-size:14px;font-weight:600;color:var(--text)}
    .v-prop,.wn{font-size:12px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .chip{font-size:11px;font-weight:700;padding:3px 9px;border-radius:20px;white-space:nowrap}
    .v-actions{display:flex;gap:6px;flex-shrink:0}
    .act{min-width:36px;height:36px;padding:0 10px;border-radius:9px;border:1.5px solid var(--border);background:var(--surface);color:var(--text-3);font-size:15px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-family:inherit}
    .act:hover{border-color:var(--primary);color:var(--primary)}
    .act.done:hover{border-color:var(--color-success);color:var(--color-success)}
    .act.drop:hover{border-color:var(--color-error);color:var(--color-error)}
    .week-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:10px}
    .week-col{background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow);padding:10px;min-height:130px}
    .week-col.today{border-color:var(--primary)}
    .week-item{border-radius:9px;background:var(--surface-2);padding:8px 9px;margin-bottom:6px;cursor:pointer}
    .week-item:hover{background:var(--accent-soft)}
    .wt{font-size:13px;font-weight:800;color:var(--text);font-variant-numeric:tabular-nums}
    .field-label{font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:7px}
    .field-input{width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--surface);box-sizing:border-box;font-family:inherit;outline:none}
    .field-input:focus{border-color:var(--primary)}
    @media (max-width:1024px){.week-only{display:none!important}.week-grid{grid-template-columns:repeat(7,minmax(150px,1fr));overflow-x:auto}}
    @media (max-width:640px){.v-row{flex-wrap:wrap}.v-actions{width:100%;justify-content:flex-end}.result-count{margin-left:0}}
  `],
  template: `
    <div style="padding:28px 32px;">

      <!-- Header -->
      <div class="page-header" style="margin-bottom:18px;">
        <div>
          <h1 class="page-title">{{ 'viewings.title' | translate }}</h1>
          <p style="font-size:14px; color:var(--text-2); margin-top:4px;">{{ 'viewings.listDescription' | translate }}</p>
        </div>
        <div class="view-tabs week-only">
          <button class="view-tab" [class.active]="view === 'agenda'" (click)="setView('agenda')">
            <i class="ri-list-check-2" style="font-size:15px;"></i>
            {{ 'viewings.viewAgenda' | translate }}
          </button>
          <button class="view-tab" [class.active]="view === 'week'" (click)="setView('week')">
            <i class="ri-calendar-2-line" style="font-size:15px;"></i>
            {{ 'viewings.viewWeek' | translate }}
          </button>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="seg">
          <button [class.active]="statusFilter === 'ALL'" (click)="setStatusFilter('ALL')">
            {{ 'viewings.allStatuses' | translate }}
          </button>
          @for (s of statusOptions; track s) {
            <button [class.active]="statusFilter === s" (click)="setStatusFilter(s)">
              {{ s | translateEnum:'viewingStatus' }}
            </button>
          }
        </div>

        @if (view === 'agenda') {
          <select class="range-select" [(ngModel)]="range" (ngModelChange)="load()"
                  [attr.aria-label]="'viewings.rangeFilter' | translate">
            @for (r of rangeOptions; track r) {
              <option [value]="r">{{ 'viewings.range.' + r | translate }}</option>
            }
          </select>
        }

        @if (view === 'week') {
          <div style="display:flex; align-items:center; gap:8px;">
            <button class="act" (click)="shiftWeek(-1)" [attr.aria-label]="'viewings.previousWeek' | translate">
              <i class="ri-arrow-left-s-line"></i>
            </button>
            <span style="font-size:13px; font-weight:600; color:var(--text-2); min-width:190px; text-align:center;">{{ weekLabel }}</span>
            <button class="act" (click)="shiftWeek(1)" [attr.aria-label]="'viewings.nextWeek' | translate">
              <i class="ri-arrow-right-s-line"></i>
            </button>
            @if (weekOffset !== 0) {
              <button class="btn-secondary" (click)="goToCurrentWeek()">{{ 'viewings.currentWeek' | translate }}</button>
            }
          </div>
        }

        <span class="result-count">{{ 'viewings.resultCount' | translate:{ count: visibleCount } }}</span>
      </div>

      <!-- Loading -->
      @if (loading) {
        <div style="text-align:center; padding:48px 0;">
          <app-loading-spinner size="lg"></app-loading-spinner>
          <p style="font-size:14px; color:var(--text-3);">{{ 'common.loading' | translate }}</p>
        </div>
      }

      @if (!loading) {

        <!-- Vergangene Termine ohne Feedback: oben, damit sie nicht liegen bleiben -->
        @if (view === 'agenda' && openFeedbackRows.length > 0) {
          <div class="group">
            <div class="group-head">
              <i class="ri-feedback-line" style="font-size:16px; color:var(--color-warning);"></i>
              <h2>{{ 'viewings.openFeedbackTitle' | translate }}</h2>
              <span>{{ openFeedbackRows.length }}</span>
            </div>
            <p style="font-size:12px; color:var(--text-3); margin:-4px 0 10px;">{{ 'viewings.openFeedbackHint' | translate }}</p>
            @for (row of openFeedbackRows; track row.id) {
              <ng-container *ngTemplateOutlet="viewingRow; context:{ $implicit: row, attention: true }"></ng-container>
            }
          </div>
        }

        <!-- Agenda -->
        @if (view === 'agenda') {
          @if (groups.length === 0 && openFeedbackRows.length === 0) {
            <div style="text-align:center; padding:52px 24px; background:var(--surface); border:1px solid var(--border); border-radius:14px; box-shadow:var(--shadow);">
              <i class="ri-calendar-line" style="font-size:46px; color:var(--text-3); display:block; margin-bottom:12px;"></i>
              <h3 style="font-size:15px; font-weight:600; color:var(--text); margin:0 0 6px;">{{ 'viewings.noViewings' | translate }}</h3>
              <p style="font-size:13px; color:var(--text-2); margin:0 0 20px;">{{ 'viewings.noViewingsHint' | translate }}</p>
              <a routerLink="/clients" class="btn-secondary" style="display:inline-flex;">
                <i class="ri-group-line"></i>
                {{ 'viewings.goToClients' | translate }}
              </a>
            </div>
          }
          @for (group of groups; track group.key) {
            <div class="group">
              <div class="group-head">
                <h2>{{ group.labelKey | translate }}</h2>
                <span>{{ group.rows.length }}</span>
              </div>
              @for (row of group.rows; track row.id) {
                <ng-container *ngTemplateOutlet="viewingRow; context:{ $implicit: row, attention: false }"></ng-container>
              }
            </div>
          }
        }

        <!-- Wochenansicht -->
        @if (view === 'week') {
          <div class="week-grid">
            @for (day of weekDays; track day.key) {
              <div class="week-col" [class.today]="day.isToday">
                <div style="margin-bottom:8px;">
                  <div class="section-label" style="margin-bottom:0;">{{ day.weekdayFmt }}</div>
                  <div style="font-size:14px; font-weight:700; color:var(--text); font-variant-numeric:tabular-nums;">{{ day.dateFmt }}</div>
                </div>
                @for (row of day.rows; track row.id) {
                  <div class="week-item" [routerLink]="['/clients', row.clientId]">
                    <div class="wt">{{ row.timeFmt }}</div>
                    <div class="wn">{{ row.clientName }}</div>
                    <div class="wn" style="color:var(--text-3);">{{ row.propertyLabel }}</div>
                    <span class="chip" style="margin-top:4px; display:inline-block;"
                          [style.background]="statusBg(row.status)" [style.color]="statusColor(row.status)">
                      {{ row.status | translateEnum:'viewingStatus' }}
                    </span>
                  </div>
                }
                @if (day.rows.length === 0) {
                  <div style="font-size:12px; color:var(--text-3);">{{ 'viewings.noViewingsThisDay' | translate }}</div>
                }
              </div>
            }
          </div>
        }
      }
    </div>

    <!-- ── Zeilen-Template ─────────────────────────────────────── -->
    <ng-template #viewingRow let-row let-attention="attention">
      <div class="v-row"
           [class.attention]="attention"
           [class.cancelled]="row.status === 'CANCELLED'"
           [routerLink]="['/clients', row.clientId]">
        <div class="v-time">
          <div class="hhmm">{{ row.timeFmt }}</div>
          <div class="day">{{ row.dayFmt }}</div>
        </div>

        <div class="v-main">
          <div style="display:flex; align-items:center; gap:8px; min-width:0;">
            <span class="v-avatar">{{ row.initials }}</span>
            <span class="v-name">{{ row.clientName }}</span>
          </div>
          <div class="v-prop" style="margin-top:3px;">
            <i class="ri-building-2-line" style="font-size:12px;"></i>
            {{ row.propertyLabel }}
          </div>
        </div>

        <span class="chip" [style.background]="statusBg(row.status)" [style.color]="statusColor(row.status)">
          {{ row.status | translateEnum:'viewingStatus' }}
        </span>

        @if (row.feedback) {
          <span class="chip" [style.background]="feedbackBg(row.feedback)" [style.color]="feedbackColor(row.feedback)">
            {{ row.feedback | translateEnum:'viewingFeedback' }}
          </span>
        }

        <div class="v-actions" (click)="$event.stopPropagation(); $event.preventDefault()">
          @if (row.status !== 'CANCELLED') {
            <button class="act done" (click)="openComplete(row)"
                    [title]="(row.status === 'COMPLETED' ? 'viewings.actions.addFeedback' : 'viewings.actions.complete') | translate">
              <i class="ri-check-line"></i>
            </button>
          }
          @if (row.status === 'SCHEDULED') {
            <button class="act" (click)="openReschedule(row)" [title]="'viewings.actions.reschedule' | translate">
              <i class="ri-pencil-line"></i>
            </button>
            <button class="act drop" (click)="askCancel(row)" [title]="'viewings.actions.cancelViewing' | translate">
              <i class="ri-close-line"></i>
            </button>
          }
        </div>
      </div>
    </ng-template>

    <!-- ── Verschieben ─────────────────────────────────────────── -->
    @if (rescheduleRow) {
      <div style="position:fixed; inset:0; z-index:400; display:flex; align-items:center; justify-content:center; padding:16px; background:rgba(0,0,0,.45);"
           (click)="closeReschedule()">
        <div (click)="$event.stopPropagation()"
             style="background:var(--surface); border-radius:16px; width:400px; max-width:96vw; padding:24px; box-shadow:0 20px 60px rgba(0,0,0,.3);">
          <h3 style="font-size:16px; font-weight:700; color:var(--text); margin:0 0 2px;">{{ 'viewings.reschedule.title' | translate }}</h3>
          <p style="font-size:13px; color:var(--text-3); margin:0 0 18px;">{{ rescheduleRow.clientName }} · {{ rescheduleRow.propertyLabel }}</p>

          <label class="field-label" for="reschedule-date">{{ 'viewings.reschedule.dateLabel' | translate }}</label>
          <input id="reschedule-date" type="datetime-local" class="field-input" [(ngModel)]="rescheduleValue">

          <div class="form-actions form-actions--centered" style="margin-top:22px;">
            <button class="btn-primary" (click)="confirmReschedule()" [disabled]="saving || !rescheduleValue">
              <i class="ri-check-line"></i>
              {{ (saving ? 'common.saving' : 'viewings.reschedule.confirm') | translate }}
            </button>
            <button class="btn-secondary" (click)="closeReschedule()">
              <i class="ri-close-line"></i>
              {{ 'common.cancel' | translate }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ── Erledigt + Feedback ─────────────────────────────────── -->
    @if (completeRow) {
      <div style="position:fixed; inset:0; z-index:400; display:flex; align-items:center; justify-content:center; padding:16px; background:rgba(0,0,0,.45);"
           (click)="closeComplete()">
        <div (click)="$event.stopPropagation()"
             style="background:var(--surface); border-radius:16px; width:400px; max-width:96vw; padding:24px; box-shadow:0 20px 60px rgba(0,0,0,.3);">
          <h3 style="font-size:16px; font-weight:700; color:var(--text); margin:0 0 2px;">{{ 'viewings.complete.title' | translate }}</h3>
          <p style="font-size:13px; color:var(--text-3); margin:0 0 18px;">{{ completeRow.clientName }} · {{ completeRow.propertyLabel }}</p>

          <span class="field-label">{{ 'viewings.complete.feedbackLabel' | translate }}</span>
          <div style="display:flex; gap:8px; margin-bottom:16px;">
            @for (fb of feedbackOptions; track fb.value) {
              <button (click)="toggleFeedback(fb.value)"
                      style="flex:1; padding:8px 10px; border-radius:8px; border:1.5px solid; cursor:pointer; font-size:13px; font-weight:600;
                             font-family:inherit; display:inline-flex; align-items:center; justify-content:center; gap:6px;"
                      [style.background]="completeFeedback === fb.value ? fb.soft : 'var(--surface-2)'"
                      [style.border-color]="completeFeedback === fb.value ? fb.color : 'var(--border)'"
                      [style.color]="completeFeedback === fb.value ? fb.color : 'var(--text-2)'">
                <i [class]="fb.icon" style="font-size:15px;"></i>
                {{ fb.value | translateEnum:'viewingFeedback' }}
              </button>
            }
          </div>

          <label class="field-label" for="complete-notes">{{ 'viewings.complete.notesLabel' | translate }}</label>
          <textarea id="complete-notes" class="field-input" rows="2" style="resize:none; margin-bottom:14px;"
                    [(ngModel)]="completeNotes"
                    [placeholder]="'viewings.complete.notesPlaceholder' | translate"></textarea>

          <label class="field-label" for="complete-followup">{{ 'viewings.complete.followUpLabel' | translate }}</label>
          <input id="complete-followup" type="text" class="field-input"
                 [(ngModel)]="completeFollowUp"
                 [placeholder]="'viewings.complete.followUpPlaceholder' | translate">

          <div class="form-actions form-actions--centered" style="margin-top:22px;">
            <button class="btn-primary" (click)="confirmComplete()" [disabled]="saving"
                    [style.background]="'var(--color-success)'">
              <i class="ri-check-line"></i>
              {{ (saving ? 'common.saving' : 'viewings.complete.confirm') | translate }}
            </button>
            <button class="btn-secondary" (click)="closeComplete()">
              <i class="ri-close-line"></i>
              {{ 'common.cancel' | translate }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ── Absagen ─────────────────────────────────────────────── -->
    <app-confirm-dialog
      [open]="cancelRow !== null"
      [danger]="false"
      icon="ri-close-line"
      [title]="'viewings.cancelDialog.title' | translate"
      [message]="cancelRow ? ('viewings.cancelDialog.message' | translate:{ name: cancelRow.clientName, date: cancelRow.dayFmt + ', ' + cancelRow.timeFmt }) : ''"
      [confirmLabel]="'viewings.cancelDialog.confirm' | translate"
      [busyLabel]="'common.saving' | translate"
      [busy]="saving"
      (cancel)="cancelRow = null"
      (confirm)="confirmCancel()">
    </app-confirm-dialog>
  `
})
export class ViewingListComponent implements OnInit, OnDestroy {

  view: ViewMode = 'agenda';
  range: RangeFilter = 'UPCOMING';
  statusFilter: StatusFilter = 'ALL';
  weekOffset = 0;

  loading = true;
  saving = false;

  groups: AgendaGroup[] = [];
  weekDays: WeekDay[] = [];
  openFeedbackRows: ViewingRow[] = [];
  visibleCount = 0;
  weekLabel = '';

  rescheduleRow: ViewingRow | null = null;
  rescheduleValue = '';

  completeRow: ViewingRow | null = null;
  completeFeedback: ViewingFeedback | null = null;
  completeNotes = '';
  completeFollowUp = '';

  cancelRow: ViewingRow | null = null;

  readonly statusOptions: ViewingStatus[] = [ViewingStatus.SCHEDULED, ViewingStatus.COMPLETED, ViewingStatus.CANCELLED];
  readonly rangeOptions: RangeFilter[] = ['UPCOMING', 'WEEK', 'MONTH', 'PAST', 'ALL'];
  readonly feedbackOptions = [
    { value: ViewingFeedback.LIKED,    icon: 'ri-thumb-up-line',       color: 'var(--color-success)', soft: 'var(--color-success-soft)' },
    { value: ViewingFeedback.NEUTRAL,  icon: 'ri-emotion-normal-line', color: 'var(--color-warning)', soft: 'var(--color-warning-soft)' },
    { value: ViewingFeedback.DISLIKED, icon: 'ri-thumb-down-line',     color: 'var(--color-error)',   soft: 'var(--color-error-soft)' }
  ];

  private allRows: ViewingRow[] = [];
  private pastOpenRows: ViewingRow[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private viewingService: ViewingService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.load();
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.load());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Laden ───────────────────────────────────────────────────
  load(): void {
    this.loading = true;
    const bounds = this.currentBounds();
    const today = this.startOfDay(new Date());

    forkJoin({
      main: this.viewingService.getViewings({ from: bounds.from, to: bounds.to, sort: 'viewingDate,asc', size: 300 })
        .pipe(catchError(() => of(EMPTY_PAGE))),
      pastOpen: this.viewingService.getViewings({
        from: this.toLocalIso(this.addDays(today, -OPEN_FEEDBACK_DAYS)),
        to: this.toLocalIso(today),
        sort: 'viewingDate,desc',
        size: 200
      }).pipe(catchError(() => of(EMPTY_PAGE)))
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ main, pastOpen }) => {
        this.allRows = main.content.map(v => this.toRow(v));
        this.pastOpenRows = pastOpen.content.filter(v => this.needsFeedback(v)).map(v => this.toRow(v));
        this.loading = false;
        this.applyView();
      });
  }

  private needsFeedback(v: ViewingSummary): boolean {
    return v.status === ViewingStatus.SCHEDULED
        || (v.status === ViewingStatus.COMPLETED && !v.feedback);
  }

  // ── Ansicht aufbauen ────────────────────────────────────────
  applyView(): void {
    const matchesStatus = (row: ViewingRow) => this.statusFilter === 'ALL' || row.status === this.statusFilter;

    this.openFeedbackRows = this.view === 'agenda' ? this.pastOpenRows.filter(matchesStatus) : [];
    const highlighted = new Set(this.openFeedbackRows.map(r => r.id));

    const rows = this.allRows.filter(matchesStatus);
    const mainIds = new Set(rows.map(r => r.id));
    this.visibleCount = rows.length + this.openFeedbackRows.filter(r => !mainIds.has(r.id)).length;

    if (this.view === 'week') {
      this.buildWeek(rows);
      this.groups = [];
    } else {
      this.buildGroups(rows.filter(r => !highlighted.has(r.id)));
      this.weekDays = [];
    }
  }

  private buildGroups(rows: ViewingRow[]): void {
    const today = this.startOfDay(new Date());
    const tomorrow = this.addDays(today, 1);
    const afterTomorrow = this.addDays(today, 2);
    const endOfWeek = this.addDays(this.startOfWeek(today), 7);

    const buckets: Record<string, ViewingRow[]> = { past: [], today: [], tomorrow: [], week: [], later: [] };

    for (const row of rows) {
      const day = this.startOfDay(row.date);
      if (day < today) buckets['past'].push(row);
      else if (day.getTime() === today.getTime()) buckets['today'].push(row);
      else if (day.getTime() === tomorrow.getTime()) buckets['tomorrow'].push(row);
      else if (day >= afterTomorrow && day < endOfWeek) buckets['week'].push(row);
      else buckets['later'].push(row);
    }

    // Vergangenes rueckwaerts: der letzte Termin ist der relevanteste
    buckets['past'].sort((a, b) => b.date.getTime() - a.date.getTime());

    const order: { key: string; labelKey: string }[] = [
      { key: 'past',     labelKey: 'viewings.group.past' },
      { key: 'today',    labelKey: 'viewings.group.today' },
      { key: 'tomorrow', labelKey: 'viewings.group.tomorrow' },
      { key: 'week',     labelKey: 'viewings.group.thisWeek' },
      { key: 'later',    labelKey: 'viewings.group.later' }
    ];

    this.groups = order
      .filter(g => buckets[g.key].length > 0)
      .map(g => ({ key: g.key, labelKey: g.labelKey, rows: buckets[g.key] }));
  }

  private buildWeek(rows: ViewingRow[]): void {
    const locale = this.locale();
    const weekStart = this.addDays(this.startOfWeek(this.startOfDay(new Date())), this.weekOffset * 7);
    const today = this.startOfDay(new Date());

    this.weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = this.addDays(weekStart, i);
      const next = this.addDays(day, 1);
      return {
        key: day.toISOString(),
        weekdayFmt: day.toLocaleDateString(locale, { weekday: 'short' }),
        dateFmt: day.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }),
        isToday: day.getTime() === today.getTime(),
        rows: rows.filter(r => r.date >= day && r.date < next)
      };
    });

    const weekEnd = this.addDays(weekStart, 6);
    this.weekLabel = `${weekStart.toLocaleDateString(locale, { day: '2-digit', month: 'short' })} – `
      + `${weekEnd.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}`;
  }

  private toRow(v: ViewingSummary): ViewingRow {
    const locale = this.locale();
    const date = new Date(v.viewingDate);
    const initials = v.clientName.split(' ').slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('');
    return {
      id: v.id,
      clientId: v.clientId,
      clientName: v.clientName,
      initials,
      propertyLabel: v.propertyTitle || v.propertyAddress,
      date,
      timeFmt: date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
      dayFmt: date.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit' }),
      status: v.status,
      feedback: v.feedback
    };
  }

  // ── Filter / Umschalter ─────────────────────────────────────
  setView(view: ViewMode): void {
    if (this.view === view) return;
    this.view = view;
    this.weekOffset = 0;
    this.load();
  }

  setStatusFilter(status: StatusFilter): void {
    this.statusFilter = status;
    this.applyView();
  }

  shiftWeek(delta: number): void {
    this.weekOffset += delta;
    this.load();
  }

  goToCurrentWeek(): void {
    this.weekOffset = 0;
    this.load();
  }

  // ── Aktionen ────────────────────────────────────────────────
  openReschedule(row: ViewingRow): void {
    this.rescheduleRow = row;
    // datetime-local erwartet lokale Zeit ohne Zone — genau das Format der API
    this.rescheduleValue = this.toLocalIso(row.date).slice(0, 16);
  }

  closeReschedule(): void {
    this.rescheduleRow = null;
    this.rescheduleValue = '';
  }

  confirmReschedule(): void {
    if (!this.rescheduleRow || !this.rescheduleValue) return;
    this.patchViewing(this.rescheduleRow.id, { viewingDate: `${this.rescheduleValue}:00` }, () => this.closeReschedule());
  }

  openComplete(row: ViewingRow): void {
    this.completeRow = row;
    this.completeFeedback = row.feedback ?? null;
    this.completeNotes = '';
    this.completeFollowUp = '';
  }

  closeComplete(): void {
    this.completeRow = null;
    this.completeFeedback = null;
    this.completeNotes = '';
    this.completeFollowUp = '';
  }

  toggleFeedback(value: ViewingFeedback): void {
    this.completeFeedback = this.completeFeedback === value ? null : value;
  }

  confirmComplete(): void {
    if (!this.completeRow) return;
    const patch: Partial<ViewingUpdateRequest> = {
      status: ViewingStatus.COMPLETED,
      feedback: this.completeFeedback ?? undefined
    };
    // Leere Felder lassen den Bestand unangetastet, statt ihn zu ueberschreiben
    if (this.completeNotes.trim()) patch.clientNotes = this.completeNotes.trim();
    if (this.completeFollowUp.trim()) patch.followUpAction = this.completeFollowUp.trim();

    this.patchViewing(this.completeRow.id, patch, () => this.closeComplete());
  }

  askCancel(row: ViewingRow): void {
    this.cancelRow = row;
  }

  confirmCancel(): void {
    if (!this.cancelRow) return;
    this.patchViewing(this.cancelRow.id, { status: ViewingStatus.CANCELLED }, () => this.cancelRow = null);
  }

  /**
   * PUT /viewings/{id} ersetzt den kompletten Datensatz — der aktuelle Stand wird
   * deshalb erst gelesen und mit dem Patch zusammengefuehrt, sonst gehen Notizen,
   * Dauer oder Follow-up beim Verschieben oder Absagen verloren.
   */
  private patchViewing(viewingId: string, patch: Partial<ViewingUpdateRequest>, done: () => void): void {
    if (this.saving) return;
    this.saving = true;

    this.viewingService.getViewing(viewingId).pipe(
      switchMap(current => this.viewingService.updateViewing(viewingId, {
        viewingDate: current.viewingDate,
        durationMinutes: current.durationMinutes,
        status: current.status,
        feedback: current.feedback,
        clientNotes: current.clientNotes,
        followUpAction: current.followUpAction,
        ...patch
      })),
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.saving = false;
        done();
        this.load();
      },
      error: () => {
        this.saving = false;
      }
    });
  }

  // ── Darstellung ─────────────────────────────────────────────
  statusBg(status: ViewingStatus): string {
    if (status === ViewingStatus.COMPLETED) return 'var(--color-success-soft)';
    if (status === ViewingStatus.CANCELLED) return 'var(--color-error-soft)';
    return 'var(--stage-viewing-bg)';
  }

  statusColor(status: ViewingStatus): string {
    if (status === ViewingStatus.COMPLETED) return 'var(--color-success)';
    if (status === ViewingStatus.CANCELLED) return 'var(--color-error)';
    return 'var(--stage-viewing)';
  }

  feedbackBg(feedback: ViewingFeedback): string {
    return this.feedbackOptions.find(f => f.value === feedback)?.soft ?? 'var(--surface-2)';
  }

  feedbackColor(feedback: ViewingFeedback): string {
    return this.feedbackOptions.find(f => f.value === feedback)?.color ?? 'var(--text-2)';
  }

  // ── Datums-Helfer ───────────────────────────────────────────
  private currentBounds(): { from?: string; to?: string } {
    const today = this.startOfDay(new Date());

    if (this.view === 'week') {
      const start = this.addDays(this.startOfWeek(today), this.weekOffset * 7);
      return { from: this.toLocalIso(start), to: this.toLocalIso(this.addDays(start, 7)) };
    }

    switch (this.range) {
      case 'WEEK':
        return { from: this.toLocalIso(today), to: this.toLocalIso(this.addDays(this.startOfWeek(today), 7)) };
      case 'MONTH':
        return { from: this.toLocalIso(today), to: this.toLocalIso(this.addDays(today, 30)) };
      case 'PAST':
        return { from: this.toLocalIso(this.addDays(today, -365)), to: this.toLocalIso(today) };
      case 'ALL':
        return {};
      case 'UPCOMING':
      default:
        return { from: this.toLocalIso(today) };
    }
  }

  private startOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private addDays(date: Date, days: number): Date {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }

  /** Wochenstart Montag — deutsche Kalenderkonvention. */
  private startOfWeek(date: Date): Date {
    const copy = this.startOfDay(date);
    const offset = (copy.getDay() + 6) % 7;
    return this.addDays(copy, -offset);
  }

  /** Lokale ISO-Zeit ohne Zone — Besichtigungstermine sind naive Zeitstempel. */
  private toLocalIso(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
      + `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  private locale(): string {
    return (this.translate.currentLang || 'de') === 'de' ? 'de-DE' : 'en-US';
  }
}
