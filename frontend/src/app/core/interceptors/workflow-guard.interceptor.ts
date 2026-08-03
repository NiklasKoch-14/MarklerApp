import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { WorkflowGuardService } from '../workflow/workflow-guard.service';
import { WorkflowWarningPayload } from '../workflow/workflow-violation.model';

/**
 * Faengt quittierbare Regelverstoesse (409) ab, zeigt den Dialog und wiederholt denselben
 * Request mit gesetztem acknowledgedRules. Dadurch braucht kein Feature-Component eigene
 * Logik — jeder heutige und kuenftige Aufruf ist automatisch abgesichert.
 */
export const workflowGuardInterceptor: HttpInterceptorFn = (req, next) => {
  const guard = inject(WorkflowGuardService);

  return next(req).pipe(
    catchError(error => {
      const payload = error instanceof HttpErrorResponse ? (error.error as WorkflowWarningPayload) : null;

      if (error.status !== 409 || payload?.type !== 'WORKFLOW_WARNING') {
        return throwError(() => error);
      }

      return guard.ask(payload.violations).pipe(
        switchMap(accepted => {
          if (!accepted) {
            return throwError(() => error);
          }

          // req.body ist unknown — der Cast ist noetig, weil der Interceptor bewusst
          // jeden Request bedient und die konkrete DTO-Form nicht kennt.
          const body = (req.body ?? {}) as Record<string, unknown>;
          const alreadyAcknowledged = (body['acknowledgedRules'] as string[]) ?? [];
          const acknowledgedRules = [
            ...new Set([...alreadyAcknowledged, ...payload.violations.map(v => v.code)])
          ];

          return next(req.clone({ body: { ...body, acknowledgedRules } }));
        })
      );
    })
  );
};
