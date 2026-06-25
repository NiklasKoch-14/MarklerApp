import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { ViewingService, ViewingResponse, ViewingFeedback } from '../../services/viewing.service';
import { ClientService, Client } from '../../../client-management/services/client.service';
import { PropertyService } from '../../../property-management/services/property.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-viewing-add-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LoadingSpinnerComponent],
  template: `
    <!-- Backdrop -->
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;"
         (click)="onBackdropClick($event)">

      <!-- Modal -->
      <div style="background:var(--surface);border-radius:12px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);"
           (click)="$event.stopPropagation()">

        <!-- Header -->
        <div style="padding:20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
          <div>
            <h2 style="font-size:18px;font-weight:600;color:var(--text-1);margin:0;">Besichtigung erfassen</h2>
            <p style="font-size:13px;color:var(--text-3);margin:4px 0 0;">
              {{ mode === 'from-client' ? 'Immobilie auswählen und Termin festhalten' : 'Kunden auswählen und Termin festhalten' }}
            </p>
          </div>
          <button (click)="cancel()" style="border:none;background:none;cursor:pointer;padding:8px;color:var(--text-3);font-size:20px;line-height:1;">
            <i class="ph ph-x"></i>
          </button>
        </div>

        <!-- Form -->
        <form [formGroup]="form" (ngSubmit)="submit()" style="padding:24px;">

          <!-- Preselected entity badge -->
          <div *ngIf="mode === 'from-client' && preselectedClientName" style="margin-bottom:20px;">
            <label style="font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px;">Kunde</label>
            <div style="padding:10px 14px;background:var(--surface-2);border-radius:8px;border:1px solid var(--border);font-size:14px;color:var(--text-1);display:flex;align-items:center;gap:8px;">
              <i class="ph ph-user" style="color:var(--primary);"></i>
              {{ preselectedClientName }}
            </div>
          </div>

          <div *ngIf="mode === 'from-property' && preselectedPropertyTitle" style="margin-bottom:20px;">
            <label style="font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px;">Immobilie</label>
            <div style="padding:10px 14px;background:var(--surface-2);border-radius:8px;border:1px solid var(--border);font-size:14px;color:var(--text-1);display:flex;align-items:center;gap:8px;">
              <i class="ph ph-house" style="color:var(--primary);"></i>
              {{ preselectedPropertyTitle }}
            </div>
          </div>

          <!-- Property search (when opened from client) -->
          <div *ngIf="mode === 'from-client'" style="margin-bottom:20px;">
            <label style="font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px;">
              Immobilie <span style="color:var(--error);">*</span>
            </label>
            <div *ngIf="!selectedProperty" style="position:relative;">
              <input type="text" [formControl]="propertySearch"
                     placeholder="Immobilie suchen..."
                     style="width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--surface);color:var(--text-1);outline:none;box-sizing:border-box;"
                     (focus)="showPropertyDropdown = true">
              <div *ngIf="showPropertyDropdown && propertyResults.length > 0"
                   style="position:absolute;top:100%;left:0;right:0;background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:10;max-height:200px;overflow-y:auto;margin-top:4px;">
                <button type="button" *ngFor="let prop of propertyResults"
                        (click)="selectProperty(prop)"
                        style="width:100%;text-align:left;padding:10px 14px;border:none;background:none;cursor:pointer;font-size:14px;color:var(--text-1);"
                        class="property-option">
                  <div style="font-weight:500;">{{ prop.title }}</div>
                  <div style="font-size:12px;color:var(--text-3);">{{ prop.addressCity }}</div>
                </button>
              </div>
              <div *ngIf="searchingProperties" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);">
                <app-loading-spinner size="xs" [centered]="false"></app-loading-spinner>
              </div>
            </div>
            <div *ngIf="selectedProperty"
                 style="padding:10px 14px;background:var(--surface-2);border-radius:8px;border:1px solid var(--primary);font-size:14px;color:var(--text-1);display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:8px;">
                <i class="ph ph-house" style="color:var(--primary);"></i>
                <div>
                  <div style="font-weight:500;">{{ selectedProperty.title }}</div>
                  <div style="font-size:12px;color:var(--text-3);">{{ selectedProperty.addressCity }}</div>
                </div>
              </div>
              <button type="button" (click)="clearProperty()" style="border:none;background:none;cursor:pointer;color:var(--text-3);font-size:16px;">
                <i class="ph ph-x"></i>
              </button>
            </div>
          </div>

          <!-- Client search (when opened from property) -->
          <div *ngIf="mode === 'from-property'" style="margin-bottom:20px;">
            <label style="font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px;">
              Kunde <span style="color:var(--error);">*</span>
            </label>
            <div *ngIf="!selectedClient" style="position:relative;">
              <input type="text" [formControl]="clientSearch"
                     placeholder="Kunde suchen..."
                     style="width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--surface);color:var(--text-1);outline:none;box-sizing:border-box;"
                     (focus)="showClientDropdown = true">
              <div *ngIf="showClientDropdown && clientResults.length > 0"
                   style="position:absolute;top:100%;left:0;right:0;background:var(--surface);border:1px solid var(--border);border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:10;max-height:200px;overflow-y:auto;margin-top:4px;">
                <button type="button" *ngFor="let client of clientResults"
                        (click)="selectClient(client)"
                        style="width:100%;text-align:left;padding:10px 14px;border:none;background:none;cursor:pointer;font-size:14px;color:var(--text-1);">
                  <div style="font-weight:500;">{{ client.firstName }} {{ client.lastName }}</div>
                  <div style="font-size:12px;color:var(--text-3);">{{ client.email }}</div>
                </button>
              </div>
              <div *ngIf="searchingClients" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);">
                <app-loading-spinner size="xs" [centered]="false"></app-loading-spinner>
              </div>
            </div>
            <div *ngIf="selectedClient"
                 style="padding:10px 14px;background:var(--surface-2);border-radius:8px;border:1px solid var(--primary);font-size:14px;color:var(--text-1);display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:8px;">
                <i class="ph ph-user" style="color:var(--primary);"></i>
                <div>
                  <div style="font-weight:500;">{{ selectedClient.firstName }} {{ selectedClient.lastName }}</div>
                  <div style="font-size:12px;color:var(--text-3);">{{ selectedClient.email }}</div>
                </div>
              </div>
              <button type="button" (click)="clearClient()" style="border:none;background:none;cursor:pointer;color:var(--text-3);font-size:16px;">
                <i class="ph ph-x"></i>
              </button>
            </div>
          </div>

          <!-- Viewing date -->
          <div style="margin-bottom:20px;">
            <label style="font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px;">
              Datum &amp; Uhrzeit <span style="color:var(--error);">*</span>
            </label>
            <input type="datetime-local" formControlName="viewingDate"
                   style="width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--surface);color:var(--text-1);outline:none;box-sizing:border-box;">
            <div *ngIf="form.get('viewingDate')?.invalid && form.get('viewingDate')?.touched"
                 style="margin-top:4px;font-size:12px;color:var(--error);">
              Datum ist erforderlich
            </div>
          </div>

          <!-- Feedback -->
          <div style="margin-bottom:20px;">
            <label style="font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:8px;">
              Feedback des Kunden
            </label>
            <div style="display:flex;gap:8px;">
              <button type="button" *ngFor="let option of feedbackOptions"
                      (click)="setFeedback(option.value)"
                      [style.background]="form.get('feedback')?.value === option.value ? option.bg : 'var(--surface-2)'"
                      [style.border-color]="form.get('feedback')?.value === option.value ? option.color : 'var(--border)'"
                      [style.color]="form.get('feedback')?.value === option.value ? option.color : 'var(--text-2)'"
                      style="flex:1;padding:8px 12px;border-radius:8px;border:1.5px solid;cursor:pointer;font-size:13px;font-weight:500;transition:all .15s;">
                {{ option.icon }} {{ option.label }}
              </button>
            </div>
          </div>

          <!-- Notes -->
          <div style="margin-bottom:20px;">
            <label style="font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px;">
              Notizen
            </label>
            <textarea formControlName="clientNotes" rows="3"
                      placeholder="Was hat der Kunde gesagt? Besondere Wünsche?"
                      style="width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--surface);color:var(--text-1);outline:none;resize:vertical;box-sizing:border-box;font-family:inherit;">
            </textarea>
          </div>

          <!-- Follow-up action -->
          <div style="margin-bottom:24px;">
            <label style="font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px;">
              Nächster Schritt
            </label>
            <input type="text" formControlName="followUpAction"
                   placeholder="z.B. Zweittermin vereinbaren, Finanzierungsnachweis anfordern..."
                   style="width:100%;padding:10px 14px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--surface);color:var(--text-1);outline:none;box-sizing:border-box;">
          </div>

          <!-- Error -->
          <div *ngIf="errorMessage" style="margin-bottom:16px;padding:12px 14px;background:var(--error-bg,#fef2f2);border-radius:8px;border:1px solid var(--error);font-size:13px;color:var(--error);">
            {{ errorMessage }}
          </div>

          <!-- Actions -->
          <div style="display:flex;gap:12px;">
            <button type="button" (click)="cancel()"
                    style="flex:1;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface-2);color:var(--text-2);font-size:14px;font-weight:500;cursor:pointer;">
              Abbrechen
            </button>
            <button type="submit" [disabled]="!canSubmit() || isSubmitting"
                    style="flex:2;padding:10px;border:none;border-radius:8px;background:var(--primary);color:#fff;font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;"
                    [style.opacity]="!canSubmit() || isSubmitting ? '0.6' : '1'">
              <app-loading-spinner *ngIf="isSubmitting" size="xs" [centered]="false"></app-loading-spinner>
              {{ isSubmitting ? 'Speichern...' : 'Besichtigung speichern' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .property-option:hover { background: var(--surface-2) !important; }
  `]
})
export class ViewingAddDialogComponent implements OnInit, OnDestroy {
  @Input() mode: 'from-client' | 'from-property' = 'from-client';
  @Input() preselectedClientId?: string;
  @Input() preselectedClientName?: string;
  @Input() preselectedPropertyId?: string;
  @Input() preselectedPropertyTitle?: string;

