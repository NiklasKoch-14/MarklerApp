import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ClientService, ClientImportResponse, ClientImportRowResult } from '../../services/client.service';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-client-import',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, LoadingSpinnerComponent],
  styles: [`
    .drop-zone {
      border: 1.5px dashed var(--border);
      border-radius: 14px;
      padding: 36px 24px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
    }
    .drop-zone:hover, .drop-zone.drag-over {
      border-color: var(--primary);
      background: var(--accent-soft);
    }
    .row-status { display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:600; padding:2px 9px; border-radius:20px; white-space:nowrap; }
    .row-status.IMPORTED { background:var(--color-success-soft); color:var(--color-success); }
    .row-status.SKIPPED_DUPLICATE { background:var(--color-warning-soft); color:var(--color-warning); }
    .row-status.FAILED { background:var(--color-error-soft); color:var(--color-error); }
    table.import-results { width:100%; border-collapse:separate; border-spacing:0; }
    table.import-results th { text-align:left; font-size:12px; font-weight:600; color:var(--text-3); text-transform:uppercase; letter-spacing:0.03em; padding:10px 14px; border-bottom:1px solid var(--border); background:var(--surface-2); white-space:nowrap; }
    table.import-results td { padding:9px 14px; border-bottom:1px solid var(--border); font-size:13px; color:var(--text-2); vertical-align:middle; }
    table.import-results tbody tr:last-child td { border-bottom:none; }
  `],
  template: `
    <div style="padding:28px 32px; max-width:820px; margin:0 auto;">
      <a routerLink="/clients"
         style="display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--text-3);text-decoration:none;margin-bottom:20px;">
        <i class="ri-arrow-left-line" style="font-size:14px;"></i>
        {{ 'clients.backToClients' | translate }}
      </a>

      <div class="page-header" style="margin-bottom:20px;">
        <div>
          <h1 class="page-title">{{ 'clients.import.title' | translate }}</h1>
          <p style="font-size:14px; color:var(--text-2); margin-top:4px;">{{ 'clients.import.subtitle' | translate }}</p>
        </div>
      </div>

      <!-- Instructions -->
      <div class="widget-card" style="margin-bottom:20px; padding:20px;">
        <h3 style="margin:0 0 8px; font-size:14px; font-weight:700; color:var(--text);">{{ 'clients.import.formatTitle' | translate }}</h3>
        <p style="margin:0 0 6px; font-size:13px; color:var(--text-2); line-height:1.6;">{{ 'clients.import.formatRequired' | translate }}</p>
        <p style="margin:0 0 14px; font-size:13px; color:var(--text-2); line-height:1.6;">{{ 'clients.import.formatOptional' | translate }}</p>
        <button class="btn-secondary" (click)="downloadTemplate()" style="display:inline-flex;">
          <i class="ri-download-2-line"></i>
          {{ 'clients.import.downloadTemplate' | translate }}
        </button>
      </div>

      <!-- Upload -->
      <div class="widget-card" style="margin-bottom:20px; padding:20px;" *ngIf="!result">
        <div class="drop-zone" [class.drag-over]="dragOver"
             (click)="fileInput.click()"
             (dragover)="onDragOver($event)" (dragleave)="dragOver = false" (drop)="onDrop($event)">
          <i class="ri-file-upload-line" style="font-size:32px; color:var(--text-3); display:block; margin-bottom:10px;"></i>
          <div *ngIf="!selectedFile" style="font-size:14px; color:var(--text-2);">{{ 'clients.import.dropHint' | translate }}</div>
          <div *ngIf="selectedFile" style="font-size:14px; font-weight:600; color:var(--text);">{{ selectedFile.name }}</div>
          <input #fileInput type="file" accept=".csv,text/csv" style="display:none;" (change)="onFileSelected($event)">
        </div>

        <div *ngIf="errorMessage" style="margin-top:14px; background:var(--color-error-soft); border:1px solid var(--color-error); border-radius:10px; padding:12px 14px;">
          <p style="margin:0; color:var(--color-error); font-size:13px; font-weight:500;">{{ errorMessage }}</p>
        </div>

        <div style="display:flex; justify-content:flex-end; margin-top:16px;">
          <button class="btn-primary" [disabled]="!selectedFile || isImporting" (click)="startImport()">
            <app-loading-spinner *ngIf="isImporting" size="sm"></app-loading-spinner>
            {{ isImporting ? ('clients.import.importing' | translate) : ('clients.import.startImport' | translate) }}
          </button>
        </div>
      </div>

      <!-- Result -->
      <div *ngIf="result">
        <div style="display:flex; gap:12px; margin-bottom:20px; flex-wrap:wrap;">
          <div style="flex:1; min-width:140px; background:var(--color-success-soft); border:1px solid var(--color-success); border-radius:12px; padding:14px 16px;">
            <div style="font-size:22px; font-weight:800; color:var(--color-success);">{{ result.importedCount }}</div>
            <div style="font-size:12px; font-weight:600; color:var(--text-2);">{{ 'clients.import.imported' | translate }}</div>
          </div>
          <div style="flex:1; min-width:140px; background:var(--color-warning-soft); border:1px solid var(--color-warning); border-radius:12px; padding:14px 16px;">
            <div style="font-size:22px; font-weight:800; color:var(--color-warning);">{{ result.skippedCount }}</div>
            <div style="font-size:12px; font-weight:600; color:var(--text-2);">{{ 'clients.import.skipped' | translate }}</div>
          </div>
          <div style="flex:1; min-width:140px; background:var(--color-error-soft); border:1px solid var(--color-error); border-radius:12px; padding:14px 16px;">
            <div style="font-size:22px; font-weight:800; color:var(--color-error);">{{ result.failedCount }}</div>
            <div style="font-size:12px; font-weight:600; color:var(--text-2);">{{ 'clients.import.failed' | translate }}</div>
          </div>
        </div>

        <div class="widget-card" style="overflow-x:auto; margin-bottom:20px;">
          <table class="import-results">
            <thead>
              <tr>
                <th>{{ 'clients.import.col.row' | translate }}</th>
                <th>{{ 'clients.import.col.name' | translate }}</th>
                <th>{{ 'clients.import.col.status' | translate }}</th>
                <th>{{ 'clients.import.col.message' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of result.rows">
                <td>{{ row.rowNumber }}</td>
                <td>{{ row.firstName }} {{ row.lastName }}</td>
                <td><span class="row-status" [class]="row.status">{{ statusLabelKey(row) | translate }}</span></td>
                <td>{{ row.message || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <button class="btn-secondary" (click)="reset()">
            {{ 'clients.import.importAnother' | translate }}
          </button>
          <a routerLink="/clients" class="btn-primary" style="display:inline-flex;">
            {{ 'clients.backToClients' | translate }}
          </a>
        </div>
      </div>
    </div>
  `
})
export class ClientImportComponent {
  selectedFile: File | null = null;
  dragOver = false;
  isImporting = false;
  errorMessage = '';
  result: ClientImportResponse | null = null;

  constructor(private clientService: ClientService) {}

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.errorMessage = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.selectedFile = file;
      this.errorMessage = '';
    }
  }

  downloadTemplate(): void {
    this.clientService.downloadImportTemplate().subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'kunden_import_vorlage.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    });
  }

  startImport(): void {
    if (!this.selectedFile || this.isImporting) return;
    this.isImporting = true;
    this.errorMessage = '';
    this.clientService.importClientsCsv(this.selectedFile).subscribe({
      next: (result) => {
        this.isImporting = false;
        this.result = result;
      },
      error: (error) => {
        this.isImporting = false;
        this.errorMessage = error.message || 'Import failed. Please check the file format and try again.';
      }
    });
  }

  reset(): void {
    this.selectedFile = null;
    this.result = null;
    this.errorMessage = '';
  }

  statusLabelKey(row: ClientImportRowResult): string {
    return 'clients.import.status.' + row.status;
  }
}
