import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { catchError, of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LoadingSpinnerComponent],
  styles: [`
    .auth-page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--surface-2); padding:24px; }
    .auth-card { background:var(--surface); border:1px solid var(--border); border-radius:16px; box-shadow:0 4px 24px rgba(20,40,45,0.08); padding:36px 32px; width:100%; max-width:400px; text-align:center; }
    .auth-logo { font-size:22px; font-weight:800; color:var(--primary); margin-bottom:4px; text-align:left; }
    .auth-sub { font-size:13px; color:var(--text-3); margin-bottom:28px; text-align:left; }
    .auth-btn { width:100%; padding:11px 0; background:var(--primary); color:#fff; border:none; border-radius:10px; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; display:flex; align-items:center; justify-content:center; gap:8px; }
    .auth-btn:hover { background:var(--primary-hover); }
    .auth-btn:disabled { opacity:0.55; cursor:not-allowed; }
    .auth-link { color:var(--primary); font-size:13px; font-weight:600; text-decoration:none; }
    .auth-link:hover { text-decoration:underline; }
    .strength-bar { height:4px; border-radius:4px; transition:width 0.3s, background 0.3s; }
  `],
  template: `
    <div class="auth-page">
      <div class="auth-card">

        <!-- Verifying -->
        <div *ngIf="isVerifying" style="padding:20px 0;">
          <div style="width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px;"></div>
          <p style="font-size:13px;color:var(--text-3);">{{ 'auth.resetPassword.tokenVerifying' | translate }}</p>
        </div>

        <!-- Invalid token -->
        <div *ngIf="!isValid && !isVerifying" style="padding:20px 0;">
          <i class="ph ph-warning-circle" style="font-size:48px;color:var(--color-error);display:block;margin-bottom:12px;"></i>
          <h2 style="font-size:18px;font-weight:700;color:var(--text);margin:0 0 8px;">{{ 'auth.resetPassword.invalidToken' | translate }}</h2>
          <p style="font-size:13px;color:var(--text-3);margin:0 0 20px;">{{ 'auth.resetPassword.expiredToken' | translate }}</p>
          <a routerLink="/auth/forgot-password" class="auth-link">{{ 'auth.resetPassword.requestNewLink' | translate }}</a>
        </div>

        <!-- Form -->
        <div *ngIf="isValid && !successMessage" style="text-align:left;">
          <div class="auth-logo">MarklerApp</div>
          <div class="auth-sub">
            {{ 'auth.resetPassword.subtitle' | translate }}
            <span *ngIf="maskedEmail" style="display:block;margin-top:4px;font-weight:600;color:var(--text-2);">{{ maskedEmail }}</span>
          </div>

          <form [formGroup]="resetPasswordForm" (ngSubmit)="onSubmit()" style="display:flex;flex-direction:column;gap:14px;">

            <div>
              <label class="form-label">{{ 'auth.resetPassword.newPassword' | translate }}</label>
              <input type="password" formControlName="newPassword" class="form-input"
                     [placeholder]="'auth.resetPassword.newPasswordPlaceholder' | translate">
              <!-- Strength bar -->
              <div *ngIf="resetPasswordForm.get('newPassword')?.value" style="margin-top:8px;display:flex;align-items:center;gap:10px;">
                <div style="flex:1;background:var(--surface-2);border-radius:4px;overflow:hidden;height:4px;">
                  <div class="strength-bar" [style.width.%]="getPasswordStrengthWidth()"
                       [style.background]="getPasswordStrengthWidth() < 40 ? 'var(--color-error)' : getPasswordStrengthWidth() < 75 ? 'var(--color-amber)' : 'var(--color-success)'"></div>
                </div>
                <span style="font-size:11px;font-weight:600;" [style.color]="getPasswordStrengthWidth() < 40 ? 'var(--color-error)' : getPasswordStrengthWidth() < 75 ? 'var(--color-amber)' : 'var(--color-success)'">
                  {{ getPasswordStrengthText() | translate }}
                </span>
              </div>
              <div *ngIf="resetPasswordForm.get('newPassword')?.invalid && resetPasswordForm.get('newPassword')?.touched" class="form-error">
                {{ 'auth.resetPassword.passwordRequirements' | translate }}
              </div>
            </div>

            <div>
              <label class="form-label">{{ 'auth.resetPassword.confirmPassword' | translate }}</label>
              <input type="password" formControlName="confirmPassword" class="form-input"
                     [placeholder]="'auth.resetPassword.confirmPasswordPlaceholder' | translate">
              <div *ngIf="resetPasswordForm.errors?.['passwordMismatch'] && resetPasswordForm.get('confirmPassword')?.touched" class="form-error">
                {{ 'auth.resetPassword.passwordMismatch' | translate }}
              </div>
            </div>

            <div *ngIf="errorMessage"
                 style="padding:12px 14px;background:var(--color-error-soft);border-radius:10px;border-left:3px solid var(--color-error);">
              <span style="font-size:13px;color:var(--color-error);">{{ errorMessage }}</span>
            </div>

            <button type="submit" class="auth-btn" [disabled]="!resetPasswordForm.valid || isSubmitting" style="margin-top:4px;">
              <div *ngIf="isSubmitting" style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
              {{ isSubmitting ? ('auth.resetPassword.submitting' | translate) : ('auth.resetPassword.submitButton' | translate) }}
            </button>
          </form>
        </div>

        <!-- Success -->
        <div *ngIf="successMessage" style="padding:20px 0;">
          <i class="ph ph-check-circle" style="font-size:48px;color:var(--color-success);display:block;margin-bottom:12px;"></i>
          <h2 style="font-size:18px;font-weight:700;color:var(--text);margin:0 0 8px;">{{ successMessage }}</h2>
          <p style="font-size:13px;color:var(--text-3);margin:0;">{{ 'auth.resetPassword.redirecting' | translate }}</p>
        </div>

      </div>
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  isVerifying = true;
  isValid = false;
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';
  maskedEmail = '';
  private token = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      ]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Get token from query params
    this.token = this.route.snapshot.queryParams['token'] || '';

    if (!this.token) {
      this.isVerifying = false;
      this.isValid = false;
      return;
    }

    // Verify token validity
    this.authService.verifyResetToken(this.token).pipe(
      catchError(error => {
        console.error('Token verification error:', error);
        this.isVerifying = false;
        this.isValid = false;
        return of(null);
      })
    ).subscribe(response => {
      this.isVerifying = false;
      if (response && response.valid) {
        this.isValid = true;
        this.maskedEmail = response.maskedEmail;
      } else {
        this.isValid = false;
      }
    });
  }

  onSubmit(): void {
    if (this.resetPasswordForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.errorMessage = '';

      const newPassword = this.resetPasswordForm.value.newPassword;

      this.authService.resetPassword(this.token, newPassword).pipe(
        catchError(error => {
          this.errorMessage = error.error?.message || 'Password reset failed. Please try again.';
          this.isSubmitting = false;
          return of(null);
        })
      ).subscribe(response => {
        this.isSubmitting = false;
        if (response) {
          this.successMessage = response.message;
          // Redirect to login after 3 seconds
          setTimeout(() => {
            this.router.navigate(['/auth/login']);
          }, 3000);
        }
      });
    }
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');

    if (!newPassword || !confirmPassword) {
      return null;
    }

    return newPassword.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  getPasswordStrengthWidth(): number {
    const password = this.resetPasswordForm.get('newPassword')?.value || '';
    if (password.length === 0) return 0;
    if (password.length < 8) return 33;

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);

    const strength = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

    if (strength <= 2) return 33;
    if (strength === 3) return 66;
    return 100;
  }

  getPasswordStrengthClass(): string {
    const width = this.getPasswordStrengthWidth();
    if (width <= 33) return 'bg-error-500';
    if (width <= 66) return 'bg-warning-500';
    return 'bg-success-500';
  }

  getPasswordStrengthTextClass(): string {
    const width = this.getPasswordStrengthWidth();
    if (width <= 33) return 'text-error-600 dark:text-error-400';
    if (width <= 66) return 'text-warning-600 dark:text-warning-400';
    return 'text-success-600 dark:text-success-400';
  }

  getPasswordStrengthText(): string {
    const width = this.getPasswordStrengthWidth();
    if (width <= 33) return 'auth.resetPassword.weakPassword';
    if (width <= 66) return 'auth.resetPassword.mediumPassword';
    return 'auth.resetPassword.strongPassword';
  }
}
