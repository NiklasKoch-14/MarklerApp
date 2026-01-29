import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { catchError, of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">

        <!-- Loading state -->
        <div *ngIf="isVerifying" class="text-center">
          <div class="spinner h-12 w-12 mx-auto mb-4"></div>
          <p class="text-gray-600 dark:text-gray-400">
            {{ 'auth.resetPassword.tokenVerifying' | translate }}
          </p>
        </div>

        <!-- Invalid token state -->
        <div *ngIf="!isValid && !isVerifying" class="text-center">
          <div class="mb-6">
            <svg class="mx-auto h-12 w-12 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {{ 'auth.resetPassword.invalidToken' | translate }}
          </h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            {{ 'auth.resetPassword.expiredToken' | translate }}
          </p>
          <a routerLink="/auth/forgot-password" class="btn btn-primary">
            {{ 'auth.resetPassword.requestNewLink' | translate }}
          </a>
        </div>

        <!-- Valid token - show form -->
        <div *ngIf="isValid && !successMessage">
          <div>
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              {{ 'auth.resetPassword.title' | translate }}
            </h2>
            <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              {{ 'auth.resetPassword.subtitle' | translate }}
            </p>
            <p *ngIf="maskedEmail" class="mt-1 text-center text-sm text-gray-500 dark:text-gray-500">
              {{ maskedEmail }}
            </p>
          </div>

          <form class="mt-8 space-y-6" [formGroup]="resetPasswordForm" (ngSubmit)="onSubmit()">
            <div class="space-y-4">
              <div>
                <label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ 'auth.resetPassword.newPassword' | translate }}
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  formControlName="newPassword"
                  class="mt-1 form-input appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-600 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  [placeholder]="'auth.resetPassword.newPasswordPlaceholder' | translate">

                <div *ngIf="resetPasswordForm.get('newPassword')?.invalid && resetPasswordForm.get('newPassword')?.touched"
                     class="mt-2 text-sm text-error-600 dark:text-error-400">
                  <span *ngIf="resetPasswordForm.get('newPassword')?.errors?.['required']">
                    {{ 'auth.resetPassword.newPassword' | translate }} {{ 'validation.isRequired' | translate }}
                  </span>
                  <span *ngIf="resetPasswordForm.get('newPassword')?.errors?.['minlength']">
                    {{ 'auth.resetPassword.passwordRequirements' | translate }}
                  </span>
                  <span *ngIf="resetPasswordForm.get('newPassword')?.errors?.['pattern']">
                    {{ 'auth.resetPassword.passwordRequirements' | translate }}
                  </span>
                </div>

                <!-- Password strength indicator -->
                <div *ngIf="resetPasswordForm.get('newPassword')?.value" class="mt-2">
                  <div class="flex items-center space-x-2">
                    <div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        [class]="getPasswordStrengthClass()"
                        [style.width.%]="getPasswordStrengthWidth()"
                        class="h-full transition-all duration-300">
                      </div>
                    </div>
                    <span class="text-xs font-medium" [class]="getPasswordStrengthTextClass()">
                      {{ getPasswordStrengthText() | translate }}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ 'auth.resetPassword.confirmPassword' | translate }}
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  formControlName="confirmPassword"
                  class="mt-1 form-input appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-600 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                  [placeholder]="'auth.resetPassword.confirmPasswordPlaceholder' | translate">

                <div *ngIf="resetPasswordForm.get('confirmPassword')?.invalid && resetPasswordForm.get('confirmPassword')?.touched"
                     class="mt-2 text-sm text-error-600 dark:text-error-400">
                  <span *ngIf="resetPasswordForm.get('confirmPassword')?.errors?.['required']">
                    {{ 'auth.resetPassword.confirmPassword' | translate }} {{ 'validation.isRequired' | translate }}
                  </span>
                </div>

                <div *ngIf="resetPasswordForm.errors?.['passwordMismatch'] && resetPasswordForm.get('confirmPassword')?.touched"
                     class="mt-2 text-sm text-error-600 dark:text-error-400">
                  {{ 'auth.resetPassword.passwordMismatch' | translate }}
                </div>
              </div>
            </div>

            <div *ngIf="errorMessage" class="rounded-md bg-error-50 dark:bg-error-900/20 p-4">
              <div class="flex">
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-error-800 dark:text-error-400">
                    {{ errorMessage }}
                  </h3>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                [disabled]="!resetPasswordForm.valid || isSubmitting"
                class="btn btn-primary w-full">

                <span *ngIf="isSubmitting" class="absolute left-0 inset-y-0 flex items-center pl-3">
                  <div class="spinner h-5 w-5"></div>
                </span>

                {{ isSubmitting ? ('auth.resetPassword.submitting' | translate) : ('auth.resetPassword.submitButton' | translate) }}
              </button>
            </div>
          </form>
        </div>

        <!-- Success state -->
        <div *ngIf="successMessage" class="text-center">
          <div class="mb-6">
            <svg class="mx-auto h-12 w-12 text-success-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {{ successMessage }}
          </h2>
          <p class="text-gray-600 dark:text-gray-400">
            {{ 'auth.resetPassword.redirecting' | translate }}
          </p>
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
