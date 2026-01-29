import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { catchError, of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {{ 'auth.login.title' | translate }}
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {{ 'auth.login.subtitle' | translate }}
          </p>
        </div>

        <form class="mt-8 space-y-6" [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="rounded-md shadow-sm -space-y-px">
            <div>
              <label for="email" class="sr-only">{{ 'auth.login.email' | translate }}</label>
              <input
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                formControlName="email"
                class="form-input appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-600 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                [placeholder]="'auth.login.emailPlaceholder' | translate">
            </div>
            <div>
              <label for="password" class="sr-only">{{ 'auth.login.password' | translate }}</label>
              <input
                id="password"
                name="password"
                type="password"
                autocomplete="current-password"
                required
                formControlName="password"
                class="form-input appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-600 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                [placeholder]="'auth.login.passwordPlaceholder' | translate">
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded">
              <label for="remember-me" class="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                {{ 'auth.login.rememberMe' | translate }}
              </label>
            </div>

            <div class="text-sm">
              <a routerLink="/auth/forgot-password" class="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
                {{ 'auth.login.forgotPassword' | translate }}
              </a>
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
              [disabled]="!loginForm.valid || isLoading"
              class="btn btn-primary w-full">

              <span *ngIf="isLoading" class="absolute left-0 inset-y-0 flex items-center pl-3">
                <div class="spinner h-5 w-5"></div>
              </span>

              {{ isLoading ? ('auth.login.signingIn' | translate) : ('auth.login.signInButton' | translate) }}
            </button>
          </div>

          <div class="text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ 'auth.login.noAccount' | translate }}
              <a routerLink="/auth/register" class="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
                {{ 'auth.login.signUp' | translate }}
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  `
})
export class LoginComponent {
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