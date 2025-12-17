import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import {
  PropertyService,
  PropertyType,
  ListingType,
  PropertyStatus,
  HeatingType
} from '../../services/property.service';

@Component({
  selector: 'app-property-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './property-form.component.html',
  styleUrls: ['./property-form.component.scss']
})
export class PropertyFormComponent implements OnInit, OnDestroy {
  propertyForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  fieldErrors: { [key: string]: string } = {};
  isEditMode = false;
  propertyId: string | null = null;

  // Current form section
  currentSection: 'basic' | 'location' | 'specs' | 'financial' | 'features' = 'basic';

  // Enum values for dropdowns
  propertyTypes = Object.values(PropertyType);
  listingTypes = Object.values(ListingType);
  propertyStatuses = Object.values(PropertyStatus);
  heatingTypes = Object.values(HeatingType);

  // Form persistence
  private destroy$ = new Subject<void>();
  private readonly FORM_STORAGE_KEY = 'property-form-draft';
  private readonly SESSION_STORAGE_KEY = 'property-form-session';
  showRestoreDialog = false;
  hasUnsavedChanges = false;

  constructor(
    private fb: FormBuilder,
    public propertyService: PropertyService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.propertyForm = this.fb.group({
      // Basic Information
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(5000)]],
      propertyType: ['', [Validators.required]],
      listingType: ['', [Validators.required]],
      status: [PropertyStatus.AVAILABLE],
      availableFrom: [''],

      // Location
      addressStreet: ['', [Validators.required, Validators.maxLength(200)]],
      addressHouseNumber: ['', [Validators.maxLength(20)]],
      addressCity: ['', [Validators.required, Validators.maxLength(100)]],
      addressPostalCode: ['', [Validators.required, Validators.pattern('^[0-9]{5}$')]],
      addressState: ['', [Validators.maxLength(100)]],
      addressCountry: ['Germany'],
      addressDistrict: ['', [Validators.maxLength(100)]],

      // Specifications
      livingAreaSqm: ['', [Validators.min(0), Validators.max(10000)]],
      totalAreaSqm: ['', [Validators.min(0), Validators.max(100000)]],
      plotAreaSqm: ['', [Validators.min(0), Validators.max(1000000)]],
      rooms: ['', [Validators.min(0.5), Validators.max(50)]],
      bedrooms: ['', [Validators.min(0), Validators.max(20)]],
      bathrooms: ['', [Validators.min(0), Validators.max(20)]],
      floors: ['', [Validators.min(1), Validators.max(100)]],
      floorNumber: ['', [Validators.min(-5), Validators.max(100)]],
      constructionYear: ['', [Validators.min(1000), Validators.max(3000)]],
      lastRenovationYear: ['', [Validators.min(1000), Validators.max(3000)]],

      // Financial
      price: ['', [Validators.min(0), Validators.max(99999999.99)]],
      pricePerSqm: ['', [Validators.min(0)]],
      additionalCosts: ['', [Validators.min(0)]],
      heatingCosts: ['', [Validators.min(0)]],
      commission: ['', [Validators.min(0)]],

      // Features
      hasElevator: [false],
      hasBalcony: [false],
      hasTerrace: [false],
      hasGarden: [false],
      hasGarage: [false],
      hasParking: [false],
      hasBasement: [false],
      hasAttic: [false],
      isBarrierFree: [false],
      petsAllowed: [false],
      furnished: [false],

      // Energy
      energyEfficiencyClass: ['', [Validators.maxLength(10)]],
      energyConsumptionKwh: ['', [Validators.min(0), Validators.max(1000)]],
      heatingType: [''],

      // Additional
      contactPhone: ['', [Validators.pattern('^[+]?[0-9\\s\\-()]*$'), Validators.maxLength(20)]],
      contactEmail: ['', [Validators.email]],
      virtualTourUrl: ['', [Validators.maxLength(500)]],
      notes: ['', [Validators.maxLength(2000)]],

      // GDPR
      dataProcessingConsent: [false, [Validators.requiredTrue]]
    });
  }

  ngOnInit(): void {
    this.propertyId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!this.propertyId;

    if (this.isEditMode && this.propertyId) {
      this.loadProperty(this.propertyId);
    } else {
      // Only for new property creation, check for saved draft
      this.checkForSavedDraft();
    }

    // Set up auto-save for form changes (only for new properties)
    if (!this.isEditMode) {
      this.setupAutoSave();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProperty(id: string): void {
    this.isLoading = true;
    this.propertyService.getProperty(id).subscribe({
      next: (property) => {
        this.propertyForm.patchValue({
          title: property.title,
          description: property.description,
          propertyType: property.propertyType,
          listingType: property.listingType,
          status: property.status,
          availableFrom: property.availableFrom,

          addressStreet: property.addressStreet,
          addressHouseNumber: property.addressHouseNumber,
          addressCity: property.addressCity,
          addressPostalCode: property.addressPostalCode,
          addressState: property.addressState,
          addressCountry: property.addressCountry,
          addressDistrict: property.addressDistrict,

          livingAreaSqm: property.livingAreaSqm,
          totalAreaSqm: property.totalAreaSqm,
          plotAreaSqm: property.plotAreaSqm,
          rooms: property.rooms,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          floors: property.floors,
          floorNumber: property.floorNumber,
          constructionYear: property.constructionYear,
          lastRenovationYear: property.lastRenovationYear,

          price: property.price,
          pricePerSqm: property.pricePerSqm,
          additionalCosts: property.additionalCosts,
          heatingCosts: property.heatingCosts,
          commission: property.commission,

          hasElevator: property.hasElevator,
          hasBalcony: property.hasBalcony,
          hasTerrace: property.hasTerrace,
          hasGarden: property.hasGarden,
          hasGarage: property.hasGarage,
          hasParking: property.hasParking,
          hasBasement: property.hasBasement,
          hasAttic: property.hasAttic,
          isBarrierFree: property.isBarrierFree,
          petsAllowed: property.petsAllowed,
          furnished: property.furnished,

          energyEfficiencyClass: property.energyEfficiencyClass,
          energyConsumptionKwh: property.energyConsumptionKwh,
          heatingType: property.heatingType,

          contactPhone: property.contactPhone,
          contactEmail: property.contactEmail,
          virtualTourUrl: property.virtualTourUrl,
          notes: property.notes
        });
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load property data. Please try again.';
        console.error('Error loading property:', error);
      }
    });
  }

  onSubmit(): void {
    if (this.propertyForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';
      this.fieldErrors = {};

      const propertyData = this.propertyForm.value;

      if (this.isEditMode && this.propertyId) {
        this.propertyService.updateProperty(this.propertyId, propertyData).subscribe({
          next: (property) => {
            this.isLoading = false;
            this.router.navigate(['/properties', property.id]);
          },
          error: (error) => {
            this.isLoading = false;
            this.handleSubmitError(error);
          }
        });
      } else {
        this.propertyService.createProperty(propertyData).subscribe({
          next: (property) => {
            this.isLoading = false;
            this.clearSavedDraft(); // Clear draft on successful creation
            this.router.navigate(['/properties', property.id]);
          },
          error: (error) => {
            this.isLoading = false;
            this.handleSubmitError(error);
          }
        });
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.propertyForm.controls).forEach(key => {
        this.propertyForm.get(key)?.markAsTouched();
      });
      this.errorMessage = 'Please fill in all required fields correctly.';
      this.scrollToFirstError();
    }
  }

  private handleSubmitError(error: any): void {
    console.error('Error submitting property:', error);

    // Check if backend sent field-specific errors
    if (error.error?.fieldErrors) {
      this.fieldErrors = error.error.fieldErrors;

      // Build a detailed error message listing which fields failed
      const fieldNames = Object.keys(this.fieldErrors);
      if (fieldNames.length > 0) {
        const fieldList = fieldNames
          .map(field => this.getFieldDisplayName(field))
          .join(', ');
        this.errorMessage = `Validation failed for the following field(s): ${fieldList}. Please check the highlighted fields below.`;
      } else {
        this.errorMessage = error.error?.message || 'Failed to save property. Please try again.';
      }

      // Mark fields with errors as touched
      Object.keys(this.fieldErrors).forEach(fieldName => {
        const control = this.propertyForm.get(fieldName);
        if (control) {
          control.markAsTouched();
          control.setErrors({ serverError: this.fieldErrors[fieldName] });
        }
      });

      this.scrollToFirstError();
    } else {
      this.errorMessage = error.error?.message || 'Failed to save property. Please try again.';
    }
  }

  private getFieldDisplayName(fieldName: string): string {
    const fieldMap: { [key: string]: string } = {
      'title': 'Property Title',
      'propertyType': 'Property Type',
      'listingType': 'Listing Type',
      'addressStreet': 'Street Address',
      'addressCity': 'City',
      'addressPostalCode': 'Postal Code',
      'dataProcessingConsent': 'Data Processing Consent',
      'price': 'Price',
      'livingAreaSqm': 'Living Area',
      'rooms': 'Number of Rooms'
    };
    return fieldMap[fieldName] || fieldName;
  }

  private scrollToFirstError(): void {
    setTimeout(() => {
      const firstError = document.querySelector('.ng-invalid:not(form), [data-error="true"]');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  cancel(): void {
    if (this.isEditMode && this.propertyId) {
      this.router.navigate(['/properties', this.propertyId]);
    } else {
      this.router.navigate(['/properties']);
    }
  }

  goToSection(section: 'basic' | 'location' | 'specs' | 'financial' | 'features'): void {
    this.currentSection = section;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.propertyForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.propertyForm.get(fieldName);

    // Check for server-side errors first (most specific)
    if (field?.hasError('serverError')) {
      return field.errors?.['serverError'];
    }

    // Check for backend field errors
    if (this.fieldErrors[fieldName]) {
      return this.fieldErrors[fieldName];
    }

    // Frontend validation errors
    if (field?.hasError('required')) return 'This field is required';
    if (field?.hasError('requiredTrue')) return 'You must accept this to continue';
    if (field?.hasError('minlength')) return `Minimum length is ${field.errors?.['minlength'].requiredLength}`;
    if (field?.hasError('maxlength')) return `Maximum length is ${field.errors?.['maxlength'].requiredLength}`;
    if (field?.hasError('min')) return `Minimum value is ${field.errors?.['min'].min}`;
    if (field?.hasError('max')) return `Maximum value is ${field.errors?.['max'].max}`;
    if (field?.hasError('pattern')) return 'Invalid format';
    if (field?.hasError('email')) return 'Invalid email address';
    return '';
  }

  // Form persistence methods
  private checkForSavedDraft(): void {
    const savedForm = localStorage.getItem(this.FORM_STORAGE_KEY);
    const sessionId = sessionStorage.getItem(this.SESSION_STORAGE_KEY);
    const currentSessionId = this.generateSessionId();

    // If there's a saved form and it's from a different session, offer to restore
    if (savedForm && sessionId !== currentSessionId) {
      this.showRestoreDialog = true;
    }

    // Set current session ID
    sessionStorage.setItem(this.SESSION_STORAGE_KEY, currentSessionId);
  }

  private generateSessionId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  private setupAutoSave(): void {
    this.propertyForm.valueChanges
      .pipe(
        debounceTime(1000), // Wait 1 second after user stops typing
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (!this.isFormEmpty()) {
          this.saveFormDraft();
          this.hasUnsavedChanges = true;
        }
      });
  }

  private isFormEmpty(): boolean {
    const formValue = this.propertyForm.value;
    return !Object.values(formValue).some(value => {
      if (typeof value === 'string') return value.trim() !== '';
      return value !== null && value !== undefined;
    });
  }

  private saveFormDraft(): void {
    const formData = {
      ...this.propertyForm.value,
      currentSection: this.currentSection,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(this.FORM_STORAGE_KEY, JSON.stringify(formData));
  }

  public restoreFromDraft(): void {
    const savedForm = localStorage.getItem(this.FORM_STORAGE_KEY);
    if (savedForm) {
      try {
        const formData = JSON.parse(savedForm);
        this.propertyForm.patchValue(formData);
        this.currentSection = formData.currentSection || 'basic';
        this.hasUnsavedChanges = true;
      } catch (error) {
        console.error('Error restoring form draft:', error);
      }
    }
    this.showRestoreDialog = false;
  }

  public discardDraft(): void {
    localStorage.removeItem(this.FORM_STORAGE_KEY);
    this.showRestoreDialog = false;
  }

  public clearSavedDraft(): void {
    localStorage.removeItem(this.FORM_STORAGE_KEY);
    sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
    this.hasUnsavedChanges = false;
  }

  @HostListener('window:beforeunload', ['$event'])
  unloadNotification($event: any): void {
    if (this.hasUnsavedChanges && !this.isEditMode) {
      $event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
  }
}
