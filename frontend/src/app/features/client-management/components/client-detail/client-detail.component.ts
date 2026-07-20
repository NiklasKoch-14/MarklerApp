import { Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ClientService, Client, PipelineStage, ClientType, FinancingStatus, MoveInTimeline } from '../../services/client.service';
import { CallNotesService, CallNoteSummary, BulkSummary, PagedResponse, CallNoteCreateRequest, CallType, CallOutcome, VoiceNoteDraft } from '../../../call-notes/services/call-notes.service';
import { ViewingService, ViewingSummary, ViewingStatus } from '../../../viewing-management/services/viewing.service';
import { ViewingAddDialogComponent } from '../../../viewing-management/components/viewing-add-dialog/viewing-add-dialog.component';
import { FileAttachmentManagerComponent } from '../../../../shared/components/file-attachment-manager/file-attachment-manager.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { PropertyMatchingService } from '../../../property-management/services/property-matching.service';
import { PropertyMatchResult } from '../../../property-management/models/property-match.model';
import { TranslateEnumPipe } from '../../../../shared/pipes/translate-enum.pipe';
import { LocationPickerMapComponent } from '../../../../shared/components/location-picker-map/location-picker-map.component';
import { GeocodingService } from '../../../../shared/services/geocoding.service';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, FileAttachmentManagerComponent, LoadingSpinnerComponent, ViewingAddDialogComponent, TranslateEnumPipe, ConfirmDialogComponent, LocationPickerMapComponent],
  styles: [`
    .stage-option:hover { background:var(--surface-2) !important; }
    .qm-item { display:flex; align-items:center; gap:10px; width:100%; padding:10px 14px; border:none; background:none; cursor:pointer; font-size:13px; font-weight:500; color:var(--text); text-align:left; font-family:inherit; transition:background 0.1s; }
    .qm-item:hover { background:var(--surface-2); }
    .qm-item.danger { color:var(--color-error); }
    .qm-item.danger:hover { background:var(--color-error-soft); }
    .note-form-enter { animation:slideDown .18s ease; }
    @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
    .detail-modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:999; animation:modalFade .15s ease; }
    .detail-modal-card { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:1000; width:calc(100% - 32px); max-width:560px; max-height:calc(100vh - 48px); overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.3); animation:modalPop .18s ease; }
    @keyframes modalFade { from { opacity:0; } to { opacity:1; } }
    @keyframes modalPop { from { opacity:0; transform:translate(-50%,-48%) scale(.98); } to { opacity:1; transform:translate(-50%,-50%) scale(1); } }
    .rec-dot { width:8px; height:8px; border-radius:50%; background:var(--color-error); display:inline-block; flex-shrink:0; animation:recPulse 1.1s ease infinite; }
    @keyframes recPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.35; transform:scale(.8); } }
    .tl-row { display:flex; align-items:flex-start; gap:12px; padding:14px 0; border-bottom:1px solid var(--border); }
    .tl-row:last-child { border-bottom:none; }
    .match-link:hover { background:var(--surface) !important; }
  `],
  template: `
    <div class="detail-page">
      <div *ngIf="isLoading" style="text-align:center;padding:48px 0;">
        <app-loading-spinner size="lg"></app-loading-spinner>
      </div>

      <div *ngIf="!isLoading && client">

        <!-- Back link -->
        <a routerLink="/clients"
           style="display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--text-3);text-decoration:none;margin-bottom:20px;">
          <i class="ri-arrow-left-line" style="font-size:14px;"></i>
          {{ 'clients.backToClients' | translate }}
        </a>

        <!-- ══ HERO CARD ══════════════════════════════════════════ -->
        <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:18px;padding:24px 28px;margin-bottom:16px;">
          <div class="hero-row" style="display:flex;align-items:flex-start;gap:16px;">

            <!-- Name + contact + stage -->
            <div style="flex:1;min-width:0;">
              <h1 style="font-size:22px;font-weight:800;color:var(--text);margin:0 0 8px;line-height:1.2;">
                {{ client.firstName }} {{ client.lastName }}
              </h1>
              <!-- Inline contact row -->
              <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                <a *ngIf="client.phone" [href]="'tel:' + client.phone"
                   style="display:flex;align-items:center;gap:5px;font-size:13px;color:var(--text-2);text-decoration:none;">
                  <i class="ri-phone-line" style="font-size:13px;color:var(--text-3);flex-shrink:0;"></i>
                  {{ client.phone }}
                </a>
                <a *ngIf="client.email" [href]="'mailto:' + client.email"
                   style="display:flex;align-items:center;gap:5px;font-size:13px;color:var(--text-2);text-decoration:none;">
                  <i class="ri-mail-line" style="font-size:13px;color:var(--text-3);flex-shrink:0;"></i>
                  {{ client.email }}
                </a>
                <span *ngIf="client.addressCity"
                      style="display:flex;align-items:center;gap:5px;font-size:13px;color:var(--text-2);">
                  <i class="ri-map-pin-line" style="font-size:13px;color:var(--text-3);flex-shrink:0;"></i>
                  <span>{{ client.addressStreet ? client.addressStreet + ', ' : '' }}{{ client.addressCity }}</span>
                </span>
              </div>
              <!-- Stage + last contact -->
              <div style="display:flex;align-items:center;gap:10px;margin-top:10px;flex-wrap:wrap;">
                <div *ngIf="client.id" style="position:relative;">
                  <button (click)="stageDropdownOpen = !stageDropdownOpen"
                          [style.background]="getStageBg(client.pipelineStage)"
                          [style.color]="getStageColor(client.pipelineStage)"
                          style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:20px;border:none;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;">
                    {{ getStageLabel(client.pipelineStage) }}
                    <i class="ri-arrow-down-s-line" style="font-size:11px;"></i>
                  </button>
                  <div *ngIf="stageDropdownOpen" (click)="stageDropdownOpen = false"
                       style="position:fixed;inset:0;z-index:99;"></div>
                  <div *ngIf="stageDropdownOpen"
                       style="position:absolute;top:100%;left:0;margin-top:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:100;min-width:160px;overflow:hidden;">
                    <button *ngFor="let s of pipelineStages" (click)="setStage(s.value)"
                            class="stage-option"
                            style="width:100%;text-align:left;padding:9px 14px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:500;"
                            [style.color]="getStageColor(s.value)">
                      {{ s.label }}
                    </button>
                  </div>
                </div>
                <span *ngIf="callNotesSummary?.lastCallDate"
                      style="font-size:12px;color:var(--text-3);display:flex;align-items:center;gap:4px;">
                  <i class="ri-time-line" style="font-size:12px;"></i>
                  Letzter Kontakt {{ callNotesSummary!.lastCallDate | date:'dd.MM.yy' }}
                </span>
                <span *ngIf="!callNotesSummary?.lastCallDate"
                      style="font-size:12px;color:var(--text-3);">Noch kein Kontakt</span>
              </div>
            </div>

            <!-- Right: action buttons -->
            <div class="hero-actions" style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
              <!-- Follow-up button (only if pending) -->
              <button *ngIf="(callNotesSummary?.pendingFollowUps || 0) > 0"
                      (click)="showFollowUpPanel = !showFollowUpPanel; showQuickNoteForm = false"
                      style="display:inline-flex;align-items:center;gap:6px;padding:9px 16px;background:var(--color-warning);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;position:relative;">
                <i class="ri-notification-fill" style="font-size:14px;"></i>
                Follow-up
                <span style="background:rgba(0,0,0,.2);border-radius:8px;font-size:11px;padding:1px 6px;line-height:1.4;">{{ callNotesSummary!.pendingFollowUps }}</span>
              </button>

              <!-- Neue Notiz -->
              <button (click)="showQuickNoteForm = !showQuickNoteForm; showFollowUpPanel = false"
                      style="display:inline-flex;align-items:center;gap:6px;padding:9px 16px;background:var(--primary);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap;">
                <i class="ri-edit-2-fill" style="font-size:14px;"></i>
                + Neue Notiz
              </button>

              <!-- Bearbeiten -->
              <a [routerLink]="['/clients', client.id, 'edit']"
                 style="display:inline-flex;align-items:center;gap:6px;padding:9px 16px;background:var(--surface-2);color:var(--text-2);border:1px solid var(--border);border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;white-space:nowrap;">
                <i class="ri-pencil-line" style="font-size:14px;"></i>
                Bearbeiten
              </a>

              <!-- ⋯ Quick-action menu -->
              <div style="position:relative;">
                <button (click)="showQuickMenu = !showQuickMenu"
                        style="width:38px;height:38px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-2);"
                        title="Weitere Aktionen">
                  <i class="ri-more-line" style="font-size:20px;"></i>
                </button>
                <div *ngIf="showQuickMenu" (click)="showQuickMenu = false"
                     style="position:fixed;inset:0;z-index:199;"></div>
                <div *ngIf="showQuickMenu"
                     style="position:absolute;top:calc(100% + 6px);right:0;min-width:210px;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.14);z-index:200;overflow:hidden;">
                  <button class="qm-item" (click)="showAttachmentsDialog = true; showQuickMenu = false">
                    <i class="ri-attachment-line" style="font-size:16px;color:var(--text-3);"></i>
                    Dokumente &amp; Anhänge
                  </button>
                  <div style="height:1px;background:var(--border);margin:4px 0;"></div>
                  <button class="qm-item danger" (click)="showDeleteConfirm = true; showQuickMenu = false" [disabled]="isDeleting">
                    <i class="ri-delete-bin-line" style="font-size:16px;"></i>
                    {{ isDeleting ? ('clients.deleting' | translate) : ('clients.delete' | translate) }}
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        <!-- ── Notiz-Dialog ─────────────────────────────────────── -->
        <div *ngIf="showQuickNoteForm" class="detail-modal-backdrop" (click)="showQuickNoteForm = false"></div>
        <div *ngIf="showQuickNoteForm" class="detail-modal-card"
             style="background:var(--surface);border-radius:14px;padding:20px 24px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
            <i class="ri-edit-2-fill" style="font-size:16px;color:var(--primary);"></i>
            <span style="font-size:14px;font-weight:700;color:var(--text);">Gesprächsnotiz</span>
            <div style="flex:1;"></div>
            <button *ngIf="voiceSupported" (click)="toggleVoiceRecording()" [disabled]="isParsingVoice"
                    [style.background]="isRecording ? 'var(--color-error)' : 'var(--accent-soft)'"
                    [style.color]="isRecording ? '#fff' : 'var(--primary)'"
                    style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">
              <i [class]="isRecording ? 'ri-stop-circle-fill' : 'ri-mic-fill'" style="font-size:14px;"></i>
              {{ (isRecording ? 'callNotes.voice.stop' : 'callNotes.voice.start') | translate }}
            </button>
            <span *ngIf="!voiceSupported"
                  [title]="'callNotes.voice.notSupported' | translate"
                  style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border:1px solid var(--border);border-radius:8px;font-size:12px;font-weight:600;color:var(--text-3);cursor:default;">
              <i class="ri-mic-off-line" style="font-size:14px;"></i>
              {{ 'callNotes.voice.start' | translate }}
            </span>
            <button (click)="showQuickNoteForm = false"
                    style="background:none;border:none;cursor:pointer;color:var(--text-3);font-size:18px;line-height:1;">
              <i class="ri-close-line"></i>
            </button>
          </div>
          <div *ngIf="isRecording || isParsingVoice"
               style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:9px 12px;border-radius:8px;background:var(--accent-soft);">
            <span *ngIf="isRecording" class="rec-dot"></span>
            <i *ngIf="isParsingVoice" class="ri-sparkling-fill" style="font-size:13px;color:var(--primary);"></i>
            <span style="font-size:12px;font-weight:600;color:var(--primary);">
              {{ (isRecording ? 'callNotes.voice.listening' : 'callNotes.voice.structuring') | translate }}
            </span>
          </div>
          <div class="form-grid-2" style="gap:12px;margin-bottom:12px;">
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px;">Betreff</label>
              <input type="text" [(ngModel)]="quickNoteSubject" placeholder="Worum ging es?"
                     style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--surface-2);outline:none;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px;">Kontaktart</label>
              <select [(ngModel)]="quickNoteType"
                      style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--surface-2);cursor:pointer;">
                <option value="PHONE_OUTBOUND">Anruf (ausgehend)</option>
                <option value="PHONE_INBOUND">Anruf (eingehend)</option>
                <option value="EMAIL">E-Mail</option>
                <option value="MEETING">Meeting</option>
              </select>
            </div>
          </div>
          <textarea [(ngModel)]="quickNoteText" placeholder="Was wurde besprochen?" rows="3"
                    style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--surface-2);resize:vertical;font-family:inherit;margin-bottom:12px;box-sizing:border-box;outline:none;">
          </textarea>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <select [(ngModel)]="quickNoteOutcome"
                    style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--surface-2);cursor:pointer;">
              <option value="">Ergebnis wählen…</option>
              <option value="INTERESTED">Interessiert</option>
              <option value="NOT_INTERESTED">Kein Interesse</option>
              <option value="SCHEDULED_VIEWING">Besichtigung vereinbart</option>
              <option value="OFFER_MADE">Angebot gemacht</option>
              <option value="DEAL_CLOSED">Abschluss</option>
            </select>
            <div *ngIf="quickNoteFollowUpRequired"
                 style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;background:var(--color-warning-soft);border-radius:8px;">
              <i class="ri-notification-fill" style="font-size:13px;color:var(--color-warning);"></i>
              <span style="font-size:12px;font-weight:600;color:var(--color-warning);">{{ 'callNotes.voice.followUpDetected' | translate }}</span>
              <input type="date" [(ngModel)]="quickNoteFollowUpDate"
                     style="border:none;background:none;font-size:12px;color:var(--color-warning);font-weight:600;font-family:inherit;outline:none;cursor:pointer;">
              <button (click)="quickNoteFollowUpRequired = false; quickNoteFollowUpDate = ''"
                      style="background:none;border:none;cursor:pointer;color:var(--color-warning);padding:0;line-height:1;">
                <i class="ri-close-line" style="font-size:12px;"></i>
              </button>
            </div>
            <button (click)="saveQuickNote()" [disabled]="isSavingNote || isParsingVoice || !quickNoteText.trim()"
                    style="padding:9px 20px;background:var(--primary);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;"
                    [style.opacity]="(isSavingNote || isParsingVoice || !quickNoteText.trim()) ? '0.45' : '1'">
              <i class="ri-check-line" style="margin-right:5px;"></i>
              {{ isSavingNote ? 'Speichern…' : 'Notiz speichern' }}
            </button>
          </div>
        </div>

        <!-- ── Guided Follow-up Dialog ─────────────────────────── -->
        <div *ngIf="showFollowUpPanel" class="detail-modal-backdrop" (click)="showFollowUpPanel = false"></div>
        <div *ngIf="showFollowUpPanel" class="detail-modal-card"
             style="background:var(--surface);border-radius:14px;padding:20px 24px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
            <i class="ri-notification-fill" style="font-size:16px;color:var(--color-warning);"></i>
            <span style="font-size:14px;font-weight:700;color:var(--text);">Follow-up abschließen</span>
            <span style="font-size:12px;font-weight:600;color:var(--color-warning);background:var(--color-warning-soft);padding:2px 8px;border-radius:10px;">
              {{ callNotesSummary?.pendingFollowUps }} offen
            </span>
            <button (click)="showFollowUpPanel = false"
                    style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--text-3);font-size:18px;line-height:1;">
              <i class="ri-close-line"></i>
            </button>
          </div>
          <div *ngIf="callNotesSummary?.mostRecentSubject"
               style="background:var(--surface-2);border-radius:8px;padding:10px 14px;margin-bottom:14px;border-left:3px solid var(--color-warning);">
            <div style="font-size:10px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px;">Geplanter Follow-up</div>
            <div style="font-size:13px;font-weight:600;color:var(--text);">{{ callNotesSummary!.mostRecentSubject }}</div>
          </div>
          <div style="font-size:13px;color:var(--text-2);margin-bottom:14px;">
            Was ist beim Follow-up passiert? Trag kurz ein, was besprochen wurde.
          </div>
          <div class="form-grid-2" style="gap:12px;margin-bottom:12px;">
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px;">Betreff</label>
              <input type="text" [(ngModel)]="quickNoteSubject"
                     [placeholder]="callNotesSummary?.mostRecentSubject || 'Worum ging es?'"
                     style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--surface-2);outline:none;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px;">Kontaktart</label>
              <select [(ngModel)]="quickNoteType"
                      style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--surface-2);cursor:pointer;">
                <option value="PHONE_OUTBOUND">Anruf (ausgehend)</option>
                <option value="PHONE_INBOUND">Anruf (eingehend)</option>
                <option value="EMAIL">E-Mail</option>
                <option value="MEETING">Meeting</option>
              </select>
            </div>
          </div>
          <textarea [(ngModel)]="quickNoteText" placeholder="Was wurde besprochen?" rows="3"
                    style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--surface-2);resize:vertical;font-family:inherit;margin-bottom:12px;box-sizing:border-box;outline:none;">
          </textarea>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <select [(ngModel)]="quickNoteOutcome"
                    style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--surface-2);cursor:pointer;">
              <option value="">Ergebnis wählen…</option>
              <option value="INTERESTED">Interessiert</option>
              <option value="NOT_INTERESTED">Kein Interesse</option>
              <option value="SCHEDULED_VIEWING">Besichtigung vereinbart</option>
              <option value="OFFER_MADE">Angebot gemacht</option>
              <option value="DEAL_CLOSED">Abschluss</option>
            </select>
            <button (click)="saveFollowUp()" [disabled]="isSavingNote || !quickNoteText.trim()"
                    style="padding:9px 20px;background:var(--color-warning);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;"
                    [style.opacity]="(isSavingNote || !quickNoteText.trim()) ? '0.45' : '1'">
              <i class="ri-check-line" style="margin-right:5px;"></i>
              {{ isSavingNote ? 'Speichern…' : 'Follow-up erledigt · Notiz speichern' }}
            </button>
          </div>
        </div>

        <!-- ── Besichtigungs-Dialog ───────────────────────── -->
        <app-viewing-add-dialog
          *ngIf="showViewingForm && client"
          mode="from-client"
          [preselectedClientId]="client.id"
          [preselectedClientName]="client.firstName + ' ' + client.lastName"
          (viewingCreated)="onViewingCreated()"
          (cancelled)="showViewingForm = false">
        </app-viewing-add-dialog>

        <!-- ══ TWO-COLUMN BODY ════════════════════════════════════ -->
        <div class="detail-two-col">

          <!-- LEFT: Activity stream -->
          <div style="display:flex;flex-direction:column;gap:16px;">

            <!-- Besichtigungen -->
            <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:18px 20px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                <i class="ri-door-open-fill" style="font-size:17px;color:var(--color-warning);"></i>
                <span style="font-size:15px;font-weight:700;color:var(--text);flex:1;">Besichtigungen</span>
                <span *ngIf="viewings.length > 0"
                      style="font-size:12px;font-weight:700;color:var(--color-warning);background:var(--color-warning-soft);padding:2px 8px;border-radius:10px;">
                  {{ viewings.length }}
                </span>
                <button (click)="showViewingForm = !showViewingForm"
                        style="display:inline-flex;align-items:center;gap:5px;padding:6px 12px;background:var(--color-warning-soft);color:var(--color-warning);border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">
                  <i class="ri-add-fill" style="font-size:12px;"></i>
                  Besichtigung
                </button>
              </div>
              <app-loading-spinner *ngIf="isLoadingViewings" size="sm"></app-loading-spinner>
              <div *ngIf="!isLoadingViewings && viewings.length > 0" style="display:flex;flex-direction:column;gap:8px;">
                <div *ngFor="let v of viewings"
                     style="display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);">
                  <div style="min-width:44px;text-align:center;background:var(--surface);border-radius:8px;padding:5px 4px;border:1px solid var(--border);">
                    <div style="font-size:16px;font-weight:700;color:var(--text);line-height:1;">{{ v.viewingDate | date:'dd' }}</div>
                    <div style="font-size:10px;font-weight:600;color:var(--text-3);text-transform:uppercase;">{{ v.viewingDate | date:'MMM' }}</div>
                  </div>
                  <div style="flex:1;min-width:0;">
                    <a [routerLink]="['/properties', v.propertyId]"
                       style="font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px;text-decoration:none;">
                      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ v.propertyTitle }}</span>
                      <i class="ri-external-link-line" style="font-size:11px;color:var(--text-3);flex-shrink:0;"></i>
                    </a>
                    <div style="font-size:11px;color:var(--text-3);">{{ v.viewingDate | date:'HH:mm' }} Uhr · {{ v.propertyAddress }}</div>
                  </div>
                  <div *ngIf="v.feedback" style="font-size:16px;flex-shrink:0;" [title]="v.feedback">
                    <i [class.ri-thumb-up-fill]="v.feedback === 'LIKED'"
                       [class.ri-thumb-down-fill]="v.feedback === 'DISLIKED'"
                       [class.ri-emotion-normal-fill]="v.feedback !== 'LIKED' && v.feedback !== 'DISLIKED'"
                       [style.color]="v.feedback === 'LIKED' ? 'var(--color-success)' : v.feedback === 'DISLIKED' ? 'var(--color-error)' : 'var(--color-warning)'"></i>
                  </div>
                  <span [style.background]="getViewingStatusBg(v.status)"
                        [style.color]="getViewingStatusColor(v.status)"
                        style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:8px;white-space:nowrap;flex-shrink:0;">
                    {{ v.status === 'SCHEDULED' ? 'Geplant' : v.status === 'COMPLETED' ? 'Erledigt' : 'Abgesagt' }}
                  </span>
                </div>
              </div>
              <div *ngIf="!isLoadingViewings && viewings.length === 0"
                   style="text-align:center;padding:20px 0;color:var(--text-3);">
                <i class="ri-door-open-line" style="font-size:28px;display:block;margin-bottom:6px;"></i>
                <div style="font-size:13px;">Noch keine Besichtigungen geplant</div>
              </div>
            </div>

            <!-- Kontakthistorie -->
            <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:18px 20px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                <i class="ri-chat-3-line" style="font-size:17px;color:var(--primary);"></i>
                <span style="font-size:15px;font-weight:700;color:var(--text);">Kontakthistorie</span>
                <span *ngIf="callNotesSummary"
                      style="font-size:12px;font-weight:700;color:var(--primary);background:var(--accent-soft);padding:2px 8px;border-radius:10px;">
                  {{ callNotesSummary.totalCallNotes }}
                </span>
              </div>
              <app-loading-spinner *ngIf="isLoadingCallNotes && !callNotesSummary" size="sm"></app-loading-spinner>
              <div *ngIf="recentCallNotes.length > 0">
                <div *ngFor="let note of recentCallNotes" class="tl-row">
                  <!-- Icon -->
                  <div style="width:36px;height:36px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
                    <i [class]="getCallTypeIcon(note.callType)" style="font-size:15px;color:var(--text-3);"></i>
                  </div>
                  <!-- Content -->
                  <div style="flex:1;min-width:0;">
                    <!-- Title + date -->
                    <div style="display:flex;align-items:baseline;gap:8px;justify-content:space-between;">
                      <span style="font-size:14px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;">{{ note.subject }}</span>
                      <span style="font-size:11px;color:var(--text-3);white-space:nowrap;flex-shrink:0;margin-left:8px;">
                        {{ note.callDate | date:'dd.MM.yyyy · HH:mm' }}
                      </span>
                    </div>
                    <!-- Description -->
                    <div *ngIf="note.notesSummary"
                         style="font-size:13px;color:var(--text-2);margin-top:4px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                      {{ note.notesSummary }}
                    </div>
                    <!-- Meta chips -->
                    <div style="display:flex;align-items:center;gap:6px;margin-top:7px;flex-wrap:wrap;">
                      <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--text-3);">
                        <i [class]="getCallTypeIcon(note.callType)" style="font-size:11px;"></i>
                        {{ getCallTypeLabel(note.callType) }}
                      </span>
                      <ng-container *ngIf="note.followUpRequired">
                        <span style="color:var(--border);font-size:10px;">·</span>
                        <span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;background:var(--color-warning-soft);color:var(--color-warning);">
                          <span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block;flex-shrink:0;"></span>
                          Follow-up nötig
                        </span>
                      </ng-container>
                      <ng-container *ngIf="note.outcome">
                        <span style="color:var(--border);font-size:10px;">·</span>
                        <span [style.background]="getOutcomeBg(note.outcome)"
                              [style.color]="getOutcomeColor(note.outcome)"
                              style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;">
                          <span style="width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block;flex-shrink:0;"></span>
                          {{ getOutcomeLabel(note.outcome) }}
                        </span>
                      </ng-container>
                      <ng-container *ngIf="note.propertyTitle">
                        <span style="color:var(--border);font-size:10px;">·</span>
                        <a [routerLink]="['/properties', note.propertyId]"
                           style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--text-3);background:var(--surface-2);padding:2px 8px;border-radius:10px;text-decoration:none;">
                          <i class="ri-home-line" style="font-size:11px;flex-shrink:0;"></i>
                          {{ note.propertyTitle }}
                        </a>
                      </ng-container>
                    </div>
                  </div>
                </div>
              </div>
              <div *ngIf="!isLoadingCallNotes && recentCallNotes.length === 0"
                   style="text-align:center;padding:20px 0;color:var(--text-3);">
                <i class="ri-discuss-line" style="font-size:28px;display:block;margin-bottom:6px;"></i>
                <div style="font-size:13px;">Noch keine Notizen</div>
              </div>
            </div>

          </div>

          <!-- RIGHT: Info sidebar -->
          <div style="display:flex;flex-direction:column;gap:16px;">

            <!-- Suchprofil -->
            <div *ngIf="client.searchCriteria || client.clientType"
                 style="background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:18px 20px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <i class="ri-search-line" style="font-size:15px;color:var(--text-3);"></i>
                  <span style="font-size:15px;font-weight:700;color:var(--text);">Suchprofil</span>
                </div>
                <a [routerLink]="['/clients', client.id, 'edit']"
                   style="font-size:12px;font-weight:600;color:var(--primary);text-decoration:none;">Bearbeiten</a>
              </div>
              <!-- Key-value rows -->
              <div>
                <div *ngIf="client.clientType"
                     style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);">
                  <span style="font-size:12px;color:var(--text-3);">Angebotsart</span>
                  <span style="font-size:13px;font-weight:600;color:var(--text);">{{ getAngebotsart() }}</span>
                </div>
                <div *ngIf="client.searchCriteria?.propertyTypes?.length"
                     style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);">
                  <span style="font-size:12px;color:var(--text-3);">Objekttyp</span>
                  <span style="font-size:13px;font-weight:600;color:var(--text);"><ng-container *ngFor="let pt of client.searchCriteria!.propertyTypes!; let last = last">{{ pt | translateEnum:'propertyType' }}{{ last ? '' : ', ' }}</ng-container></span>
                </div>
                <div *ngIf="hasBudgetOrRent()"
                     style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);">
                  <span style="font-size:12px;color:var(--text-3);">{{ client.clientType === ClientType.RENTER ? 'Miete' : 'Kaufpreis' }}</span>
                  <span style="font-size:13px;font-weight:600;color:var(--text);">{{ formatBudget() }}</span>
                </div>
                <div *ngIf="client.searchCriteria?.minSquareMeters || client.searchCriteria?.maxSquareMeters"
                     style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);">
                  <span style="font-size:12px;color:var(--text-3);">Wohnfläche</span>
                  <span style="font-size:13px;font-weight:600;color:var(--text);">{{ formatSqm() }}</span>
                </div>
                <div *ngIf="client.searchCriteria?.minRooms || client.searchCriteria?.maxRooms"
                     style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);">
                  <span style="font-size:12px;color:var(--text-3);">Zimmer</span>
                  <span style="font-size:13px;font-weight:600;color:var(--text);">{{ formatRooms() }}</span>
                </div>
                <div *ngIf="client.searchCriteria?.preferredLocations?.length"
                     style="display:flex;justify-content:space-between;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--border);">
                  <span style="font-size:12px;color:var(--text-3);">Lage</span>
                  <span style="font-size:13px;font-weight:600;color:var(--text);text-align:right;max-width:60%;">{{ client.searchCriteria!.preferredLocations!.join(', ') }}</span>
                </div>
                <div *ngIf="client.financingStatus && client.clientType !== ClientType.SELLER"
                     style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);">
                  <span style="font-size:12px;color:var(--text-3);">Finanzierung</span>
                  <span style="font-size:13px;font-weight:600;color:var(--text);">{{ getFinancingLabel() }}</span>
                </div>
                <div *ngIf="client.moveInTimeline && client.clientType !== ClientType.SELLER"
                     style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;">
                  <span style="font-size:12px;color:var(--text-3);">Einzug</span>
                  <span style="font-size:13px;font-weight:600;color:var(--text);">{{ getMoveInLabel() }}</span>
                </div>
              </div>
            </div>

            <!-- Suchradius -->
            <div *ngIf="client.searchCriteria?.latitude != null && client.searchCriteria?.longitude != null"
                 style="background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:18px 20px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                <i class="ri-map-pin-line" style="font-size:15px;color:var(--text-3);"></i>
                <span style="font-size:15px;font-weight:700;color:var(--text);">Suchradius</span>
              </div>
              <div *ngIf="searchLocationLabel" style="margin-bottom:12px;">
                <span style="font-size:13px;color:var(--text);">{{ searchLocationLabel }}</span>
              </div>
              <app-location-picker-map
                [latitude]="client.searchCriteria!.latitude!"
                [longitude]="client.searchCriteria!.longitude!"
                [radiusKm]="client.searchCriteria!.searchRadiusKm || 10"
                [readOnly]="true"
                [showRadiusControl]="true"
                mapBorderRadius="0 0 12px 12px">
              </app-location-picker-map>
            </div>

            <!-- Passende Objekte -->
            <div *ngIf="client.searchCriteria"
                 style="background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:18px 20px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                <i class="ri-shuffle-fill" style="font-size:15px;color:var(--primary);"></i>
                <span style="font-size:15px;font-weight:700;color:var(--text);flex:1;">Passende Objekte</span>
                <span *ngIf="!isLoadingMatches && matchingProperties.length > 0"
                      style="font-size:12px;font-weight:700;color:var(--primary);background:var(--accent-soft);padding:2px 8px;border-radius:10px;">
                  {{ matchingProperties.length }}
                </span>
              </div>
              <app-loading-spinner *ngIf="isLoadingMatches" size="sm"></app-loading-spinner>
              <div *ngIf="!isLoadingMatches && matchingProperties.length > 0" style="display:flex;flex-direction:column;gap:8px;">
                <a *ngFor="let match of matchingProperties"
                   [routerLink]="['/properties', match.property.id]"
                   class="match-link"
                   style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);text-decoration:none;transition:background 0.1s;">
                  <span [style.background]="getMatchScoreBg(match.matchScore)"
                        [style.color]="getMatchScoreColor(match.matchScore)"
                        style="font-size:11px;font-weight:800;padding:4px 8px;border-radius:8px;flex-shrink:0;min-width:36px;text-align:center;">
                    {{ match.matchScore }}%
                  </span>
                  <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span style="font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ match.property.title }}</span>
                      <span *ngIf="match.previouslyContacted"
                            title="{{ 'properties.matching.alreadyContactedHint' | translate }}"
                            style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:700;color:var(--color-neutral);background:var(--color-neutral-soft);padding:2px 6px;border-radius:8px;flex-shrink:0;">
                        <i class="ri-checkbox-circle-line" style="font-size:11px;"></i>
                        {{ 'properties.matching.alreadyContacted' | translate }}
                      </span>
                    </div>
                    <div style="font-size:11px;color:var(--text-3);">{{ match.property.addressCity }}</div>
                  </div>
                  <i class="ri-arrow-right-line" style="font-size:13px;color:var(--text-3);flex-shrink:0;"></i>
                </a>
              </div>
              <div *ngIf="!isLoadingMatches && matchingProperties.length === 0"
                   style="text-align:center;padding:16px 0;color:var(--text-3);">
                <i class="ri-home-line" style="font-size:24px;display:block;margin-bottom:6px;"></i>
                <div style="font-size:13px;">Keine passenden Objekte gefunden</div>
              </div>
            </div>

            <!-- DSGVO-Einwilligung -->
            <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:16px 20px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"
                     [style.background]="client.gdprConsentGiven ? 'var(--color-success-soft)' : 'var(--color-error-soft)'">
                  <i [class]="client.gdprConsentGiven ? 'ri-shield-check-line' : 'ri-shield-line'"
                     [style.color]="client.gdprConsentGiven ? 'var(--color-success)' : 'var(--color-error)'"
                     style="font-size:17px;"></i>
                </div>
                <div>
                  <div style="font-size:13px;font-weight:600;color:var(--text);">DSGVO-Einwilligung</div>
                  <div style="font-size:12px;color:var(--text-3);margin-top:1px;">
                    {{ client.gdprConsentGiven ? 'Erteilt' : 'Ausstehend' }}<ng-container *ngIf="client.gdprConsentGiven && client.gdprConsentDate"> · {{ client.gdprConsentDate | date:'dd.MM.yyyy' }}</ng-container>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div><!-- end two-col -->
      </div>

      <div *ngIf="!isLoading && !client" style="text-align:center;padding:48px 0;">
        <i class="ri-user-line" style="font-size:48px;color:var(--text-3);display:block;margin-bottom:12px;"></i>
        <h3 style="font-size:15px;font-weight:600;color:var(--text);margin:0 0 6px;">{{ 'clients.notFound' | translate }}</h3>
        <a routerLink="/clients"
           style="font-size:13px;color:var(--primary);text-decoration:none;display:inline-flex;align-items:center;gap:6px;justify-content:center;">
          <i class="ri-arrow-left-line"></i> {{ 'clients.backToClients' | translate }}</a>
      </div>
    </div>

    <!-- Attachments Dialog -->
    <div *ngIf="showAttachmentsDialog && client"
         style="position:fixed;inset:0;z-index:600;display:flex;align-items:flex-start;justify-content:center;padding:48px 20px 20px;"
         (click)="showAttachmentsDialog = false">
      <div style="position:absolute;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(3px);"></div>
      <div style="position:relative;width:100%;max-width:680px;background:var(--surface);border-radius:18px;box-shadow:0 24px 64px rgba(0,0,0,.22);overflow:hidden;max-height:calc(100vh - 80px);display:flex;flex-direction:column;"
           (click)="$event.stopPropagation()">
        <div style="display:flex;align-items:center;gap:12px;padding:18px 22px;border-bottom:1px solid var(--border);flex-shrink:0;">
          <div style="width:34px;height:34px;border-radius:9px;background:var(--surface-2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;">
            <i class="ri-attachment-line" style="font-size:16px;color:var(--text-3);"></i>
          </div>
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:700;color:var(--text);">{{ 'attachments.sectionTitle' | translate }}</div>
            <div style="font-size:12px;color:var(--text-3);">{{ client.firstName }} {{ client.lastName }}</div>
          </div>
          <button (click)="showAttachmentsDialog = false"
                  style="width:32px;height:32px;border-radius:8px;background:var(--surface-2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-3);font-size:16px;">
            <i class="ri-close-line"></i>
          </button>
        </div>
        <div style="overflow-y:auto;flex:1;padding:20px 22px;">
          <app-file-attachment-manager
            entityType="client"
            [entityId]="client.id!">
          </app-file-attachment-manager>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <app-confirm-dialog
      [open]="showDeleteConfirm && !!client"
      [danger]="true"
      icon="ri-delete-bin-line"
      [title]="'clients.delete' | translate"
      [message]="'clients.deleteConfirm' | translate"
      [busy]="isDeleting"
      (cancel)="showDeleteConfirm = false"
      (confirm)="deleteClient()">
    </app-confirm-dialog>

    <!-- Terminal Stage Change Confirmation (won/lost — same friction as delete/mark-inactive) -->
    <app-confirm-dialog
      [open]="pendingStageChange !== null"
      [danger]="pendingStageChange === PipelineStage.LOST"
      [icon]="pendingStageChange === PipelineStage.WON ? 'ri-trophy-line' : 'ri-close-circle-line'"
      [title]="(pendingStageChange === PipelineStage.WON ? 'clients.confirmWonTitle' : 'clients.confirmLostTitle') | translate"
      [message]="client ? ((pendingStageChange === PipelineStage.WON ? 'clients.confirmWonMessage' : 'clients.confirmLostMessage') | translate:{ name: client.firstName + ' ' + client.lastName }) : ''"
      [confirmLabel]="(pendingStageChange === PipelineStage.WON ? 'clients.confirmWonTitle' : 'clients.confirmLostTitle') | translate"
      (cancel)="cancelStageChange()"
      (confirm)="confirmStageChange()">
    </app-confirm-dialog>

    <!-- Stage Upgrade Hint -->
    <div *ngIf="showStageUpgradeHint"
         style="position:fixed;bottom:24px;right:24px;background:var(--surface);border:1.5px solid var(--primary);border-radius:12px;padding:16px 20px;box-shadow:0 8px 32px rgba(0,0,0,.15);z-index:500;max-width:320px;">
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <i class="ri-information-line" style="color:var(--primary);font-size:20px;flex-shrink:0;margin-top:1px;"></i>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px;">Pipeline-Stage aktualisieren?</div>
          <div style="font-size:12px;color:var(--text-2);margin-bottom:12px;">Besichtigung erfasst — soll der Stage auf "Besichtigungen" gesetzt werden?</div>
          <div style="display:flex;gap:8px;">
            <button (click)="setStage(PipelineStage.VIEWING); showStageUpgradeHint = false"
                    style="padding:6px 14px;background:var(--primary);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">
              Ja, setzen
            </button>
            <button (click)="showStageUpgradeHint = false"
                    style="padding:6px 12px;background:none;border:1px solid var(--border);border-radius:8px;font-size:12px;color:var(--text-2);cursor:pointer;">
              Nein
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ClientDetailComponent implements OnInit {
  readonly PipelineStage = PipelineStage;
  readonly ClientType = ClientType;

  client: Client | null = null;
  isLoading = false;
  isDeleting = false;

  showQuickNoteForm = false;
  showFollowUpPanel = false;
  quickNoteSubject = '';
  quickNoteType = 'PHONE_OUTBOUND';
  quickNoteText = '';
  quickNoteOutcome = '';
  quickNoteFollowUpRequired = false;
  quickNoteFollowUpDate = '';
  isSavingNote = false;

  readonly voiceSupported = typeof window !== 'undefined'
    && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  isRecording = false;
  isParsingVoice = false;
  private recognition: any = null;
  private finalTranscript = '';

  recentCallNotes: CallNoteSummary[] = [];
  callNotesSummary: BulkSummary | null = null;
  isLoadingCallNotes = false;

  viewings: ViewingSummary[] = [];
  isLoadingViewings = false;
  showViewingForm = false;

  matchingProperties: PropertyMatchResult[] = [];
  searchLocationLabel: string | null = null;
  isLoadingMatches = false;

  showAttachmentsDialog = false;
  stageDropdownOpen = false;
  pendingStageChange: PipelineStage | null = null;
  showQuickMenu = false;
  showStageUpgradeHint = false;
  showDeleteConfirm = false;

  pipelineStages = [
    { value: PipelineStage.PROSPECT,      label: 'Interessent',    color: 'var(--stage-prospect)',      bg: 'var(--stage-prospect-bg)' },
    { value: PipelineStage.ACTIVE_SEARCH, label: 'Aktive Suche',   color: 'var(--stage-active-search)', bg: 'var(--stage-active-search-bg)' },
    { value: PipelineStage.VIEWING,       label: 'Besichtigungen', color: 'var(--stage-viewing)',       bg: 'var(--stage-viewing-bg)' },
    { value: PipelineStage.WON,           label: 'Gewonnen',       color: 'var(--stage-won)',           bg: 'var(--stage-won-bg)' },
    { value: PipelineStage.LOST,          label: 'Verloren',       color: 'var(--stage-lost)',          bg: 'var(--stage-lost-bg)' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientService: ClientService,
    public callNotesService: CallNotesService,
    private viewingService: ViewingService,
    private propertyMatchingService: PropertyMatchingService,
    private geocodingService: GeocodingService,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id');
    if (clientId) {
      this.loadClient(clientId);
      this.loadCallNotes(clientId);
      this.loadViewings(clientId);
    }
  }

  private loadClient(id: string): void {
    this.isLoading = true;
    this.clientService.getClient(id).subscribe({
      next: (client) => {
        this.client = client;
        this.isLoading = false;
        if (client.searchCriteria && client.id) {
          this.loadMatchingProperties(client.id);
        }
        if (client.searchCriteria?.latitude != null && client.searchCriteria?.longitude != null) {
          this.loadSearchLocationLabel(client.searchCriteria.latitude, client.searchCriteria.longitude);
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private loadCallNotes(clientId: string): void {
    this.isLoadingCallNotes = true;
    this.callNotesService.getCallNotesByClient(clientId, 0, 5).subscribe({
      next: (response: PagedResponse<CallNoteSummary>) => {
        this.recentCallNotes = response.content;
        this.isLoadingCallNotes = false;
      },
      error: () => {
        this.isLoadingCallNotes = false;
      }
    });
    this.callNotesService.getClientCallNotesSummary(clientId).subscribe({
      next: (summary: BulkSummary) => {
        this.callNotesSummary = summary;
      },
      error: () => {}
    });
  }

  private loadViewings(clientId: string): void {
    this.isLoadingViewings = true;
    this.viewingService.getViewingsByClient(clientId).subscribe({
      next: (viewings) => {
        this.viewings = viewings;
        this.isLoadingViewings = false;
      },
      error: () => {
        this.isLoadingViewings = false;
      }
    });
  }

  private loadSearchLocationLabel(latitude: number, longitude: number): void {
    this.searchLocationLabel = null;
    this.geocodingService.reverse(latitude, longitude).subscribe(label => {
      this.searchLocationLabel = label;
    });
  }

  private loadMatchingProperties(clientId: string): void {
    this.isLoadingMatches = true;
    this.propertyMatchingService.findMatchingPropertiesForClient(clientId, { maxResults: 3, matchThreshold: 0 }).subscribe({
      next: (response) => {
        this.matchingProperties = response.properties?.slice(0, 3) ?? [];
        this.isLoadingMatches = false;
      },
      error: () => {
        this.isLoadingMatches = false;
      }
    });
  }

  saveFollowUp(): void {
    if (!this.client?.id || !this.quickNoteText.trim()) return;
    this.isSavingNote = true;
    const request: CallNoteCreateRequest = {
      clientId: this.client.id,
      callDate: new Date().toISOString(),
      callType: (this.quickNoteType as CallType) || CallType.PHONE_OUTBOUND,
      subject: this.quickNoteSubject.trim() || this.callNotesSummary?.mostRecentSubject || 'Follow-up erledigt',
      notes: this.quickNoteText.trim(),
      followUpRequired: false,
      outcome: (this.quickNoteOutcome as CallOutcome) || undefined
    };
    this.callNotesService.createCallNote(request).subscribe({
      next: () => {
        this.isSavingNote = false;
        this.showFollowUpPanel = false;
        this.quickNoteSubject = '';
        this.quickNoteText = '';
        this.quickNoteOutcome = '';
        this.quickNoteType = 'PHONE_OUTBOUND';
        this.loadCallNotes(this.client!.id!);
      },
      error: () => { this.isSavingNote = false; }
    });
  }

  saveQuickNote(): void {
    if (!this.client?.id || !this.quickNoteText.trim()) return;
    this.isSavingNote = true;
    const request: CallNoteCreateRequest = {
      clientId: this.client.id,
      callDate: new Date().toISOString(),
      callType: (this.quickNoteType as CallType) || CallType.PHONE_OUTBOUND,
      subject: this.quickNoteSubject.trim() || 'Gesprächsnotiz',
      notes: this.quickNoteText.trim(),
      followUpRequired: this.quickNoteFollowUpRequired,
      followUpDate: this.quickNoteFollowUpRequired && this.quickNoteFollowUpDate ? this.quickNoteFollowUpDate : undefined,
      outcome: (this.quickNoteOutcome as CallOutcome) || undefined
    };
    this.callNotesService.createCallNote(request).subscribe({
      next: () => {
        this.isSavingNote = false;
        this.showQuickNoteForm = false;
        this.quickNoteSubject = '';
        this.quickNoteText = '';
        this.quickNoteOutcome = '';
        this.quickNoteType = 'PHONE_OUTBOUND';
        this.quickNoteFollowUpRequired = false;
        this.quickNoteFollowUpDate = '';
        this.loadCallNotes(this.client!.id!);
      },
      error: () => { this.isSavingNote = false; }
    });
  }

  /**
   * Voice flow: on-device speech-to-text (Web Speech API) fills the textarea live;
   * when the recording stops, the transcript is sent to the AI parser which
   * prefills subject, outcome, call type and follow-up for one-tap saving.
   */
  toggleVoiceRecording(): void {
    if (this.isRecording) {
      this.recognition?.stop();
      return;
    }
    const SpeechRecognitionImpl = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) return;

    this.finalTranscript = '';
    const rec = new SpeechRecognitionImpl();
    rec.lang = 'de-DE';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: any) => this.zone.run(() => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) this.finalTranscript += result[0].transcript + ' ';
        else interim += result[0].transcript;
      }
      this.quickNoteText = (this.finalTranscript + interim).trim();
    });
    rec.onerror = () => this.zone.run(() => {
      this.isRecording = false;
      this.recognition = null;
    });
    rec.onend = () => this.zone.run(() => {
      if (!this.isRecording) return;
      this.isRecording = false;
      this.recognition = null;
      this.parseDictatedTranscript();
    });

    this.recognition = rec;
    this.isRecording = true;
    rec.start();
  }

  private parseDictatedTranscript(): void {
    const transcript = this.quickNoteText.trim();
    if (transcript.length < 10) return;
    this.isParsingVoice = true;
    this.callNotesService.parseVoiceTranscript(transcript).subscribe({
      next: (draft: VoiceNoteDraft) => {
        this.isParsingVoice = false;
        if (draft.subject) this.quickNoteSubject = draft.subject;
        if (draft.notes) this.quickNoteText = draft.notes;
        if (draft.callType) this.quickNoteType = draft.callType;
        if (draft.outcome) this.quickNoteOutcome = draft.outcome;
        this.quickNoteFollowUpRequired = !!draft.followUpRequired;
        this.quickNoteFollowUpDate = draft.followUpDate ?? '';
      },
      // parser unavailable or failed — the raw transcript stays editable in the textarea
      error: () => { this.isParsingVoice = false; }
    });
  }

  onViewingCreated(): void {
    this.showViewingForm = false;
    const clientId = this.route.snapshot.paramMap.get('id');
    if (clientId) this.loadViewings(clientId);
    const stageOrder = [PipelineStage.PROSPECT, PipelineStage.ACTIVE_SEARCH];
    if (this.client?.id && this.client.pipelineStage && stageOrder.includes(this.client.pipelineStage)) {
      this.showStageUpgradeHint = true;
    }
  }

  /**
   * Same interaction cost for the same category of action everywhere: moving a client to a
   * terminal stage (won/lost) gets a confirmation, just like the dashboard's "mark inactive"
   * and the delete flow do — normal forward progress through the pipeline stays frictionless.
   */
  setStage(stage: PipelineStage): void {
    if (!this.client?.id) return;
    this.stageDropdownOpen = false;

    if (stage === PipelineStage.WON || stage === PipelineStage.LOST) {
      this.pendingStageChange = stage;
      return;
    }

    this.applyStage(stage);
  }

  cancelStageChange(): void {
    this.pendingStageChange = null;
  }

  confirmStageChange(): void {
    if (this.pendingStageChange) this.applyStage(this.pendingStageChange);
  }

  private applyStage(stage: PipelineStage): void {
    if (!this.client?.id) return;
    this.clientService.updatePipelineStage(this.client.id, stage).subscribe({
      next: (updated) => {
        this.client = updated;
        this.pendingStageChange = null;
      }
    });
  }

  getStageLabel(stage?: PipelineStage): string {
    return this.pipelineStages.find(s => s.value === stage)?.label ?? 'Interessent';
  }

  getStageBg(stage?: PipelineStage): string {
    return this.pipelineStages.find(s => s.value === stage)?.bg ?? 'var(--stage-prospect-bg)';
  }

  getStageColor(stage?: PipelineStage): string {
    return this.pipelineStages.find(s => s.value === stage)?.color ?? 'var(--stage-prospect)';
  }

  getViewingStatusBg(status: ViewingStatus): string {
    switch (status) {
      case ViewingStatus.COMPLETED: return 'var(--color-success-soft)';
      case ViewingStatus.CANCELLED: return 'var(--color-error-soft)';
      default: return 'var(--stage-viewing-bg)';
    }
  }

  getViewingStatusColor(status: ViewingStatus): string {
    switch (status) {
      case ViewingStatus.COMPLETED: return 'var(--color-success)';
      case ViewingStatus.CANCELLED: return 'var(--color-error)';
      default: return 'var(--stage-viewing)';
    }
  }

  getCallTypeIcon(callType: CallType): string {
    switch (callType) {
      case CallType.PHONE_INBOUND:  return 'ri-phone-line';
      case CallType.PHONE_OUTBOUND: return 'ri-phone-line';
      case CallType.EMAIL:          return 'ri-mail-line';
      case CallType.MEETING:        return 'ri-shake-hands-line';
      default:                      return 'ri-chat-1-line';
    }
  }

  getCallTypeLabel(callType: CallType): string {
    switch (callType) {
      case CallType.PHONE_INBOUND:  return 'Anruf (eingehend)';
      case CallType.PHONE_OUTBOUND: return 'Anruf (ausgehend)';
      case CallType.EMAIL:          return 'E-Mail';
      case CallType.MEETING:        return 'Meeting';
      default:                      return 'Kontakt';
    }
  }

  getOutcomeBg(outcome: string): string {
    switch (outcome) {
      case 'INTERESTED':        return 'var(--accent-soft)';
      case 'NOT_INTERESTED':    return 'var(--color-error-soft)';
      case 'SCHEDULED_VIEWING': return 'var(--color-warning-soft)';
      case 'OFFER_MADE':        return 'var(--color-warning-soft)';
      case 'DEAL_CLOSED':       return 'var(--color-success-soft)';
      default:                  return 'var(--surface-2)';
    }
  }

  getOutcomeColor(outcome: string): string {
    switch (outcome) {
      case 'INTERESTED':        return 'var(--color-interested)';
      case 'NOT_INTERESTED':    return 'var(--color-not-interested)';
      case 'SCHEDULED_VIEWING': return 'var(--color-viewing)';
      case 'OFFER_MADE':        return 'var(--color-offer)';
      case 'DEAL_CLOSED':       return 'var(--color-closed)';
      default:                  return 'var(--text-3)';
    }
  }

  getOutcomeLabel(outcome: string): string {
    switch (outcome) {
      case 'INTERESTED':        return 'Interessiert';
      case 'NOT_INTERESTED':    return 'Kein Interesse';
      case 'SCHEDULED_VIEWING': return 'Besichtigung vereinbart';
      case 'OFFER_MADE':        return 'Angebot gemacht';
      case 'DEAL_CLOSED':       return 'Abschluss';
      default:                  return outcome;
    }
  }

  getAngebotsart(): string {
    switch (this.client?.clientType) {
      case ClientType.BUYER:  return 'Kauf';
      case ClientType.RENTER: return 'Miete';
      case ClientType.SELLER: return 'Verkauf';
      default:                return '–';
    }
  }

  getFinancingLabel(): string {
    switch (this.client?.financingStatus) {
      case FinancingStatus.SELF_FINANCED:    return 'Eigenfinanzierung';
      case FinancingStatus.BANK_PRE_APPROVED: return 'Vorabzusage';
      case FinancingStatus.NEEDS_FINANCING:  return 'Finanzierung nötig';
      default:                               return 'Unbekannt';
    }
  }

  getMoveInLabel(): string {
    switch (this.client?.moveInTimeline) {
      case MoveInTimeline.IMMEDIATE:    return 'Sofort';
      case MoveInTimeline.THREE_MONTHS: return 'In 3 Monaten';
      case MoveInTimeline.SIX_MONTHS:  return 'In 6 Monaten';
      case MoveInTimeline.ONE_YEAR:    return 'In 1 Jahr';
      case MoveInTimeline.FLEXIBLE:    return 'Flexibel';
      default:                         return '–';
    }
  }

  getMatchScoreBg(score: number): string {
    if (score >= 75) return 'var(--accent-soft)';
    if (score >= 50) return 'var(--color-warning-soft)';
    return 'var(--surface-2)';
  }

  getMatchScoreColor(score: number): string {
    if (score >= 75) return 'var(--primary)';
    if (score >= 50) return 'var(--color-warning)';
    return 'var(--text-3)';
  }

  hasBudgetOrRent(): boolean {
    const sc = this.client?.searchCriteria;
    if (!sc) return false;
    return !!(sc.minBudget || sc.maxBudget || sc.minColdRent || sc.maxColdRent || sc.minWarmRent || sc.maxWarmRent);
  }

  formatBudget(): string {
    const sc = this.client?.searchCriteria;
    if (!sc) return '';
    const fmt = (n: number) => n.toLocaleString('de-DE') + ' €';
    const range = (min?: number, max?: number): string => {
      if (min && max) return `${fmt(min)} – ${fmt(max)}`;
      if (min) return `ab ${fmt(min)}`;
      if (max) return `bis ${fmt(max)}`;
      return '';
    };

    if (this.client?.clientType === ClientType.RENTER) {
      const warm = range(sc.minWarmRent, sc.maxWarmRent);
      if (warm) return `${warm} (Warmmiete)`;
      const cold = range(sc.minColdRent, sc.maxColdRent);
      if (cold) return `${cold} (Kaltmiete)`;
      return range(sc.minBudget, sc.maxBudget);
    }

    return range(sc.minBudget, sc.maxBudget);
  }

  formatSqm(): string {
    const sc = this.client?.searchCriteria;
    if (!sc) return '';
    if (sc.minSquareMeters && sc.maxSquareMeters) return `${sc.minSquareMeters} – ${sc.maxSquareMeters} m²`;
    if (sc.minSquareMeters) return `ab ${sc.minSquareMeters} m²`;
    if (sc.maxSquareMeters) return `bis ${sc.maxSquareMeters} m²`;
    return '';
  }

  formatRooms(): string {
    const sc = this.client?.searchCriteria;
    if (!sc) return '';
    if (sc.minRooms && sc.maxRooms) return `${sc.minRooms} – ${sc.maxRooms} Zi.`;
    if (sc.minRooms) return `ab ${sc.minRooms} Zi.`;
    if (sc.maxRooms) return `bis ${sc.maxRooms} Zi.`;
    return '';
  }

  deleteClient(): void {
    if (!this.client) return;
    this.isDeleting = true;
    this.clientService.deleteClient(this.client.id!).subscribe({
      next: () => {
        this.router.navigate(['/clients']);
      },
      error: () => {
        this.isDeleting = false;
        this.showDeleteConfirm = false;
      }
    });
  }
}
