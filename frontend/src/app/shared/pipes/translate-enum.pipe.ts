import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { EnumTranslationService } from '../services/enum-translation.service';

/**
 * Pipe to translate enum values to localized labels
 * Usage: {{ enumValue | translateEnum:'EnumType' }}
 * Example: {{ 'APARTMENT' | translateEnum:'PropertyType' }}
 *
 * The enum value stays the same (e.g., 'APARTMENT')
 * But displays translated label (e.g., 'Wohnung' in German, 'Apartment' in English)
 */
@Pipe({
  name: 'translateEnum',
  standalone: true,
  pure: false // Re-evaluate when language changes
})
export class TranslateEnumPipe implements PipeTransform {

  constructor(
    private translateService: TranslateService,
    private enumTranslationService: EnumTranslationService
  ) {}

  transform(value: string | null | undefined, enumType: string): string {
    if (!value) {
      return '';
    }

    // Get translation key for the enum value
    const translationKey = this.enumTranslationService.getTranslationKey(enumType, value);

    // Get translated value
    const translated = this.translateService.instant(translationKey);

    // If translation not found, return the original value formatted nicely
    if (translated === translationKey) {
      return this.formatEnumValue(value);
    }

    return translated;
  }

  /**
   * Format enum value as fallback (convert UPPER_CASE to Title Case)
   * @param value Enum value
   * @returns Formatted string
   */
  private formatEnumValue(value: string): string {
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
