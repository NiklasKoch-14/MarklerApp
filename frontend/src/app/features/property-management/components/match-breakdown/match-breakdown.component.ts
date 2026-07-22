import { Component, Input, OnChanges, LOCALE_ID, inject } from '@angular/core';
import { CommonModule, formatNumber } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EnumTranslationService } from '../../../../shared/services/enum-translation.service';
import {
  MatchReason,
  MatchReasonCategory,
  MatchScoreBreakdown,
  MatchWeights
} from '../../models/property-match.model';

type ReasonTone = 'match' | 'mismatch' | 'neutral';

interface BreakdownRow {
  category: MatchReasonCategory;
  labelKey: string;
  score: number;
  weight: number;
  contribution: number;
  reasons: { reason: MatchReason; tone: ReasonTone }[];
  /** Single "no preference given" reason — rendered on one line instead of a block */
  compact: boolean;
}

/**
 * Makes a match percentage auditable: every category with its score, the weight it carries,
 * what it contributes to the total, and the reasons behind it — filed under the category
 * they belong to rather than in one undifferentiated list.
 *
 * Reasons arrive as codes plus raw params; wording and number formatting happen here so the
 * backend stays language-neutral.
 */
@Component({
  selector: 'app-match-breakdown',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div style="display:flex;flex-direction:column;gap:12px;">

      <!-- Kategorien, deren einzige Aussage "keine Vorgabe" ist, stehen einzeilig:
           die Information bleibt sichtbar, kostet aber nicht die Aufmerksamkeit
           einer Zeile, die tatsaechlich etwas ueber das Objekt aussagt. -->
      @for (row of rows; track row.category) {
        <div [style.display]="row.compact ? 'flex' : 'block'"
             style="align-items:baseline;gap:8px;">

          <div style="display:flex;align-items:baseline;gap:8px;"
               [style.flex]="row.compact ? '1' : null"
               [style.margin-bottom]="row.compact ? '0' : '3px'">
            <span style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.4px;white-space:nowrap;">
              {{ row.labelKey | translate }}
            </span>
            @if (row.compact) {
              <span style="flex:1;font-size:12px;color:var(--text-3);min-width:0;">
                {{ reasonKey(row.reasons[0].reason) | translate: displayParams(row.reasons[0].reason) }}
              </span>
            } @else {
              <span style="flex:1;"></span>
            }
            <span style="font-size:11px;color:var(--text-3);font-variant-numeric:tabular-nums;white-space:nowrap;">
              {{ row.score }} &times; {{ row.weight }}% = <span style="color:var(--text-2);font-weight:700;">{{ row.contribution | number:'1.1-1' }}</span>
            </span>
          </div>

          @if (!row.compact) {
            <div style="display:flex;flex-direction:column;gap:3px;">
              @for (entry of row.reasons; track entry.reason.code) {
                <div style="display:flex;align-items:flex-start;gap:7px;font-size:13px;line-height:1.5;">
                  <i [class]="toneIcon(entry.tone)"
                     [style.color]="toneColor(entry.tone)"
                     style="font-size:14px;flex-shrink:0;margin-top:2px;"></i>
                  <span [style.color]="entry.tone === 'neutral' ? 'var(--text-3)' : 'var(--text)'">
                    {{ reasonKey(entry.reason) | translate: displayParams(entry.reason) }}
                  </span>
                </div>
              }
            </div>
          }
        </div>
      }

      <div style="display:flex;align-items:baseline;gap:8px;padding-top:9px;border-top:1px solid var(--border);">
        <span style="flex:1;font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.4px;">
          {{ 'properties.matching.totalScore' | translate }}
        </span>
        <span style="font-size:14px;color:var(--text);font-weight:800;font-variant-numeric:tabular-nums;">{{ matchScore }}%</span>
      </div>
    </div>
  `
})
export class MatchBreakdownComponent implements OnChanges {

  @Input() breakdown?: MatchScoreBreakdown;
  @Input() weights?: MatchWeights;
  @Input() matchReasons: MatchReason[] = [];
  @Input() mismatchReasons: MatchReason[] = [];
  @Input() matchScore = 0;

  rows: BreakdownRow[] = [];

  private readonly locale = inject(LOCALE_ID);
  private readonly translate = inject(TranslateService);
  private readonly enumTranslation = inject(EnumTranslationService);

  /**
   * Reasons that report an absence rather than a property trait. They score 100 without
   * saying anything good about the object, so they must not read as evidence — but they
   * are exactly what explains a suspiciously high score, so they stay visible.
   */
  private static readonly NEUTRAL_CODES = new Set([
    'noPriceConstraints', 'priceNotSpecified',
    'noLocationPreferences', 'locationNotSpecified',
    'noAreaConstraints', 'areaNotSpecified',
    'noRoomConstraints', 'roomsNotSpecified',
    'noTypePreferences', 'typeNotSpecified'
  ]);

  // Mirrors the backend defaults — only used if a response predates appliedWeights
  private static readonly DEFAULT_WEIGHTS: MatchWeights = {
    priceWeight: 30,
    locationWeight: 25,
    areaWeight: 20,
    roomWeight: 15,
    featureWeight: 10
  };

  ngOnChanges(): void {
    this.rows = this.buildRows();
  }

  reasonKey(reason: MatchReason): string {
    return `properties.matching.reasons.${reason.code}`;
  }

  /**
   * Raw params become display-ready strings here: the backend sends numbers, the user
   * reads formatted values. What a param means depends on its category — `limit` is a
   * budget under PRICE and a square-metre bound under AREA.
   */
  displayParams(reason: MatchReason): { [key: string]: string } {
    const source = reason.params ?? {};
    const formatted: { [key: string]: string } = {};

    Object.keys(source).forEach(key => {
      formatted[key] = this.formatParam(reason.category, key, source[key]);
    });

    return formatted;
  }

  toneIcon(tone: ReasonTone): string {
    if (tone === 'mismatch') {
      return 'ri-close-line';
    }
    return tone === 'neutral' ? 'ri-information-line' : 'ri-check-line';
  }

  toneColor(tone: ReasonTone): string {
    if (tone === 'mismatch') {
      return 'var(--color-warning)';
    }
    return tone === 'neutral' ? 'var(--text-3)' : 'var(--color-success)';
  }

  private buildRows(): BreakdownRow[] {
    if (!this.breakdown) {
      return [];
    }

    const weights = this.weights ?? MatchBreakdownComponent.DEFAULT_WEIGHTS;

    const candidates: { category: MatchReasonCategory; labelKey: string; score?: number; weight: number }[] = [
      { category: 'PRICE', labelKey: 'properties.matching.priceScore', score: this.breakdown.priceScore, weight: weights.priceWeight },
      { category: 'LOCATION', labelKey: 'properties.matching.locationScore', score: this.breakdown.locationScore, weight: weights.locationWeight },
      { category: 'AREA', labelKey: 'properties.matching.areaScore', score: this.breakdown.areaScore, weight: weights.areaWeight },
      { category: 'ROOM', labelKey: 'properties.matching.roomScore', score: this.breakdown.roomScore, weight: weights.roomWeight },
      { category: 'TYPE', labelKey: 'properties.matching.typeScore', score: this.breakdown.featureScore, weight: weights.featureWeight }
    ];

    return candidates
      .filter(candidate => candidate.score != null)
      .map(candidate => {
        const reasons = this.reasonsFor(candidate.category);
        return {
          category: candidate.category,
          labelKey: candidate.labelKey,
          score: candidate.score as number,
          weight: candidate.weight,
          contribution: ((candidate.score as number) * candidate.weight) / 100,
          reasons,
          compact: reasons.length === 1 && reasons[0].tone === 'neutral'
        };
      });
  }

  private reasonsFor(category: MatchReasonCategory): { reason: MatchReason; tone: ReasonTone }[] {
    const positives = (this.matchReasons ?? [])
      .filter(reason => reason.category === category)
      .map(reason => ({
        reason,
        tone: (MatchBreakdownComponent.NEUTRAL_CODES.has(reason.code) ? 'neutral' : 'match') as ReasonTone
      }));
    const negatives = (this.mismatchReasons ?? [])
      .filter(reason => reason.category === category)
      .map(reason => ({ reason, tone: 'mismatch' as ReasonTone }));

    // Mismatches first: what is wrong with a match is the part worth reading
    return [...negatives, ...positives];
  }

  private formatParam(category: MatchReasonCategory, key: string, value: string | number): string {
    if (key === 'priceKind') {
      return this.translate.instant(`properties.matching.reasons.priceKind.${value}`);
    }

    if (key === 'propertyType') {
      return this.translate.instant(this.enumTranslation.getTranslationKey('PropertyType', String(value)));
    }

    if (typeof value !== 'number') {
      return String(value);
    }

    switch (key) {
      case 'percent':
      case 'distanceKm':
      case 'overKm':
        return formatNumber(value, this.locale, '1.0-1');
      case 'rooms':
      case 'difference':
        return formatNumber(value, this.locale, '1.0-1');
      case 'radiusKm':
        return formatNumber(value, this.locale, '1.0-0');
      case 'value':
      case 'limit':
        // AREA limits are square metres, PRICE limits are euros — both render without decimals
        return formatNumber(value, this.locale, category === 'ROOM' ? '1.0-1' : '1.0-0');
      case 'area':
        return formatNumber(value, this.locale, '1.0-0');
      default:
        return formatNumber(value, this.locale, '1.0-2');
    }
  }
}
