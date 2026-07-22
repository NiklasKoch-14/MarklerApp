import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

/**
 * Error response structure from backend
 */
export interface BackendErrorResponse {
  error?: string;
  message?: string;
  status?: number;
  timestamp?: string;
  path?: string;
  fieldErrors?: { [key: string]: string };
}

/**
 * Processed error for display
 */
export interface ProcessedError {
  message: string;
  statusCode: number;
  type: ErrorType;
  fieldErrors?: { [key: string]: string };
  originalError?: any;
}

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Centralized error handling service for HTTP requests
 *
 * Usage in services:
 * ```typescript
 * return this.http.get<Data>(url).pipe(
 *   catchError(err => this.errorHandler.handleError(err))
 * );
 * ```
 */
/**
 * Backend responses carry plain-English message text (Bean Validation annotations,
 * ValidationConstants, hand-thrown IllegalArgumentException). Rather than translating
 * every one of the 200+ distinct backend validation strings, this maps the known,
 * commonly user-facing ones to existing i18n keys — anything not in this list falls
 * back to a generic translated message instead of leaking raw English (see
 * extractErrorMessage / translateBackendMessage).
 */
const BACKEND_MESSAGE_TRANSLATIONS: Record<string, string> = {
  'Invalid email or password': 'errors.backend.invalidCredentials',
  'Google sign-in failed': 'errors.backend.googleSignInFailed',
  'A client with this email already exists': 'errors.backend.duplicateEmail',
  'Unable to create client: Invalid agent session. Please log out and log in again.': 'errors.backend.invalidAgentSession',
  'Client does not have search criteria configured': 'errors.backend.noSearchCriteria',
  'Current password is incorrect': 'errors.backend.currentPasswordIncorrect',
  'Email is already in use': 'errors.backend.emailInUse',
  'Email is already in use by another agent': 'errors.backend.emailInUseByAgent',
  'User account is inactive': 'errors.backend.accountInactive',
  'File is empty': 'errors.backend.fileEmpty',
  'File content type is missing': 'errors.backend.missingContentType',
  'Unsupported file format. Supported: PDF, Word, Excel, JPEG, PNG, GIF': 'errors.backend.unsupportedAttachmentFormat',
  'File must be a PDF': 'errors.backend.invalidPdf',
  'File size must not exceed 50MB': 'errors.backend.pdfSizeLimit',
  'File data is required': 'errors.backend.fileDataRequired',
  'Invalid file data format. Must be Base64 encoded.': 'errors.backend.invalidBase64',
  'Invalid PDF file': 'errors.backend.invalidPdfFile',
  'Invalid PDF file format': 'errors.backend.invalidPdfFormat',
  'File must be an image': 'errors.backend.fileMustBeImage',
  'File size exceeds maximum limit of 10MB': 'errors.backend.imageSizeLimit',
  'Unsupported image format. Supported: JPEG, PNG, GIF, WebP': 'errors.backend.unsupportedImageFormat',
  'Data processing consent is required': 'errors.backend.gdprConsentRequired',
  'Too many password reset requests. Please try again later.': 'errors.backend.passwordResetRateLimit',
  "If your email is registered, you'll receive a reset link shortly.": 'auth.forgotPassword.successMessage',
  'This reset link is invalid or has expired.': 'auth.resetPassword.invalidToken',
  'This reset link has expired. Please request a new password reset.': 'auth.resetPassword.expiredToken',
  'This reset link has already been used.': 'errors.backend.resetTokenUsed',
  'Password successfully reset. You can now log in.': 'auth.resetPassword.successMessage',
  'CSV file has no rows': 'errors.backend.csvNoRows',
  'First and last name are required (min. 2 characters)': 'errors.backend.csvRowNameRequired',

  // Bean-Validation-Feldmeldungen (Issue #25) — nur die aus echten Formularen
  // erreichbaren. Rein interne Meldungen (Paging, Token-Hashes, Gewichtungen)
  // bleiben bewusst ungemappt: sie sind Symptome eines Bugs, nicht Nutzerfehler.
  'First name is required': 'errors.backend.validation.firstNameRequired',
  'Last name is required': 'errors.backend.validation.lastNameRequired',
  'Email is required': 'errors.backend.validation.emailRequired',
  'Password is required': 'errors.backend.validation.passwordRequired',
  'New password is required': 'errors.backend.validation.newPasswordRequired',
  'City is required': 'errors.backend.validation.cityRequired',
  'Postal code is required': 'errors.backend.validation.postalCodeRequired',
  'Street address is required': 'errors.backend.validation.streetRequired',
  'Property title is required': 'errors.backend.validation.propertyTitleRequired',
  'Property type is required': 'errors.backend.validation.propertyTypeRequired',
  'Listing type is required': 'errors.backend.validation.listingTypeRequired',
  'Viewing date is required': 'errors.backend.validation.viewingDateRequired',
  'Call date is required': 'errors.backend.validation.callDateRequired',
  'Call type is required': 'errors.backend.validation.callTypeRequired',
  'Subject is required': 'errors.backend.validation.subjectRequired',
  'Notes are required': 'errors.backend.validation.notesRequired',
  'Transcript is required': 'errors.backend.validation.transcriptRequired',
  'File name is required': 'errors.backend.validation.fileNameRequired',
  'Phone number format is invalid': 'errors.backend.validation.phoneInvalid',
  'Email should be valid': 'errors.backend.validation.emailInvalid',
  'Owner email should be valid': 'errors.backend.validation.ownerEmailInvalid',
  'Contact email should be valid': 'errors.backend.validation.contactEmailInvalid',
  'Postal code must be 5 digits': 'errors.backend.validation.postalCode5Digits',
  'Postal code must be 5 digits or empty': 'errors.backend.validation.postalCode5DigitsOrEmpty',
  'Password must be at least 8 characters long': 'errors.backend.validation.passwordMinLength',
  'Password must be at least 8 characters': 'errors.backend.validation.passwordMinLength',
  'Password must contain at least one lowercase letter, one uppercase letter, and one number': 'errors.backend.validation.passwordPattern',
  'Content type must be an image type': 'errors.backend.validation.contentTypeImage',
  'First name must be between 2 and 100 characters': 'errors.backend.validation.firstNameLength',
  'Last name must be between 2 and 100 characters': 'errors.backend.validation.lastNameLength',
  'Title must be between 5 and 200 characters': 'errors.backend.validation.titleLength',
  'Title must not exceed 200 characters': 'errors.backend.validation.titleMaxLength',
  'Subject must be between 5 and 200 characters': 'errors.backend.validation.subjectLength',
  'City must not exceed 100 characters': 'errors.backend.validation.cityMaxLength',
  'Street address must not exceed 200 characters': 'errors.backend.validation.streetMaxLength',
  'House number must not exceed 20 characters': 'errors.backend.validation.houseNumberMaxLength',
  'State must not exceed 100 characters': 'errors.backend.validation.stateMaxLength',
  'District must not exceed 100 characters': 'errors.backend.validation.districtMaxLength',
  'Country must not exceed 100 characters': 'errors.backend.validation.countryMaxLength',
  'Phone number must not exceed 20 characters': 'errors.backend.validation.phoneMaxLength',
  'Owner name must not exceed 100 characters': 'errors.backend.validation.ownerNameMaxLength',
  'Owner phone must not exceed 20 characters': 'errors.backend.validation.ownerPhoneMaxLength',
  'Contact phone must not exceed 20 characters': 'errors.backend.validation.contactPhoneMaxLength',
  'Virtual tour URL must not exceed 500 characters': 'errors.backend.validation.virtualTourMaxLength',
  'Notes must not exceed 5000 characters': 'errors.backend.validation.notesMaxLength5000',
  'Notes must not exceed 2000 characters': 'errors.backend.validation.notesMaxLength2000',
  'Notes must be between 10 and 5000 characters': 'errors.backend.validation.notesLength',
  'Description must not exceed 5000 characters': 'errors.backend.validation.descriptionMaxLength5000',
  'Description must not exceed 500 characters': 'errors.backend.validation.descriptionMaxLength500',
  'Follow-up action must not exceed 500 characters': 'errors.backend.validation.followUpMaxLength',
  'Transcript must be between 10 and 5000 characters': 'errors.backend.validation.transcriptLength',
  'Energy efficiency class must not exceed 10 characters': 'errors.backend.validation.energyClassMaxLength',
  'File name must not exceed 255 characters': 'errors.backend.validation.fileNameMaxLength',
  'Filename must not exceed 255 characters': 'errors.backend.validation.fileNameMaxLength',
  'Alt text must not exceed 500 characters': 'errors.backend.validation.altTextMaxLength',
  'Price must be non-negative': 'errors.backend.validation.priceNonNegative',
  'Price exceeds maximum allowed value': 'errors.backend.validation.priceMax',
  'Price per sqm must be non-negative': 'errors.backend.validation.pricePerSqmNonNegative',
  'Living area must be positive': 'errors.backend.validation.livingAreaPositive',
  'Living area must not exceed 10,000 sqm': 'errors.backend.validation.livingAreaMax',
  'Total area must be positive': 'errors.backend.validation.totalAreaPositive',
  'Total area must not exceed 100,000 sqm': 'errors.backend.validation.totalAreaMax',
  'Plot area must be positive': 'errors.backend.validation.plotAreaPositive',
  'Plot area must not exceed 1,000,000 sqm': 'errors.backend.validation.plotAreaMax',
  'Rooms must be at least 0.5': 'errors.backend.validation.roomsMin',
  'Rooms must not exceed 50': 'errors.backend.validation.roomsMax',
  'Bedrooms must be non-negative': 'errors.backend.validation.bedroomsNonNegative',
  'Bedrooms must not exceed 20': 'errors.backend.validation.bedroomsMax',
  'Bathrooms must be non-negative': 'errors.backend.validation.bathroomsNonNegative',
  'Bathrooms must not exceed 20': 'errors.backend.validation.bathroomsMax',
  'Floors must be at least 1': 'errors.backend.validation.floorsMin',
  'Floors must not exceed 100': 'errors.backend.validation.floorsMax',
  'Floor number must be at least -5 (basement)': 'errors.backend.validation.floorNumberMin',
  'Floor number must not exceed 100': 'errors.backend.validation.floorNumberMax',
  'Construction year must be at least 1000': 'errors.backend.validation.constructionYearMin',
  'Construction year must not exceed 3000': 'errors.backend.validation.constructionYearMax',
  'Last renovation year must be at least 1000': 'errors.backend.validation.renovationYearMin',
  'Last renovation year must not exceed 3000': 'errors.backend.validation.renovationYearMax',
  'Heating costs must be non-negative': 'errors.backend.validation.heatingCostsNonNegative',
  'Additional costs must be non-negative': 'errors.backend.validation.additionalCostsNonNegative',
  'Commission must be non-negative': 'errors.backend.validation.commissionNonNegative',
  'Energy consumption must be non-negative': 'errors.backend.validation.energyConsumptionNonNegative',
  'Energy consumption must not exceed 1000 kWh/m²a': 'errors.backend.validation.energyConsumptionMax',
  'Duration must be positive': 'errors.backend.validation.durationPositive',
  'Search radius must be at least 1 km': 'errors.backend.validation.searchRadiusMin',
  'Search radius must not exceed 200 km': 'errors.backend.validation.searchRadiusMax',
  'Minimum square meters must be at least 10': 'errors.backend.validation.minSquareMetersMin',
  'Maximum square meters cannot exceed 10000': 'errors.backend.validation.maxSquareMetersMax',
  'Minimum rooms must be at least 1': 'errors.backend.validation.minRoomsMin',
  'Minimum rooms cannot exceed 20': 'errors.backend.validation.minRoomsMax',
  'Maximum rooms must be at least 1': 'errors.backend.validation.maxRoomsMin',
  'Maximum rooms cannot exceed 20': 'errors.backend.validation.maxRoomsMax',
  'Minimum budget must be positive': 'errors.backend.validation.minBudgetPositive',
  'Maximum budget must be positive': 'errors.backend.validation.maxBudgetPositive',
  'Minimum cold rent must be positive': 'errors.backend.validation.minColdRentPositive',
  'Maximum cold rent must be positive': 'errors.backend.validation.maxColdRentPositive',
  'Minimum warm rent must be positive': 'errors.backend.validation.minWarmRentPositive',
  'Maximum warm rent must be positive': 'errors.backend.validation.maxWarmRentPositive',
  'File size cannot exceed 10MB': 'errors.backend.validation.fileSize10MB',
};

