import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { of } from 'rxjs';
import { TranslateEnumPipe } from '../../pipes/translate-enum.pipe';
import {
  EMPTY_SEARCH_RESULTS,
  GlobalSearchService,
  MIN_SEARCH_TERM_LENGTH,
  SearchHit,
  SearchHitType,
  SearchResults
} from '../../services/global-search.service';

interface HitGroup {
  type: SearchHitType;
  hits: SearchHit[];
}

/**
 * Command palette (Strg/Cmd + K) — the one cross-cutting entry point into clients,
 * properties and call notes.
 *
 * Accessibility is load-bearing here, not decoration: the input is the combobox, the
 * result list the listbox, and the active option is communicated via aria-activedescendant
 * so focus never leaves the text field while arrowing through hits. The dialog traps Tab,
 * Escape closes, and focus returns to whatever opened it.
 */
@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, TranslateEnumPipe],
  template: `
    <div class="cp-overlay" *ngIf="open" (click)="close()">
      <div class="cp-dialog"
           #dialog
           role="dialog"
           aria-modal="true"
           [attr.aria-label]="'globalSearch.title' | translate"
           (click)="$event.stopPropagation()"
           (keydown)="onDialogKeydown($event)">

        <div class="cp-field">
          <i class="ri-search-line cp-field-icon" aria-hidden="true"></i>
          <input #searchInput
                 type="text"
                 class="cp-input"
                 role="combobox"
                 aria-controls="cp-listbox"
                 aria-autocomplete="list"
                 autocomplete="off"
                 spellcheck="false"
                 [attr.aria-expanded]="flatHits.length > 0"
                 [attr.aria-activedescendant]="activeOptionId"
                 [attr.aria-label]="'globalSearch.inputLabel' | translate"
                 [placeholder]="'globalSearch.placeholder' | translate"
                 [ngModel]="term"
                 (ngModelChange)="onTermChange($event)"
                 (keydown)="onInputKeydown($event)">
          <button type="button"
                  class="cp-close"
                  (click)="close()"
                  [attr.aria-label]="'common.close' | translate">
            <i class="ri-close-line" aria-hidden="true"></i>
          </button>
        </div>

        <div class="cp-body">
          <div class="cp-hint" *ngIf="term.trim().length < minLength && !loading">
            {{ 'globalSearch.minLength' | translate:{ count: minLength } }}
          </div>

          <div class="cp-hint" *ngIf="loading">
            {{ 'globalSearch.searching' | translate }}
          </div>

          <div class="cp-hint cp-hint--error" *ngIf="failed && !loading">
            <i class="ri-error-warning-line" aria-hidden="true"></i>
            {{ 'globalSearch.failed' | translate }}
          </div>

          <div class="cp-hint"
               *ngIf="!loading && !failed && term.trim().length >= minLength && flatHits.length === 0">
            {{ 'globalSearch.noResults' | translate:{ term: term.trim() } }}
          </div>

          <div id="cp-listbox"
               role="listbox"
               [attr.aria-label]="'globalSearch.resultsLabel' | translate"
               class="cp-list">
            <ng-container *ngFor="let group of groups">
              <div *ngIf="group.hits.length"
                   role="group"
                   [attr.aria-label]="group.type | translateEnum:'searchResultType'">
                <div class="cp-group" aria-hidden="true">
                  {{ group.type | translateEnum:'searchResultType' }}
                </div>
                <div *ngFor="let hit of group.hits"
                     class="cp-option"
                     [class.cp-option--active]="hit === activeHit"
                     [id]="optionId(hit)"
                     role="option"
                     [attr.aria-selected]="hit === activeHit"
                     (click)="goTo(hit)"
                     (mouseenter)="activeHit = hit">
                  <i [class]="iconFor(hit.type)" class="cp-option-icon" aria-hidden="true"></i>
                  <span class="cp-option-text">
                    <span class="cp-option-title">{{ hit.title }}</span>
                    <span class="cp-option-sub" *ngIf="hit.subtitle">{{ hit.subtitle }}</span>
                    <span class="cp-option-snippet" *ngIf="hit.snippet">{{ hit.snippet }}</span>
                  </span>
                  <span class="cp-option-date" *ngIf="hit.date">{{ hit.date | date:'dd.MM.yy' }}</span>
                </div>
              </div>
            </ng-container>
          </div>
        </div>

        <div class="cp-footer">
          <!-- Live-Region: meldet die Trefferzahl, sobald der Term lang genug ist. Der
               Span bleibt dauerhaft im DOM, sonst kuendigt der Screenreader nichts an. -->
          <span role="status" aria-live="polite" class="cp-count">
            <ng-container *ngIf="term.trim().length >= minLength && !loading">
              {{ 'globalSearch.resultCount' | translate:{ count: flatHits.length } }}
            </ng-container>
          </span>
          <span class="cp-keys" aria-hidden="true">
            <kbd>↑</kbd><kbd>↓</kbd> {{ 'globalSearch.keyNavigate' | translate }}
            <kbd>↵</kbd> {{ 'globalSearch.keyOpen' | translate }}
            <kbd>Esc</kbd> {{ 'globalSearch.keyClose' | translate }}
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cp-overlay { position:fixed; inset:0; z-index:900; display:flex; align-items:flex-start; justify-content:center; padding:12vh 16px 16px; background:rgba(0,0,0,.45); }
    .cp-dialog { width:100%; max-width:620px; max-height:72vh; display:flex; flex-direction:column; overflow:hidden; background:var(--surface); border:1.5px solid var(--border); border-radius:16px; box-shadow:0 24px 64px rgba(0,0,0,.28); }
    .cp-field { display:flex; align-items:center; gap:10px; padding:12px 14px; border-bottom:1.5px solid var(--border); }
    .cp-field-icon { font-size:19px; color:var(--text-3); flex-shrink:0; }
    .cp-input { flex:1; min-width:0; border:none; outline:none; background:transparent; font-size:16px; font-weight:600; color:var(--text); }
    .cp-input::placeholder { color:var(--text-3); font-weight:500; }
    .cp-close { flex-shrink:0; border:none; background:transparent; cursor:pointer; color:var(--text-3); font-size:18px; line-height:1; padding:4px; border-radius:8px; }
    .cp-close:hover { color:var(--text); }
    .cp-body { flex:1; overflow-y:auto; padding:6px; }
    .cp-hint { padding:18px 12px; font-size:13px; color:var(--text-3); text-align:center; }
    .cp-hint--error { color:var(--color-error); }
    .cp-group { padding:10px 10px 4px; font-size:11px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--text-3); }
    .cp-option { display:flex; align-items:flex-start; gap:10px; padding:8px 10px; border-radius:10px; cursor:pointer; }
    .cp-option--active { background:var(--accent-soft); }
    .cp-option-icon { font-size:16px; color:var(--primary); margin-top:2px; flex-shrink:0; }
    .cp-option-text { display:flex; flex-direction:column; gap:2px; min-width:0; flex:1; }
    .cp-option-title { font-size:14px; font-weight:700; color:var(--text); }
    .cp-option-sub { font-size:12px; color:var(--text-2); }
    .cp-option-title, .cp-option-sub { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .cp-option-snippet { font-size:12px; color:var(--text-3); line-height:1.45; }
    .cp-option-date { font-size:11px; color:var(--text-3); flex-shrink:0; margin-top:2px; }
    .cp-footer { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:8px 14px; border-top:1.5px solid var(--border); background:var(--surface-2); font-size:11px; color:var(--text-3); }
    .cp-count { font-weight:700; white-space:nowrap; }
    .cp-keys { display:flex; align-items:center; gap:5px; flex-wrap:wrap; }
    .cp-keys kbd { font:inherit; padding:1px 5px; border-radius:5px; background:var(--surface); border:1px solid var(--border); }
    @media (max-width:640px) { .cp-overlay { padding:6vh 10px 10px; } .cp-keys { display:none; } }
  `]
})
export class CommandPaletteComponent implements OnChanges, AfterViewInit, OnDestroy {

