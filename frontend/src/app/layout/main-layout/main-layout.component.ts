import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ThemeToggleComponent, LanguageSwitcherComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Navigation -->
      <nav class="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex">
              <div class="flex-shrink-0 flex items-center">
                <h1 class="text-xl font-bold text-primary-600 dark:text-primary-400">Real Estate CRM</h1>
              </div>
              <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
                <a routerLink="/dashboard"
                   routerLinkActive="border-primary-500 text-gray-900 dark:text-gray-100"
                   [routerLinkActiveOptions]="{exact: true}"
                   class="border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Dashboard
                </a>
                <a routerLink="/clients"
                   routerLinkActive="border-primary-500 text-gray-900 dark:text-gray-100"
                   class="border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Clients
                </a>
                <a routerLink="/properties"
                   routerLinkActive="border-primary-500 text-gray-900 dark:text-gray-100"
                   class="border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Properties
                </a>
                <a routerLink="/call-notes"
                   routerLinkActive="border-primary-500 text-gray-900 dark:text-gray-100"
                   class="border-transparent text-gray-500 dark:text-gray-300 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-200 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                  Call Notes
                </a>
              </div>
            </div>
            <div class="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
              <!-- Theme Toggle -->
              <app-theme-toggle></app-theme-toggle>

              <!-- Language Switcher -->
              <app-language-switcher></app-language-switcher>

              <!-- Logout -->
              <div class="ml-3 relative">
                <button (click)="logout()"
                        class="bg-white dark:bg-gray-800 rounded-md p-2 text-gray-400 dark:text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <!-- Main content -->
      <main>
        <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `
})
export class MainLayoutComponent {

  constructor(private authService: AuthService) {}

  logout(): void {
    this.authService.logout();
  }
}