/** Prefix-matched translations for messages with a dynamic suffix (e.g. an appended list). */
const BACKEND_MESSAGE_PREFIX_TRANSLATIONS: Array<{ prefix: string; key: string }> = [
  { prefix: 'CSV is missing required column(s):', key: 'errors.backend.csvMissingColumns' },
  { prefix: 'Could not read CSV file:', key: 'errors.backend.csvReadError' },
  { prefix: 'Invalid email address:', key: 'errors.backend.csvRowInvalidEmail' },
];

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  constructor(private translate: TranslateService) {}

  /**
   * Translates a raw backend message (English) into the current UI language via the
   * curated lookup above. Returns null if the message isn't in the map — callers should
   * fall back to a generic translated message rather than displaying the raw text.
   */
  translateBackendMessage(message: string | null | undefined): string | null {
    if (!message) {
      return null;
    }
    const key = BACKEND_MESSAGE_TRANSLATIONS[message];
    if (key) {
      return this.translate.instant(key);
    }
    const prefixMatch = BACKEND_MESSAGE_PREFIX_TRANSLATIONS.find(p => message.startsWith(p.prefix));
    if (prefixMatch) {
      return this.translate.instant(prefixMatch.key);
    }
    return null;
  }

  /**
   * Main error handling method
   * Processes HTTP errors and returns observable error with user-friendly message
   */
  handleError(error: HttpErrorResponse): Observable<never> {
    const processedError = this.processError(error);

    // Log to console for debugging
    console.error('HTTP Error:', {
      status: processedError.statusCode,
      type: processedError.type,
      message: processedError.message,
      originalError: processedError.originalError
    });

    // Return observable error with processed error
    return throwError(() => processedError);
  }

  /**
   * Process HTTP error response into user-friendly format
   */
  processError(error: HttpErrorResponse): ProcessedError {
    // Network/Connection Error
    if (error.error instanceof ErrorEvent) {
      return {
        message: this.translate.instant('errors.networkError'),
        statusCode: 0,
        type: ErrorType.NETWORK_ERROR,
        originalError: error
      };
    }

    // HTTP Error Response
    const statusCode = error.status;
    const backendError = error.error as BackendErrorResponse;

    switch (statusCode) {
      case 400: // Bad Request / Validation Error
        return this.handleValidationError(backendError, error);

      case 401: // Unauthorized — prefer a specific translated message (e.g. bad login
                // credentials) over the generic one, when the backend text is known
        return {
          message: this.extractErrorMessage(backendError) ||
                   this.translate.instant('errors.unauthorized'),
          statusCode,
          type: ErrorType.UNAUTHORIZED,
          originalError: error
        };

      case 403: // Forbidden
        return {
          message: this.translate.instant('errors.forbidden'),
          statusCode,
          type: ErrorType.FORBIDDEN,
          originalError: error
        };

      case 404: // Not Found
        return {
          message: this.extractErrorMessage(backendError) ||
                   this.translate.instant('errors.notFound'),
          statusCode,
          type: ErrorType.NOT_FOUND,
          originalError: error
        };

      case 500: // Internal Server Error
      case 502: // Bad Gateway
      case 503: // Service Unavailable
      case 504: // Gateway Timeout
        return {
          message: this.translate.instant('errors.serverError'),
          statusCode,
          type: ErrorType.SERVER_ERROR,
          originalError: error
        };

      default:
        return {
          message: this.extractErrorMessage(backendError) ||
                   this.translate.instant('errors.unknownError'),
          statusCode,
          type: ErrorType.UNKNOWN,
          originalError: error
        };
    }
  }

  /**
   * Handle validation errors (400 Bad Request)
   */
  private handleValidationError(
    backendError: BackendErrorResponse,
    httpError: HttpErrorResponse
  ): ProcessedError {
    const fieldErrors = backendError?.fieldErrors;

    // If we have field-specific errors, use them
    if (fieldErrors && Object.keys(fieldErrors).length > 0) {
      const firstFieldError = Object.values(fieldErrors)[0] as string;
      return {
        message: this.translateBackendMessage(firstFieldError) || this.translate.instant('errors.validationError'),
        statusCode: 400,
        type: ErrorType.VALIDATION,
        fieldErrors,
        originalError: httpError
      };
    }

    // Otherwise, use general error message
    return {
      message: this.extractErrorMessage(backendError) ||
               this.translate.instant('errors.validationError'),
      statusCode: 400,
      type: ErrorType.VALIDATION,
      originalError: httpError
    };
  }

  /**
   * Extract user-friendly error message from backend response
   */
  private extractErrorMessage(backendError: BackendErrorResponse | any): string | null {
    if (!backendError) {
      return null;
    }

    // Try different message fields (backend might use different structures)
    const rawMessage = backendError.message || backendError.error || backendError.title || null;
    return this.translateBackendMessage(rawMessage);
  }

  /**
   * Get user-friendly error message for display
   * Use this method in components to show errors to users
   */
  getUserMessage(error: any): string {
    // Check if it's already a ProcessedError (has type property)
    if (error?.type && error?.message && error?.statusCode !== undefined) {
      return error.message;
    }

    if (error instanceof HttpErrorResponse) {
      return this.processError(error).message;
    }

    // Fallback to error.message if it exists — translated where known, generic otherwise
    // (never the raw backend string, which would leak untranslated English)
    if (error?.message) {
      return this.translateBackendMessage(error.message) || this.translate.instant('errors.unknownError');
    }

    return this.translate.instant('errors.unknownError');
  }

  /**
   * Check if error is a validation error with field-specific messages
   */
  hasFieldErrors(error: any): boolean {
    return error?.fieldErrors && Object.keys(error.fieldErrors).length > 0;
  }

  /**
   * Get field errors from processed error
   */
  getFieldErrors(error: any): { [key: string]: string } | null {
    return error?.fieldErrors || null;
  }

  /**
   * Show error in console (development mode)
   */
  logError(context: string, error: any): void {
    console.error(`[${context}]`, error);
  }
}
