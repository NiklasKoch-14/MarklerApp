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
@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  constructor(private translate: TranslateService) {}

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

      case 401: // Unauthorized
        return {
          message: this.translate.instant('errors.unauthorized'),
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
      const firstFieldError = Object.values(fieldErrors)[0];
      return {
        message: firstFieldError || this.translate.instant('errors.validationError'),
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
    return backendError.message ||
           backendError.error ||
           backendError.title ||
           null;
  }

  /**
   * Get user-friendly error message for display
   * Use this method in components to show errors to users
   */
  getUserMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }

    if (error instanceof ProcessedError) {
      return error.message;
    }

    if (error instanceof HttpErrorResponse) {
      return this.processError(error).message;
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