  @Output() viewingCreated = new EventEmitter<ViewingResponse>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;
  propertySearch = this.fb.control('');
  clientSearch = this.fb.control('');

  propertyResults: any[] = [];
  clientResults: any[] = [];
  selectedProperty: any = null;
  selectedClient: any = null;

  showPropertyDropdown = false;
  showClientDropdown = false;
  searchingProperties = false;
  searchingClients = false;
  isSubmitting = false;
  errorMessage = '';

  feedbackOptions = [
    { value: ViewingFeedback.LIKED,    label: 'Gefällt',   icon: '👍', color: '#16a34a', bg: '#f0fdf4' },
    { value: ViewingFeedback.NEUTRAL,  label: 'Neutral',   icon: '🤷', color: '#d97706', bg: '#fffbeb' },
    { value: ViewingFeedback.DISLIKED, label: 'Gefällt nicht', icon: '👎', color: '#dc2626', bg: '#fef2f2' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private viewingService: ViewingService,
    private clientService: ClientService,
    private propertyService: PropertyService
  ) {}

  ngOnInit(): void {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);

    this.form = this.fb.group({
      viewingDate: [localIso, Validators.required],
      feedback: [null],
      clientNotes: [''],
      followUpAction: ['']
    });

    // Property search autocomplete
    this.propertySearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.length < 2) { this.propertyResults = []; return of(null); }
        this.searchingProperties = true;
        return this.propertyService.getProperties(0, 10).pipe(catchError(() => of(null)));
      }),
      takeUntil(this.destroy$)
    ).subscribe((result: any) => {
      this.searchingProperties = false;
      if (result) {
        const query = (this.propertySearch.value || '').toLowerCase();
        this.propertyResults = (result.content || []).filter((p: any) =>
          p.title?.toLowerCase().includes(query) || p.addressCity?.toLowerCase().includes(query)
        );
      }
    });

    // Client search autocomplete
    this.clientSearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.length < 2) { this.clientResults = []; return of(null); }
        this.searchingClients = true;
        return this.clientService.searchClients(query, 0, 10).pipe(catchError(() => of(null)));
      }),
      takeUntil(this.destroy$)
    ).subscribe((result: any) => {
      this.searchingClients = false;
      if (result) this.clientResults = result.content || [];
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setFeedback(value: ViewingFeedback): void {
    const current = this.form.get('feedback')?.value;
    this.form.patchValue({ feedback: current === value ? null : value });
  }

  selectProperty(prop: any): void {
    this.selectedProperty = prop;
    this.showPropertyDropdown = false;
    this.propertyResults = [];
  }

  clearProperty(): void {
    this.selectedProperty = null;
    this.propertySearch.setValue('');
  }

  selectClient(client: Client): void {
    this.selectedClient = client;
    this.showClientDropdown = false;
    this.clientResults = [];
  }

  clearClient(): void {
    this.selectedClient = null;
    this.clientSearch.setValue('');
  }

  canSubmit(): boolean {
    if (!this.form.valid) return false;
    if (this.mode === 'from-client') return !!this.selectedProperty || !!this.preselectedPropertyId;
    if (this.mode === 'from-property') return !!this.selectedClient || !!this.preselectedClientId;
    return false;
  }

  submit(): void {
    if (!this.canSubmit() || this.isSubmitting) return;
    this.isSubmitting = true;
    this.errorMessage = '';

    const clientId = this.mode === 'from-client' ? this.preselectedClientId! : this.selectedClient?.id;
    const propertyId = this.mode === 'from-property' ? this.preselectedPropertyId! : this.selectedProperty?.id;
    const raw = this.form.value;

    const localDate = raw.viewingDate;
    const isoDate = localDate.length === 16 ? localDate + ':00' : localDate;

    this.viewingService.createViewing({
      clientId,
      propertyId,
      viewingDate: isoDate,
      feedback: raw.feedback || undefined,
      clientNotes: raw.clientNotes || undefined,
      followUpAction: raw.followUpAction || undefined
    }).subscribe({
      next: (viewing) => {
        this.isSubmitting = false;
        this.viewingCreated.emit(viewing);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err?.error?.message || 'Fehler beim Speichern der Besichtigung';
      }
    });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    this.cancel();
  }
}
