import { Injectable } from '@angular/core';

/**
 * Service for translating enum values to localized labels
 * Maintains enum values while displaying translated labels
 */
@Injectable({
  providedIn: 'root'
})
export class EnumTranslationService {

  /**
   * Get translation key for an enum value
   * @param enumType The type of enum (e.g., 'PropertyType', 'PropertyStatus')
   * @param value The enum value (e.g., 'APARTMENT', 'AVAILABLE')
   * @returns Translation key (e.g., 'enums.propertyType.APARTMENT')
   */
  getTranslationKey(enumType: string, value: string): string {
    if (!value) {
      return '';
    }

    // Convert enum type to camelCase for translation key
    const keyPrefix = this.toCamelCase(enumType);
    return `enums.${keyPrefix}.${value}`;
  }

  /**
   * Convert string to camelCase
   * @param str String to convert
   * @returns camelCase string
   */
  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * Get all translation keys for an enum type
   * @param enumType The type of enum
   * @param enumValues Array of enum values
   * @returns Object mapping enum values to translation keys
   */
  getEnumTranslationKeys(enumType: string, enumValues: string[]): { [key: string]: string } {
    const keys: { [key: string]: string } = {};
    enumValues.forEach(value => {
      keys[value] = this.getTranslationKey(enumType, value);
    });
    return keys;
  }
}
