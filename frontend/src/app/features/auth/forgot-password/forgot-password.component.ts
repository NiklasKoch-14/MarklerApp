import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { catchError, of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LoadingSpinnerComponent],
  styles: [`
    .auth-page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--surface-2); padding:24px; }
    .auth-card { background:var(--surface); border:1px solid var(--border); border-radius:16px; box-shadow:0 4px 24px rgba(20,40,45,0.08); padding:36px 32px; width:100%; max-width:400px; }
    .auth-logo { font-size:22px; font-weight:800; color:var(--primary); margin-bottom:4px; }
    .auth-sub { font-size:13px; color:var(--text-3); margin-bottom:28px; }
    .auth-btn { width:100%; padding:11px 0; background:var(--primary); color:#fff; border:none; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; display:flex; align-items:center; justify-content:center; gap:8px; }
    .auth-btn:hover { background:var(--primary-hover); }
    .auth-btn:disabled { opacity:0.55; cursor:not-allowed; }
    .auth-link { color:var(--primary); font-size:13px; font-weight:600; text-decoration:none; }
    .auth-link:hover { text-decoration:underline; }
  `],
  template: `
    <div class="auth-page">
      <div class="auth-card">

        <div class="auth-logo">MarklerApp</div>
        <div class="auth-sub">{{ 'auth.forgotPassword.subtitle' | translate }}</div>

        <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()" style="display:flex;flex-direction:column;gap:14px;">

          <div>
            <label class="form-label">{{ 'auth.forgotPassword.email' | translate }}</label>
            <input type="email" formControlName="email" class="form-input"
                   [placeholder]="'auth.forgotPassword.emailPlaceholder' | translate"
                   autocomplete="email">
            <div *ngIf="forgotPasswordForm.get('email')?.invalid && forgotPasswordForm.get('email')?.touched" class="form-error">
              <span *ngIf="forgotPasswordForm.get('email')?.errors?.['required']">{{ 'validation.isRequired' | translate }}</span>
              <span *ngIf="forgotPasswordForm.get('email')?.errors?.['email']">{{ 'validation.invalidEmail' | translate }}</span>
            </div>
          </div>

          <div *ngIf="successMessage"
               style="padding:12px 14px;background:var(--color-success-soft);border-radius:10px;border-left:3px solid var(--color-success);">
            <div style="font-size:13px;color:var(--color-success);font-weight:600;">{{ successMessage }}</div>
            <div style="font-size:12px;color:var(--color-success);margin-top:4px;opacity:0.8;">{{ 'auth.forgotPassword.checkSpam' | translate }}</div>
          </div>

          <div *ngIf="errorMessage"
               style="padding:12px 14px;background:var(--color-error-soft);border-radius:10px;border-left:3px solid var(--color-error);">
            <span style="font-size:13px;color:var(--color-error);">{{ errorMessage }}</span>
          </div>

          <button type="submit" class="auth-btn" [disabled]="!forgotPasswordForm.valid || isLoading" style="margin-top:4px;">
            <div *ngIf="isLoading" style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
            {{ isLoading ? ('auth.forgotPassword.submitting' | translate) : ('auth.forgotPassword.submitButton' | translate) }}
          </button>

          <p style="text-align:center;font-size:13px;color:var(--text-3);margin:4px 0 0;">
            <a routerLink="/auth/login" class="auth-link">{{ 'auth.forgotPassword.backToLogin' | translate }}</a>
          </p>
        </form>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  forgotPasswordForm: FormGroup;
  isLoading = false;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.successMessage = '';
      this.errorMessage = '';

      const email = this.forgotPasswordForm.value.email;

      this.authService.forgotPassword(email).pipe(
        catchError(error => {
          this.errorMessage = error.error?.message || 'An error occurred. Please try again.';
          this.isLoading = false;
          return of(null);
        })
      ).subscribe(response => {
        this.isLoading = false;
        if (response) {
          this.successMessage = response.message;
          this.forgotPasswordForm.reset();
        }
      });
    }
  }
}
