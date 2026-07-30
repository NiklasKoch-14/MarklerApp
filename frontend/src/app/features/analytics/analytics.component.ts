import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AnalyticsService, DashboardAnalytics, DailyActivity, PropertyOnMarket, LeadSourcePerformance } from './services/analytics.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { TranslateEnumPipe } from '../../shared/pipes/translate-enum.pipe';
import { LocationPickerMapComponent, SecondaryMarker } from '../../shared/components/location-picker-map/location-picker-map.component';
import { PropertyService } from '../property-management/services/property.service';
import { ClientService } from '../client-management/services/client.service';

interface FunnelStage {
  labelKey: string;
  count: number;
  widthPct: number;      // Anteil an allen Kunden — nicht an der breitesten Stufe
  color: string;
  opacity: number;
  rate: number | null;   // Anteil, der aus der Vorstufe hierher gekommen ist
  isLeak: boolean;       // schwächster Übergang
}

interface TrendPoint {
  x: number;
  y: number;
  deal: boolean;
  calls: number;
  dateLabel: string;
}

interface LeadSourceBar {
  source: string | null;   // null = Kunden ohne erfasste Quelle
  clients: number;
  won: number;
  winRate: number;
  commissionLabel: string;
  widthPct: number;
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
  imports: [CommonModule, RouterLink, TranslateModule, LoadingSpinnerComponent, LocationPickerMapComponent, TranslateEnumPipe],
  styles: [`
    .an-card { background:var(--surface); border:1px solid var(--border); border-radius:16px; box-shadow:var(--shadow); }
    .an-card-head { padding:16px 20px 4px; }
    .an-title { font-size:16px; font-weight:700; color:var(--text); }
    .an-sub { font-size:12.5px; color:var(--text-3); margin-top:3px; line-height:1.45; }
    .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; }
    .kpi { background:var(--surface); border:1px solid var(--border); border-radius:16px; box-shadow:var(--shadow); padding:18px 20px; }
    .kpi-val { font-size:26px; font-weight:800; letter-spacing:-0.02em; color:var(--text); font-variant-numeric:tabular-nums; line-height:1.1; }
    .kpi-lbl { font-size:12.5px; color:var(--text-2); font-weight:600; margin-top:4px; }
    .kpi-cap { font-size:12px; margin-top:7px; font-weight:500; }
    .market-row:hover { background:var(--surface-2); }

    /* Trichter als Tabelle: Stufe · Balken · Kunden · Übergangsquote.
       Die Balken messen alle gegen die Gesamtzahl der Kunden, damit die
       Verjüngung nach unten die echte Grössenordnung zeigt. */
    .funnel { display:grid; grid-template-columns:minmax(84px,auto) 1fr 44px 58px; align-items:center; row-gap:7px; column-gap:14px; }
    .funnel-head,.funnel-count,.funnel-rate { text-align:right; font-variant-numeric:tabular-nums; }
    .funnel-head { font-size:10.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--text-3); }
    .funnel-label { font-size:12.5px; font-weight:600; color:var(--text-2); }
    .funnel-track { height:26px; background:var(--surface-2); border-radius:7px; overflow:hidden; }
    .funnel-fill { height:100%; transition:width .5s cubic-bezier(.2,.7,.3,1); }
    .funnel-count { font-size:14px; font-weight:700; color:var(--text); }
    .funnel-rate { font-size:12.5px; font-weight:600; color:var(--text-3); }
    .funnel-rate.is-leak { color:var(--color-error); font-weight:700; }
    .funnel-foot { margin-top:16px; padding-top:13px; border-top:1px solid var(--border); font-size:12.5px; color:var(--text-3); line-height:1.5; }

    @media (max-width:1024px){ .kpi-grid{ grid-template-columns:repeat(2,1fr); } .an-two{ grid-template-columns:1fr !important; } }
    @media (max-width:560px){ .kpi-grid{ grid-template-columns:repeat(2,1fr); gap:10px; } .kpi{ padding:14px; } .kpi-val{ font-size:21px; }
      .funnel{ grid-template-columns:minmax(70px,auto) 1fr 36px 48px; column-gap:9px; } }
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

        <!-- ══ Portfolio-Karte — wo liegt alles, und wer sucht dort ══ -->
        <div class="an-card" style="margin-bottom:20px;">
          <div class="an-card-head">
            <div class="an-title">{{ 'analytics.mapTitle' | translate }}</div>
            <div class="an-sub">{{ 'analytics.mapSub' | translate }}</div>
          </div>
          <div style="padding:8px 20px 16px;">
            <app-location-picker-map
              [readOnly]="true"
              [showRadiusControl]="false"
              [secondaryMarkers]="mapMarkers"
              height="520px"
              (markerClick)="onMarkerClick($event)">
            </app-location-picker-map>

            <div *ngIf="mapMarkers.length > 0" style="display:flex; flex-wrap:wrap; gap:18px; margin-top:12px; font-size:12.5px; color:var(--text-2);">
              <span style="display:inline-flex; align-items:center; gap:7px;">
                <span style="width:11px; height:11px; border-radius:50%; background:#2563eb; box-shadow:0 0 0 2px var(--surface);"></span>
                {{ 'analytics.mapLegendProperties' | translate:{ count: propertyPinCount } }}
              </span>
              <span style="display:inline-flex; align-items:center; gap:7px;">
                <span style="width:11px; height:11px; border-radius:50%; background:#dc2626; box-shadow:0 0 0 2px var(--surface);"></span>
                {{ 'analytics.mapLegendClients' | translate:{ count: searchPinCount } }}
              </span>
              <span style="color:var(--text-3);">{{ 'analytics.mapClickHint' | translate }}</span>
            </div>

            <div *ngIf="!isLoadingMap && mapMarkers.length === 0"
                 style="margin-top:12px; font-size:13px; color:var(--text-3);">
              {{ 'analytics.mapEmpty' | translate }}
            </div>
          </div>
        </div>

        <div class="an-two" style="display:grid; grid-template-columns:1.15fr 1fr; gap:20px; align-items:start; margin-bottom:20px;">

          <!-- ══ Conversion Funnel — wo versickern die Leads ══ -->
          <div class="an-card">
            <div class="an-card-head">
              <div class="an-title">{{ 'analytics.funnelTitle' | translate }}</div>
              <div class="an-sub">{{ 'analytics.funnelSub' | translate }}</div>
            </div>
            <div style="padding:16px 20px 20px;">
              <div class="funnel">
                <div class="funnel-head"></div>
                <div class="funnel-head"></div>
                <div class="funnel-head">{{ 'analytics.funnelColClients' | translate }}</div>
                <div class="funnel-head">{{ 'analytics.funnelColRate' | translate }}</div>

                <ng-container *ngFor="let s of funnelStages">
                  <div class="funnel-label">{{ s.labelKey | translate }}</div>
                  <div class="funnel-track">
                    <div class="funnel-fill"
                         [style.width.%]="s.widthPct"
                         [style.minWidth.px]="s.count > 0 ? 4 : 0"
                         [style.background]="s.color"
                         [style.opacity]="s.opacity"></div>
                  </div>
                  <div class="funnel-count">{{ s.count }}</div>
                  <div class="funnel-rate" [class.is-leak]="s.isLeak">
                    {{ s.rate === null ? '—' : (s.rate | number:'1.0-0') + '%' }}
                  </div>
                </ng-container>
              </div>

              <div class="funnel-foot">
                <div *ngIf="leakToKey">
                  {{ 'analytics.weakestStep' | translate }}
                  <strong style="color:var(--color-error);">{{ leakFromKey | translate }} → {{ leakToKey | translate }}</strong>
                  · {{ leakRate | number:'1.0-0' }}% {{ 'analytics.convertFurther' | translate }}
                </div>
                <div>{{ 'analytics.funnelLost' | translate:{ count: data.conversionFunnel.lostClients } }}</div>
              </div>
            </div>
          </div>

          <!-- ══ Akquise-Trichter (Issue #38) — nur wenn es Verkäufer gibt, sonst
                    stünde hier eine Karte aus lauter Nullen ══ -->
          <div class="an-card" *ngIf="data.sellerPipeline && data.sellerPipeline.totalSellers > 0">
            <div class="an-card-head">
              <div class="an-title">{{ 'analytics.sellerFunnelTitle' | translate }}</div>
              <div class="an-sub">{{ 'analytics.sellerFunnelSub' | translate }}</div>
            </div>
            <div style="padding:16px 20px 20px;">
              <div class="funnel">
                <div class="funnel-head"></div>
                <div class="funnel-head"></div>
                <div class="funnel-head">{{ 'analytics.sellerFunnelColOwners' | translate }}</div>
                <div class="funnel-head">{{ 'analytics.funnelColRate' | translate }}</div>

                <ng-container *ngFor="let s of sellerFunnelStages">
                  <div class="funnel-label">{{ s.labelKey | translate }}</div>
                  <div class="funnel-track">
                    <div class="funnel-fill"
                         [style.width.%]="s.widthPct"
                         [style.minWidth.px]="s.count > 0 ? 4 : 0"
                         [style.background]="s.color"
                         [style.opacity]="s.opacity"></div>
                  </div>
                  <div class="funnel-count">{{ s.count }}</div>
                  <div class="funnel-rate" [class.is-leak]="s.isLeak">
                    {{ s.rate === null ? '—' : (s.rate | number:'1.0-0') + '%' }}
                  </div>
                </ng-container>
              </div>

              <div class="funnel-foot">
                <div>
                  {{ 'analytics.sellerMandateRate' | translate }}
                  <strong style="color:var(--text-2);">{{ data.sellerPipeline.overallMandateRate | number:'1.0-1' }}%</strong>
                </div>
                <div>{{ 'analytics.sellerFunnelLost' | translate:{ count: data.sellerPipeline.lost } }}</div>
              </div>
            </div>
          </div>

          <!-- ══ Aktivitätsverlauf — telefoniere ich genug ══ -->
          <div class="an-card">
            <div class="an-card-head">
              <div class="an-title">{{ 'analytics.activityTitle' | translate }}</div>
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
              <!-- Ohne Skala zeigt die Kurve nur die Form — der Spitzenwert gibt ihr eine Groessenordnung. -->
              <div *ngIf="trendPoints.length > 1" style="margin-top:4px; font-size:11px; color:var(--text-3);">
                {{ 'analytics.peakPerDay' | translate:{ count: trendPeak } }}
              </div>
            </div>
          </div>

        </div>

        <!-- ══ Akquisekanäle — welcher Kanal bringt Abschlüsse ══ -->
        <div class="an-card" style="margin-bottom:20px;">
          <div class="an-card-head">
            <div class="an-title"><i class="ri-inbox-archive-fill" style="color:var(--color-closed);"></i>{{ 'analytics.leadSourceTitle' | translate }}</div>
            <div class="an-sub">{{ 'analytics.leadSourceSub' | translate }}</div>
          </div>
          <div style="padding:8px 20px 16px;">
            <div *ngIf="!hasLeadSourceData" style="padding:22px 0; text-align:center; color:var(--text-3); font-size:13px; line-height:1.5;">
              {{ 'analytics.leadSourceEmpty' | translate }}
            </div>

            <ng-container *ngIf="hasLeadSourceData">
              <div *ngIf="leadSourceScale === 'deals'" style="font-size:12.5px; color:var(--text-3); padding:2px 0 10px;">
                {{ 'analytics.leadSourceNoCommission' | translate }}
              </div>

              <div *ngFor="let r of leadSourceBars"
                   style="display:flex; align-items:center; gap:14px; padding:11px 4px; border-bottom:1px solid var(--border);">
                <div style="flex:1; min-width:0;">
                  <div style="font-size:13.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"
                       [style.color]="r.source ? 'var(--text)' : 'var(--text-3)'">
                    {{ r.source ? (r.source | translateEnum:'leadSource') : ('analytics.leadSourceUnknown' | translate) }}
                  </div>
                  <div style="font-size:12px; color:var(--text-3); margin-top:1px;">
                    {{ 'analytics.leadSourceMeta' | translate:{ won: r.won, clients: r.clients, rate: r.winRate } }}
                  </div>
                </div>
                <div style="width:min(46%,300px); flex-shrink:0; display:flex; align-items:center; gap:10px;">
                  <div style="flex:1; height:8px; background:var(--surface-2); border-radius:6px; overflow:hidden;">
                    <div [style.width.%]="r.widthPct"
                         [style.background]="r.source ? 'var(--color-closed)' : 'var(--text-3)'"
                         style="height:100%; border-radius:6px; transition:width .5s;"></div>
                  </div>
                  <span style="font-size:12.5px; font-weight:700; white-space:nowrap; font-variant-numeric:tabular-nums; min-width:74px; text-align:right;"
                        [style.color]="r.source ? 'var(--text)' : 'var(--text-3)'">
                    {{ r.commissionLabel }}
                  </span>
                </div>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- ══ Objekte am längsten am Markt — Preisdruck-Gespräch ══ -->
        <div class="an-card" style="margin-bottom:20px;">
          <div class="an-card-head">
            <div class="an-title">{{ 'analytics.longestTitle' | translate }}</div>
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
            <div class="an-title">{{ 'analytics.healthTitle' | translate }}</div>
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
              <div style="font-size:11px; color:var(--text-3); margin-top:3px;">
                {{ 'analytics.contactBase' | translate:{ count: data.pipelineHealth.clientsWithContact } }}
              </div>
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
  sellerFunnelStages: FunnelStage[] = [];
  leakFromKey = '';
  leakToKey = '';
  leakRate = 0;
  trendPoints: TrendPoint[] = [];
  trendPeak = 0;
  trendLinePath = '';
  trendAreaPath = '';
  trendStartLabel = '';
  marketBars: MarketBar[] = [];
  leadSourceBars: LeadSourceBar[] = [];
  hasLeadSourceData = false;
  leadSourceScale: 'commission' | 'deals' = 'commission';
  tooFewData = false;

  mapMarkers: SecondaryMarker[] = [];
  propertyPinCount = 0;
  searchPinCount = 0;
  isLoadingMap = true;

  constructor(
    private analyticsService: AnalyticsService,
    private propertyService: PropertyService,
    private clientService: ClientService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMapMarkers();
    this.analyticsService.getAnalytics().subscribe({
      next: (d) => {
        this.data = d;
        this.buildFunnel(d);
        this.buildSellerFunnel(d);
        this.buildTrend(d.activityTrends.last30DaysActivity);
        this.buildMarketBars(d.propertyPortfolio.longestOnMarket);
        this.buildLeadSources(d.leadSourcePerformance);
        this.tooFewData = d.conversionFunnel.totalClients < 3;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  /**
   * Bewusst getrennt vom Analytics-Endpoint geladen: die Karte braucht Koordinaten
   * einzelner Datensätze, keine Kennzahlen — und soll auch stehen, wenn die
   * Auswertung noch lädt oder mangels Daten gar nicht angezeigt wird.
   * Größe 1000: ein Agent hat realistisch weit weniger Datensätze; erspart Paging.
   */
  private loadMapMarkers(): void {
    forkJoin({
      properties: this.propertyService.getProperties(0, 1000).pipe(catchError(() => of(null))),
      clients: this.clientService.getClients(0, 1000).pipe(catchError(() => of(null)))
    }).subscribe(({ properties, clients }) => {
      const propertyMarkers: SecondaryMarker[] = (properties?.content ?? [])
        .filter(p => p.latitude != null && p.longitude != null)
        .map(p => ({
          latitude: p.latitude!,
          longitude: p.longitude!,
          label: p.title,
          role: 'property' as const,
          link: ['/properties', p.id!]
        }));

      const searchMarkers: SecondaryMarker[] = (clients?.content ?? [])
        .filter(c => c.searchCriteria?.latitude != null && c.searchCriteria?.longitude != null)
        .map(c => ({
          latitude: c.searchCriteria!.latitude!,
          longitude: c.searchCriteria!.longitude!,
          label: `${c.firstName} ${c.lastName} · ${c.searchCriteria!.searchRadiusKm ?? 10} km`,
          role: 'search' as const,
          link: ['/clients', c.id!]
        }));

      this.propertyPinCount = propertyMarkers.length;
      this.searchPinCount = searchMarkers.length;
      this.mapMarkers = [...propertyMarkers, ...searchMarkers];
      this.isLoadingMap = false;
    });
  }

  onMarkerClick(marker: SecondaryMarker): void {
    if (marker.link) {
      this.router.navigate(marker.link);
    }
  }

  private buildFunnel(d: DashboardAnalytics): void {
    const f = d.conversionFunnel;
    // Eine Farbe, die nach unten kräftiger wird — der Balken schrumpft, die Farbe
    // verdichtet sich. Die Kanban-Stufenfarben scheiden aus: --stage-viewing und
    // --color-offer sind beide --color-warning, zwei Stufen wären ununterscheidbar.
    const raw = [
      { key: 'analytics.funnelTotal',      count: f.totalClients,      color: 'var(--color-neutral)', opacity: 0.45, rate: null as number | null },
      { key: 'analytics.funnelInterested', count: f.interestedClients, color: 'var(--primary)',       opacity: 0.45, rate: f.interestedRate },
      { key: 'analytics.funnelViewing',    count: f.scheduledViewings, color: 'var(--primary)',       opacity: 0.65, rate: f.viewingRate },
      { key: 'analytics.funnelOffer',      count: f.offersMade,        color: 'var(--primary)',       opacity: 0.85, rate: f.offerRate },
      { key: 'analytics.funnelClosed',     count: f.dealsClosed,       color: 'var(--color-closed)',  opacity: 1,    rate: f.closingRate },
    ];
    const base = Math.max(1, f.totalClients);

    // Schwächster Übergang: die niedrigste Quote, aber nur dort wo die Vorstufe
    // überhaupt Kunden hatte — sonst ist eine 0-%-Quote nur ein leerer Trichter.
    let leakIdx = -1;
    let lowest = Infinity;
    for (let i = 1; i < raw.length; i++) {
      if (raw[i - 1].count > 0 && raw[i].rate !== null && raw[i].rate! < lowest) {
        lowest = raw[i].rate!;
        leakIdx = i;
      }
    }

    this.funnelStages = raw.map((r, i) => ({
      labelKey: r.key,
      count: r.count,
      widthPct: (r.count / base) * 100,
      color: r.color,
      opacity: r.opacity,
      rate: r.rate,
      isLeak: i === leakIdx,
    }));

    this.leakFromKey = leakIdx > 0 ? raw[leakIdx - 1].key : '';
    this.leakToKey = leakIdx > 0 ? raw[leakIdx].key : '';
    this.leakRate = leakIdx > 0 ? lowest : 0;
  }

  /**
   * Akquise-Trichter (Issue #38). Gleiche Darstellung wie beim Käufer-Trichter, aber
   * eigene Karte: die Stufen sind andere, und ein gemeinsamer Balken würde suggerieren,
   * dass ein Eigentümer und ein Interessent dasselbe durchlaufen.
   */
  private buildSellerFunnel(d: DashboardAnalytics): void {
    const s = d.sellerPipeline;
    if (!s) { this.sellerFunnelStages = []; return; }

    const raw = [
      { key: 'analytics.sellerFunnelTotal',     count: s.totalSellers, color: 'var(--color-neutral)', opacity: 0.45, rate: null as number | null },
      { key: 'analytics.sellerFunnelValuation', count: s.valuations,   color: 'var(--primary)',       opacity: 0.45, rate: s.valuationRate },
      { key: 'analytics.sellerFunnelPitch',     count: s.pitches,      color: 'var(--primary)',       opacity: 0.65, rate: s.pitchRate },
      { key: 'analytics.sellerFunnelMandate',   count: s.mandates,     color: 'var(--primary)',       opacity: 0.85, rate: s.mandateRate },
      { key: 'analytics.sellerFunnelSold',      count: s.sold,         color: 'var(--color-closed)',  opacity: 1,    rate: s.soldRate },
    ];
    const base = Math.max(1, s.totalSellers);

    let leakIdx = -1;
    let lowest = Infinity;
    for (let i = 1; i < raw.length; i++) {
      if (raw[i - 1].count > 0 && raw[i].rate !== null && raw[i].rate! < lowest) {
        lowest = raw[i].rate!;
        leakIdx = i;
      }
    }

    this.sellerFunnelStages = raw.map((r, i) => ({
      labelKey: r.key,
      count: r.count,
      widthPct: (r.count / base) * 100,
      color: r.color,
      opacity: r.opacity,
      rate: r.rate,
      isLeak: i === leakIdx,
    }));
  }

  private buildTrend(days: DailyActivity[]): void {
    if (!days || days.length < 2) { this.trendPoints = []; this.trendPeak = 0; return; }
    const W = 320, H = 96, pad = 3;
    const max = Math.max(1, ...days.map(d => d.callNotes));
    const n = days.length;
    this.trendPeak = Math.max(0, ...days.map(d => d.callNotes));

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

  /**
   * Balkenlänge = realisierte Provision je Kanal. Solange nirgends eine Provision gepflegt ist,
   * wären alle Balken null — dann skaliert die Grafik auf die Zahl der Abschlüsse und sagt das
   * im Hinweis darüber auch, statt eine leere Karte zu zeigen.
   */
  private buildLeadSources(rows: LeadSourcePerformance[]): void {
    const list = rows ?? [];
    this.hasLeadSourceData = list.some(r => r.source !== null);
    if (!this.hasLeadSourceData) { this.leadSourceBars = []; return; }

    const maxCommission = Math.max(0, ...list.map(r => r.wonCommission ?? 0));
    this.leadSourceScale = maxCommission > 0 ? 'commission' : 'deals';
    const max = this.leadSourceScale === 'commission'
      ? maxCommission
      : Math.max(0, ...list.map(r => r.wonClients ?? 0));

    this.leadSourceBars = list.map(r => {
      const value = this.leadSourceScale === 'commission' ? (r.wonCommission ?? 0) : (r.wonClients ?? 0);
      return {
        source: r.source,
        clients: r.totalClients,
        won: r.wonClients,
        winRate: r.winRate,
        commissionLabel: this.money(r.wonCommission),
        widthPct: max > 0 ? (value / max) * 100 : 0,
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
