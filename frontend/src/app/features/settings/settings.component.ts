import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService, Agent } from '../../core/auth/auth.service';
import { AgentService, AgentProfile } from '../../core/services/agent.service';
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

        <!-- Anmeldemethode -->
        <div *ngIf="profile"
             style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;padding-top:14px;border-top:1px solid var(--border);">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--text);">{{ 'settings.signInMethod.label' | translate }}</div>
            <div style="font-size:12px;color:var(--text-3);margin-top:2px;">{{ signInMethodHint | translate }}</div>
          </div>
          <span *ngIf="profile.googleLinked"
                style="display:inline-flex;align-items:center;gap:7px;padding:7px 14px;border-radius:20px;border:1.5px solid var(--border);background:var(--surface-2);font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;">
            <svg width="15" height="15" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
            </svg>
            Google
          </span>
          <span *ngIf="!profile.googleLinked"
                style="display:inline-flex;align-items:center;gap:7px;padding:7px 14px;border-radius:20px;border:1.5px solid var(--border);background:var(--surface-2);font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;">
            <i class="ri-mail-line" style="font-size:15px;"></i>
            {{ 'settings.signInMethod.password' | translate }}
          </span>
        </div>
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
            <i [class]="isDark ? 'ri-sun-line' : 'ri-moon-line'" style="font-size:15px;"></i>
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
            <i class="ri-logout-box-line" style="font-size:15px;"></i>
            Abmelden
          </button>
        </div>
      </div>

    </div>
  `
})
export class SettingsComponent implements OnInit, OnDestroy {
  user: Agent | null = null;
  profile: AgentProfile | null = null;
  isDark = false;
  currentLang = 'de';

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private agentService: AgentService,
    private themeService: ThemeService,
    private translate: TranslateService
  ) {}

  get signInMethodHint(): string {
    if (!this.profile) {
      return '';
    }
    if (!this.profile.googleLinked) {
      return 'settings.signInMethod.passwordHint';
    }
    return this.profile.passwordSet
      ? 'settings.signInMethod.googleAndPasswordHint'
      : 'settings.signInMethod.googleOnlyHint';
  }

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => this.user = user);

    this.agentService.getMe()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: profile => this.profile = profile,
        error: () => this.profile = null
      });

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
