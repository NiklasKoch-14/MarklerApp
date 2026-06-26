import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ClientService, Client, PipelineStage, ClientType, FinancingStatus, MoveInTimeline } from '../../services/client.service';
import { CallNotesService, CallNoteSummary, BulkSummary, PagedResponse, CallNoteCreateRequest, CallType, CallOutcome } from '../../../call-notes/services/call-notes.service';
import { ViewingService, ViewingSummary, ViewingFeedback, ViewingStatus } from '../../../viewing-management/services/viewing.service';
import { ViewingAddDialogComponent } from '../../../viewing-management/components/viewing-add-dialog/viewing-add-dialog.component';
import { TranslateEnumPipe } from '../../../../shared/pipes/translate-enum.pipe';
import { FileAttachmentManagerComponent } from '../../../../shared/components/file-attachment-manager/file-attachment-manager.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, TranslateEnumPipe, FileAttachmentManagerComponent, LoadingSpinnerComponent, ViewingAddDialogComponent],
  template: `
    <div style="padding:24px 28px; max-width:860px;">
      <div *ngIf="isLoading" class="text-center py-8">
        <app-loading-spinner size="lg"></app-loading-spinner>
      </div>

      <div *ngIf="!isLoading && client">

        <!-- ══ ZONE 1: Header ══════════════════════════════════════ -->
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:20px;">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; min-width:0;">
            <a routerLink="/clients" style="color:var(--text-3); font-size:13px; text-decoration:none; display:flex; align-items:center; gap:4px; flex-shrink:0;">
              <i class="ph ph-caret-left" style="font-size:14px;"></i>
            </a>
            <h1 style="font-size:22px; font-weight:800; color:var(--text); margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              {{ client.firstName }} {{ client.lastName }}
            </h1>
            <!-- Pipeline Stage Dropdown -->
            <div style="position:relative;" *ngIf="client.id">
              <button (click)="stageDropdownOpen = !stageDropdownOpen"
                      [style.background]="getStageBg(client.pipelineStage)"
                      [style.color]="getStageColor(client.pipelineStage)"
                      style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;border:none;cursor:pointer;font-size:12px;font-weight:600;">
                {{ getStageLabel(client.pipelineStage) }}
                <i class="ph ph-caret-down" style="font-size:11px;"></i>
              </button>
              <div *ngIf="stageDropdownOpen" (click)="stageDropdownOpen = false"
                   style="position:fixed;inset:0;z-index:99;"></div>
              <div *ngIf="stageDropdownOpen"
                   style="position:absolute;top:100%;left:0;margin-top:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:100;min-width:160px;overflow:hidden;">
                <button *ngFor="let s of pipelineStages"
                        (click)="setStage(s.value)"
                        style="width:100%;text-align:left;padding:9px 14px;border:none;background:none;cursor:pointer;font-size:13px;font-weight:500;"
                        [style.color]="getStageColor(s.value)"
                        class="stage-option">
                  {{ s.label }}
                </button>
              </div>
            </div>
            <!-- Context chips -->
            <span *ngIf="callNotesSummary?.lastCallDate"
                  style="font-size:12px; color:var(--text-3); display:flex; align-items:center; gap:4px;">
              <i class="ph ph-clock" style="font-size:12px;"></i>
              {{ callNotesSummary!.lastCallDate | date:'dd.MM.yy' }}
            </span>
            <span *ngIf="callNotesSummary && callNotesSummary.pendingFollowUps > 0"
                  style="font-size:12px; font-weight:600; color:#c07a1e; display:flex; align-items:center; gap:4px;">
              <i class="ph-fill ph-bell-ringing" style="font-size:12px;"></i>
              {{ callNotesSummary.pendingFollowUps }} Follow-up{{ callNotesSummary.pendingFollowUps > 1 ? 's' : '' }}
            </span>
          </div>
          <a [routerLink]="['/clients', client.id, 'edit']"
             style="display:inline-flex;align-items:center;gap:6px;padding:7px 14px;background:var(--surface-2);color:var(--text-2);border:1px solid var(--border);border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;white-space:nowrap;flex-shrink:0;">
            <i class="ph ph-pencil-simple" style="font-size:14px;"></i>
            Bearbeiten
          </a>
        </div>

        <!-- ══ ZONE 2: Follow-up Alert ════════════════════════════ -->
        <div *ngIf="showContactPanel"
             style="border-left:4px solid #d9534f; background:color-mix(in srgb,#d9534f 6%,var(--surface));
                    border-radius:10px; padding:14px 18px; margin-bottom:16px;
                    display:flex; align-items:center; gap:12px;">
          <i class="ph-fill ph-warning" style="color:#d9534f; font-size:20px; flex-shrink:0;"></i>
          <div style="flex:1; min-width:0;">
            <div style="font-size:11px; font-weight:700; color:#d9534f; text-transform:uppercase; letter-spacing:0.05em;">Follow-up fällig</div>
            <div style="font-size:14px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ followUpSubject }}</div>
          </div>
          <button (click)="dismissContactPanel()"
                  style="background:none; border:none; cursor:pointer; color:var(--text-3); font-size:18px; line-height:1; flex-shrink:0;">
            <i class="ph ph-x"></i>
          </button>
        </div>

        <!-- ══ ZONE 3: Action Strip ═══════════════════════════════ -->
        <div style="background:var(--surface); border:1.5px solid var(--border); border-radius:14px; padding:18px 20px; margin-bottom:20px;">

          <!-- Contact buttons -->
          <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:14px;">
            <a *ngIf="client.phone" [href]="'tel:' + client.phone"
               style="display:inline-flex; align-items:center; gap:8px; padding:10px 20px;
                      background:var(--primary); color:#fff; border-radius:9px;
                      font-size:14px; font-weight:600; text-decoration:none;">
              <i class="ph-bold ph-phone" style="font-size:16px;"></i>
              {{ client.phone }}
            </a>
            <a *ngIf="client.email" [href]="'mailto:' + client.email"
               style="display:inline-flex; align-items:center; gap:8px; padding:10px 20px;
                      background:transparent; color:var(--primary);
                      border:1.5px solid var(--primary); border-radius:9px;
                      font-size:14px; font-weight:600; text-decoration:none;">
              <i class="ph-bold ph-envelope" style="font-size:16px;"></i>
              E-Mail
            </a>
            <span *ngIf="!client.phone && !client.email"
                  style="font-size:13px; color:var(--text-3); align-self:center;">
              Keine Kontaktdaten —
              <a [routerLink]="['/clients', client.id, 'edit']" style="color:var(--primary);">Jetzt ergänzen</a>
            </span>
          </div>

          <!-- Action buttons -->
          <div style="display:flex; gap:8px; flex-wrap:wrap; padding-top:12px; border-top:1px solid var(--border);">
            <button (click)="showQuickNoteForm = !showQuickNoteForm"
                    [style.background]="showQuickNoteForm ? 'var(--accent-soft)' : 'var(--surface-2)'"
                    [style.border-color]="showQuickNoteForm ? 'var(--primary)' : 'var(--border)'"
                    [style.color]="showQuickNoteForm ? 'var(--primary)' : 'var(--text-2)'"
                    style="display:inline-flex; align-items:center; gap:7px; padding:8px 16px;
                           border:1.5px solid; border-radius:9px; font-size:13px; font-weight:600; cursor:pointer;">
              <i class="ph-bold ph-note-pencil" style="font-size:15px;"></i>
              Notiz hinzufügen
            </button>
            <button (click)="showViewingDialog = true"
                    style="display:inline-flex; align-items:center; gap:7px; padding:8px 16px;
                           background:var(--surface-2); border:1.5px solid var(--border); border-radius:9px;
                           font-size:13px; font-weight:600; color:var(--text-2); cursor:pointer;">
              <i class="ph-bold ph-door-open" style="font-size:15px;"></i>
              Besichtigung planen
            </button>
          </div>

          <!-- ── Inline Notiz-Formular ──────────────────────────── -->
          <div *ngIf="showQuickNoteForm"
               style="margin-top:16px; padding-top:16px; border-top:1px solid var(--border);">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
              <div>
                <label style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px;">Betreff</label>
                <input type="text" [(ngModel)]="quickNoteSubject"
                       placeholder="Worum ging es?"
                       style="width:100%;padding:8px 11px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--surface-2);outline:none;box-sizing:border-box;">
              </div>
              <div>
                <label style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px;">Typ</label>
                <select [(ngModel)]="quickNoteType"
                        style="width:100%;padding:8px 11px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--surface-2);cursor:pointer;">
                  <option value="PHONE_OUTBOUND">📞 Anruf (ausgehend)</option>
                  <option value="PHONE_INBOUND">📞 Anruf (eingehend)</option>
                  <option value="EMAIL">✉ E-Mail</option>
                  <option value="MEETING">🤝 Meeting</option>
                </select>
              </div>
            </div>
            <textarea [(ngModel)]="quickNoteText"
                      placeholder="Was wurde besprochen?"
                      rows="3"
                      style="width:100%; padding:9px 11px; border:1.5px solid var(--border);
                             border-radius:8px; font-size:13px; color:var(--text);
                             background:var(--surface-2); resize:vertical;
                             font-family:inherit; margin-bottom:10px; box-sizing:border-box; outline:none;">
            </textarea>
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
              <select [(ngModel)]="quickNoteOutcome"
                      style="padding:8px 12px; border:1.5px solid var(--border); border-radius:8px;
                             font-size:13px; color:var(--text); background:var(--surface-2); cursor:pointer;">
                <option value="">Ergebnis wählen…</option>
                <option value="INTERESTED">Interessiert</option>
                <option value="NOT_INTERESTED">Kein Interesse</option>
                <option value="SCHEDULED_VIEWING">Besichtigung vereinbart</option>
                <option value="OFFER_MADE">Angebot gemacht</option>
                <option value="DEAL_CLOSED">Abschluss</option>
              </select>
              <button (click)="saveQuickNote()"
                      [disabled]="isSavingNote || !quickNoteText.trim()"
                      style="padding:8px 18px; background:var(--primary); color:#fff;
                             border:none; border-radius:8px; font-size:13px; font-weight:600;
                             cursor:pointer; transition:opacity 0.15s;"
                      [style.opacity]="(isSavingNote || !quickNoteText.trim()) ? '0.5' : '1'">
                <i class="ph ph-check" style="margin-right:4px;"></i>
                {{ isSavingNote ? 'Speichern…' : 'Notiz speichern' }}
              </button>
              <button (click)="showQuickNoteForm = false"
                      style="padding:8px 14px; background:none; border:1px solid var(--border); border-radius:8px; font-size:13px; color:var(--text-3); cursor:pointer;">
                Abbrechen
              </button>
            </div>
          </div>
        </div>

        <!-- ══ ZONE 4: Kontakthistorie ════════════════════════════ -->
        <div style="background:var(--surface); border:1.5px solid var(--border); border-radius:14px; padding:18px 20px; margin-bottom:20px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
            <i class="ph-fill ph-chat-circle-text" style="font-size:17px; color:var(--primary);"></i>
            <span style="font-size:15px; font-weight:700; color:var(--text);">Kontakthistorie</span>
            <span *ngIf="callNotesSummary"
                  style="font-size:12px; font-weight:700; color:var(--primary); background:var(--accent-soft); padding:2px 8px; border-radius:10px;">
              {{ callNotesSummary.totalCallNotes }}
            </span>
          </div>

          <app-loading-spinner *ngIf="isLoadingCallNotes && !callNotesSummary" size="sm"></app-loading-spinner>

          <!-- Notes timeline -->
          <div *ngIf="recentCallNotes.length > 0" style="display:flex; flex-direction:column; gap:2px;">
            <div *ngFor="let note of recentCallNotes"
                 style="display:flex; align-items:flex-start; gap:12px; padding:10px 0; border-bottom:1px solid var(--border);">
              <div style="width:30px; height:30px; border-radius:8px; background:var(--surface-2); display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px;">
                <i [class]="getCallTypeIcon(note.callType)" style="font-size:14px; color:var(--text-3);"></i>
              </div>
              <div style="flex:1; min-width:0;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <span style="font-size:13px; font-weight:600; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ note.subject }}</span>
                  <span *ngIf="note.outcome"
                        [ngClass]="getOutcomeClass(note.outcome)"
                        style="font-size:11px; font-weight:600; padding:1px 7px; border-radius:8px; white-space:nowrap; flex-shrink:0;">
                    {{ note.outcome | translateEnum:'callOutcome' }}
                  </span>
                  <span *ngIf="note.followUpRequired"
                        style="font-size:11px; font-weight:600; padding:1px 7px; border-radius:8px; background:#fffbeb; color:#d97706; white-space:nowrap; flex-shrink:0;">
                    Follow-up
                  </span>
                </div>
                <div style="font-size:11px; color:var(--text-3); margin-top:2px;">
                  {{ note.callDate | date:'dd.MM.yy · HH:mm' }}
                  <span *ngIf="note.followUpDate"> · Follow-up: {{ note.followUpDate | date:'dd.MM.yy' }}</span>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="!isLoadingCallNotes && recentCallNotes.length === 0"
               style="text-align:center; padding:24px 0; color:var(--text-3);">
            <i class="ph ph-chats-circle" style="font-size:28px; display:block; margin-bottom:8px;"></i>
            <div style="font-size:13px;">Noch keine Notizen vorhanden</div>
          </div>
        </div>

        <!-- ══ ZONE 5: Besichtigungen ═════════════════════════════ -->
        <div style="background:var(--surface); border:1.5px solid var(--border); border-radius:14px; padding:18px 20px; margin-bottom:20px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <i class="ph-fill ph-door-open" style="font-size:17px; color:#7c3aed;"></i>
              <span style="font-size:15px; font-weight:700; color:var(--text);">Besichtigungen</span>
              <span *ngIf="viewings.length > 0"
                    style="font-size:12px;font-weight:700;color:#7c3aed;background:color-mix(in srgb,#7c3aed 12%,var(--surface));padding:2px 8px;border-radius:10px;">
                {{ viewings.length }}
              </span>
            </div>
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
                <div style="font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ v.propertyTitle }}</div>
                <div style="font-size:11px;color:var(--text-3);">{{ v.viewingDate | date:'HH:mm' }} Uhr · {{ v.propertyAddress }}</div>
              </div>
              <div *ngIf="v.feedback" style="font-size:16px;" [title]="v.feedback">
                {{ v.feedback === 'LIKED' ? '👍' : v.feedback === 'DISLIKED' ? '👎' : '🤷' }}
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
            <i class="ph ph-door-open" style="font-size:28px;display:block;margin-bottom:8px;"></i>
            <div style="font-size:13px;">Noch keine Besichtigungen geplant</div>
          </div>
        </div>

        <!-- ══ ZONE 6: Sekundäre Infos (weiter unten) ════════════ -->
        <div style="margin-top:8px; margin-bottom:6px; display:flex; align-items:center; gap:8px;">
          <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-3);">Weitere Infos</span>
          <div style="flex:1; height:1px; background:var(--border);"></div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
          <!-- Personal Information -->
          <div class="card">
            <div class="card-header" style="display:flex;align-items:center;gap:8px;">
              <i class="ph ph-user-circle" style="font-size:15px;color:var(--text-3);"></i>
              <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">{{ 'clients.personalInformation' | translate }}</h3>
            </div>
            <div class="card-body">
              <dl class="space-y-3">
                <div *ngIf="client.email" style="display:flex;align-items:center;gap:8px;">
                  <i class="ph ph-envelope" style="font-size:13px;color:var(--text-3);flex-shrink:0;"></i>
                  <span style="font-size:13px;color:var(--text-2);">{{ client.email }}</span>
                </div>
                <div *ngIf="client.phone" style="display:flex;align-items:center;gap:8px;">
                  <i class="ph ph-phone" style="font-size:13px;color:var(--text-3);flex-shrink:0;"></i>
                  <span style="font-size:13px;color:var(--text-2);">{{ client.phone }}</span>
                </div>
                <div *ngIf="hasAddress()" style="display:flex;align-items:center;gap:8px;">
                  <i class="ph ph-map-pin" style="font-size:13px;color:var(--text-3);flex-shrink:0;"></i>
                  <span style="font-size:13px;color:var(--text-2);">{{ getAddressSummary() }}</span>
                </div>
              </dl>
              <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);display:flex;align-items:center;gap:6px;">
                <i [class]="client.gdprConsentGiven ? 'ph ph-shield-check' : 'ph ph-shield-warning'"
                   [style.color]="client.gdprConsentGiven ? 'var(--color-success)' : 'var(--color-error)'"
                   style="font-size:13px;"></i>
                <span style="font-size:11px;color:var(--text-3);">
                  DSGVO {{ client.gdprConsentGiven ? 'Einwilligung erteilt' : 'ausstehend' }}
                  <ng-container *ngIf="client.gdprConsentGiven && client.gdprConsentDate">
                    · {{ client.gdprConsentDate | date:'dd.MM.yy' }}
                  </ng-container>
                </span>
              </div>
            </div>
          </div>

          <!-- Kunden-Profil -->
          <div class="card">
            <div class="card-header" style="display:flex;align-items:center;gap:8px;">
              <i class="ph-fill ph-user-gear" style="font-size:15px;color:var(--primary);"></i>
              <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">Kunden-Profil</h3>
            </div>
            <div class="card-body">
              <dl class="space-y-3">
                <div>
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Kundentyp</dt>
                  <select [(ngModel)]="client.clientType" (change)="onClientProfileChange()"
                          style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--surface-2);cursor:pointer;">
                    <option value="BUYER">Käufer</option>
                    <option value="RENTER">Mieter</option>
                    <option value="SELLER">Verkäufer</option>
                  </select>
                </div>
                <div *ngIf="client.clientType !== 'SELLER'">
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Finanzierung</dt>
                  <select [(ngModel)]="client.financingStatus" (change)="onClientProfileChange()"
                          style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--surface-2);cursor:pointer;">
                    <option value="UNKNOWN">Unbekannt</option>
                    <option value="SELF_FINANCED">Eigenfinanzierung</option>
                    <option value="BANK_PRE_APPROVED">Bank-Vorabzusage</option>
                    <option value="NEEDS_FINANCING">Finanzierung nötig</option>
                  </select>
                </div>
                <div *ngIf="client.clientType !== 'SELLER'">
                  <dt class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Einzugs-Zeitraum</dt>
                  <select [(ngModel)]="client.moveInTimeline" (change)="onClientProfileChange()"
                          style="width:100%;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--surface-2);cursor:pointer;">
                    <option value="IMMEDIATE">Sofort</option>
                    <option value="THREE_MONTHS">In 3 Monaten</option>
                    <option value="SIX_MONTHS">In 6 Monaten</option>
                    <option value="ONE_YEAR">In 1 Jahr</option>
                    <option value="FLEXIBLE">Flexibel</option>
                  </select>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <!-- Search Criteria -->
        <div class="card" *ngIf="client.searchCriteria" style="margin-bottom:16px;">
          <div class="card-header flex items-center justify-between">
            <div style="display:flex;align-items:center;gap:8px;">
              <i class="ph ph-magnifying-glass" style="font-size:15px;color:var(--text-3);"></i>
              <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">{{ 'clients.propertySearchCriteria' | translate }}</h3>
            </div>
            <a [routerLink]="['/clients', client.id, 'edit']" class="btn btn-outline btn-sm">
              {{ 'clients.editSearchCriteria' | translate }}
            </a>
          </div>
          <div class="card-body">
            <dl class="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div *ngIf="client.searchCriteria.minSquareMeters || client.searchCriteria.maxSquareMeters">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ 'clients.sizeSqm' | translate }}</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {{ client.searchCriteria.minSquareMeters || '—' }} – {{ client.searchCriteria.maxSquareMeters || '—' }} m²
                </dd>
              </div>
              <div *ngIf="client.searchCriteria.minRooms || client.searchCriteria.maxRooms">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ 'clients.rooms' | translate }}</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {{ client.searchCriteria.minRooms || '—' }} – {{ client.searchCriteria.maxRooms || '—' }} Zi.
                </dd>
              </div>
              <div *ngIf="client.searchCriteria.minBudget || client.searchCriteria.maxBudget">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ 'clients.budgetEur' | translate }}</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">
                  {{ client.searchCriteria.minBudget || '—' }} – {{ client.searchCriteria.maxBudget || '—' }} €
                </dd>
              </div>
              <div *ngIf="client.searchCriteria.preferredLocations?.length" class="col-span-2">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ 'clients.preferredLocations' | translate }}</dt>
                <dd class="mt-1 flex flex-wrap gap-1">
                  <span *ngFor="let location of client.searchCriteria.preferredLocations" class="badge badge-primary">{{ location }}</span>
                </dd>
              </div>
              <div *ngIf="client.searchCriteria.propertyTypes?.length">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ 'clients.propertyTypes' | translate }}</dt>
                <dd class="mt-1 flex flex-wrap gap-1">
                  <span *ngFor="let type of client.searchCriteria.propertyTypes" class="badge badge-primary">{{ type }}</span>
                </dd>
              </div>
              <div *ngIf="client.searchCriteria.additionalRequirements" class="col-span-3">
                <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ 'clients.additionalRequirements' | translate }}</dt>
                <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ client.searchCriteria.additionalRequirements }}</dd>
              </div>
            </dl>
          </div>
        </div>

        <!-- File Attachments -->
        <div class="card" style="margin-bottom:24px;">
          <div class="card-header" style="display:flex;align-items:center;gap:8px;">
            <i class="ph ph-paperclip" style="font-size:15px;color:var(--text-3);"></i>
            <h3 class="text-base font-medium text-gray-900 dark:text-white">{{ 'attachments.sectionTitle' | translate }}</h3>
          </div>
          <div class="card-body">
            <app-file-attachment-manager entityType="client" [entityId]="client.id!"></app-file-attachment-manager>
          </div>
        </div>

        <!-- Footer actions -->
        <div style="display:flex; justify-content:flex-end;">
          <button (click)="deleteClient()" class="btn btn-danger" [disabled]="isDeleting">
            {{ isDeleting ? ('clients.deleting' | translate) : ('clients.delete' | translate) }}
          </button>
        </div>
      </div>

      <div *ngIf="!isLoading && !client" class="text-center py-8">
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ 'clients.notFound' | translate }}</p>
        <a routerLink="/clients" class="text-primary-600 hover:text-primary-900 text-sm font-medium">{{ 'clients.backToClients' | translate }}</a>
      </div>
    </div>

    <!-- Viewing Add Dialog -->
    <app-viewing-add-dialog
      *ngIf="showViewingDialog && client"
      mode="from-client"
      [preselectedClientId]="client.id"
      [preselectedClientName]="client.firstName + ' ' + client.lastName"
      (viewingCreated)="onViewingCreated()"
      (cancelled)="showViewingDialog = false">
    </app-viewing-add-dialog>

    <!-- Stage Upgrade Hint -->
    <div *ngIf="showStageUpgradeHint"
         style="position:fixed;bottom:24px;right:24px;background:var(--surface);border:1.5px solid var(--primary);border-radius:12px;padding:16px 20px;box-shadow:0 8px 32px rgba(0,0,0,.15);z-index:500;max-width:320px;">
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <i class="ph ph-info" style="color:var(--primary);font-size:20px;flex-shrink:0;margin-top:1px;"></i>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;color:var(--text-1);margin-bottom:4px;">Pipeline-Stage aktualisieren?</div>
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
  client: Client | null = null;
  isLoading = false;
  isDeleting = false;

  // Follow-up contact panel
  showContactPanel = false;
  followUpSubject = '';

  // Quick note form (inline action strip)
  showQuickNoteForm = false;
  quickNoteSubject = '';
  quickNoteType = 'PHONE_OUTBOUND';
  quickNoteText = '';
  quickNoteOutcome = '';
  isSavingNote = false;

  // Call Notes
  recentCallNotes: CallNoteSummary[] = [];
  previewCallNotes: CallNoteSummary[] = [];
  callNotesSummary: BulkSummary | null = null;
  isLoadingCallNotes = false;

  // Viewings
  viewings: ViewingSummary[] = [];
  isLoadingViewings = false;
  showViewingDialog = false;

  // Pipeline Stage
  stageDropdownOpen = false;
  showStageUpgradeHint = false;
  pipelineStages = [
    { value: PipelineStage.PROSPECT,      label: 'Interessent',    color: 'var(--stage-prospect)',      bg: 'var(--stage-prospect-bg)' },
    { value: PipelineStage.ACTIVE_SEARCH, label: 'Aktive Suche',   color: 'var(--stage-active-search)', bg: 'var(--stage-active-search-bg)' },
    { value: PipelineStage.VIEWING,       label: 'Besichtigungen', color: 'var(--stage-viewing)',       bg: 'var(--stage-viewing-bg)' },
    { value: PipelineStage.OFFER,         label: 'Angebot',        color: 'var(--stage-offer)',         bg: 'var(--stage-offer-bg)' },
    { value: PipelineStage.CLOSED,        label: 'Abschluss',      color: 'var(--stage-closed)',        bg: 'var(--stage-closed-bg)' },
    { value: PipelineStage.INACTIVE,      label: 'Inaktiv',        color: 'var(--stage-inactive)',      bg: 'var(--stage-inactive-bg)' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private clientService: ClientService,
    public callNotesService: CallNotesService,
    private viewingService: ViewingService
  ) {}

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id');
    if (clientId) {
      this.loadClient(clientId);
      this.loadCallNotes(clientId);
      this.loadViewings(clientId);
    }

    const action = this.route.snapshot.queryParamMap.get('action');
    if (action === 'contact') {
      this.showContactPanel = true;
      this.followUpSubject = this.route.snapshot.queryParamMap.get('subject') ?? '';
    }
  }

  private loadClient(id: string): void {
    this.isLoading = true;
    this.clientService.getClient(id).subscribe({
      next: (client) => {
        this.client = client;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading client:', error);
        this.isLoading = false;
      }
    });
  }

  private loadCallNotes(clientId: string): void {
    this.isLoadingCallNotes = true;

    // Load recent call notes (last 5)
    this.callNotesService.getCallNotesByClient(clientId, 0, 5).subscribe({
      next: (response: PagedResponse<CallNoteSummary>) => {
        this.recentCallNotes = response.content;
        this.previewCallNotes = response.content.slice(0, 3);
        this.isLoadingCallNotes = false;
      },
      error: (error) => {
        console.error('Error loading call notes:', error);
        this.isLoadingCallNotes = false;
      }
    });

    // Load call notes summary
    this.callNotesService.getClientCallNotesSummary(clientId).subscribe({
      next: (summary: BulkSummary) => {
        this.callNotesSummary = summary;
      },
      error: (error) => {
        console.error('Error loading call notes summary:', error);
      }
    });
  }

  dismissContactPanel(): void {
    this.showContactPanel = false;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
  }

  saveQuickNote(): void {
    if (!this.client?.id || !this.quickNoteText.trim()) return;
    this.isSavingNote = true;

    const request: CallNoteCreateRequest = {
      clientId: this.client.id,
      callDate: new Date().toISOString(),
      callType: (this.quickNoteType as CallType) || CallType.PHONE_OUTBOUND,
      subject: this.quickNoteSubject.trim() || this.followUpSubject || 'Gesprächsnotiz',
      notes: this.quickNoteText.trim(),
      followUpRequired: false,
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
        this.loadCallNotes(this.client!.id!);
        if (this.showContactPanel) this.dismissContactPanel();
      },
      error: () => {
        this.isSavingNote = false;
      }
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

  onViewingCreated(): void {
    this.showViewingDialog = false;
    const clientId = this.route.snapshot.paramMap.get('id');
    if (clientId) this.loadViewings(clientId);

    // Suggest stage upgrade if client is not yet in VIEWING stage
    const stageOrder = [PipelineStage.PROSPECT, PipelineStage.ACTIVE_SEARCH];
    if (this.client?.id && this.client.pipelineStage && stageOrder.includes(this.client.pipelineStage)) {
      this.showStageUpgradeHint = true;
    }
  }

  setStage(stage: PipelineStage): void {
    if (!this.client?.id) return;
    this.stageDropdownOpen = false;
    this.clientService.updatePipelineStage(this.client.id, stage).subscribe({
      next: (updated) => {
        this.client = updated;
      }
    });
  }

  onClientProfileChange(): void {
    if (!this.client?.id) return;
    this.clientService.updateClient(this.client.id, this.client).subscribe({
      next: (updated) => {
        this.client = updated;
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

  hasAddress(): boolean {
    return !!(this.client?.addressStreet || this.client?.addressCity ||
              this.client?.addressPostalCode || this.client?.addressCountry);
  }

  getAddressSummary(): string {
    if (!this.client) return '';
    const parts = [this.client.addressCity, this.client.addressPostalCode].filter(Boolean);
    return parts.length ? parts.join(', ') : (this.client.addressStreet ?? '');
  }

  getCallTypeIcon(callType: CallType): string {
    switch (callType) {
      case CallType.PHONE_INBOUND:  return 'ph ph-phone-incoming';
      case CallType.PHONE_OUTBOUND: return 'ph ph-phone-outgoing';
      case CallType.EMAIL:          return 'ph ph-envelope';
      case CallType.MEETING:        return 'ph ph-handshake';
      default:                      return 'ph ph-chat-circle';
    }
  }

  getOutcomeClass(outcome: string): string {
    switch (outcome) {
      case 'INTERESTED':
        return 'bg-green-100 text-green-800';
      case 'NOT_INTERESTED':
        return 'bg-red-100 text-red-800';
      case 'SCHEDULED_VIEWING':
        return 'bg-blue-100 text-blue-800';
      case 'OFFER_MADE':
        return 'bg-yellow-100 text-yellow-800';
      case 'DEAL_CLOSED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  deleteClient(): void {
    if (this.client && confirm(this.getTranslation('clients.deleteConfirm'))) {
      this.isDeleting = true;
      this.clientService.deleteClient(this.client.id!).subscribe({
        next: () => {
          this.router.navigate(['/clients']);
        },
        error: (error) => {
          console.error('Error deleting client:', error);
          this.isDeleting = false;
          alert(this.getTranslation('clients.deleteError'));
        }
      });
    }
  }

  private getTranslation(key: string): string {
    // This is a simple helper - in production you'd inject TranslateService
    // For now, return English fallback
    const translations: Record<string, string> = {
      'clients.deleteConfirm': 'Are you sure you want to delete this client? This action cannot be undone.',
      'clients.deleteError': 'Failed to delete client. Please try again.'
    };
    return translations[key] || key;
  }
}