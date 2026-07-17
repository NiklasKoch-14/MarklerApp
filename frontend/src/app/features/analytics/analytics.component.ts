import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AnalyticsService, DashboardAnalytics, DailyActivity, PropertyOnMarket } from './services/analytics.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

interface FunnelStage {
  label: string;
  count: number;
  widthPct: number;   // bar width relative to the widest stage
  color: string;
  dropLabel: string;  // conversion rate into this stage, e.g. "72 %"
  isLeak: boolean;    // biggest drop-off → highlighted
}

interface TrendPoint {
  x: number;
  y: number;
  deal: boolean;
  calls: number;
  dateLabel: string;
}

interface MarketBar {
  id: string;
  title: string;
  city: string;
  days: number;
  priceLabel: string;
  widthPct: number;
  color: string;
  bg: string;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, LoadingSpinnerComponent],
  styles: [`
    .an-card { background:var(--surface); border:1px solid var(--border); border-radius:16px; box-shadow:var(--shadow); }
    .an-card-head { padding:16px 20px 4px; }
    .an-title { font-size:16px; font-weight:700; color:var(--text); display:flex; align-items:center; gap:9px; }
    .an-sub { font-size:12.5px; color:var(--text-3); margin-top:3px; line-height:1.45; }
    .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
    .kpi { background:var(--surface); border:1px solid var(--border); border-radius:16px; box-shadow:var(--shadow); padding:18px 20px; }
    .kpi-val { font-size:26px; font-weight:800; letter-spacing:-0.02em; color:var(--text); font-variant-numeric:tabular-nums; line-height:1.1; }
    .kpi-lbl { font-size:12.5px; color:var(--text-2); font-weight:600; margin-top:4px; }
    .kpi-cap { font-size:12px; margin-top:7px; font-weight:500; }
    .market-row:hover { background:var(--surface-2); }
    @media (max-width:1024px){ .kpi-grid{ grid-template-columns:repeat(2,1fr); } .an-two{ grid-template-columns:1fr !important; } }
    @media (max-width:560px){ .kpi-grid{ grid-template-columns:repeat(2,1fr); gap:10px; } .kpi{ padding:14px; } .kpi-val{ font-size:21px; } }
  `],
  template: `
    <div style="max-width:1180px; margin:0 auto;">

      <!-- Header -->
      <div class="page-header" style="margin-bottom:22px;">
        <div>
          <div class="page-subtitle">{{ 'analytics.subtitle' | translate }}</div>
          <h1 class="page-title">{{ 'analytics.title' | translate }}</h1>
        </div>
      </div>

      <div *ngIf="loading" style="text-align:center; padding:64px 0;">
        <app-loading-spinner size="lg"></app-loading-spinner>
      </div>

      <ng-container *ngIf="!loading && data">

        <!-- ══ Provisions-KPIs — die Zahlen die Geld bedeuten ══ -->
        <div class="kpi-grid" style="margin-bottom:20px;">
          <div class="kpi">
            <div class="kpi-val" style="color:var(--color-closed);">{{ money(data.revenue.realizedCommissionYtd) }}</div>
            <div class="kpi-lbl">{{ 'analytics.realizedCommission' | translate }}</div>
            <div class="kpi-cap" style="color:var(--text-3);">{{ data.revenue.dealsClosedYtd }} {{ 'analytics.dealsThisYear' | translate }}</div>
          </div>
          <div class="kpi">
            <div class="kpi-val" style="color:var(--primary);">{{ money(data.revenue.pipelineCommission) }}</div>
            <div class="kpi-lbl">{{ 'analytics.pipelineCommission' | translate }}</div>
            <div class="kpi-cap" style="color:var(--text-3);">{{ 'analytics.pipelineHint' | translate }}</div>
          </div>
          <div class="kpi">
            <div class="kpi-val">{{ data.conversionFunnel.overallConversionRate | number:'1.0-1' }}%</div>
            <div class="kpi-lbl">{{ 'analytics.overallConversion' | translate }}</div>
            <div class="kpi-cap" style="color:var(--text-3);">{{ 'analytics.leadToDeal' | translate }}</div>
          </div>
          <div class="kpi">
            <div class="kpi-val" [style.color]="data.propertyPortfolio.averageDaysOnMarket > 90 ? 'var(--color-error)' : 'var(--text)'">
              {{ data.propertyPortfolio.averageDaysOnMarket }} <span style="font-size:15px; font-weight:600; color:var(--text-3);">{{ 'analytics.days' | translate }}</span>
            </div>
            <div class="kpi-lbl">{{ 'analytics.avgDaysOnMarket' | translate }}</div>
            <div class="kpi-cap" style="color:var(--text-3);">{{ 'analytics.availableObjects' | translate }}</div>
          </div>
        </div>

        <!-- Zu wenig Daten Hinweis -->
        <div *ngIf="tooFewData"
             style="background:var(--surface); border:1px dashed var(--border); border-radius:16px; padding:22px 24px; margin-bottom:20px; display:flex; align-items:center; gap:14px;">
          <i class="ri-line-chart-line" style="font-size:26px; color:var(--text-3);"></i>
          <div>
            <div style="font-size:14px; font-weight:600; color:var(--text);">{{ 'analytics.tooFewTitle' | translate }}</div>
            <div style="font-size:13px; color:var(--text-3); margin-top:2px;">{{ 'analytics.tooFewBody' | translate }}</div>
          </div>
        </div>

        <div class="an-two" style="display:grid; grid-template-columns:1.15fr 1fr; gap:20px; align-items:start; margin-bottom:20px;">

          <!-- ══ Conversion Funnel — wo versickern die Leads ══ -->
          <div class="an-card">
            <div class="an-card-head">
              <div class="an-title"><i class="ri-filter-3-fill" style="color:var(--primary);"></i>{{ 'analytics.funnelTitle' | translate }}</div>
              <div class="an-sub">{{ 'analytics.funnelSub' | translate }}</div>
            </div>
            <div style="padding:14px 20px 20px;">
              <div *ngFor="let s of funnelStages; let i = index" style="margin-bottom:2px;">
                <!-- Drop-off connector -->
                <div *ngIf="i > 0" style="display:flex; align-items:center; gap:7px; padding:5px 0 5px 4px;">
                  <i class="ri-corner-down-right-line" style="font-size:13px;" [style.color]="s.isLeak ? 'var(--color-error)' : 'var(--text-3)'"></i>
                  <span style="font-size:12px; font-weight:600;" [style.color]="s.isLeak ? 'var(--color-error)' : 'var(--text-3)'">
                    {{ s.dropLabel }} {{ 'analytics.convertFurther' | translate }}
                  </span>
                  <span *ngIf="s.isLeak" style="font-size:10.5px; font-weight:700; color:var(--color-error); background:var(--color-error-soft); padding:1px 7px; border-radius:20px;">
                    {{ 'analytics.biggestLeak' | translate }}
                  </span>
                </div>
                <!-- Stage bar -->
                <div style="display:flex; align-items:center; gap:12px;">
                  <div style="width:98px; flex-shrink:0; font-size:12.5px; font-weight:600; color:var(--text-2); text-align:right;">{{ s.label }}</div>
                  <div style="flex:1; min-width:0;">
                    <div [style.width.%]="s.widthPct" [style.background]="s.color"
                         style="height:34px; border-radius:8px; min-width:44px; display:flex; align-items:center; justify-content:flex-end; padding-right:11px; transition:width .5s cubic-bezier(.2,.7,.3,1);">
                      <span style="font-size:14px; font-weight:800; color:#fff; font-variant-numeric:tabular-nums;">{{ s.count }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ══ Aktivitätsverlauf — telefoniere ich genug ══ -->
          <div class="an-card">
            <div class="an-card-head">
              <div class="an-title"><i class="ri-pulse-fill" style="color:var(--color-viewing);"></i>{{ 'analytics.activityTitle' | translate }}</div>
              <div class="an-sub">
                {{ data.activityTrends.callNotesThisMonth }} {{ 'analytics.callsThisMonth' | translate }}
                <span [style.color]="data.activityTrends.callNotesGrowthPercent >= 0 ? 'var(--color-closed)' : 'var(--color-error)'" style="font-weight:700;">
                  {{ data.activityTrends.callNotesGrowthPercent >= 0 ? '+' : '' }}{{ data.activityTrends.callNotesGrowthPercent }}%
                </span>
                {{ 'analytics.vsLastMonth' | translate }}
              </div>
            </div>
            <div style="padding:16px 16px 12px;">
              <svg *ngIf="trendPoints.length > 1" viewBox="0 0 320 96" preserveAspectRatio="none" style="width:100%; height:130px; display:block;">
                <defs>
                  <linearGradient id="an-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--color-viewing)" stop-opacity="0.28"/>
                    <stop offset="100%" stop-color="var(--color-viewing)" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path [attr.d]="trendAreaPath" fill="url(#an-area)"/>
                <path [attr.d]="trendLinePath" fill="none" stroke="var(--color-viewing)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
                <circle *ngFor="let p of trendPoints" [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="p.deal ? 3.5 : 0"
                        fill="var(--color-closed)" stroke="var(--surface)" stroke-width="1.5" vector-effect="non-scaling-stroke"/>
              </svg>
              <div *ngIf="trendPoints.length <= 1" style="padding:34px 0; text-align:center; color:var(--text-3); font-size:13px;">
                {{ 'analytics.noActivityData' | translate }}
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; margin-top:6px; font-size:11px; color:var(--text-3);">
                <span>{{ trendStartLabel }}</span>
                <span style="display:inline-flex; align-items:center; gap:5px;">
                  <span style="width:7px; height:7px; border-radius:50%; background:var(--color-closed); display:inline-block;"></span>
                  {{ 'analytics.dealMarker' | translate }}
                </span>
                <span>{{ 'analytics.today' | translate }}</span>
              </div>
            </div>
          </div>

        </div>

        <!-- ══ Objekte am längsten am Markt — Preisdruck-Gespräch ══ -->
        <div class="an-card" style="margin-bottom:20px;">
          <div class="an-card-head">
            <div class="an-title"><i class="ri-timer-fill" style="color:var(--color-warning);"></i>{{ 'analytics.longestTitle' | translate }}</div>
            <div class="an-sub">{{ 'analytics.longestSub' | translate }}</div>
          </div>
          <div style="padding:8px 20px 14px;">
            <a *ngFor="let m of marketBars" [routerLink]="['/properties', m.id]" class="market-row"
               style="display:flex; align-items:center; gap:14px; padding:11px 4px; border-bottom:1px solid var(--border); text-decoration:none;">
              <div style="flex:1; min-width:0;">
                <div style="font-size:13.5px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ m.title }}</div>
                <div style="font-size:12px; color:var(--text-3); margin-top:1px;">{{ m.city || '—' }} · {{ m.priceLabel }}</div>
              </div>
              <div style="width:min(46%,300px); flex-shrink:0; display:flex; align-items:center; gap:10px;">
                <div style="flex:1; height:8px; background:var(--surface-2); border-radius:6px; overflow:hidden;">
                  <div [style.width.%]="m.widthPct" [style.background]="m.color" style="height:100%; border-radius:6px; transition:width .5s;"></div>
                </div>
                <span [style.color]="m.color" [style.background]="m.bg"
                      style="font-size:12px; font-weight:700; padding:2px 9px; border-radius:20px; white-space:nowrap; font-variant-numeric:tabular-nums;">
                  {{ m.days }} {{ 'analytics.days' | translate }}
                </span>
              </div>
            </a>
            <div *ngIf="marketBars.length === 0" style="padding:26px 0; text-align:center; color:var(--text-3); font-size:13px;">
              {{ 'analytics.noAvailableObjects' | translate }}
            </div>
          </div>
        </div>

        <!-- ══ Pipeline-Gesundheit — mein Gewissen ══ -->
        <div class="an-card">
          <div class="an-card-head">
            <div class="an-title"><i class="ri-heart-pulse-fill" style="color:var(--color-error);"></i>{{ 'analytics.healthTitle' | translate }}</div>
          </div>
          <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:0; padding:12px 8px 16px;">
            <div style="padding:8px 16px; text-align:center; border-right:1px solid var(--border);">
              <div style="font-size:26px; font-weight:800; font-variant-numeric:tabular-nums;"
                   [style.color]="data.pipelineHealth.overdueFollowUps > 0 ? 'var(--color-error)' : 'var(--color-closed)'">
                {{ data.pipelineHealth.overdueFollowUps }}
              </div>
              <div style="font-size:12.5px; color:var(--text-2); font-weight:600; margin-top:3px;">{{ 'analytics.overdueFollowups' | translate }}</div>
            </div>
            <div style="padding:8px 16px; text-align:center; border-right:1px solid var(--border);">
              <div style="font-size:26px; font-weight:800; font-variant-numeric:tabular-nums;"
                   [style.color]="data.pipelineHealth.clientsWithoutRecentContact > 5 ? 'var(--color-warning)' : 'var(--text)'">
                {{ data.pipelineHealth.clientsWithoutRecentContact }}
              </div>
              <div style="font-size:12.5px; color:var(--text-2); font-weight:600; margin-top:3px;">{{ 'analytics.noContact30' | translate }}</div>
            </div>
            <div style="padding:8px 16px; text-align:center;">
              <div style="font-size:26px; font-weight:800; font-variant-numeric:tabular-nums; color:var(--text);">
                {{ data.pipelineHealth.averageDaysSinceLastContact }}
              </div>
              <div style="font-size:12.5px; color:var(--text-2); font-weight:600; margin-top:3px;">{{ 'analytics.avgDaysSinceContact' | translate }}</div>
            </div>
          </div>
        </div>

      </ng-container>
    </div>
  `,
})
export class AnalyticsComponent implements OnInit {
  loading = true;
  data: DashboardAnalytics | null = null;

