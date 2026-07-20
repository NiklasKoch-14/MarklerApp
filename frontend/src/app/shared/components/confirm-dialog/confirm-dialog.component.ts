import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

/**
 * Shared in-app confirmation dialog — replaces window.confirm()/alert() everywhere so every
 * destructive/state-changing action gets the same look, the same translated copy, and the
 * same interaction cost (Jakob's Law: one action type, one consistent pattern).
 *
 * `danger` picks the visual language: true (default) = destructive/irreversible (red),
 * false = a softer state change like "mark inactive" (amber) — never identical to destructive.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div *ngIf="open"
         style="position:fixed;inset:0;z-index:800;display:flex;align-items:center;justify-content:center;padding:20px;"
         (click)="cancel.emit()">
      <div style="position:absolute;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(3px);"></div>
      <div style="position:relative;width:100%;max-width:420px;background:var(--surface);border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.25);padding:24px;"
           (click)="$event.stopPropagation()">
        <div style="display:flex;align-items:flex-start;gap:14px;">
          <div [style.background]="danger ? 'var(--color-error-soft)' : 'var(--color-warning-soft)'"
               style="flex-shrink:0;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;">
            <i [class]="icon"
               [style.color]="danger ? 'var(--color-error)' : 'var(--color-warning)'"
               style="font-size:20px;"></i>
          </div>
          <div style="flex:1;">
            <h3 style="font-size:16px;font-weight:700;color:var(--text);margin:0 0 6px;">{{ title }}</h3>
            <p style="font-size:13px;color:var(--text-2);margin:0;line-height:1.5;">{{ message }}</p>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:22px;">
          <button (click)="cancel.emit()"
                  style="padding:9px 16px;background:var(--surface-2);color:var(--text-2);border:1px solid var(--border);border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">
            {{ cancelLabel || ('common.cancel' | translate) }}
          </button>
          <button (click)="confirm.emit()" [disabled]="busy"
                  [style.background]="danger ? 'var(--color-error)' : 'var(--color-warning)'"
                  [style.opacity]="busy ? 0.7 : 1"
                  style="padding:9px 16px;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;">
            {{ busy ? (busyLabel || ('common.deleting' | translate)) : (confirmLabel || ('common.delete' | translate)) }}
          </button>
        </div>
      </div>
    </div>
  `
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() danger = true;
  @Input() icon = 'ri-delete-bin-line';
  @Input() title = '';
  @Input() message = '';
  @Input() confirmLabel = '';
  @Input() cancelLabel = '';
  @Input() busyLabel = '';
  @Input() busy = false;
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
