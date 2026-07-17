import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from './core/auth/auth.service';
import { ThemeService } from './core/services/theme.service';
import { environment } from '../environments/environment';

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
    const supported = ['de', 'en'];

    this.translate.setDefaultLang(environment.defaultLanguage);

    // Explicit choice wins over the browser; an unsupported browser locale falls
    // back to the app default rather than to English.
    const storedLanguage = localStorage.getItem('app-language');
    const browserLanguage = this.translate.getBrowserLang();

    let languageToUse: string = environment.defaultLanguage;

    if (storedLanguage && supported.includes(storedLanguage)) {
      languageToUse = storedLanguage;
    } else if (browserLanguage && supported.includes(browserLanguage)) {
      languageToUse = browserLanguage;
    }

    this.translate.use(languageToUse);
  }
}