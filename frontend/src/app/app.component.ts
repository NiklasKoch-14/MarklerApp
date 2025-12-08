import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from './core/auth/auth.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, TranslateModule],
  template: `
    <div class="min-h-screen bg-gray-50">
      <router-outlet></router-outlet>
    </div>
  `
})
export class AppComponent implements OnInit {
  title = 'Real Estate CRM';

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private translate: TranslateService
  ) {}

  ngOnInit() {
    // Initialize authentication state on app start
    this.authService.initializeAuth();

    // Initialize theme service (this will apply the stored theme)
    this.themeService.getCurrentTheme(); // This triggers theme initialization

    // Initialize language
    this.initializeLanguage();
  }

  private initializeLanguage(): void {
    // Set default language
    this.translate.setDefaultLang('en');

    // Get stored language preference or detect browser language
    const storedLanguage = localStorage.getItem('app-language');
    const browserLanguage = this.translate.getBrowserLang();

    let languageToUse = 'en'; // Default fallback

    if (storedLanguage && (storedLanguage === 'en' || storedLanguage === 'de')) {
      languageToUse = storedLanguage;
    } else if (browserLanguage === 'de') {
      languageToUse = 'de';
    }

    this.translate.use(languageToUse);
  }
}