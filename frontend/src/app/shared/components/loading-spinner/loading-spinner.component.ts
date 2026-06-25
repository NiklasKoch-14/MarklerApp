import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
    <div [style.display]="centered ? 'flex' : 'inline-flex'"
         [style.justify-content]="centered ? 'center' : undefined"
         [style.align-items]="centered ? 'center' : undefined"
         [style.padding]="centered ? '12px 0' : '0'">
      <div [style.width.px]="sizePx"
           [style.height.px]="sizePx"
           [style.border-width.px]="borderPx"
           style="border-radius:50%; border-style:solid; border-color:var(--border);
                  border-top-color:var(--primary); animation:app-spin 0.75s linear infinite;
                  flex-shrink:0;">
      </div>
    </div>
  `
})
export class LoadingSpinnerComponent {
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' = 'md';
  @Input() centered = true;

  get sizePx(): number {
    switch (this.size) {
      case 'xs': return 14;
      case 'sm': return 20;
      case 'lg': return 40;
      default:   return 28;
    }
  }

  get borderPx(): number {
    return this.size === 'xs' || this.size === 'sm' ? 2 : 3;
  }
}
