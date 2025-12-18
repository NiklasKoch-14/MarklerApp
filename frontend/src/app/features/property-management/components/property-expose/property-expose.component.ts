import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { PropertyService, PropertyExpose } from '../../services/property.service';

@Component({
  selector: 'app-property-expose',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="bg-white shadow rounded-lg p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">
        {{ 'properties.expose.title' | translate }}
      </h3>

      <!-- No Expose State -->
      <div *ngIf="!expose && !uploading" class="text-center py-8">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">{{ 'properties.expose.noExpose' | translate }}</h3>
        <p class="mt-1 text-sm text-gray-500">{{ 'properties.expose.uploadDescription' | translate }}</p>

        <!-- File Input -->
        <div class="mt-6">
          <label class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
            <svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            {{ 'properties.expose.selectPdf' | translate }}
            <input type="file" class="hidden" accept=".pdf" (change)="onFileSelected($event)" [disabled]="uploading">
          </label>
          <p class="mt-2 text-xs text-gray-500">{{ 'properties.expose.maxSize' | translate }}</p>
        </div>
      </div>

      <!-- Has Expose State -->
      <div *ngIf="expose && !uploading" class="space-y-4">
        <!-- Expose Info Card -->
        <div class="flex items-start p-4 bg-gray-50 rounded-lg border border-gray-200">
          <svg class="mt-1 h-8 w-8 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd"></path>
          </svg>
          <div class="ml-4 flex-1">
            <h4 class="text-sm font-medium text-gray-900">{{ expose.fileName }}</h4>
            <p class="text-sm text-gray-500">
              {{ propertyService.formatFileSize(expose.fileSize) }}
              <span *ngIf="expose.uploadedAt" class="mx-2">•</span>
              <span *ngIf="expose.uploadedAt">{{ 'properties.expose.uploaded' | translate }}: {{ formatDate(expose.uploadedAt) }}</span>
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex space-x-3">
          <button
            type="button"
            (click)="downloadExpose()"
            [disabled]="downloading"
            class="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
            <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
            {{ downloading ? ('common.downloading' | translate) : ('properties.expose.download' | translate) }}
          </button>

          <button
            type="button"
            (click)="previewExpose()"
            [disabled]="previewing"
            class="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
            <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            {{ previewing ? ('common.loading' | translate) : ('properties.expose.preview' | translate) }}
          </button>

          <button
            type="button"
            (click)="confirmDelete()"
            [disabled]="deleting"
            class="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>

        <!-- Replace Button -->
        <div class="border-t border-gray-200 pt-4">
          <label class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
            <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            {{ 'properties.expose.replace' | translate }}
            <input type="file" class="hidden" accept=".pdf" (change)="onFileSelected($event)" [disabled]="uploading">
          </label>
        </div>
      </div>

      <!-- Uploading State -->
      <div *ngIf="uploading" class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p class="mt-4 text-sm text-gray-500">{{ 'properties.expose.uploading' | translate }}</p>
      </div>

      <!-- Error Alert -->
      <div *ngIf="error" class="mt-4 rounded-md bg-red-50 p-4">
        <div class="flex">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
          </svg>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800">{{ error }}</h3>
          </div>
        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      <div *ngIf="showDeleteConfirm" class="fixed inset-0 z-50 overflow-y-auto">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="fixed inset-0 transition-opacity" (click)="cancelDelete()">
            <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
          </div>

          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 class="text-lg leading-6 font-medium text-gray-900">
                    {{ 'properties.expose.deleteConfirmTitle' | translate }}
                  </h3>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500">
                      {{ 'properties.expose.deleteConfirmMessage' | translate }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                (click)="deleteExpose()"
                [disabled]="deleting"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                {{ deleting ? ('common.deleting' | translate) : ('common.delete' | translate) }}
              </button>
              <button
                type="button"
                (click)="cancelDelete()"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                {{ 'common.cancel' | translate }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PropertyExposeComponent implements OnInit, OnDestroy {
  @Input() propertyId!: string;

  expose: PropertyExpose | null = null;
  uploading = false;
  downloading = false;
  previewing = false;
  deleting = false;
  error: string | null = null;
  showDeleteConfirm = false;

  private destroy$ = new Subject<void>();

  constructor(public propertyService: PropertyService) {}

  ngOnInit(): void {
    this.loadExpose();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadExpose(): void {
    this.propertyService.hasExpose(this.propertyId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (hasExpose) => {
        if (hasExpose) {
          // Load expose metadata only (no file data)
          this.propertyService.downloadExpose(this.propertyId).pipe(
            takeUntil(this.destroy$)
          ).subscribe({
            next: (expose) => {
              // Store metadata without file data to avoid memory issues
              this.expose = {
                fileName: expose.fileName,
                fileSize: expose.fileSize,
                uploadedAt: expose.uploadedAt,
                propertyId: expose.propertyId
              };
            },
            error: (err) => {
              console.error('Error loading expose:', err);
            }
          });
        }
      },
      error: (err) => {
        console.error('Error checking expose:', err);
      }
    });
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      this.error = 'Only PDF files are allowed';
      return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      this.error = 'File size must not exceed 50MB';
      return;
    }

    this.error = null;
    this.uploadFile(file);
  }

  uploadFile(file: File): void {
    this.uploading = true;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1]; // Remove data:application/pdf;base64, prefix

      const expose: PropertyExpose = {
        fileName: file.name,
        fileData: base64Data,
        fileSize: file.size
      };

      this.propertyService.uploadExpose(this.propertyId, expose).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (result) => {
          this.expose = result;
          this.uploading = false;
          this.error = null;
        },
        error: (err) => {
          console.error('Error uploading expose:', err);
          console.error('Full error object:', JSON.stringify(err, null, 2));

          // Handle different error types
          if (err.status === 0) {
            this.error = 'Network error. Please check your connection and try again.';
          } else if (err.error?.message) {
            this.error = err.error.message;
          } else if (err.message) {
            this.error = err.message;
          } else {
            this.error = 'Failed to upload expose. Please try again.';
          }
          this.uploading = false;
        }
      });
    };

    reader.onerror = () => {
      this.error = 'Failed to read file';
      this.uploading = false;
    };

    reader.readAsDataURL(file);
  }

  downloadExpose(): void {
    if (!this.expose) {
      console.warn('No expose available to download');
      return;
    }

    this.downloading = true;
    this.error = null;

    console.log('Downloading expose for property:', this.propertyId);

    this.propertyService.downloadExpose(this.propertyId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (expose) => {
        console.log('Expose downloaded, fileName:', expose.fileName, 'hasFileData:', !!expose.fileData);

        if (!expose.fileData) {
          console.error('No file data in response');
          this.error = 'No file data available for download';
          this.downloading = false;
          return;
        }

        try {
          // Create download link
          const linkSource = `data:application/pdf;base64,${expose.fileData}`;
          const downloadLink = document.createElement('a');
          downloadLink.href = linkSource;
          downloadLink.download = expose.fileName || 'expose.pdf';
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          this.downloading = false;
          console.log('Download triggered successfully');
        } catch (e) {
          console.error('Error creating download link:', e);
          this.error = 'Failed to create download link';
          this.downloading = false;
        }
      },
      error: (err) => {
        console.error('Error downloading expose:', err);
        console.error('Full error:', JSON.stringify(err, null, 2));
        this.error = err.error?.message || 'Failed to download expose';
        this.downloading = false;
      }
    });
  }

  previewExpose(): void {
    if (!this.expose) {
      console.warn('No expose available to preview');
      return;
    }

    this.previewing = true;
    this.error = null;

    console.log('Previewing expose for property:', this.propertyId);

    this.propertyService.downloadExpose(this.propertyId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (expose) => {
        console.log('Expose loaded for preview, fileName:', expose.fileName, 'hasFileData:', !!expose.fileData);

        if (!expose.fileData) {
          console.error('No file data in response');
          this.error = 'No file data available for preview';
          this.previewing = false;
          return;
        }

        try {
          // Open PDF in new tab
          const pdfWindow = window.open('');
          if (pdfWindow) {
            pdfWindow.document.write(
              `<iframe width='100%' height='100%' src='data:application/pdf;base64,${expose.fileData}'></iframe>`
            );
          } else {
            console.error('Failed to open popup window');
            this.error = 'Failed to open preview window. Please check popup blocker settings.';
          }
          this.previewing = false;
          console.log('Preview opened successfully');
        } catch (e) {
          console.error('Error opening preview:', e);
          this.error = 'Failed to open preview window';
          this.previewing = false;
        }
      },
      error: (err) => {
        console.error('Error previewing expose:', err);
        console.error('Full error:', JSON.stringify(err, null, 2));
        this.error = err.error?.message || 'Failed to preview expose';
        this.previewing = false;
      }
    });
  }

  confirmDelete(): void {
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  deleteExpose(): void {
    this.deleting = true;
    this.propertyService.deleteExpose(this.propertyId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: () => {
        this.expose = null;
        this.deleting = false;
        this.showDeleteConfirm = false;
        this.error = null;
      },
      error: (err) => {
        console.error('Error deleting expose:', err);
        this.error = 'Failed to delete expose';
        this.deleting = false;
        this.showDeleteConfirm = false;
      }
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString();
  }
}
