import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

export interface ConversionFunnel {
  totalClients: number;
  interestedClients: number;
  scheduledViewings: number;
  offersMade: number;
  dealsClosed: number;
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

export interface DashboardAnalytics {
  conversionFunnel: ConversionFunnel;
  pipelineHealth: PipelineHealth;
  propertyPortfolio: PropertyPortfolio;
  activityTrends: ActivityTrends;
  revenue: Revenue;
  clientsNeedingAttention: unknown[];
  suggestedActions: string[];
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
