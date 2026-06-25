import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { PropertyMatchingService } from '../../services/property-matching.service';
import { PropertyService } from '../../services/property.service';
import { PropertyMatchRequest, PropertyMatchResponse, PropertyMatchResult } from '../../models/property-match.model';
import { TranslateEnumPipe } from '../../../../shared/pipes/translate-enum.pipe';

@Component({
  selector: 'app-property-matching',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule, TranslateModule, TranslateEnumPipe],
  template: `
    <div style="padding:28px 32px; max-width:900px;">
      <!-- Page Header -->
      <div class="page-header" style="margin-bottom:24px;">
        <div>
          <h1 class="page-title">{{ 'properties.matching.title' | translate }}</h1>
          <p style="font-size:14px; color:var(--text-2); margin-top:4px;">{{ 'properties.matching.subtitle' | translate }}</p>
        </div>
      </div>

      <!-- Matching Form Card -->
      <div class="widget-card" style="margin-bottom:20px;">
        <form [formGroup]="matchingForm" (ngSubmit)="onMatch()">

          <!-- Mode Tabs -->
          <div style="padding:16px 20px 0;">
            <label class="form-label">{{ 'properties.matching.matchingMode' | translate }}</label>
            <div class="view-tabs" style="margin-top:8px;">
              <button type="button" class="view-tab" [class.active]="matchMode === 'client'"
                (click)="matchMode = 'client'">
                <i class="ph ph-user"></i>
                {{ 'properties.matching.clientToProperties' | translate }}
              </button>
              <button type="button" class="view-tab" [class.active]="matchMode === 'property'"
                (click)="matchMode = 'property'">
                <i class="ph ph-buildings"></i>
                {{ 'properties.matching.propertyToClients' | translate }}
              </button>
            </div>
          </div>

          <div style="padding:16px 20px; display:flex; flex-direction:column; gap:16px;">

            <!-- ID Input -->
            <div *ngIf="matchMode === 'client'">
              <label class="form-label">{{ 'properties.matching.clientId' | translate }}</label>
              <input type="text" formControlName="clientId" class="form-input"
                [placeholder]="'properties.matching.clientIdPlaceholder' | translate" />
            </div>
            <div *ngIf="matchMode === 'property'">
              <label class="form-label">{{ 'properties.matching.propertyId' | translate }}</label>
              <input type="text" formControlName="propertyId" class="form-input"
                [placeholder]="'properties.matching.propertyIdPlaceholder' | translate" />
            </div>

            <!-- Threshold + Max Results -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div>
                <label class="form-label">{{ 'properties.matching.matchThreshold' | translate }}</label>
                <input type="number" formControlName="matchThreshold" class="form-input" min="0" max="100" />
              </div>
              <div>
                <label class="form-label">{{ 'properties.matching.maxResults' | translate }}</label>
                <input type="number" formControlName="maxResults" class="form-input" min="1" max="500" />
              </div>
            </div>

            <!-- Options -->
            <div>
              <label class="form-label" style="margin-bottom:10px;">{{ 'properties.matching.matchingOptions' | translate }}</label>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px; color:var(--text);">
                  <input type="checkbox" formControlName="exactLocationMatch" style="accent-color:var(--primary); width:15px; height:15px;" />
                  {{ 'properties.matching.locationExactness' | translate }}
                </label>
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px; color:var(--text);">
                  <input type="checkbox" formControlName="allowBudgetFlexibility" style="accent-color:var(--primary); width:15px; height:15px;" />
                  {{ 'properties.matching.budgetFlexibility' | translate }}
                </label>
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px; color:var(--text);">
                  <input type="checkbox" formControlName="allowFeatureFlexibility" style="accent-color:var(--primary); width:15px; height:15px;" />
                  {{ 'properties.matching.featureFlexibility' | translate }}
                </label>
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:14px; color:var(--text);">
                  <input type="checkbox" formControlName="includeContacted" style="accent-color:var(--primary); width:15px; height:15px;" />
                  {{ 'properties.matching.includeContacted' | translate }}
                </label>
              </div>
            </div>

            <!-- Advanced Weights -->
            <div>
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
                <label class="form-label" style="margin:0;">{{ 'properties.matching.advancedWeights' | translate }}</label>
                <button type="button" (click)="showAdvanced = !showAdvanced"
                  style="font-size:13px; color:var(--primary); background:none; border:none; cursor:pointer; padding:0;">
                  {{ (showAdvanced ? 'properties.matching.hideAdvanced' : 'properties.matching.showAdvanced') | translate }}
                </button>
              </div>
              <div *ngIf="showAdvanced"
                style="display:grid; grid-template-columns:repeat(5,1fr); gap:10px; background:var(--surface-2); border:1px solid var(--border); border-radius:10px; padding:14px;">
                <div *ngFor="let w of weightFields">
                  <label class="form-label" style="font-size:12px;">{{ ('properties.matching.' + w.key) | translate }}</label>
                  <input type="number" [formControlName]="w.ctrl" class="form-input" style="padding:7px 10px;" min="0" max="100" />
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div style="display:flex; gap:10px; align-items:center; padding-top:4px;">
              <button type="submit" class="btn-primary" [disabled]="isLoading || matchingForm.invalid">
                <i class="ph ph-shuffle"></i>
                {{ (isLoading ? 'properties.matching.findingMatches' : 'properties.matching.findMatches') | translate }}
              </button>
              <button type="button" class="btn-secondary" (click)="onReset()">
                {{ 'properties.matching.reset' | translate }}
              </button>
              <a routerLink="/properties" class="btn-secondary">
                {{ 'properties.backToProperties' | translate }}
              </a>
            </div>
          </div>
        </form>
      </div>

      <!-- Results -->
      <div *ngIf="matchResponse" class="widget-card">
        <div class="widget-header">
          <span class="widget-title">{{ 'properties.matching.matchResults' | translate }}</span>
          <span style="font-size:13px; color:var(--text-2); margin-left:auto;" *ngIf="matchResponse.totalMatches">
            {{ matchResponse.totalMatches }} Treffer · {{ matchResponse.executionTimeMs }}ms
          </span>
        </div>

        <div style="padding:16px 20px;">
          <!-- No Results -->
          <p *ngIf="!isLoading && (!matchResponse.properties || matchResponse.properties.length === 0)"
            style="text-align:center; color:var(--text-3); font-size:14px; padding:24px 0;">
            {{ 'properties.matching.noMatches' | translate }}
          </p>

          <!-- Match Items -->
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div *ngFor="let match of matchResponse.properties"
              style="border:1px solid var(--border); border-radius:12px; padding:16px; transition:box-shadow 0.15s;"
              [style.border-left]="'3px solid ' + getScoreColor(match.matchScore)">

              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">
                <div style="flex:1;">
                  <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
                    <h3 style="font-size:15px; font-weight:600; color:var(--text); margin:0;">{{ match.property.title }}</h3>
                    <span style="font-size:12px; font-weight:700; padding:3px 10px; border-radius:20px;"
                      [style.background]="getScoreBg(match.matchScore)"
                      [style.color]="getScoreColor(match.matchScore)">
                      {{ match.matchScore }}%
                    </span>
                  </div>
                  <p style="font-size:13px; color:var(--text-2); margin:0 0 8px;">
                    {{ match.property.addressCity }}
                    <span *ngIf="match.property.rooms"> · {{ match.property.rooms }} Zi.</span>
                    <span *ngIf="match.property.livingAreaSqm"> · {{ match.property.livingAreaSqm }} m²</span>
                  </p>

                  <div *ngIf="match.matchReasons && match.matchReasons.length > 0" style="margin-bottom:10px;">
                    <p style="font-size:12px; font-weight:600; color:#1f8a5b; margin:0 0 4px;">{{ 'properties.matching.whyMatches' | translate }}</p>
                    <ul style="margin:0; padding-left:16px; font-size:12px; color:var(--text-2);">
                      <li *ngFor="let reason of match.matchReasons">{{ reason }}</li>
                    </ul>
                  </div>

                  <div *ngIf="match.scoreBreakdown"
                    style="display:flex; gap:8px; flex-wrap:wrap;">
                    <span *ngFor="let s of getScoreItems(match.scoreBreakdown)"
                      style="font-size:11px; background:var(--surface-2); border:1px solid var(--border); border-radius:6px; padding:2px 8px; color:var(--text-2);">
                      {{ s.label }}: {{ s.val }}%
                    </span>
                  </div>
                </div>

                <div style="text-align:right; flex-shrink:0;">
                  <div style="font-size:18px; font-weight:700; color:var(--primary); margin-bottom:8px;">
                    {{ propertyService.formatPrice(match.property.price, match.property.listingType) }}
                  </div>
                  <a [routerLink]="['/properties', match.property.id]" class="btn-secondary" style="font-size:13px; padding:6px 14px;">
                    {{ 'properties.matching.viewDetails' | translate }}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class PropertyMatchingComponent implements OnInit {
  matchingForm: FormGroup;
  matchMode: 'client' | 'property' = 'client';
  matchResponse: PropertyMatchResponse | null = null;
  isLoading = false;
  showAdvanced = false;

  weightFields = [
    { key: 'priceWeight', ctrl: 'priceWeight' },
    { key: 'locationWeight', ctrl: 'locationWeight' },
    { key: 'areaWeight', ctrl: 'areaWeight' },
    { key: 'roomWeight', ctrl: 'roomWeight' },
    { key: 'featureWeight', ctrl: 'featureWeight' },
  ];

  constructor(
    private fb: FormBuilder,
    public matchingService: PropertyMatchingService,
    public propertyService: PropertyService
  ) {
    const defaultRequest = this.matchingService.getDefaultMatchRequest();

    this.matchingForm = this.fb.group({
      clientId: [''],
      propertyId: [''],
      matchThreshold: [defaultRequest.matchThreshold],
      maxResults: [defaultRequest.maxResults],
      exactLocationMatch: [defaultRequest.exactLocationMatch],
      allowBudgetFlexibility: [defaultRequest.allowBudgetFlexibility],
      allowFeatureFlexibility: [defaultRequest.allowFeatureFlexibility],
      includeContacted: [defaultRequest.includeContacted],
      priceWeight: [defaultRequest.priceWeight],
      locationWeight: [defaultRequest.locationWeight],
      areaWeight: [defaultRequest.areaWeight],
      roomWeight: [defaultRequest.roomWeight],
      featureWeight: [defaultRequest.featureWeight]
    });
  }

  ngOnInit(): void {
    // Component initialization
  }

  onMatch(): void {
    if (this.matchingForm.invalid) {
      return;
    }

    this.isLoading = true;
    const formValue = this.matchingForm.value;

    const request: PropertyMatchRequest = {
      matchThreshold: formValue.matchThreshold,
      maxResults: formValue.maxResults,
      exactLocationMatch: formValue.exactLocationMatch,
      allowBudgetFlexibility: formValue.allowBudgetFlexibility,
      allowFeatureFlexibility: formValue.allowFeatureFlexibility,
      includeContacted: formValue.includeContacted,
      priceWeight: formValue.priceWeight,
      locationWeight: formValue.locationWeight,
      areaWeight: formValue.areaWeight,
      roomWeight: formValue.roomWeight,
      featureWeight: formValue.featureWeight,
      sortBy: 'matchScore',
      sortDirection: 'DESC'
    };

    if (this.matchMode === 'client') {
      request.clientId = formValue.clientId;
      this.matchingService.findMatchingPropertiesForClient(formValue.clientId, request).subscribe({
        next: (response) => {
          this.matchResponse = response;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error finding matches:', error);
          this.isLoading = false;
        }
      });
    } else {
      request.propertyId = formValue.propertyId;
      this.matchingService.findMatchingClientsForProperty(formValue.propertyId, request).subscribe({
        next: (response) => {
          this.matchResponse = response;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error finding matches:', error);
          this.isLoading = false;
        }
      });
    }
  }

  getScoreColor(score: number): string {
    if (score >= 80) return '#1f8a5b';
    if (score >= 60) return '#2f6b7a';
    if (score >= 40) return '#c07a1e';
    return '#b23a55';
  }

  getScoreBg(score: number): string {
    if (score >= 80) return '#e6f4ed';
    if (score >= 60) return '#e9f1f2';
    if (score >= 40) return '#fef3e2';
    return '#fce8ed';
  }

  getScoreItems(breakdown: any): { label: string; val: number }[] {
    return [
      { label: 'Preis', val: breakdown.priceScore },
      { label: 'Standort', val: breakdown.locationScore },
      { label: 'Fläche', val: breakdown.areaScore },
      { label: 'Zimmer', val: breakdown.roomScore },
      { label: 'Ausst.', val: breakdown.featureScore },
      { label: 'Typ', val: breakdown.typeScore },
    ].filter(s => s.val != null);
  }

  onReset(): void {
    const defaultRequest = this.matchingService.getDefaultMatchRequest();
    this.matchingForm.reset({
      matchThreshold: defaultRequest.matchThreshold,
      maxResults: defaultRequest.maxResults,
      exactLocationMatch: defaultRequest.exactLocationMatch,
      allowBudgetFlexibility: defaultRequest.allowBudgetFlexibility,
      allowFeatureFlexibility: defaultRequest.allowFeatureFlexibility,
      includeContacted: defaultRequest.includeContacted,
      priceWeight: defaultRequest.priceWeight,
      locationWeight: defaultRequest.locationWeight,
      areaWeight: defaultRequest.areaWeight,
      roomWeight: defaultRequest.roomWeight,
      featureWeight: defaultRequest.featureWeight
    });
    this.matchResponse = null;
  }
}
