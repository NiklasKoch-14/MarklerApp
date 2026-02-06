import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { catchError, of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {{ 'auth.forgotPassword.title' | translate }}
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {{ 'auth.forgotPassword.subtitle' | translate }}
          </p>
        </div>

        <form class="mt-8 space-y-6" [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()">
          <div>
            <label for="email" class="sr-only">{{ 'auth.forgotPassword.email' | translate }}</label>
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              formControlName="email"
              class="form-input appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-600 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
              [placeholder]="'auth.forgotPassword.emailPlaceholder' | translate">

            <div *ngIf="forgotPasswordForm.get('email')?.invalid && forgotPasswordForm.get('email')?.touched"
                 class="mt-2 text-sm text-error-600 dark:text-error-400">
              <span *ngIf="forgotPasswordForm.get('email')?.errors?.['required']">
                {{ 'auth.forgotPassword.email' | translate }} {{ 'validation.isRequired' | translate }}
              </span>
              <span *ngIf="forgotPasswordForm.get('email')?.errors?.['email']">
                {{ 'validation.invalidEmail' | translate }}
              </span>
            </div>
          </div>

          <div *ngIf="successMessage" class="rounded-md bg-success-50 dark:bg-success-900/20 p-4">
            <div class="flex">
              <div class="ml-3">
                <h3 class="text-sm font-medium text-success-800 dark:text-success-400">
                  {{ successMessage }}
                </h3>
                <p class="mt-2 text-sm text-success-700 dark:text-success-500">
                  {{ 'auth.forgotPassword.checkSpam' | translate }}
                </p>
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
              [disabled]="!forgotPasswordForm.valid || isLoading"
              class="btn btn-primary w-full">

              <span *ngIf="isLoading" class="absolute left-0 inset-y-0 flex items-center pl-3">
                <div class="spinner h-5 w-5"></div>
              </span>

              {{ isLoading ? ('auth.forgotPassword.submitting' | translate) : ('auth.forgotPassword.submitButton' | translate) }}
            </button>
          </div>

          <div class="text-center">
            <a routerLink="/auth/login" class="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
              {{ 'auth.forgotPassword.backToLogin' | translate }}
            </a>
          </div>
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
