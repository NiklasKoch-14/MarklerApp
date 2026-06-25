import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';

import { ClientService } from '../client-management/services/client.service';
import {
  CallNotesService,
  CallNoteSummary,
  FollowUpReminder,
  CallType,
  CallOutcome,
} from '../call-notes/services/call-notes.service';

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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, DatePipe],
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
      <div class="stat-grid">
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
        <div style="display:grid; grid-template-columns:1.35fr 1fr; gap:20px;">

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
      }

      <!-- Pipeline view -->
      @if (view === 'pipeline') {
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:14px; align-items:start;">
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
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  view: 'cards' | 'pipeline' = 'cards';
  loading = true;

  statCards: StatCard[] = [];
  followUps: FollowUpRow[] = [];
  recentActivity: ActivityRow[] = [];

  pipelineCols: { label: string; color: string; items: any[] }[] = [];

  todayLabel = '';
  greeting = '';

  private destroy$ = new Subject<void>();

  constructor(
    private clientService: ClientService,
    private callNotesService: CallNotesService,
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
      clientStats:  this.clientService.getClientStats().pipe(catchError(() => of({ totalClients: 0 }))),
      notes:        this.callNotesService.getCallNotesByAgent(0, 10).pipe(catchError(() => of({ content: [], totalElements: 0 }))),
      followUps:    this.callNotesService.getFollowUpReminders().pipe(catchError(() => of([]))),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe(({ clientStats, notes, followUps }) => {
      this.loading = false;

      const totalClients = clientStats.totalClients;
      const totalNotes   = (notes as any).totalElements ?? 0;
      const overdueCount = (followUps as FollowUpReminder[]).filter(f => f.isOverdue).length;

      this.buildStatCards(totalClients, totalNotes, (followUps as FollowUpReminder[]).length);
      this.buildFollowUps(followUps as FollowUpReminder[]);
      this.buildActivity((notes as any).content ?? []);
      this.buildPipeline((notes as any).content ?? []);
    });
  }

  private buildStatCards(clients: number, notes: number, followups: number): void {
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
          iconBg: 'color-mix(in srgb,#2f6b7a 12%,var(--surface))',
          iconColor: '#2f6b7a',
          value: String(clients),
          label: t['dashboard.stats.clients'],
          caption: t['dashboard.stats.activeThis'],
          capColor: '#1f8a5b',
        },
        {
          icon: 'ph-fill ph-chats-circle',
          iconBg: 'color-mix(in srgb,#9f5aaa 12%,var(--surface))',
          iconColor: '#9f5aaa',
          value: String(notes),
          label: t['dashboard.stats.notes'],
          caption: t['dashboard.stats.thisMonth'],
          capColor: 'var(--text-3)',
        },
        {
          icon: 'ph-fill ph-buildings',
          iconBg: 'color-mix(in srgb,#1f8a5b 12%,var(--surface))',
          iconColor: '#1f8a5b',
          value: '–',
          label: t['dashboard.stats.properties'],
          caption: '',
          capColor: 'var(--text-3)',
        },
        {
          icon: 'ph-fill ph-bell-ringing',
          iconBg: 'color-mix(in srgb,#c07a1e 12%,var(--surface))',
          iconColor: '#c07a1e',
          value: String(followups),
          label: t['dashboard.stats.followups'],
          caption: t['dashboard.stats.open'],
          capColor: followups > 0 ? '#c07a1e' : '#1f8a5b',
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
        dueColor: r.isOverdue ? '#b23a55' : (r.daysUntilDue <= 2 ? '#c07a1e' : '#1f8a5b'),
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

  private buildPipeline(notes: CallNoteSummary[]): void {
    const lang = this.translate.currentLang || 'de';
    const locale = lang === 'de' ? 'de-DE' : 'en-US';

    const cols = [
      { outcome: CallOutcome.INTERESTED,       label: 'Interessiert',  color: '#2f6b7a', items: [] as any[] },
      { outcome: CallOutcome.SCHEDULED_VIEWING, label: 'Besichtigung', color: '#9f5aaa', items: [] as any[] },
      { outcome: CallOutcome.OFFER_MADE,        label: 'Angebot',      color: '#c07a1e', items: [] as any[] },
      { outcome: CallOutcome.DEAL_CLOSED,       label: 'Abschluss',    color: '#1f8a5b', items: [] as any[] },
    ];

    for (const n of notes) {
      const col = cols.find(c => c.outcome === n.outcome);
      if (col) {
        const initials = (n.clientName ?? '?')
          .split(' ')
          .map(p => p.charAt(0).toUpperCase())
          .slice(0, 2)
          .join('');
        col.items.push({
          clientId: n.clientId,
          customerName: n.clientName ?? '',
          initials,
          subject: n.subject,
          typeIcon: this.typeIcon(n.callType),
          dateFmt: new Date(n.callDate).toLocaleDateString(locale, { day: '2-digit', month: 'short' }),
        });
      }
    }

    this.pipelineCols = cols;
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
      case CallType.PHONE_INBOUND:  return '#2f6b7a';
      case CallType.PHONE_OUTBOUND: return '#9f5aaa';
      case CallType.EMAIL:          return '#c07a1e';
      case CallType.MEETING:        return '#1f8a5b';
      default:                      return 'var(--text-3)';
    }
  }

  private outcomeColor(outcome?: CallOutcome): string {
    switch (outcome) {
      case CallOutcome.INTERESTED:        return '#2f6b7a';
      case CallOutcome.SCHEDULED_VIEWING: return '#9f5aaa';
      case CallOutcome.OFFER_MADE:        return '#c07a1e';
      case CallOutcome.DEAL_CLOSED:       return '#1f8a5b';
      case CallOutcome.NOT_INTERESTED:    return '#b23a55';
      default:                            return 'var(--text-3)';
    }
  }
}
