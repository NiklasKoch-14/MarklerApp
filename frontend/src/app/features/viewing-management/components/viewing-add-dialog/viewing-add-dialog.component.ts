import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { ViewingService, ViewingResponse, ViewingFeedback } from '../../services/viewing.service';
import { ClientService, Client, PipelineStage } from '../../../client-management/services/client.service';
import { PropertyService, Property, ListingType } from '../../../property-management/services/property.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-viewing-add-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LoadingSpinnerComponent],
  template: `
    <!-- ── Shared form body ────────────────────────────────────── -->
    <ng-template #formBody>
      <form [formGroup]="form" (ngSubmit)="submit()" [style.padding]="inline ? '0' : '24px'">

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

        <!-- Property picker (when opened from client) — card dialog -->
        <div *ngIf="mode === 'from-client'" style="margin-bottom:20px;">
          <label style="font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px;">
            Immobilie <span style="color:var(--error);">*</span>
          </label>

          <!-- Selected state -->
          <div *ngIf="selectedProperty"
               style="padding:12px 14px;background:var(--surface-2);border-radius:10px;border:1.5px solid var(--primary);display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <div style="display:flex;align-items:center;gap:12px;min-width:0;">
              <div style="width:36px;height:36px;border-radius:8px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="ph-fill ph-buildings" style="color:var(--primary);font-size:18px;"></i>
              </div>
              <div style="min-width:0;">
                <div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ selectedProperty.title }}</div>
                <div style="font-size:12px;color:var(--text-3);">{{ selectedProperty.addressCity }} · {{ formatPropertyPrice(selectedProperty) }}</div>
              </div>
            </div>
            <button type="button" (click)="clearProperty()" style="border:none;background:none;cursor:pointer;color:var(--text-3);font-size:18px;flex-shrink:0;"><i class="ph ph-x"></i></button>
          </div>

          <!-- Picker trigger button -->
          <button *ngIf="!selectedProperty" type="button" (click)="openPropertyPicker()"
                  style="width:100%;padding:12px 14px;border:1.5px dashed var(--border);border-radius:10px;
                         background:none;cursor:pointer;display:flex;align-items:center;gap:10px;color:var(--text-2);
                         transition:border-color .15s,color .15s;">
            <i class="ph ph-buildings" style="font-size:20px;color:var(--text-3);"></i>
            <span style="font-size:14px;">Immobilie auswählen...</span>
            <i class="ph ph-caret-right" style="margin-left:auto;font-size:14px;color:var(--text-3);"></i>
          </button>
        </div>

        <!-- ── Property Picker Dialog ──────────────────────────────── -->
        <div *ngIf="showPropertyPicker"
             style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2000;display:flex;align-items:center;justify-content:center;padding:16px;"
             (click)="closePropertyPicker()">
          <div style="background:var(--surface);border-radius:14px;width:600px;max-width:95vw;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.3);"
               (click)="$event.stopPropagation()">

            <!-- Header -->
            <div style="padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;">
              <i class="ph-fill ph-buildings" style="color:var(--primary);font-size:20px;"></i>
              <span style="font-size:16px;font-weight:700;color:var(--text);flex:1;">Immobilie auswählen</span>
              <button type="button" (click)="closePropertyPicker()" style="border:none;background:none;cursor:pointer;color:var(--text-3);font-size:20px;line-height:1;"><i class="ph ph-x"></i></button>
            </div>

            <!-- Search -->
            <div style="padding:14px 20px;border-bottom:1px solid var(--border);">
              <div style="position:relative;">
                <i class="ph ph-magnifying-glass" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-3);font-size:15px;"></i>
                <input type="text" [(ngModel)]="propertyPickerSearch" (input)="onPropertyPickerSearch()"
                       placeholder="Titel, Ort oder Typ suchen..."
                       autofocus
                       style="width:100%;padding:9px 14px 9px 36px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--surface-2);color:var(--text-1);outline:none;box-sizing:border-box;">
                <div *ngIf="searchingProperties" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);">
                  <app-loading-spinner size="xs" [centered]="false"></app-loading-spinner>
                </div>
              </div>
            </div>

            <!-- Property cards -->
            <div style="overflow-y:auto;padding:14px 20px;display:flex;flex-direction:column;gap:10px;">
              <div *ngIf="pickerPropertyList.length === 0 && !searchingProperties"
                   style="text-align:center;padding:32px;color:var(--text-3);font-size:13px;">
                <i class="ph ph-house-simple" style="font-size:32px;display:block;margin-bottom:8px;"></i>
                Keine Immobilien gefunden
              </div>

              <button type="button" *ngFor="let p of pickerPropertyList"
                      (click)="selectPropertyFromPicker(p)"
                      style="width:100%;text-align:left;padding:14px;border:1.5px solid var(--border);border-radius:12px;
                             background:var(--surface);cursor:pointer;display:flex;align-items:center;gap:14px;
                             transition:border-color .12s,box-shadow .12s;"
                      class="property-picker-card">
                <!-- Icon / Type -->
                <div style="width:44px;height:44px;border-radius:10px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <i [class]="getPropertyTypeIcon(p)" style="font-size:22px;color:var(--primary);"></i>
                </div>
                <!-- Info -->
                <div style="flex:1;min-width:0;">
                  <div style="font-size:14px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:3px;">{{ p.title }}</div>
                  <div style="font-size:12px;color:var(--text-3);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span><i class="ph ph-map-pin" style="font-size:11px;"></i> {{ p.addressCity }}{{ p.addressPostalCode ? ' ' + p.addressPostalCode : '' }}</span>
                    <span *ngIf="p.rooms">· {{ p.rooms }} Zi.</span>
                    <span *ngIf="p.livingAreaSqm">· {{ p.livingAreaSqm }} m²</span>
                  </div>
                </div>
                <!-- Price + status -->
                <div style="text-align:right;flex-shrink:0;">
                  <div style="font-size:13px;font-weight:700;color:var(--primary);">{{ formatPropertyPrice(p) }}</div>
                  <span [style.background]="getPropertyStatusBg(p.status)"
                        [style.color]="getPropertyStatusColor(p.status)"
                        style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:8px;white-space:nowrap;">
                    {{ getPropertyStatusLabel(p.status) }}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Client picker (when opened from property) — proper list with Hot Lead indicators -->
        <div *ngIf="mode === 'from-property'" style="margin-bottom:20px;">
          <label style="font-size:12px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:6px;">
            Kunde <span style="color:var(--error);">*</span>
          </label>

          <!-- Selected state -->
          <div *ngIf="selectedClient"
               style="padding:10px 14px;background:var(--surface-2);border-radius:8px;border:1px solid var(--primary);font-size:14px;color:var(--text-1);display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:32px;height:32px;border-radius:50%;background:var(--accent-soft);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">
                {{ getClientInitials(selectedClient) }}
              </div>
              <div>
                <div style="font-weight:600;font-size:14px;">{{ selectedClient.firstName }} {{ selectedClient.lastName }}</div>
                <div style="font-size:12px;color:var(--text-3);">{{ selectedClient.addressCity || selectedClient.email }}</div>
              </div>
              <span [style.background]="getClientStageBg(selectedClient.pipelineStage)"
                    [style.color]="getClientStageColor(selectedClient.pipelineStage)"
                    style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;">
                {{ getClientStageLabel(selectedClient.pipelineStage) }}
              </span>
            </div>
            <button type="button" (click)="clearClient()" style="border:none;background:none;cursor:pointer;color:var(--text-3);font-size:16px;"><i class="ph ph-x"></i></button>
          </div>

          <!-- Search + list -->
          <div *ngIf="!selectedClient">
            <!-- Search input -->
            <div style="position:relative;margin-bottom:10px;">
              <i class="ph ph-magnifying-glass" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-3);font-size:15px;"></i>
              <input type="text" [(ngModel)]="clientSearchText" (input)="onClientSearchInput()"
                     placeholder="Nach Namen suchen..."
                     style="width:100%;padding:9px 14px 9px 36px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--surface);color:var(--text-1);outline:none;box-sizing:border-box;">
              <div *ngIf="searchingClients" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);">
                <app-loading-spinner size="xs" [centered]="false"></app-loading-spinner>
              </div>
            </div>

            <!-- Hot leads section (no search active) -->
            <div *ngIf="!clientSearchText && hotLeadClients.length > 0">
              <div style="font-size:11px;font-weight:700;color:var(--color-error);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;display:flex;align-items:center;gap:5px;">
                <i class="ph-fill ph-fire" style="font-size:13px;"></i> Heiße Interessenten
              </div>
              <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:10px;">
                <button type="button" *ngFor="let c of hotLeadClients; let last = last"
                        (click)="selectClient(c)"
                        [style.border-bottom]="last ? 'none' : '1px solid var(--border)'"
                        style="width:100%;text-align:left;padding:10px 14px;border:none;background:none;cursor:pointer;display:flex;align-items:center;gap:10px;"
                        class="client-list-opt">
                  <div style="width:30px;height:30px;border-radius:50%;background:color-mix(in srgb,var(--color-error) 12%,var(--surface));color:var(--color-error);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0;">
                    {{ getClientInitials(c) }}
                  </div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ c.firstName }} {{ c.lastName }}</div>
                    <div style="font-size:11px;color:var(--text-3);">{{ c.addressCity || c.email || '—' }}</div>
                  </div>
                  <span [style.background]="getClientStageBg(c.pipelineStage)"
                        [style.color]="getClientStageColor(c.pipelineStage)"
                        style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;white-space:nowrap;flex-shrink:0;">
                    {{ getClientStageLabel(c.pipelineStage) }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Other clients / search results -->
            <div *ngIf="!clientSearchText && otherClients.length > 0">
              <div style="font-size:11px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">Alle Kunden</div>
            </div>
            <div *ngIf="clientListDisplay.length > 0" style="border:1px solid var(--border);border-radius:10px;overflow:hidden;max-height:220px;overflow-y:auto;">
              <button type="button" *ngFor="let c of clientListDisplay; let last = last"
                      (click)="selectClient(c)"
                      [style.border-bottom]="last ? 'none' : '1px solid var(--border)'"
                      style="width:100%;text-align:left;padding:10px 14px;border:none;background:none;cursor:pointer;display:flex;align-items:center;gap:10px;"
                      class="client-list-opt">
                <div style="width:30px;height:30px;border-radius:50%;background:var(--accent-soft);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0;">
                  {{ getClientInitials(c) }}
                </div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ c.firstName }} {{ c.lastName }}</div>
                  <div style="font-size:11px;color:var(--text-3);">{{ c.addressCity || c.email || '—' }}</div>
                </div>
                <span [style.background]="getClientStageBg(c.pipelineStage)"
                      [style.color]="getClientStageColor(c.pipelineStage)"
                      style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;white-space:nowrap;flex-shrink:0;">
                  {{ getClientStageLabel(c.pipelineStage) }}
                </span>
              </button>
            </div>

            <div *ngIf="clientListDisplay.length === 0 && !searchingClients && clientSearchText"
                 style="text-align:center;padding:16px;color:var(--text-3);font-size:13px;">
              Keine Kunden gefunden
            </div>
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
    </ng-template>

    <!-- ══ INLINE MODE ══════════════════════════════════════════════ -->
    <ng-container *ngIf="inline">
      <div class="viewing-form-enter"
           style="background:var(--surface);border:2px solid var(--color-purple);border-radius:14px;padding:20px 24px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
          <i class="ph-fill ph-door-open" style="font-size:16px;color:var(--color-purple);"></i>
          <span style="font-size:14px;font-weight:700;color:var(--text);">Besichtigung planen</span>
          <button (click)="cancel()"
                  style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--text-3);font-size:18px;line-height:1;">
            <i class="ph ph-x"></i>
          </button>
        </div>
        <ng-container *ngTemplateOutlet="formBody"></ng-container>
      </div>
    </ng-container>

    <!-- ══ DIALOG MODE ══════════════════════════════════════════════ -->
    <ng-container *ngIf="!inline">
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;"
           (click)="onBackdropClick($event)">
        <div style="background:var(--surface);border-radius:12px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);"
             (click)="$event.stopPropagation()">
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
          <ng-container *ngTemplateOutlet="formBody"></ng-container>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .property-option:hover { background: var(--surface-2) !important; }
    .client-list-opt:hover { background: var(--surface-2) !important; }
    .property-picker-card:hover { border-color: var(--primary) !important; box-shadow: 0 2px 12px rgba(47,107,122,.12) !important; }
    .viewing-form-enter { animation: slideDown .18s ease; }
    @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
  `]
})
export class ViewingAddDialogComponent implements OnInit, OnDestroy {
  @Input() mode: 'from-client' | 'from-property' = 'from-client';
  @Input() inline = false;
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

