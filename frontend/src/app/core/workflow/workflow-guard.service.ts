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

  /**
   * Oeffnet den Dialog und liefert true, sobald der Makler bestaetigt.
   *
   * Eine bereits offene, noch unbeantwortete Anfrage wird hier verdraengt (der Dialog
   * kann immer nur einen Verstoss-Satz zeigen). Sie muss trotzdem terminieren: ein
   * bloßes complete() ohne vorherigen next() laesst switchMap() in der Pipeline des
   * Interceptors ohne Wert oder Fehler durchlaufen -- der urspruengliche Aufrufer haengt
   * dann fuer immer in seinem subscribe(), ohne Ergebnis und ohne Fehlermeldung. Die
   * verdraengte Anfrage wird deshalb explizit als abgelehnt aufgeloest, bevor die naechste
   * das Feld uebernimmt; ihr Request wirft dadurch ganz normal den urspruenglichen
   * 409-Fehler weiter.
   */
  ask(violations: WorkflowViolation[]): Observable<boolean> {
    this.pendingDecision?.next(false);
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
