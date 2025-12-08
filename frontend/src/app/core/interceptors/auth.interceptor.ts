import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { Router } from '@angular/router';

/**
 * HTTP Interceptor to add JWT tokens to outgoing requests and handle auth errors
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Get the auth token from the service
  const authToken = authService.getToken();

  // Clone the request and add the authorization header if token exists
  let authReq = req;
  if (authToken && !req.url.includes('/auth/')) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${authToken}`)
    });
  }

  // Handle the request and catch auth errors
  return next(authReq).pipe(
    catchError(error => {
      // Handle 401 Unauthorized errors
      if (error.status === 401 && authService.isAuthenticated()) {
        // Token is likely expired, logout user
        authService.logout();
        router.navigate(['/auth'], {
          queryParams: { message: 'Session expired. Please login again.' }
        });
      }

      // Handle 403 Forbidden errors
      if (error.status === 403) {
        router.navigate(['/dashboard'], {
          queryParams: { message: 'Access denied. You do not have permission for this action.' }
        });
      }

      return throwError(() => error);
    })
  );
};