  // New client picker state
  clientSearchText = '';
  hotLeadClients: Client[] = [];
  otherClients: Client[] = [];
  clientListDisplay: Client[] = [];

  // Property picker dialog state
  showPropertyPicker = false;
  propertyPickerSearch = '';
  pickerPropertyList: Property[] = [];
  allProperties: Property[] = [];

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

    // Client search autocomplete (legacy, still used for property search)
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

    // Pre-load properties for the card picker (from-client mode)
    if (this.mode === 'from-client') {
      this.propertyService.getProperties(0, 100).pipe(
        catchError(() => of({ content: [] })),
        takeUntil(this.destroy$)
      ).subscribe((result: any) => {
        this.allProperties = result.content || [];
        this.pickerPropertyList = this.allProperties;
      });
    }

    // Pre-load clients for the new list picker (from-property mode)
    if (this.mode === 'from-property') {
      this.clientService.getClients(0, 100).pipe(
        catchError(() => of({ content: [] })),
        takeUntil(this.destroy$)
      ).subscribe((result: any) => {
        const all: Client[] = result.content || [];
        const hotStages: string[] = [PipelineStage.ACTIVE_SEARCH, PipelineStage.VIEWING];
        this.hotLeadClients = all.filter(c => hotStages.includes(c.pipelineStage as string));
        this.otherClients = all.filter(c => !hotStages.includes(c.pipelineStage as string));
        this.clientListDisplay = this.otherClients;
      });
    }
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
    this.propertyPickerSearch = '';
    this.pickerPropertyList = this.allProperties;
  }

  openPropertyPicker(): void {
    this.propertyPickerSearch = '';
    this.pickerPropertyList = this.allProperties;
    this.showPropertyPicker = true;
  }

  closePropertyPicker(): void {
    this.showPropertyPicker = false;
  }

  selectPropertyFromPicker(prop: Property): void {
    this.selectedProperty = prop;
    this.showPropertyPicker = false;
  }

  onPropertyPickerSearch(): void {
    const q = this.propertyPickerSearch.toLowerCase().trim();
    if (!q) {
      this.pickerPropertyList = this.allProperties;
      return;
    }
    this.pickerPropertyList = this.allProperties.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.addressCity?.toLowerCase().includes(q) ||
      p.addressPostalCode?.toLowerCase().includes(q) ||
      p.propertyType?.toLowerCase().includes(q)
    );
  }

  formatPropertyPrice(prop: Property): string {
    if (!prop.price) return '—';
    const fmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(prop.price);
    return prop.listingType === ListingType.RENT ? fmt + '/Mo' : fmt;
  }

  getPropertyTypeIcon(prop: Property): string {
    switch (prop.propertyType) {
      case 'APARTMENT':  return 'ph-fill ph-buildings';
      case 'HOUSE':      return 'ph-fill ph-house';
      case 'TOWNHOUSE':  return 'ph-fill ph-house-line';
      case 'PENTHOUSE':  return 'ph-fill ph-building-apartment';
      default:           return 'ph-fill ph-buildings';
    }
  }

  getPropertyStatusLabel(status?: string): string {
    switch (status) {
      case 'AVAILABLE':  return 'Verfügbar';
      case 'RESERVED':   return 'Reserviert';
      case 'SOLD':       return 'Verkauft';
      case 'RENTED':     return 'Vermietet';
      default:           return status ?? '—';
    }
  }

  getPropertyStatusBg(status?: string): string {
    switch (status) {
      case 'AVAILABLE': return 'color-mix(in srgb,var(--color-success) 14%,var(--surface))';
      case 'RESERVED':  return 'color-mix(in srgb,var(--color-warning) 14%,var(--surface))';
      default:          return 'var(--surface-2)';
    }
  }

  getPropertyStatusColor(status?: string): string {
    switch (status) {
      case 'AVAILABLE': return 'var(--color-success)';
      case 'RESERVED':  return 'var(--color-warning)';
      case 'SOLD':      return 'var(--text-3)';
      case 'RENTED':    return 'var(--text-3)';
      default:          return 'var(--text-3)';
    }
  }

  selectClient(client: Client): void {
    this.selectedClient = client;
    this.showClientDropdown = false;
    this.clientResults = [];
  }

  clearClient(): void {
    this.selectedClient = null;
    this.clientSearch.setValue('');
    this.clientSearchText = '';
    this.clientListDisplay = this.otherClients;
  }

  onClientSearchInput(): void {
    const q = this.clientSearchText.toLowerCase().trim();
    if (!q) {
      this.clientListDisplay = this.otherClients;
      return;
    }
    this.searchingClients = true;
    this.clientService.searchClients(q, 0, 20).pipe(
      catchError(() => of({ content: [] })),
      takeUntil(this.destroy$)
    ).subscribe((result: any) => {
      this.searchingClients = false;
      this.clientListDisplay = result.content || [];
    });
  }

  getClientInitials(client: Client): string {
    const f = client.firstName?.charAt(0)?.toUpperCase() || '';
    const l = client.lastName?.charAt(0)?.toUpperCase() || '';
    return f + l;
  }

  getClientStageBg(stage?: PipelineStage): string {
    switch (stage) {
      case PipelineStage.ACTIVE_SEARCH: return 'color-mix(in srgb,var(--stage-active-search) 14%,var(--surface))';
      case PipelineStage.VIEWING:       return 'color-mix(in srgb,var(--stage-viewing) 14%,var(--surface))';
      case PipelineStage.CLOSED:        return 'color-mix(in srgb,var(--color-success) 14%,var(--surface))';
      default:                          return 'var(--surface-2)';
    }
  }

  getClientStageColor(stage?: PipelineStage): string {
    switch (stage) {
      case PipelineStage.PROSPECT:      return 'var(--stage-prospect)';
      case PipelineStage.ACTIVE_SEARCH: return 'var(--stage-active-search)';
      case PipelineStage.VIEWING:       return 'var(--stage-viewing)';
      case PipelineStage.CLOSED:        return 'var(--color-success)';
      default:                          return 'var(--text-3)';
    }
  }

  getClientStageLabel(stage?: PipelineStage): string {
    switch (stage) {
      case PipelineStage.PROSPECT:      return 'Interessent';
      case PipelineStage.ACTIVE_SEARCH: return 'Aktive Suche';
      case PipelineStage.VIEWING:       return 'Besichtigung';
      case PipelineStage.CLOSED:        return 'Abgeschlossen';
      default:                          return '—';
    }
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
