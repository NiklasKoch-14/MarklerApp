import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatchBreakdownComponent } from './match-breakdown.component';
import { MatchReason, MatchScoreBreakdown, MatchWeights } from '../../models/property-match.model';

let popoverSeq = 0;

/**
 * The match percentage as a badge that reveals its full breakdown in a popover.
 *
 * Opens on hover, on keyboard focus, and on click — hover alone would leave the
 * explanation unreachable on touch devices and for keyboard users. A click pins the
 * popover open so its text can be read and selected without keeping the pointer still.
 *
 * Positioned `fixed` from the trigger's viewport rect rather than absolutely: every
 * ancestor card clips with `overflow:hidden`, which would cut an absolutely positioned
 * panel off at the card edge.
 */
@Component({
  selector: 'app-match-score-popover',
  standalone: true,
  imports: [CommonModule, TranslateModule, MatchBreakdownComponent],
  template: `
    <button #trigger type="button"
            (mouseenter)="onTriggerEnter()"
            (mouseleave)="scheduleClose()"
            (focus)="onTriggerEnter()"
            (blur)="scheduleClose()"
            (click)="togglePinned()"
            [attr.aria-expanded]="isOpen"
            [attr.aria-describedby]="isOpen ? popoverId : null"
            [attr.aria-label]="('properties.matching.scoreBreakdown' | translate) + ': ' + matchScore + '%'"
            [style.background]="badgeBackground()"
            [style.color]="badgeColor()"
            style="font-size:12px;font-weight:800;padding:5px 9px;border-radius:8px;border:none;min-width:40px;text-align:center;cursor:pointer;font-family:inherit;line-height:1.4;">
      {{ matchScore }}%
    </button>

    @if (isOpen) {
      <div #popover
           [id]="popoverId"
           role="tooltip"
           (mouseenter)="cancelClose()"
           (mouseleave)="scheduleClose()"
           [style.top.px]="top"
           [style.left.px]="left"
           style="position:fixed;z-index:900;width:380px;max-width:calc(100vw - 24px);max-height:min(70vh,560px);overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:0 16px 40px rgba(0,0,0,.18);padding:14px 16px;">
        <app-match-breakdown [breakdown]="breakdown"
                             [weights]="weights"
                             [matchReasons]="matchReasons"
                             [mismatchReasons]="mismatchReasons"
                             [matchScore]="matchScore"></app-match-breakdown>
      </div>
    }
  `
})
export class MatchScorePopoverComponent implements OnDestroy {

  @Input() matchScore = 0;
  @Input() breakdown?: MatchScoreBreakdown;
  @Input() weights?: MatchWeights;
  @Input() matchReasons: MatchReason[] = [];
  @Input() mismatchReasons: MatchReason[] = [];

  @ViewChild('trigger') private triggerRef?: ElementRef<HTMLElement>;
  @ViewChild('popover') private popoverRef?: ElementRef<HTMLElement>;

  readonly popoverId = `match-breakdown-${popoverSeq++}`;

  isOpen = false;
  top = 0;
  left = 0;

  private pinned = false;
  private closeTimer?: ReturnType<typeof setTimeout>;
  private readonly reposition = () => this.position();

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  ngOnDestroy(): void {
    this.detachViewportListeners();
    this.cancelClose();
  }

  onTriggerEnter(): void {
    this.cancelClose();
    this.open();
  }

  togglePinned(): void {
    if (this.pinned) {
      this.pinned = false;
      this.close();
      return;
    }
    this.pinned = true;
    this.open();
  }

  /**
   * Closing is delayed so the pointer can travel the gap between badge and popover
   * without the panel vanishing underneath it.
   */
  scheduleClose(): void {
    if (this.pinned) {
      return;
    }
    this.cancelClose();
    this.closeTimer = setTimeout(() => this.close(), 180);
  }

  cancelClose(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = undefined;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.pinned = false;
      this.close();
      this.triggerRef?.nativeElement.focus();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen || !this.pinned) {
      return;
    }
    const target = event.target as Node;
    const insideTrigger = this.host.nativeElement.contains(target);
    const insidePopover = !!this.popoverRef?.nativeElement.contains(target);
    if (!insideTrigger && !insidePopover) {
      this.pinned = false;
      this.close();
    }
  }

  badgeBackground(): string {
    if (this.matchScore >= 75) {
      return 'var(--accent-soft)';
    }
    return this.matchScore >= 50 ? 'var(--color-warning-soft)' : 'var(--surface-2)';
  }

  badgeColor(): string {
    if (this.matchScore >= 75) {
      return 'var(--primary)';
    }
    return this.matchScore >= 50 ? 'var(--color-warning)' : 'var(--text-3)';
  }

  private open(): void {
    if (this.isOpen) {
      this.position();
      return;
    }
    this.isOpen = true;
    this.position();
    // The panel's real height is only known once rendered — place it, then correct it
    setTimeout(() => this.position());
    this.attachViewportListeners();
  }

  private close(): void {
    this.isOpen = false;
    this.detachViewportListeners();
  }

  private position(): void {
    const trigger = this.triggerRef?.nativeElement;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const panel = this.popoverRef?.nativeElement;
    const width = panel?.offsetWidth ?? Math.min(380, window.innerWidth - 24);
    const height = panel?.offsetHeight ?? 320;
    const margin = 12;

    this.left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));

    const below = rect.bottom + 8;
    if (below + height <= window.innerHeight - margin) {
      this.top = below;
      return;
    }

    const above = rect.top - 8 - height;
    this.top = above >= margin ? above : Math.max(margin, window.innerHeight - height - margin);
  }

  private attachViewportListeners(): void {
    // Capture phase: the badge sits inside scrollable cards, and those scroll events
    // do not bubble to window.
    document.addEventListener('scroll', this.reposition, true);
    window.addEventListener('resize', this.reposition);
  }

  private detachViewportListeners(): void {
    document.removeEventListener('scroll', this.reposition, true);
    window.removeEventListener('resize', this.reposition);
  }
}
