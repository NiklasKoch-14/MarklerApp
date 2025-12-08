import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export type Language = 'en' | 'de';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="relative inline-block text-left">
      <button
        (click)="toggleDropdown()"
        class="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        [attr.aria-label]="'language.switch' | translate">

        <!-- Current language flag/icon -->
        <span class="mr-2 text-base">
          {{ currentLanguage === 'en' ? '🇺🇸' : '🇩🇪' }}
        </span>

        {{ currentLanguage === 'en' ? 'EN' : 'DE' }}

        <!-- Dropdown arrow -->
        <svg class="ml-2 -mr-0.5 h-4 w-4"
             fill="none"
             stroke="currentColor"
             viewBox="0 0 24 24">
          <path stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Dropdown menu -->
      <div *ngIf="isDropdownOpen"
           class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
        <div class="py-1">
          <button
            (click)="switchLanguage('en')"
            [class.bg-gray-100]="currentLanguage === 'en'"
            [class.dark:bg-gray-700]="currentLanguage === 'en'"
            class="group flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
            <span class="mr-3 text-base">🇺🇸</span>
            {{ 'language.english' | translate }}
            <svg *ngIf="currentLanguage === 'en'"
                 class="ml-auto h-4 w-4 text-primary-600"
                 fill="currentColor"
                 viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd" />
            </svg>
          </button>

          <button
            (click)="switchLanguage('de')"
            [class.bg-gray-100]="currentLanguage === 'de'"
            [class.dark:bg-gray-700]="currentLanguage === 'de'"
            class="group flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
            <span class="mr-3 text-base">🇩🇪</span>
            {{ 'language.german' | translate }}
            <svg *ngIf="currentLanguage === 'de'"
                 class="ml-auto h-4 w-4 text-primary-600"
                 fill="currentColor"
                 viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Backdrop to close dropdown when clicking outside -->
    <div *ngIf="isDropdownOpen"
         (click)="closeDropdown()"
         class="fixed inset-0 z-40">
    </div>
  `
})
export class LanguageSwitcherComponent implements OnInit, OnDestroy {
  currentLanguage: Language = 'en';
  isDropdownOpen = false;
  private destroy$ = new Subject<void>();

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    // Get current language
    this.currentLanguage = this.translate.currentLang as Language || 'en';

    // Listen to language changes
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.currentLanguage = event.lang as Language;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  switchLanguage(language: Language): void {
    this.translate.use(language);
    // Store language preference
    localStorage.setItem('app-language', language);
    this.closeDropdown();
  }
}