  funnelStages: FunnelStage[] = [];
  trendPoints: TrendPoint[] = [];
  trendLinePath = '';
  trendAreaPath = '';
  trendStartLabel = '';
  marketBars: MarketBar[] = [];
  tooFewData = false;

  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    this.analyticsService.getAnalytics().subscribe({
      next: (d) => {
        this.data = d;
        this.buildFunnel(d);
        this.buildTrend(d.activityTrends.last30DaysActivity);
        this.buildMarketBars(d.propertyPortfolio.longestOnMarket);
        this.tooFewData = d.conversionFunnel.totalClients < 3;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  private buildFunnel(d: DashboardAnalytics): void {
    const f = d.conversionFunnel;
    const raw = [
      { label: 'Kunden gesamt', count: f.totalClients,       color: 'var(--stage-prospect)',      rate: null as number | null },
      { label: 'Interessiert',  count: f.interestedClients,  color: 'var(--stage-active-search)', rate: f.interestedRate },
      { label: 'Besichtigung',  count: f.scheduledViewings,  color: 'var(--stage-viewing)',       rate: f.viewingRate },
      { label: 'Angebot',       count: f.offersMade,         color: 'var(--color-offer)',         rate: f.offerRate },
      { label: 'Abschluss',     count: f.dealsClosed,        color: 'var(--color-closed)',        rate: f.closingRate },
    ];
    const max = Math.max(1, ...raw.map(r => r.count));

    // Find the biggest leak: the transition with the lowest conversion rate (only where the previous stage had clients)
    let leakIdx = -1;
    let lowest = Infinity;
    for (let i = 1; i < raw.length; i++) {
      if (raw[i - 1].count > 0 && raw[i].rate !== null && raw[i].rate! < lowest) {
        lowest = raw[i].rate!;
        leakIdx = i;
      }
    }

    this.funnelStages = raw.map((r, i) => ({
      label: r.label,
      count: r.count,
      widthPct: Math.max(12, (r.count / max) * 100),
      color: r.color,
      dropLabel: r.rate !== null ? `${Math.round(r.rate)}%` : '',
      isLeak: i === leakIdx,
    }));
  }

  private buildTrend(days: DailyActivity[]): void {
    if (!days || days.length < 2) { this.trendPoints = []; return; }
    const W = 320, H = 96, pad = 3;
    const max = Math.max(1, ...days.map(d => d.callNotes));
    const n = days.length;

    this.trendPoints = days.map((d, i) => {
      const x = (i / (n - 1)) * W;
      const y = H - pad - (d.callNotes / max) * (H - pad * 2);
      const date = new Date(d.date);
      return {
        x, y,
        deal: d.dealsClosed > 0,
        calls: d.callNotes,
        dateLabel: date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      };
    });

    this.trendLinePath = this.trendPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
    this.trendAreaPath =
      `M ${this.trendPoints[0].x.toFixed(1)} ${H} ` +
      this.trendPoints.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
      ` L ${W} ${H} Z`;

    this.trendStartLabel = new Date(days[0].date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  }

  private buildMarketBars(items: PropertyOnMarket[]): void {
    if (!items || items.length === 0) { this.marketBars = []; return; }
    const max = Math.max(1, ...items.map(i => i.daysOnMarket));
    this.marketBars = items.map(i => {
      const c = this.marketColor(i.daysOnMarket);
      return {
        id: i.propertyId,
        title: i.title,
        city: i.city,
        days: i.daysOnMarket,
        priceLabel: i.price != null ? this.money(i.price) : '—',
        widthPct: Math.max(6, (i.daysOnMarket / max) * 100),
        color: c.fg,
        bg: c.bg,
      };
    });
  }

  private marketColor(days: number): { fg: string; bg: string } {
    if (days > 90) return { fg: 'var(--color-error)', bg: 'var(--color-error-soft)' };
    if (days > 30) return { fg: 'var(--color-warning)', bg: 'var(--color-warning-soft)' };
    return { fg: 'var(--color-closed)', bg: 'var(--color-success-soft)' };
  }

  money(v: number | null | undefined): string {
    if (v == null) return '0 €';
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  }
}
