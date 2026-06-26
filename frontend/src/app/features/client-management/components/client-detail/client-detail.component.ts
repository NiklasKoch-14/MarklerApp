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
  styles: [`
    .action-tile {
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      gap:7px; padding:20px 10px; border-radius:14px; cursor:pointer;
      border:2px solid transparent; text-decoration:none; transition:all 0.18s ease;
      font-family:inherit; background:none; flex:1; min-width:0;
    }
    .action-tile:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,.12); }
    .at-call    { background:var(--accent-soft); color:var(--primary); }
    .at-call:hover  { border-color:var(--primary); background:color-mix(in srgb,var(--primary) 14%,var(--surface)); }
    .at-email   { background:var(--color-blue-soft); color:var(--color-blue); }
    .at-email:hover { border-color:var(--color-blue); background:color-mix(in srgb,var(--color-blue) 14%,var(--surface)); }
    .at-note    { background:var(--color-amber-soft); color:var(--color-amber); }
    .at-note:hover  { border-color:var(--color-amber); background:color-mix(in srgb,var(--color-amber) 14%,var(--surface)); }
    .at-note.active { border-color:var(--color-amber)!important; box-shadow:0 4px 16px rgba(217,119,6,.22)!important; transform:translateY(-2px); }
    .at-viewing { background:var(--color-purple-soft); color:var(--color-purple); }
    .at-viewing:hover { border-color:var(--color-purple); background:color-mix(in srgb,var(--color-purple) 14%,var(--surface)); }
    .at-viewing.active { border-color:var(--color-purple)!important; box-shadow:0 4px 16px rgba(147,51,234,.22)!important; transform:translateY(-2px); }
    .at-disabled { opacity:0.35; cursor:not-allowed; pointer-events:none; }
    .stage-option:hover { background:var(--surface-2) !important; }
    .qm-item { display:flex; align-items:center; gap:10px; width:100%; padding:10px 14px; border:none; background:none; cursor:pointer; font-size:13px; font-weight:500; color:var(--text); text-align:left; font-family:inherit; transition:background 0.1s; }
    .qm-item:hover { background:var(--surface-2); }
    .qm-item.danger { color:var(--color-error); }
    .qm-item.danger:hover { background:var(--color-error-soft); }
    .hdr-icon { width:34px; height:34px; border-radius:9px; display:flex; align-items:center; justify-content:center; text-decoration:none; font-family:inherit; cursor:pointer; transition:all 0.15s; border:none; flex-shrink:0; position:relative; }
    .hdr-icon[data-tooltip]::after { content:attr(data-tooltip); position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%); background:var(--text); color:var(--surface); padding:4px 9px; border-radius:6px; font-size:11px; font-weight:500; white-space:nowrap; pointer-events:none; z-index:200; opacity:0; transition:opacity .15s; }
    .hdr-icon[data-tooltip]:hover::after { opacity:1; }
    .hdr-icon-call { background:var(--accent-soft); color:var(--primary); }
    .hdr-icon-call:hover { background:var(--primary); color:#fff; }
    .hdr-icon-email { background:var(--color-blue-soft); color:var(--color-blue); }
    .hdr-icon-email:hover { background:var(--color-blue); color:#fff; }
    .hdr-icon-bell { background:var(--color-amber-soft); color:var(--color-amber); }
    .hdr-icon-bell:hover { background:var(--color-amber); color:#fff; }
    .note-form-enter { animation:slideDown .18s ease; }
    @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
    .info-row { display:flex; align-items:center; gap:8px; padding:7px 0; border-bottom:1px solid var(--border); }
    .info-row:last-child { border-bottom:none; }
    .tl-row { display:flex; align-items:flex-start; gap:12px; padding:10px 0; border-bottom:1px solid var(--border); }
    .tl-row:last-child { border-bottom:none; }
  `],
  template: `
    <div style="padding:28px 36px;">
      <div *ngIf="isLoading" style="text-align:center;padding:48px 0;">
        <app-loading-spinner size="lg"></app-loading-spinner>
      </div>

      <div *ngIf="!isLoading && client">

        <!-- ══ HERO CARD ══════════════════════════════════════════ -->
        <div style="background:var(--surface); border:1.5px solid var(--border); border-radius:18px; padding:24px 28px; margin-bottom:16px;">

          <!-- Identity row -->
          <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
            <a routerLink="/clients"
               style="width:34px;height:34px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;color:var(--text-3);text-decoration:none;flex-shrink:0;">
              <i class="ph ph-arrow-left" style="font-size:16px;"></i>
            </a>

            <!-- Avatar -->
            <div style="width:52px;height:52px;border-radius:50%;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:var(--primary);flex-shrink:0;letter-spacing:0.5px;">
              {{ getInitials() }}
            </div>

            <!-- Name + Stage + chips -->
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                <h1 style="font-size:22px;font-weight:800;color:var(--text);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                  {{ client.firstName }} {{ client.lastName }}
                </h1>
                <!-- Quick-contact icons -->
                <a *ngIf="client.phone" [href]="'tel:' + client.phone" class="hdr-icon hdr-icon-call" [attr.data-tooltip]="client.phone">
                  <i class="ph-bold ph-phone" style="font-size:16px;"></i>
                </a>
                <a *ngIf="client.email" [href]="'mailto:' + client.email" class="hdr-icon hdr-icon-email" [attr.data-tooltip]="client.email">
                  <i class="ph-bold ph-envelope" style="font-size:16px;"></i>
                </a>
                <!-- Stage dropdown -->
                <div style="position:relative;" *ngIf="client.id">
                  <button (click)="stageDropdownOpen = !stageDropdownOpen"
                          [style.background]="getStageBg(client.pipelineStage)"
                          [style.color]="getStageColor(client.pipelineStage)"
                          style="display:inline-flex;align-items:center;gap:5px;padding:5px 12px;border-radius:20px;border:none;cursor:pointer;font-size:12px;font-weight:600;">
                    {{ getStageLabel(client.pipelineStage) }}
                    <i class="ph ph-caret-down" style="font-size:11px;"></i>
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
              </div>
              <!-- Context chips -->
              <div style="display:flex;align-items:center;gap:10px;margin-top:5px;flex-wrap:wrap;">
                <span *ngIf="callNotesSummary?.lastCallDate"
                      style="font-size:12px;color:var(--text-3);display:flex;align-items:center;gap:4px;">
                  <i class="ph ph-clock" style="font-size:12px;"></i>
                  Letzter Kontakt {{ callNotesSummary!.lastCallDate | date:'dd.MM.yy' }}
                </span>
                <span *ngIf="!callNotesSummary?.lastCallDate"
                      style="font-size:12px;color:var(--text-3);">Noch kein Kontakt</span>
              </div>
            </div>

            <!-- Header right: Edit + Bell + Quick-Menu -->
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
              <a [routerLink]="['/clients', client.id, 'edit']"
                 style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:var(--surface-2);color:var(--text-2);border:1px solid var(--border);border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;white-space:nowrap;">
                <i class="ph ph-pencil-simple" style="font-size:14px;"></i>
                Bearbeiten
              </a>

              <!-- Follow-up / Notiz icon button -->
              <button class="hdr-icon hdr-icon-bell"
                      (click)="showQuickNoteForm = !showQuickNoteForm"
                      [attr.data-tooltip]="(callNotesSummary?.pendingFollowUps || 0) > 0
                        ? callNotesSummary!.pendingFollowUps + ' Follow-up' + (callNotesSummary!.pendingFollowUps > 1 ? 's' : '') + ' offen'
                        : 'Gesprächsnotiz'">
                <i [class]="(callNotesSummary?.pendingFollowUps || 0) > 0 ? 'ph-bold ph-bell-ringing' : 'ph-bold ph-bell'"
                   style="font-size:16px;"></i>
                <span *ngIf="(callNotesSummary?.pendingFollowUps || 0) > 0"
                      style="position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;background:var(--color-amber);color:#fff;border-radius:8px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 3px;line-height:1;">
                  {{ callNotesSummary!.pendingFollowUps }}
                </span>
              </button>

              <!-- ⋯ Quick-action menu -->
              <div style="position:relative;">
                <button (click)="showQuickMenu = !showQuickMenu"
                        style="width:36px;height:36px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-2);transition:border-color 0.15s;"
                        title="Weitere Aktionen">
                  <i class="ph ph-dots-three" style="font-size:20px;"></i>
                </button>
                <!-- Backdrop -->
                <div *ngIf="showQuickMenu" (click)="showQuickMenu = false"
                     style="position:fixed;inset:0;z-index:199;"></div>
                <!-- Dropdown -->
                <div *ngIf="showQuickMenu"
                     style="position:absolute;top:calc(100% + 6px);right:0;min-width:210px;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:0 8px 28px rgba(0,0,0,.14);z-index:200;overflow:hidden;">
                  <button class="qm-item" (click)="showAttachmentsDialog = true; showQuickMenu = false">
                    <i class="ph ph-paperclip" style="font-size:16px;color:var(--text-3);"></i>
                    Dokumente &amp; Anhänge
                  </button>
                  <div style="height:1px;background:var(--border);margin:4px 0;"></div>
                  <button class="qm-item danger" (click)="deleteClient(); showQuickMenu = false" [disabled]="isDeleting">
                    <i class="ph ph-trash" style="font-size:16px;"></i>
                    {{ isDeleting ? 'Wird gelöscht…' : 'Kunde löschen' }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Action Tiles ─────────────────────────────────── -->
          <div style="border-top:1px solid var(--border); margin-top:20px; padding-top:20px; display:grid; grid-template-columns:repeat(2,1fr); gap:12px;">

            <!-- Notiz -->
            <button (click)="showQuickNoteForm = !showQuickNoteForm"
                    class="action-tile at-note"
                    [class.active]="showQuickNoteForm">
              <i class="ph-bold ph-note-pencil" style="font-size:26px;"></i>
              <span style="font-size:13px;font-weight:700;">Notiz</span>
              <span style="font-size:11px;opacity:0.7;">Gespräch notieren</span>
            </button>

            <!-- Besichtigung -->
            <button (click)="showViewingForm = !showViewingForm"
                    class="action-tile at-viewing"
                    [class.active]="showViewingForm">
              <i class="ph-bold ph-door-open" style="font-size:26px;"></i>
              <span style="font-size:13px;font-weight:700;">Besichtigung</span>
              <span style="font-size:11px;opacity:0.7;">Termin planen</span>
            </button>
          </div>
        </div>

        <!-- ── Inline Notiz-Formular ────────────────────────────── -->
        <div *ngIf="showQuickNoteForm" class="note-form-enter"
             style="background:var(--surface);border:2px solid var(--color-amber);border-radius:14px;padding:20px 24px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
            <i class="ph-fill ph-note-pencil" style="font-size:16px;color:var(--color-amber);"></i>
            <span style="font-size:14px;font-weight:700;color:var(--text);">Gesprächsnotiz</span>
            <button (click)="showQuickNoteForm = false"
                    style="margin-left:auto;background:none;border:none;cursor:pointer;color:var(--text-3);font-size:18px;line-height:1;">
              <i class="ph ph-x"></i>
            </button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px;">Betreff</label>
              <input type="text" [(ngModel)]="quickNoteSubject" placeholder="Worum ging es?"
                     style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--surface-2);outline:none;box-sizing:border-box;">
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:5px;">Kontaktart</label>
              <select [(ngModel)]="quickNoteType"
                      style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);background:var(--surface-2);cursor:pointer;">
                <option value="PHONE_OUTBOUND">📞 Anruf (ausgehend)</option>
                <option value="PHONE_INBOUND">📞 Anruf (eingehend)</option>
                <option value="EMAIL">✉ E-Mail</option>
                <option value="MEETING">🤝 Meeting</option>
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
            <button (click)="saveQuickNote()" [disabled]="isSavingNote || !quickNoteText.trim()"
                    style="padding:9px 20px;background:var(--color-amber);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:opacity 0.15s;"
                    [style.opacity]="(isSavingNote || !quickNoteText.trim()) ? '0.45' : '1'">
              <i class="ph ph-check" style="margin-right:5px;"></i>
              {{ isSavingNote ? 'Speichern…' : 'Notiz speichern' }}
            </button>
          </div>
        </div>

        <!-- ── Inline Besichtigungs-Formular ───────────────────────── -->
        <app-viewing-add-dialog
          *ngIf="showViewingForm && client"
          [inline]="true"
          mode="from-client"
          [preselectedClientId]="client.id"
          [preselectedClientName]="client.firstName + ' ' + client.lastName"
          (viewingCreated)="onViewingCreated()"
          (cancelled)="showViewingForm = false">
        </app-viewing-add-dialog>

        <!-- ── Follow-up Alert ──────────────────────────────────── -->
        <div *ngIf="showContactPanel"
             style="border-left:4px solid var(--color-error);background:var(--color-error-soft);border-radius:10px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
          <i class="ph-fill ph-warning" style="color:var(--color-error);font-size:20px;flex-shrink:0;"></i>
          <div style="flex:1;min-width:0;">
            <div style="font-size:11px;font-weight:700;color:var(--color-error);text-transform:uppercase;letter-spacing:.05em;">Follow-up fällig</div>
            <div style="font-size:14px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ followUpSubject }}</div>
          </div>
          <button (click)="dismissContactPanel()"
                  style="background:none;border:none;cursor:pointer;color:var(--text-3);font-size:18px;line-height:1;flex-shrink:0;">
            <i class="ph ph-x"></i>
          </button>
        </div>

        <!-- ══ TWO-COLUMN BODY ════════════════════════════════════ -->
        <div style="display:grid; grid-template-columns:minmax(0,3fr) minmax(0,2fr); gap:20px; align-items:start;">

          <!-- LEFT: Activity stream -->
          <div style="display:flex;flex-direction:column;gap:16px;">

            <!-- Kontakthistorie -->
            <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:18px 20px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                <i class="ph-fill ph-chat-circle-text" style="font-size:17px;color:var(--primary);"></i>
                <span style="font-size:15px;font-weight:700;color:var(--text);">Kontakthistorie</span>
                <span *ngIf="callNotesSummary"
                      style="font-size:12px;font-weight:700;color:var(--primary);background:var(--accent-soft);padding:2px 8px;border-radius:10px;">
                  {{ callNotesSummary.totalCallNotes }}
                </span>
              </div>
              <app-loading-spinner *ngIf="isLoadingCallNotes && !callNotesSummary" size="sm"></app-loading-spinner>
              <div *ngIf="recentCallNotes.length > 0">
                <div *ngFor="let note of recentCallNotes" class="tl-row">
                  <div style="width:32px;height:32px;border-radius:9px;background:var(--surface-2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
                    <i [class]="getCallTypeIcon(note.callType)" style="font-size:14px;color:var(--text-3);"></i>
                  </div>
                  <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                      <span style="font-size:13px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ note.subject }}</span>
                      <span *ngIf="note.outcome" [ngClass]="getOutcomeClass(note.outcome)"
                            style="font-size:11px;font-weight:600;padding:1px 7px;border-radius:8px;white-space:nowrap;flex-shrink:0;">
                        {{ note.outcome | translateEnum:'callOutcome' }}
                      </span>
                      <span *ngIf="note.followUpRequired"
                            style="font-size:11px;font-weight:600;padding:1px 7px;border-radius:8px;background:var(--color-amber-soft);color:var(--color-amber);white-space:nowrap;flex-shrink:0;">
                        Follow-up
                      </span>
                    </div>
                    <div style="font-size:11px;color:var(--text-3);margin-top:2px;">
                      {{ note.callDate | date:'dd.MM.yy · HH:mm' }}
                      <span *ngIf="note.followUpDate"> · Follow-up: {{ note.followUpDate | date:'dd.MM.yy' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div *ngIf="!isLoadingCallNotes && recentCallNotes.length === 0"
                   style="text-align:center;padding:20px 0;color:var(--text-3);">
                <i class="ph ph-chats-circle" style="font-size:28px;display:block;margin-bottom:6px;"></i>
                <div style="font-size:13px;">Noch keine Notizen</div>
              </div>
            </div>

            <!-- Besichtigungen -->
            <div style="background:var(--surface);border:1.5px solid var(--border);border-radius:14px;padding:18px 20px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                <i class="ph-fill ph-door-open" style="font-size:17px;color:var(--color-purple);"></i>
                <span style="font-size:15px;font-weight:700;color:var(--text);">Besichtigungen</span>
                <span *ngIf="viewings.length > 0"
                      style="font-size:12px;font-weight:700;color:var(--color-purple);background:var(--color-purple-soft);padding:2px 8px;border-radius:10px;">
                  {{ viewings.length }}
                </span>
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
                <i class="ph ph-door-open" style="font-size:28px;display:block;margin-bottom:6px;"></i>
                <div style="font-size:13px;">Noch keine Besichtigungen geplant</div>
              </div>
            </div>
          </div>

          <!-- RIGHT: Info sidebar -->
          <div style="display:flex;flex-direction:column;gap:16px;">

            <!-- Persönliche Daten -->
            <div class="card">
              <div class="card-header" style="display:flex;align-items:center;gap:8px;">
                <i class="ph ph-user-circle" style="font-size:15px;color:var(--text-3);"></i>
                <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">{{ 'clients.personalInformation' | translate }}</h3>
              </div>
              <div class="card-body" style="padding-top:4px;">
                <div class="info-row" *ngIf="client.email">
                  <i class="ph ph-envelope" style="font-size:13px;color:var(--text-3);flex-shrink:0;"></i>
                  <span style="font-size:13px;color:var(--text-2);word-break:break-all;">{{ client.email }}</span>
                </div>
                <div class="info-row" *ngIf="client.phone">
                  <i class="ph ph-phone" style="font-size:13px;color:var(--text-3);flex-shrink:0;"></i>
                  <span style="font-size:13px;color:var(--text-2);">{{ client.phone }}</span>
                </div>
                <div class="info-row" *ngIf="hasAddress()">
                  <i class="ph ph-map-pin" style="font-size:13px;color:var(--text-3);flex-shrink:0;"></i>
                  <span style="font-size:13px;color:var(--text-2);">{{ getAddressSummary() }}</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px;margin-top:10px;padding-top:8px;border-top:1px solid var(--border);">
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

            <!-- Suchkriterien -->
            <div class="card" *ngIf="client.searchCriteria">
              <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <i class="ph ph-magnifying-glass" style="font-size:15px;color:var(--text-3);"></i>
                  <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">{{ 'clients.propertySearchCriteria' | translate }}</h3>
                </div>
                <a [routerLink]="['/clients', client.id, 'edit']" class="btn btn-outline btn-sm">Bearbeiten</a>
              </div>
              <div class="card-body">
                <dl class="space-y-3">
                  <div *ngIf="client.searchCriteria.minSquareMeters || client.searchCriteria.maxSquareMeters">
                    <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ 'clients.sizeSqm' | translate }}</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ client.searchCriteria.minSquareMeters || '—' }} – {{ client.searchCriteria.maxSquareMeters || '—' }} m²</dd>
                  </div>
                  <div *ngIf="client.searchCriteria.minRooms || client.searchCriteria.maxRooms">
                    <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ 'clients.rooms' | translate }}</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ client.searchCriteria.minRooms || '—' }} – {{ client.searchCriteria.maxRooms || '—' }} Zi.</dd>
                  </div>
                  <div *ngIf="client.searchCriteria.minBudget || client.searchCriteria.maxBudget">
                    <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ 'clients.budgetEur' | translate }}</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ client.searchCriteria.minBudget || '—' }} – {{ client.searchCriteria.maxBudget || '—' }} €</dd>
                  </div>
                  <div *ngIf="client.searchCriteria.preferredLocations?.length">
                    <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ 'clients.preferredLocations' | translate }}</dt>
                    <dd class="mt-1 flex flex-wrap gap-1">
                      <span *ngFor="let location of client.searchCriteria.preferredLocations" class="badge badge-primary">{{ location }}</span>
                    </dd>
                  </div>
                  <div *ngIf="client.searchCriteria.additionalRequirements">
                    <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ 'clients.additionalRequirements' | translate }}</dt>
                    <dd class="mt-1 text-sm text-gray-900 dark:text-gray-100">{{ client.searchCriteria.additionalRequirements }}</dd>
                  </div>
                </dl>
              </div>
            </div>


          </div>

        </div><!-- end two-col -->
      </div>

      <div *ngIf="!isLoading && !client" class="text-center py-8">
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ 'clients.notFound' | translate }}</p>
        <a routerLink="/clients" class="text-primary-600 hover:text-primary-900 text-sm font-medium">{{ 'clients.backToClients' | translate }}</a>
      </div>
    </div>

    <!-- Attachments Dialog -->
    <div *ngIf="showAttachmentsDialog && client"
         style="position:fixed;inset:0;z-index:600;display:flex;align-items:flex-start;justify-content:center;padding:48px 20px 20px;"
         (click)="showAttachmentsDialog = false">
      <!-- Backdrop -->
      <div style="position:absolute;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(3px);"></div>
      <!-- Dialog panel -->
      <div style="position:relative;width:100%;max-width:680px;background:var(--surface);border-radius:18px;box-shadow:0 24px 64px rgba(0,0,0,.22);overflow:hidden;max-height:calc(100vh - 80px);display:flex;flex-direction:column;"
           (click)="$event.stopPropagation()">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;padding:18px 22px;border-bottom:1px solid var(--border);flex-shrink:0;">
          <div style="width:34px;height:34px;border-radius:9px;background:var(--surface-2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;">
            <i class="ph ph-paperclip" style="font-size:16px;color:var(--text-3);"></i>
          </div>
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:700;color:var(--text);">{{ 'attachments.sectionTitle' | translate }}</div>
            <div style="font-size:12px;color:var(--text-3);">{{ client.firstName }} {{ client.lastName }}</div>
          </div>
          <button (click)="showAttachmentsDialog = false"
                  style="width:32px;height:32px;border-radius:8px;background:var(--surface-2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-3);font-size:16px;">
            <i class="ph ph-x"></i>
          </button>
        </div>
        <!-- Content: full manager -->
        <div style="overflow-y:auto;flex:1;padding:20px 22px;">
          <app-file-attachment-manager
            entityType="client"
            [entityId]="client.id!">
          </app-file-attachment-manager>
        </div>
      </div>
    </div>

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
  showViewingForm = false;

  // Attachments dialog
  showAttachmentsDialog = false;

  // Pipeline Stage
  stageDropdownOpen = false;
  showQuickMenu = false;
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
    this.showViewingForm = false;
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

  getInitials(): string {
    const f = this.client?.firstName?.charAt(0)?.toUpperCase() ?? '';
    const l = this.client?.lastName?.charAt(0)?.toUpperCase() ?? '';
    return f + l;
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