  /** Owned by the layout so the keyboard shortcut and the header button share one state. */
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  @ViewChild('dialog') dialogRef?: ElementRef<HTMLElement>;
  @ViewChild('searchInput') inputRef?: ElementRef<HTMLInputElement>;

  readonly minLength = MIN_SEARCH_TERM_LENGTH;

  term = '';
  loading = false;
  failed = false;
  groups: HitGroup[] = [];
  flatHits: SearchHit[] = [];
  activeHit: SearchHit | null = null;

  private readonly termInput$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();
  private previouslyFocused: HTMLElement | null = null;

  constructor(
    private searchService: GlobalSearchService,
    private router: Router
  ) {
    this.termInput$
      .pipe(
        debounceTime(220),
        distinctUntilChanged(),
        switchMap(term => {
          if (term.trim().length < this.minLength) {
            return of(EMPTY_SEARCH_RESULTS);
          }
          this.loading = true;
          this.failed = false;
          return this.searchService.search(term.trim()).pipe(
            catchError(() => {
              this.failed = true;
              return of(EMPTY_SEARCH_RESULTS);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(results => this.applyResults(results));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open']) {
      return;
    }
    if (this.open) {
      this.previouslyFocused = document.activeElement as HTMLElement | null;
      this.reset();
      // The dialog is created by *ngIf in this same change detection pass.
      setTimeout(() => this.inputRef?.nativeElement.focus());
    } else {
      this.previouslyFocused?.focus();
      this.previouslyFocused = null;
    }
  }

  ngAfterViewInit(): void {
    if (this.open) {
      this.inputRef?.nativeElement.focus();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTermChange(value: string): void {
    this.term = value;
    if (value.trim().length < this.minLength) {
      this.applyResults(EMPTY_SEARCH_RESULTS);
      this.loading = false;
      this.failed = false;
    }
    this.termInput$.next(value);
  }

  onInputKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1);
        break;
      case 'Home':
        if (this.flatHits.length) {
          event.preventDefault();
          this.activeHit = this.flatHits[0];
        }
        break;
      case 'End':
        if (this.flatHits.length) {
          event.preventDefault();
          this.activeHit = this.flatHits[this.flatHits.length - 1];
        }
        break;
      case 'Enter':
        if (this.activeHit) {
          event.preventDefault();
          this.goTo(this.activeHit);
        }
        break;
      default:
        break;
    }
  }

  /**
   * Escape closes; Tab is trapped so the palette cannot be tabbed out of while it covers
   * the page — a screen-reader user would otherwise land in content that is visually gone.
   */
  onDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const focusable = this.focusableElements();
    if (focusable.length === 0) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  goTo(hit: SearchHit): void {
    this.close();
    switch (hit.type) {
      case 'CLIENT':
        this.router.navigate(['/clients', hit.id]);
        break;
      case 'PROPERTY':
        this.router.navigate(['/properties', hit.id]);
        break;
      case 'NOTE':
        if (hit.clientId) {
          this.router.navigate(['/clients', hit.clientId], { queryParams: { note: hit.id } });
        }
        break;
    }
  }

  close(): void {
    this.closed.emit();
  }

  optionId(hit: SearchHit): string {
    return `cp-option-${hit.type.toLowerCase()}-${hit.id}`;
  }

  get activeOptionId(): string | null {
    return this.activeHit ? this.optionId(this.activeHit) : null;
  }

  iconFor(type: SearchHitType): string {
    switch (type) {
      case 'CLIENT': return 'ri-user-line';
      case 'PROPERTY': return 'ri-building-2-line';
      default: return 'ri-chat-3-line';
    }
  }

  private applyResults(results: SearchResults): void {
    this.loading = false;
    this.groups = [
      { type: 'CLIENT', hits: results.clients ?? [] },
      { type: 'PROPERTY', hits: results.properties ?? [] },
      { type: 'NOTE', hits: results.notes ?? [] }
    ];
    this.flatHits = this.groups.flatMap(group => group.hits);
    this.activeHit = this.flatHits[0] ?? null;
    this.scrollActiveIntoView();
  }

  private moveActive(step: number): void {
    if (this.flatHits.length === 0) {
      return;
    }
    const current = this.activeHit ? this.flatHits.indexOf(this.activeHit) : -1;
    const next = (current + step + this.flatHits.length) % this.flatHits.length;
    this.activeHit = this.flatHits[next];
    this.scrollActiveIntoView();
  }

  private scrollActiveIntoView(): void {
    if (!this.activeHit) {
      return;
    }
    const id = this.optionId(this.activeHit);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'nearest' }));
  }

  private focusableElements(): HTMLElement[] {
    const dialog = this.dialogRef?.nativeElement;
    if (!dialog) {
      return [];
    }
    return Array.from(
      dialog.querySelectorAll<HTMLElement>('input, button, [href], select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter(element => !element.hasAttribute('disabled'));
  }

  private reset(): void {
    this.term = '';
    this.loading = false;
    this.failed = false;
    this.groups = [];
    this.flatHits = [];
    this.activeHit = null;
    // Setzt distinctUntilChanged zurueck, sonst bleibt eine wiederholte Suche nach
    // demselben Begriff nach erneutem Oeffnen stumm.
    this.termInput$.next('');
  }
}
