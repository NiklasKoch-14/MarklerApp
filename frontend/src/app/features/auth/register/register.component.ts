import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { catchError, of, debounceTime, switchMap } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <div>
          <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {{ 'auth.register.title' | translate }}
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            {{ 'auth.register.subtitle' | translate }}
          </p>
        </div>

        <form class="mt-8 space-y-6" [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <div class="rounded-md shadow-sm space-y-4">
            <!-- First Name -->
            <div>
              <label for="firstName" class="form-label">
                {{ 'auth.register.firstName' | translate }}
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autocomplete="given-name"
                required
                formControlName="firstName"
                class="form-input"
                [placeholder]="'auth.register.firstNamePlaceholder' | translate">
              <div *ngIf="registerForm.get('firstName')?.invalid && registerForm.get('firstName')?.touched" class="form-error">
                <span *ngIf="registerForm.get('firstName')?.errors?.['required']">
                  {{ 'auth.register.errors.firstNameRequired' | translate }}
                </span>
                <span *ngIf="registerForm.get('firstName')?.errors?.['minlength']">
                  {{ 'auth.register.errors.firstNameMinLength' | translate }}
                </span>
              </div>
            </div>

            <!-- Last Name -->
            <div>
              <label for="lastName" class="form-label">
                {{ 'auth.register.lastName' | translate }}
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autocomplete="family-name"
                required
                formControlName="lastName"
                class="form-input"
                [placeholder]="'auth.register.lastNamePlaceholder' | translate">
              <div *ngIf="registerForm.get('lastName')?.invalid && registerForm.get('lastName')?.touched" class="form-error">
                <span *ngIf="registerForm.get('lastName')?.errors?.['required']">
                  {{ 'auth.register.errors.lastNameRequired' | translate }}
                </span>
                <span *ngIf="registerForm.get('lastName')?.errors?.['minlength']">
                  {{ 'auth.register.errors.lastNameMinLength' | translate }}
                </span>
              </div>
            </div>

            <!-- Email -->
            <div>
              <label for="email" class="form-label">
                {{ 'auth.register.email' | translate }}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autocomplete="email"
                required
                formControlName="email"
                class="form-input"
                [placeholder]="'auth.register.emailPlaceholder' | translate">
              <div *ngIf="registerForm.get('email')?.invalid && registerForm.get('email')?.touched" class="form-error">
                <span *ngIf="registerForm.get('email')?.errors?.['required']">
                  {{ 'auth.register.errors.emailRequired' | translate }}
                </span>
                <span *ngIf="registerForm.get('email')?.errors?.['email']">
                  {{ 'auth.register.errors.emailInvalid' | translate }}
                </span>
                <span *ngIf="registerForm.get('email')?.errors?.['emailTaken']">
                  {{ 'auth.register.errors.emailTaken' | translate }}
                </span>
              </div>
            </div>

            <!-- Phone -->
            <div>
              <label for="phone" class="form-label">
                {{ 'auth.register.phone' | translate }} ({{ 'auth.register.optional' | translate }})
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autocomplete="tel"
                formControlName="phone"
                class="form-input"
                [placeholder]="'auth.register.phonePlaceholder' | translate">
              <div *ngIf="registerForm.get('phone')?.invalid && registerForm.get('phone')?.touched" class="form-error">
                <span *ngIf="registerForm.get('phone')?.errors?.['pattern']">
                  {{ 'auth.register.errors.phoneInvalid' | translate }}
                </span>
              </div>
            </div>

            <!-- Password -->
            <div>
              <label for="password" class="form-label">
                {{ 'auth.register.password' | translate }}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autocomplete="new-password"
                required
                formControlName="password"
                class="form-input"
                [placeholder]="'auth.register.passwordPlaceholder' | translate">
              <div *ngIf="registerForm.get('password')?.invalid && registerForm.get('password')?.touched" class="form-error">
                <span *ngIf="registerForm.get('password')?.errors?.['required']">
                  {{ 'auth.register.errors.passwordRequired' | translate }}
                </span>
                <span *ngIf="registerForm.get('password')?.errors?.['minlength']">
                  {{ 'auth.register.errors.passwordMinLength' | translate }}
                </span>
                <span *ngIf="registerForm.get('password')?.errors?.['pattern']">
                  {{ 'auth.register.errors.passwordPattern' | translate }}
                </span>
              </div>
            </div>

            <!-- Confirm Password -->
            <div>
              <label for="confirmPassword" class="form-label">
                {{ 'auth.register.confirmPassword' | translate }}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autocomplete="new-password"
                required
                formControlName="confirmPassword"
                class="form-input"
                [placeholder]="'auth.register.confirmPasswordPlaceholder' | translate">
              <div *ngIf="registerForm.get('confirmPassword')?.invalid && registerForm.get('confirmPassword')?.touched" class="form-error">
                <span *ngIf="registerForm.get('confirmPassword')?.errors?.['required']">
                  {{ 'auth.register.errors.confirmPasswordRequired' | translate }}
                </span>
              </div>
              <div *ngIf="registerForm.errors?.['passwordMismatch'] && registerForm.get('confirmPassword')?.touched" class="form-error">
                {{ 'auth.register.errors.passwordMismatch' | translate }}
              </div>
            </div>

            <!-- Language Preference -->
            <div>
              <label for="languagePreference" class="form-label">
                {{ 'auth.register.languagePreference' | translate }}
              </label>
              <select
                id="languagePreference"
                name="languagePreference"
                formControlName="languagePreference"
                class="form-select">
                <option value="DE">{{ 'auth.register.languageDe' | translate }}</option>
                <option value="EN">{{ 'auth.register.languageEn' | translate }}</option>
              </select>
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
              [disabled]="!registerForm.valid || isLoading"
              class="btn btn-primary w-full">

              <span *ngIf="isLoading" class="absolute left-0 inset-y-0 flex items-center pl-3">
                <div class="spinner h-5 w-5"></div>
              </span>

              {{ isLoading ? ('auth.register.registering' | translate) : ('auth.register.registerButton' | translate) }}
            </button>
          </div>

          <div class="text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ 'auth.register.alreadyHaveAccount' | translate }}
              <a routerLink="/auth/login" class="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
                {{ 'auth.register.signIn' | translate }}
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  `
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email], [this.emailAsyncValidator.bind(this)]],
      phone: ['', [Validators.pattern(/^[+]?[0-9\s\-()]+$/)]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
      ]],
      confirmPassword: ['', [Validators.required]],
      languagePreference: ['DE']
    }, {
      validators: this.passwordMatchValidator
    });
  }

  /**
   * Custom validator to check if passwords match
   */
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  /**
   * Async validator to check if email is available
   */
  private emailAsyncValidator(control: AbstractControl) {
    if (!control.value) {
      return of(null);
    }

    return of(control.value).pipe(
      debounceTime(500),
      switchMap(email =>
        this.authService.checkEmailAvailability(email).pipe(
          catchError(() => of({ available: true }))
        )
      ),
      switchMap(result => of(result.available ? null : { emailTaken: true }))
    );
  }

  onSubmit(): void {
    if (this.registerForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      const { confirmPassword, ...registerData } = this.registerForm.value;

      this.authService.register(registerData).pipe(
        catchError(error => {
          this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
          this.isLoading = false;
          return of(null);
        })
      ).subscribe(response => {
        if (response) {
          this.isLoading = false;
          // Redirect to dashboard after successful registration
          this.router.navigate(['/dashboard']);
        }
      });
    }
  }
}
