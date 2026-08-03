import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { WorkflowGuardService } from '../../../core/workflow/workflow-guard.service';
import { WorkflowViolation } from '../../../core/workflow/workflow-violation.model';

/**
 * Zeigt quittierbare Regelverstoesse samt Kaskadenvorschau. Wird einmal in AppComponent
 * eingehaengt und vom WorkflowGuardService gesteuert — kein Feature-Component bindet ihn ein.
 */
@Component({
  selector: 'app-workflow-warning-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div *ngIf="violations" class="fixed inset-0 z-[850] flex items-center justify-center p-5"
         (click)="decide(false)">
      <div class="absolute inset-0 bg-overlay"></div>
      <div class="surface-card relative w-full max-w-lg p-6 shadow-2xl" (click)="$event.stopPropagation()">

        <div class="flex items-start gap-3.5">
          <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-warning-soft">
            <i class="ri-error-warning-line text-20 text-warning"></i>
          </div>
          <div class="flex-1">
            <h3 class="text-16 font-bold text-body mb-1.5">{{ 'workflow.dialog.title' | translate }}</h3>
            <p class="text-13 text-body-2">{{ 'workflow.dialog.intro' | translate }}</p>
          </div>
        </div>

        <div class="mt-5 flex flex-col gap-4">
          <div *ngFor="let v of violations" class="flex flex-col gap-2">
            <p class="text-13 font-semibold text-body">{{ v.messageKey | translate: v.params }}</p>

            <div *ngIf="v.affected.length" class="flex flex-col gap-1.5">
              <div *ngFor="let a of v.affected" class="violation-row">
                <i class="ri-calendar-line text-13 text-body-3"></i>
                <span class="text-12 text-body-2">{{ a.label }}</span>
              </div>
            </div>

            <p *ngIf="v.cascade" class="text-12 text-body-3">
              {{ v.cascade.messageKey | translate: { count: v.cascade.ids.length } }}
            </p>
          </div>
        </div>

        <div class="form-actions form-actions--centered mt-6">
          <button class="btn-primary" (click)="decide(true)">
            <i class="ri-check-line"></i>
            {{ 'workflow.dialog.proceed' | translate }}
          </button>
          <button class="btn-secondary" (click)="decide(false)">
            <i class="ri-close-line"></i>
            {{ 'common.cancel' | translate }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class WorkflowWarningDialogComponent implements OnInit, OnDestroy {
  violations: WorkflowViolation[] | null = null;
  private subscription?: Subscription;

  constructor(private readonly guard: WorkflowGuardService) {}

  ngOnInit(): void {
    this.subscription = this.guard.violations$.subscribe(v => (this.violations = v));
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  decide(accepted: boolean): void {
    this.guard.resolve(accepted);
  }
}
