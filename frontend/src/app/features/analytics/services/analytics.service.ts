import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

/** Stufen sind kumulativ: wer ein Angebot bekam, zaehlt auch als Interessent. */
export interface ConversionFunnel {
  totalClients: number;
  interestedClients: number;
  scheduledViewings: number;
  offersMade: number;
  dealsClosed: number;
  lostClients: number;
  interestedRate: number;
  viewingRate: number;
  offerRate: number;
  closingRate: number;
  overallConversionRate: number;
}

export interface PipelineHealth {
  clientsByOutcome: Record<string, number>;
  overdueFollowUps: number;
  followUpsDueThisWeek: number;
  followUpsDueNextWeek: number;
  clientsWithoutRecentContact: number;
  averageDaysSinceLastContact: number;
  clientsWithContact: number;
}

export interface PropertyOnMarket {
  propertyId: string;
  title: string;
  city: string;
  daysOnMarket: number;
  price: number;
}

export interface PropertyPortfolio {
  totalProperties: number;
  propertiesByStatus: Record<string, number>;
  propertiesByType: Record<string, number>;
  averageDaysOnMarket: number;
  propertiesWithImages: number;
  propertiesWithExpose: number;
  totalPortfolioValue: number;
  longestOnMarket: PropertyOnMarket[];
}

export interface DailyActivity {
  date: string;
  callNotes: number;
  newClients: number;
  dealsClosed: number;
}

export interface ActivityTrends {
  callNotesThisMonth: number;
  callNotesLastMonth: number;
  callNotesGrowthPercent: number;
  newClientsThisMonth: number;
  newClientsLastMonth: number;
  dealsClosedThisMonth: number;
  dealsClosedLastMonth: number;
  newPropertiesThisMonth: number;
  newPropertiesLastMonth: number;
  last30DaysActivity: DailyActivity[];
}

export interface Revenue {
  realizedCommissionYtd: number;
  pipelineCommission: number;
  dealsClosedYtd: number;
  avgCommissionPerDeal: number;
}

/**
 * Kennzahlen je Akquisekanal (Issue #41). `source` ist der Enum-Name von LeadSource
 * oder null für Kunden ohne erfasste Quelle — übersetzt wird erst im Template.
 */
export interface LeadSourcePerformance {
  source: string | null;
  totalClients: number;
  wonClients: number;
  wonCommission: number;
  openCommission: number;
  winRate: number;
}

/**
 * Akquise-Trichter der Verkäufer (Issue #38) — getrennt vom Käufer-Trichter, weil
 * beides zu vermischen die Absprung-Erkennung verfälscht. Kumulativ gezählt.
 */
export interface SellerPipeline {
  totalSellers: number;
  valuations: number;
  pitches: number;
  mandates: number;
  sold: number;
  lost: number;
  valuationRate: number;
  pitchRate: number;
  mandateRate: number;
  soldRate: number;
  overallMandateRate: number;
}

export interface DashboardAnalytics {
  conversionFunnel: ConversionFunnel;
  sellerPipeline: SellerPipeline;
  pipelineHealth: PipelineHealth;
  propertyPortfolio: PropertyPortfolio;
  activityTrends: ActivityTrends;
  revenue: Revenue;
  leadSourcePerformance: LeadSourcePerformance[];
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService,
  ) {}

  getAnalytics(): Observable<DashboardAnalytics> {
    return this.http.get<DashboardAnalytics>(`${this.apiUrl}/analytics`).pipe(
      catchError(err => this.errorHandler.handleError(err)),
    );
  }
}
