import { Component, AfterViewInit, ElementRef, NgZone, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { catchError, of } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { environment } from '../../../../environments/environment';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LoadingSpinnerComponent],
  styles: [`
    .auth-page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--surface-2); padding:24px; }
    .auth-card { background:var(--surface); border:1px solid var(--border); border-radius:16px; box-shadow:0 4px 24px rgba(20,40,45,0.08); padding:36px 32px; width:100%; max-width:400px; }
    .auth-logo { font-size:22px; font-weight:800; color:var(--primary); margin-bottom:4px; }
    .auth-sub { font-size:13px; color:var(--text-3); margin-bottom:28px; }
    .auth-btn { width:100%; padding:11px 0; background:var(--primary); color:#fff; border:none; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; transition:background 0.15s; }
    .auth-btn:hover { background:var(--primary-hover); }
    .auth-btn:disabled { opacity:0.55; cursor:not-allowed; }
    .auth-link { color:var(--primary); font-size:13px; font-weight:600; text-decoration:none; }
    .auth-link:hover { text-decoration:underline; }
    .auth-divider { display:flex; align-items:center; gap:12px; margin:18px 0; }
    .auth-divider::before, .auth-divider::after { content:''; flex:1; height:1px; background:var(--border); }
    .auth-divider span { font-size:12px; color:var(--text-3); }
    .google-btn-host { display:flex; justify-content:center; min-height:44px; }
  `],
  template: `
    <div class="auth-page">
      <div class="auth-card">

        <!-- Brand -->
        <div class="auth-logo">MarklerApp</div>
        <div class="auth-sub">{{ 'auth.login.subtitle' | translate }}</div>

        <!-- Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" style="display:flex;flex-direction:column;gap:14px;">

          <div>
            <label class="form-label">{{ 'auth.login.email' | translate }}</label>
            <input #emailInput type="email" formControlName="email" class="form-input"
                   [placeholder]="'auth.login.emailPlaceholder' | translate"
                   autocomplete="email">
          </div>

          <div>
            <label class="form-label">{{ 'auth.login.password' | translate }}</label>
            <input type="password" formControlName="password" class="form-input"
                   [placeholder]="'auth.login.passwordPlaceholder' | translate"
                   autocomplete="current-password">
          </div>

          <div style="display:flex;align-items:center;justify-content:flex-end;">
            <a routerLink="/auth/forgot-password" class="auth-link">
              {{ 'auth.login.forgotPassword' | translate }}
            </a>
          </div>

          <!-- Error -->
          <div *ngIf="errorMessage"
               style="padding:12px 14px;background:var(--color-error-soft);border-radius:10px;border-left:3px solid var(--color-error);">
            <span style="font-size:13px;color:var(--color-error);">{{ errorMessage }}</span>
          </div>

          <button type="submit" class="auth-btn" [disabled]="!loginForm.valid || isLoading"
                  style="margin-top:4px;display:flex;align-items:center;justify-content:center;gap:8px;">
            <div *ngIf="isLoading" style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
            {{ isLoading ? ('auth.login.signingIn' | translate) : ('auth.login.signInButton' | translate) }}
          </button>

        </form>

        <!-- Google Sign-In (hidden when no client ID is configured) -->
        <ng-container *ngIf="googleEnabled">
          <div class="auth-divider"><span>{{ 'auth.login.or' | translate }}</span></div>
          <div class="google-btn-host"><div #googleBtn></div></div>
        </ng-container>

        <p style="text-align:center;font-size:13px;color:var(--text-3);margin:18px 0 0;">
          {{ 'auth.login.noAccount' | translate }}
          <a routerLink="/auth/register" class="auth-link">{{ 'auth.login.signUp' | translate }}</a>
        </p>

      </div>
    </div>
  `
})
export class LoginComponent implements AfterViewInit {
  @ViewChild('emailInput') emailInput!: ElementRef<HTMLInputElement>;
  @ViewChild('googleBtn') googleBtn?: ElementRef<HTMLDivElement>;

  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  readonly googleEnabled = !!environment.googleClientId;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private zone: NgZone,
    private translate: TranslateService,
    private errorHandler: ErrorHandlerService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngAfterViewInit(): void {
    this.emailInput.nativeElement.focus();
    if (this.googleEnabled) {
      this.renderGoogleButton();
    }
  }

  /**
   * The GIS script loads async, so retry briefly until it registers its global.
   */
  private renderGoogleButton(retries = 20): void {
    const gis = (window as any).google?.accounts?.id;

    if (!gis || !this.googleBtn) {
      if (retries > 0) {
        setTimeout(() => this.renderGoogleButton(retries - 1), 100);
      } else {
        console.warn('Google Identity Services failed to load — sign-in button unavailable');
      }
      return;
    }

    gis.initialize({
      client_id: environment.googleClientId,
      callback: (response: { credential: string }) => this.onGoogleCredential(response.credential)
    });

    gis.renderButton(this.googleBtn.nativeElement, {
      theme: 'outline',
      size: 'large',
      shape: 'rectangular',
      text: 'signin_with',
      width: 336,
      locale: this.translate.currentLang || 'de'
    });
  }

  /** GIS invokes its callback outside Angular's zone, so re-enter it for change detection. */
  private onGoogleCredential(idToken: string): void {
    this.zone.run(() => {
      this.isLoading = true;
      this.errorMessage = '';

      this.authService.loginWithGoogle(idToken).pipe(
        catchError(() => {
          this.errorMessage = this.translate.instant('auth.login.googleFailed');
          this.isLoading = false;
          return of(null);
        })
      ).subscribe(response => {
        if (response) {
          this.isLoading = false;
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
          this.router.navigateByUrl(returnUrl);
        }
      });
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      const credentials = this.loginForm.value;

      this.authService.login(credentials).pipe(
        catchError(error => {
          this.errorMessage = this.errorHandler.getUserMessage(error);
          this.isLoading = false;
          return of(null);
        })
      ).subscribe(response => {
        if (response) {
          this.isLoading = false;

          // Redirect to return URL or dashboard
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
          this.router.navigateByUrl(returnUrl);
        }
      });
    }
  }
}