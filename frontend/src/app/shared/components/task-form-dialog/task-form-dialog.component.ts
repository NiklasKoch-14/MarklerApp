import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TaskService } from '../../../core/services/task.service';
import { TaskSummary } from '../../models/task.model';

/**
 * Schnellerfassung einer Aufgabe (Issue #33). Der Bezug auf Kunde oder Objekt kommt
 * von der aufrufenden Detailseite und ist im Dialog nicht mehr waehlbar — wer auf der
 * Kundenseite steht, meint diesen Kunden.
 *
 * <p>Struktur und Verhalten folgen dem ConfirmDialog, das Styling ausdruecklich nicht:
 * dessen Inline-Styles sind Ziel von #45.</p>
 */
@Component({
  selector: 'app-task-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div *ngIf="open" class="fixed inset-0 z-[2000] flex items-center justify-center p-5"
         (click)="cancelled.emit()">
      <div class="absolute inset-0 bg-overlay"></div>
      <div class="surface-card relative w-full max-w-md p-6 shadow-card" (click)="$event.stopPropagation()">

        <h3 class="text-16 font-bold text-body mb-4">
          {{ (task ? 'common.edit' : 'tasks.add') | translate }}
        </h3>

        <label class="section-label" for="task-title">{{ 'tasks.title' | translate }}</label>
        <input id="task-title" class="form-input mb-4" type="text" [(ngModel)]="title" maxlength="200"
               [placeholder]="'tasks.title' | translate">

        <label class="section-label" for="task-note">{{ 'tasks.description' | translate }}</label>
        <textarea id="task-note" class="form-input mb-4 resize-none" rows="3" maxlength="2000"
                  [(ngModel)]="description"></textarea>

        <label class="section-label" for="task-due">{{ 'tasks.dueDate' | translate }}</label>
        <input id="task-due" class="form-input mb-1" type="date" [(ngModel)]="dueDate">

        <p *ngIf="error" class="text-12 text-error mt-2">{{ error | translate }}</p>

        <div class="form-actions form-actions--centered mt-6">
          <button class="btn-primary" (click)="save()" [disabled]="!title.trim() || !dueDate || saving">
            <i class="ri-check-line"></i>
            {{ 'common.save' | translate }}
          </button>
          <button class="btn-secondary" (click)="cancelled.emit()">
            <i class="ri-close-line"></i>
            {{ 'common.cancel' | translate }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class TaskFormDialogComponent implements OnChanges {
  @Input() open = false;
  @Input() clientId?: string;
  @Input() propertyId?: string;
  /** Gesetzt bearbeitet der Dialog eine bestehende Aufgabe statt eine neue anzulegen. */
  @Input() task?: TaskSummary;

  @Output() saved = new EventEmitter<TaskSummary>();
  @Output() cancelled = new EventEmitter<void>();

  title = '';
  description = '';
  dueDate = '';
  saving = false;
  error: string | null = null;

  constructor(private taskService: TaskService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open'] && this.open) {
      this.title = this.task?.title ?? '';
      this.description = this.task?.description ?? '';
      this.dueDate = this.task?.dueDate ?? new Date().toISOString().slice(0, 10);
      this.error = null;
    }
  }

  save(): void {
    if (this.saving || !this.title.trim() || !this.dueDate) return;
    this.saving = true;
    this.error = null;

    const body = {
      title: this.title.trim(),
      description: this.description.trim() || undefined,
      dueDate: this.dueDate,
      clientId: this.clientId,
      propertyId: this.propertyId,
    };

    const request$ = this.task
      ? this.taskService.update(this.task.id, body)
      : this.taskService.create(body);

    request$.subscribe({
      next: result => {
        this.saving = false;
        this.saved.emit(result);
      },
      error: () => {
        this.saving = false;
        this.error = 'common.error';
      }
    });
  }
}
