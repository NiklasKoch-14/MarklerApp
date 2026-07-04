import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService, Agent } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="detail-page" style="max-width:640px;">

      <h1 style="font-size:22px;font-weight:800;color:var(--text);margin:0 0 24px;">Einstellungen</h1>

      <!-- Makler-Profil -->
      <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:20px 24px;margin-bottom:16px;">
        <div style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">Makler-Profil</div>
        <div style="font-size:16px;font-weight:700;color:var(--text);">{{ user?.firstName }} {{ user?.lastName }}</div>
        <div style="font-size:13px;color:var(--text-3);margin-top:4px;">{{ user?.email }}</div>
      </div>

      <!-- Darstellung -->
      <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:20px 24px;margin-bottom:16px;">
        <div style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">Darstellung</div>

        <!-- Theme -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--text);">Erscheinungsbild</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:2px;">{{ isDark ? 'Dunkel' : 'Hell' }}</div>
          </div>
          <button (click)="toggleTheme()"
                  style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:20px;border:1.5px solid var(--border);background:var(--surface-2);color:var(--text);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">
            <i [class]="isDark ? 'ph ph-sun' : 'ph ph-moon'" style="font-size:15px;"></i>
            {{ isDark ? 'Hell schalten' : 'Dunkel schalten' }}
          </button>
        </div>

        <!-- Language -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--text);">Sprache</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:2px;">{{ currentLang === 'de' ? 'Deutsch' : 'English' }}</div>
          </div>
          <div style="display:inline-flex;border:1.5px solid var(--border);border-radius:20px;overflow:hidden;">
            <button (click)="setLang('de')"
                    [style.background]="currentLang === 'de' ? 'var(--primary)' : 'var(--surface-2)'"
                    [style.color]="currentLang === 'de' ? '#fff' : 'var(--text-2)'"
                    style="padding:7px 20px;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">DE</button>
            <button (click)="setLang('en')"
                    [style.background]="currentLang === 'en' ? 'var(--primary)' : 'var(--surface-2)'"
                    [style.color]="currentLang === 'en' ? '#fff' : 'var(--text-2)'"
                    style="padding:7px 20px;border:none;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">EN</button>
          </div>
        </div>
      </div>

      <!-- Abmelden -->
      <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:20px 24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--text);">Abmelden</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:2px;">Als {{ user?.firstName }} abmelden</div>
          </div>
          <button (click)="logout()"
                  style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:20px;border:1.5px solid var(--color-error-soft);background:var(--color-error-soft);color:var(--color-error);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;">
            <i class="ph ph-sign-out" style="font-size:15px;"></i>
            Abmelden
          </button>
        </div>
      </div>

    </div>
  `
})
export class SettingsComponent implements OnInit, OnDestroy {
  user: Agent | null = null;
  isDark = false;
  currentLang = 'de';

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => this.user = user);

    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => this.isDark = theme === 'dark');

    this.currentLang = this.translate.currentLang || this.translate.defaultLang || 'de';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  setLang(lang: string): void {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('app-language', lang);
  }

  logout(): void {
    this.authService.logout();
  }
}
