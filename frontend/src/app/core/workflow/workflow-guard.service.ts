import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { WorkflowViolation } from './workflow-violation.model';

/**
 * Vermittelt zwischen Interceptor und Dialog: der Interceptor kennt keine Komponente,
 * der Dialog kennt keinen HTTP-Request.
 */
@Injectable({ providedIn: 'root' })
export class WorkflowGuardService {
  private readonly violationsSubject = new Subject<WorkflowViolation[] | null>();
  readonly violations$ = this.violationsSubject.asObservable();

  private pendingDecision?: Subject<boolean>;

  /** Oeffnet den Dialog und liefert true, sobald der Makler bestaetigt. */
  ask(violations: WorkflowViolation[]): Observable<boolean> {
    this.pendingDecision?.complete();
    this.pendingDecision = new Subject<boolean>();
    this.violationsSubject.next(violations);
    return this.pendingDecision.asObservable();
  }

  resolve(accepted: boolean): void {
    this.violationsSubject.next(null);
    this.pendingDecision?.next(accepted);
    this.pendingDecision?.complete();
    this.pendingDecision = undefined;
  }
}
