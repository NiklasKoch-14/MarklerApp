import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ThemeService, Theme } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      (click)="toggleTheme()"
      class="p-2 rounded-md text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
      [attr.aria-label]="currentTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'"
      title="{{ currentTheme === 'light' ? 'Switch to dark mode' : 'Switch to light mode' }}">

      <!-- Sun icon (light mode) -->
      <svg *ngIf="currentTheme === 'light'"
           class="h-5 w-5"
           fill="none"
           viewBox="0 0 24 24"
           stroke="currentColor"
           stroke-width="2">
        <path stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>

      <!-- Moon icon (dark mode) -->
      <svg *ngIf="currentTheme === 'dark'"
           class="h-5 w-5"
           fill="none"
           viewBox="0 0 24 24"
           stroke="currentColor"
           stroke-width="2">
        <path stroke-linecap="round"
              stroke-linejoin="round"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    </button>
  `
})
export class ThemeToggleComponent implements OnInit, OnDestroy {
  currentTheme: Theme = 'light';
  private destroy$ = new Subject<void>();

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.currentTheme = theme;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}