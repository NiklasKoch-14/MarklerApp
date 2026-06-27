import { Component, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { catchError, of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

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

          <p style="text-align:center;font-size:13px;color:var(--text-3);margin:4px 0 0;">
            {{ 'auth.login.noAccount' | translate }}
            <a routerLink="/auth/register" class="auth-link">{{ 'auth.login.signUp' | translate }}</a>
          </p>

        </form>
      </div>
    </div>
  `
})
export class LoginComponent implements AfterViewInit {
  @ViewChild('emailInput') emailInput!: ElementRef<HTMLInputElement>;

  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngAfterViewInit(): void {
    this.emailInput.nativeElement.focus();
  }

  onSubmit(): void {
    if (this.loginForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      const credentials = this.loginForm.value;

      this.authService.login(credentials).pipe(
        catchError(error => {
          this.errorMessage = error.error?.message || 'Login failed. Please try again.';
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