import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { catchError, of, switchMap } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorHandlerService } from '../../../core/services/error-handler.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LoadingSpinnerComponent],
  styles: [`
    .auth-page { min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--surface-2); padding:24px; }
    .auth-card { background:var(--surface); border:1px solid var(--border); border-radius:16px; box-shadow:0 4px 24px rgba(20,40,45,0.08); padding:36px 32px; width:100%; max-width:420px; }
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
        <div class="auth-sub">{{ 'auth.register.subtitle' | translate }}</div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" style="display:flex;flex-direction:column;gap:14px;">

          <div class="form-grid-2" style="gap:14px;">
            <div>
              <label class="form-label">{{ 'auth.register.firstName' | translate }} *</label>
              <input type="text" formControlName="firstName" class="form-input"
                     [placeholder]="'auth.register.firstNamePlaceholder' | translate" autocomplete="given-name">
              <div *ngIf="registerForm.get('firstName')?.invalid && registerForm.get('firstName')?.touched" class="form-error">
                <span *ngIf="registerForm.get('firstName')?.errors?.['required']">{{ 'auth.register.errors.firstNameRequired' | translate }}</span>
                <span *ngIf="registerForm.get('firstName')?.errors?.['minlength']">{{ 'auth.register.errors.firstNameMinLength' | translate }}</span>
              </div>
            </div>
            <div>
              <label class="form-label">{{ 'auth.register.lastName' | translate }} *</label>
              <input type="text" formControlName="lastName" class="form-input"
                     [placeholder]="'auth.register.lastNamePlaceholder' | translate" autocomplete="family-name">
              <div *ngIf="registerForm.get('lastName')?.invalid && registerForm.get('lastName')?.touched" class="form-error">
                <span *ngIf="registerForm.get('lastName')?.errors?.['required']">{{ 'auth.register.errors.lastNameRequired' | translate }}</span>
              </div>
            </div>
          </div>

          <!-- Email -->
          <div>
            <label class="form-label">{{ 'auth.register.email' | translate }} *</label>
            <input type="email" formControlName="email" class="form-input"
                   [placeholder]="'auth.register.emailPlaceholder' | translate" autocomplete="email">
            <div *ngIf="registerForm.get('email')?.invalid && registerForm.get('email')?.touched" class="form-error">
              <span *ngIf="registerForm.get('email')?.errors?.['required']">{{ 'auth.register.errors.emailRequired' | translate }}</span>
              <span *ngIf="registerForm.get('email')?.errors?.['email']">{{ 'auth.register.errors.emailInvalid' | translate }}</span>
              <span *ngIf="registerForm.get('email')?.errors?.['emailTaken']">{{ 'auth.register.errors.emailTaken' | translate }}</span>
            </div>
            </div>

          <!-- Phone -->
          <div>
            <label class="form-label">{{ 'auth.register.phone' | translate }} <span style="color:var(--text-3);font-weight:400;">(optional)</span></label>
            <input type="tel" formControlName="phone" class="form-input"
                   [placeholder]="'auth.register.phonePlaceholder' | translate" autocomplete="tel">
            <div *ngIf="registerForm.get('phone')?.invalid && registerForm.get('phone')?.touched" class="form-error">
              {{ 'auth.register.errors.phoneInvalid' | translate }}
            </div>
          </div>

          <!-- Password -->
          <div>
            <label class="form-label">{{ 'auth.register.password' | translate }} *</label>
            <input type="password" formControlName="password" class="form-input"
                   [placeholder]="'auth.register.passwordPlaceholder' | translate" autocomplete="new-password">
            <div *ngIf="registerForm.get('password')?.invalid && registerForm.get('password')?.touched" class="form-error">
              <span *ngIf="registerForm.get('password')?.errors?.['required']">{{ 'auth.register.errors.passwordRequired' | translate }}</span>
              <span *ngIf="registerForm.get('password')?.errors?.['minlength']">{{ 'auth.register.errors.passwordMinLength' | translate }}</span>
              <span *ngIf="registerForm.get('password')?.errors?.['pattern']">{{ 'auth.register.errors.passwordPattern' | translate }}</span>
            </div>
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="form-label">{{ 'auth.register.confirmPassword' | translate }} *</label>
            <input type="password" formControlName="confirmPassword" class="form-input"
                   [placeholder]="'auth.register.confirmPasswordPlaceholder' | translate" autocomplete="new-password">
            <div *ngIf="registerForm.errors?.['passwordMismatch'] && registerForm.get('confirmPassword')?.touched" class="form-error">
              {{ 'auth.register.errors.passwordMismatch' | translate }}
            </div>
          </div>

          <!-- Language -->
          <div>
            <label class="form-label">{{ 'auth.register.languagePreference' | translate }}</label>
            <select formControlName="languagePreference" class="form-input">
              <option value="DE">{{ 'auth.register.languageDe' | translate }}</option>
              <option value="EN">{{ 'auth.register.languageEn' | translate }}</option>
            </select>
          </div>

          <div *ngIf="errorMessage"
               style="padding:12px 14px;background:var(--color-error-soft);border-radius:10px;border-left:3px solid var(--color-error);">
            <span style="font-size:13px;color:var(--color-error);">{{ errorMessage }}</span>
          </div>

          <button type="submit" class="auth-btn" [disabled]="!registerForm.valid || isLoading" style="margin-top:4px;">
            <div *ngIf="isLoading" style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.4);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
            {{ isLoading ? ('auth.register.registering' | translate) : ('auth.register.registerButton' | translate) }}
          </button>

          <p style="text-align:center;font-size:13px;color:var(--text-3);margin:4px 0 0;">
            {{ 'auth.register.alreadyHaveAccount' | translate }}
            <a routerLink="/auth/login" class="auth-link">{{ 'auth.register.signIn' | translate }}</a>
          </p>

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
    private router: Router,
    private errorHandler: ErrorHandlerService
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', {
        validators: [Validators.required, Validators.email],
        asyncValidators: [this.emailAsyncValidator.bind(this)],
        updateOn: 'blur'
      }],
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

    return this.authService.checkEmailAvailability(control.value).pipe(
      catchError(() => of({ available: true })),
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
          this.errorMessage = this.errorHandler.getUserMessage(error);
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
