import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, merge } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, map, switchMap, takeUntil } from 'rxjs/operators';
import {
  PropertyService,
  PropertyType,
  ListingType,
  PropertyStatus,
  MandateType,
  HeatingType
} from '../../services/property.service';

import { PropertyImageUploadComponent } from '../property-image-upload/property-image-upload.component';
import { PropertyExposeComponent } from '../property-expose/property-expose.component';
import { PropertyImageDto } from '../../models/property-image.model';
import { PropertyOwner } from '../../services/property.service';
import { PropertyOwnerPickerComponent } from '../property-owner-picker/property-owner-picker.component';
import { GeocodingService } from '../../../../shared/services/geocoding.service';
import { TranslateEnumPipe } from '../../../../shared/pipes/translate-enum.pipe';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ErrorHandlerService } from '../../../../core/services/error-handler.service';

@Component({
  selector: 'app-property-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PropertyImageUploadComponent, PropertyExposeComponent, PropertyOwnerPickerComponent, TranslateEnumPipe, TranslateModule],
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
  currentSection: 'basic' | 'location' | 'specs' | 'financial' | 'features' | 'images' | 'expose' = 'basic';

  // Collapsible sections — essentials open, advanced collapsed by default so the
  // "quick add" flow isn't a wall of fields (progressive disclosure).
  sectionOpen: { [key: string]: boolean } = {
    basic: true,
    location: true,
    specs: true,
    financial: true,
    features: false,
    images: true,
    expose: false,
  };

  // Enum values for dropdowns
  propertyTypes = Object.values(PropertyType);
  listingTypes = Object.values(ListingType);
  propertyStatuses = Object.values(PropertyStatus);
  mandateTypes = Object.values(MandateType);
  heatingTypes = Object.values(HeatingType);

  // Form persistence
  private destroy$ = new Subject<void>();
  private readonly FORM_STORAGE_KEY = 'property-form-draft';
  private readonly SESSION_STORAGE_KEY = 'property-form-session';
  showRestoreDialog = false;
  hasUnsavedChanges = false;

  // Property images
  propertyImages: any[] = []; // Accept both PropertyImage and PropertyImageDto

  // Bereits verknüpfter Eigentümer (#37) — füttert den Picker im Bearbeitungsmodus.
  linkedOwner: PropertyOwner | null = null;

  constructor(
    private fb: FormBuilder,
    public propertyService: PropertyService,
    private router: Router,
    private route: ActivatedRoute,
    private translate: TranslateService,
    private errorHandler: ErrorHandlerService,
    private geocodingService: GeocodingService
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
      addressCountry: ['Deutschland'],
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

      // Auftrag (Issue #39) — haengt am Objekt, weil ein Eigentuemer mehrere Objekte
      // mit unterschiedlichen Auftraegen haben kann.
      mandateType: [''],
      mandateStart: [''],
      mandateEnd: [''],
      ownerPriceExpectation: ['', [Validators.min(0)]],
      commissionSellerPercent: ['', [Validators.min(0), Validators.max(100)]],
      commissionBuyerPercent: ['', [Validators.min(0), Validators.max(100)]],

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

      // Eigentümer: verknüpfter Kunde statt Freitext (#37). Steuerung sitzt im Picker,
      // das Formular hält nur die ID.
      ownerClientId: [null as string | null],

      // Additional
      contactPhone: ['', [Validators.pattern('^[+]?[0-9\\s\\-()]*$'), Validators.maxLength(20)]],
      contactEmail: ['', [Validators.email]],
      virtualTourUrl: ['', [Validators.maxLength(500)]],
      notes: ['', [Validators.maxLength(2000)]]
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

    this.setupAddressCompletion();
  }

  // ========================================
  // Adress-Vervollstaendigung (Issue #29)
  // ========================================

  /** Felder, die die Automatik gerade gefuellt hat -- fuer die kurze optische Markierung. */
  autoFilledFields = new Set<string>();

  /**
   * Zwei Richtungen mit unterschiedlicher Verlaesslichkeit:
   *
   * 1. PLZ -> Ort, Bundesland, Stadtteil. In Deutschland nahezu eindeutig, wird
   *    automatisch gefuellt.
   * 2. Strasse + Ort -> PLZ. Bewusst NUR mit Strasse. Aus dem Ort allein waere die
   *    PLZ geraten -- Berlin hat rund 190 -- und nach der PLZ wird spaeter gefiltert
   *    und gematcht, eine falsche ist schlimmer als eine leere.
   *
   * Ueberschrieben wird nie: nur leere Felder werden ergaenzt. Was der Makler selbst
   * getippt hat, gewinnt immer gegen den Geocoder.
   */
  private setupAddressCompletion(): void {
    const plz = this.propertyForm.get('addressPostalCode');
    const street = this.propertyForm.get('addressStreet');
    const city = this.propertyForm.get('addressCity');
    if (!plz || !street || !city) return;

    // 400 ms wie die Kartensuche -- Nominatim erlaubt rund 1 Anfrage/Sekunde.
    plz.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      filter((value: string) => /^[0-9]{5}$/.test((value ?? '').trim())),
      switchMap((value: string) => this.geocodingService.lookupAddress({ postalCode: value.trim() })),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (!result) return;
      this.fillIfEmpty('addressCity', result.city);
      this.fillIfEmpty('addressState', result.state);
      this.fillIfEmpty('addressDistrict', result.district);
    });

    // Richtung 2 loest erst aus, wenn Strasse UND Ort stehen und die PLZ leer ist.
    merge(street.valueChanges, city.valueChanges).pipe(
      debounceTime(600),
      map(() => ({
        street: (street.value ?? '').trim(),
        city: (city.value ?? '').trim(),
        plz: (plz.value ?? '').trim(),
      })),
      filter(v => v.street.length > 2 && v.city.length > 1 && v.plz.length === 0),
      distinctUntilChanged((a, b) => a.street === b.street && a.city === b.city),
      switchMap(v => this.geocodingService.lookupAddress({ street: v.street, city: v.city })),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (!result?.postalCode) return;
      this.fillIfEmpty('addressPostalCode', result.postalCode);
      this.fillIfEmpty('addressState', result.state);
    });
  }

  /** Ergaenzt nur leere Felder und markiert sie kurz, damit die Herkunft erkennbar ist. */
  private fillIfEmpty(controlName: string, value?: string | null): void {
    if (!value) return;
    const control = this.propertyForm.get(controlName);
    if (!control) return;
    const current = (control.value ?? '').toString().trim();
    if (current.length > 0) return;

    control.setValue(value);
    control.markAsDirty();
    this.autoFilledFields.add(controlName);
    setTimeout(() => this.autoFilledFields.delete(controlName), 2500);
  }

  isAutoFilled(controlName: string): boolean {
    return this.autoFilledFields.has(controlName);
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

          mandateType: property.mandateType ?? '',
          mandateStart: property.mandateStart ?? '',
          mandateEnd: property.mandateEnd ?? '',
          ownerPriceExpectation: property.ownerPriceExpectation,
          commissionSellerPercent: property.commissionSellerPercent,
          commissionBuyerPercent: property.commissionBuyerPercent,

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

          ownerClientId: property.ownerClientId ?? null,
          contactPhone: property.contactPhone,
          contactEmail: property.contactEmail,
          virtualTourUrl: property.virtualTourUrl,
          notes: property.notes
        });

        this.linkedOwner = property.owner ?? null;

        // Load property images if they exist
        if (property.images) {
          this.propertyImages = property.images;
        }

        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = this.errorHandler.getUserMessage(error);
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
      this.openAllSections();
      this.errorMessage = this.translate.instant('properties.form.fillRequiredFields');
      this.scrollToFirstError();
    }
  }

  private handleSubmitError(error: any): void {
    console.error('Error submitting property:', error);

    // Check if backend sent field-specific errors
    if (error.fieldErrors) {
      this.fieldErrors = error.fieldErrors;

      // Build a detailed error message listing which fields failed
      const fieldNames = Object.keys(this.fieldErrors);
      if (fieldNames.length > 0) {
        const fieldList = fieldNames
          .map(field => this.getFieldDisplayName(field))
          .join(', ');
        this.errorMessage = this.translate.instant('properties.form.validationFailedFields', { fields: fieldList });
      } else {
        this.errorMessage = this.errorHandler.getUserMessage(error);
      }

      // Mark fields with errors as touched
      Object.keys(this.fieldErrors).forEach(fieldName => {
        const control = this.propertyForm.get(fieldName);
        if (control) {
          control.markAsTouched();
          control.setErrors({ serverError: this.fieldErrors[fieldName] });
        }
      });

      this.openAllSections();
      this.scrollToFirstError();
    } else {
      this.errorMessage = this.errorHandler.getUserMessage(error);
    }
  }

  private getFieldDisplayName(fieldName: string): string {
    const fieldKeyMap: { [key: string]: string } = {
      'title': 'properties.form.title',
      'propertyType': 'properties.form.propertyType',
      'listingType': 'properties.form.listingType',
      'addressStreet': 'properties.form.addressStreet',
      'addressCity': 'properties.form.addressCity',
      'addressPostalCode': 'properties.form.addressPostalCode',
      'price': 'properties.form.price',
      'livingAreaSqm': 'properties.form.livingArea',
      'rooms': 'properties.form.rooms'
    };
    const key = fieldKeyMap[fieldName];
    return key ? this.translate.instant(key) : fieldName;
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
    // ownerClientId bleibt draussen: eine gespeicherte Kunden-ID ohne die zugehoerigen
    // Anzeigedaten wuerde beim Wiederherstellen einen Eigentuemer suggerieren, den der
    // Picker gar nicht anzeigen kann.
    const { ownerClientId, ...draftValues } = this.propertyForm.value;
    const formData = {
      ...draftValues,
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
        delete formData.ownerClientId;
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

  /**
   * Eigentümer-Auswahl aus dem Picker übernehmen (#37). null heißt "Zuordnung entfernt"
   * und wird bewusst mitgesendet — das Backend unterscheidet das von "nicht gesendet".
   */
  onOwnerChanged(clientId: string | null): void {
    this.propertyForm.get('ownerClientId')?.setValue(clientId);
    this.propertyForm.get('ownerClientId')?.markAsDirty();
  }

  /**
   * Handle property images changes from the upload component
   */
  onImagesChanged(images: any[]): void {
    this.propertyImages = images;
  }

  /**
   * Navigate to a specific form section: open it (if collapsed) and scroll it into view.
   */
  goToSection(section: 'basic' | 'location' | 'specs' | 'financial' | 'features' | 'images' | 'expose'): void {
    this.currentSection = section;
    this.sectionOpen[section] = true;
    setTimeout(() => {
      document.getElementById(`section-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /** Toggle a collapsible form section open/closed. */
  toggleSection(section: string): void {
    this.sectionOpen[section] = !this.sectionOpen[section];
  }

  /** Expand every section — used when a submit fails so hidden errors stay visible. */
  private openAllSections(): void {
    Object.keys(this.sectionOpen).forEach(key => (this.sectionOpen[key] = true));
  }
}
