import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TaskSummary } from '../../models/task.model';

/**
 * Aufgabenliste eines Kunden oder Objekts (Issue #33). Offene stehen oben, erledigte
 * darunter ausgegraut — die Reihenfolge kommt bereits so vom Server, die Komponente
 * sortiert nicht nach.
 *
 * <p>Die Komponente entscheidet nichts selbst: sie meldet die Absicht nach oben und
 * die Detailseite laedt neu. So bleibt eine Quelle der Wahrheit.</p>
 */
@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div *ngIf="tasks.length === 0" class="text-13 text-body-3 py-3">
      {{ 'tasks.empty' | translate }}
    </div>

    <div *ngFor="let t of tasks"
         class="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0"
         [class.opacity-60]="t.status === 'DONE'">
      <i class="text-16"
         [class.ri-checkbox-circle-fill]="t.status === 'DONE'"
         [class.text-success]="t.status === 'DONE'"
         [class.ri-checkbox-blank-circle-line]="t.status === 'OPEN'"
         [class.text-body-3]="t.status === 'OPEN'"></i>

      <div class="flex-1 min-w-0">
        <div class="text-13 font-semibold text-body truncate" [class.line-through]="t.status === 'DONE'">
          {{ t.title }}
        </div>
        <div *ngIf="t.description" class="text-12 text-body-2 truncate">{{ t.description }}</div>
      </div>

      <div class="text-12 tabular-nums shrink-0"
           [class.text-error]="t.status === 'OPEN' && isOverdue(t)"
           [class.text-body-3]="!(t.status === 'OPEN' && isOverdue(t))">
        {{ t.dueDate | date:'dd. MMM' }}
      </div>

      <div *ngIf="t.status === 'OPEN'" class="flex gap-1 shrink-0">
        <button class="btn-icon" (click)="completed.emit(t)" [title]="'tasks.complete' | translate">
          <i class="ri-check-line"></i>
        </button>
        <!-- Schnellweg eine Woche nach hinten; jedes andere Datum laeuft ueber Bearbeiten,
             das denselben Datumswaehler zeigt. -->
        <button class="btn-icon" (click)="postponed.emit(t)" [title]="'tasks.postponeNextWeek' | translate">
          <i class="ri-time-line"></i>
        </button>
        <button class="btn-icon" (click)="edited.emit(t)" [title]="'common.edit' | translate">
          <i class="ri-pencil-line"></i>
        </button>
      </div>
    </div>
  `
})
export class TaskListComponent {
  @Input() tasks: TaskSummary[] = [];

  @Output() completed = new EventEmitter<TaskSummary>();
  @Output() postponed = new EventEmitter<TaskSummary>();
  @Output() edited = new EventEmitter<TaskSummary>();

  isOverdue(task: TaskSummary): boolean {
    return task.dueDate < new Date().toISOString().slice(0, 10);
  }
}
