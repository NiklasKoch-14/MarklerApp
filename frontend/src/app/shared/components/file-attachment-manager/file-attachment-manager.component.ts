import { Component, Input, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpEventType } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';

import { FileAttachmentService } from '../../services/file-attachment.service';
import {
  FileAttachmentDto,
  FileAttachmentType,
  FileAttachmentUploadDto,
  FileAttachmentEntityType,
  FileUploadState,
  FILE_TYPE_METADATA
} from '../../models/file-attachment.model';

/**
 * Reusable component for managing file attachments
 * Works for both properties and clients
 */
@Component({
  selector: 'app-file-attachment-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './file-attachment-manager.component.html',
  styleUrls: ['./file-attachment-manager.component.scss']
})
export class FileAttachmentManagerComponent implements OnInit, OnDestroy {
  @Input() entityType!: FileAttachmentEntityType;
  @Input() entityId!: string;

  attachments: FileAttachmentDto[] = [];
  isLoading = false;
  uploadStates: FileUploadState[] = [];
  isDragOver = false;

  // Context menu state
  contextMenuVisible = false;
  contextMenuX = 0;
  contextMenuY = 0;
  contextMenuAttachment: FileAttachmentDto | null = null;

  // File type metadata
  fileTypeMetadata = FILE_TYPE_METADATA;

  private destroy$ = new Subject<void>();

  constructor(
    public fileAttachmentService: FileAttachmentService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadAttachments();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load attachments for entity
   */
  loadAttachments(): void {
    this.isLoading = true;

    const request$ =
      this.entityType === 'property'
        ? this.fileAttachmentService.getPropertyAttachments(this.entityId)
        : this.fileAttachmentService.getClientAttachments(this.entityId);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (attachments) => {
        this.attachments = attachments;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading attachments:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Handle file selection from input
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      Array.from(input.files).forEach((file) => {
        this.uploadFile(file);
      });
      input.value = '';
    }
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  /**
   * Handle file drop
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (event.dataTransfer?.files) {
      Array.from(event.dataTransfer.files).forEach((file) => {
        this.uploadFile(file);
      });
    }
  }

  /**
   * Upload file with progress tracking
   */
  uploadFile(file: File): void {
    // Validate file
    const validation = this.fileAttachmentService.validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    // Create upload state
    const uploadState: FileUploadState = {
      file,
      progress: 0,
      uploading: true
    };
    this.uploadStates.push(uploadState);

    // Auto-detect file type based on extension
    const fileType = this.detectFileType(file.name);

    // Prepare upload DTO
    const uploadDto: FileAttachmentUploadDto = {
      fileType: fileType,
      description: undefined
    };

    // Upload based on entity type
    const upload$ =
      this.entityType === 'property'
        ? this.fileAttachmentService.uploadPropertyAttachment(this.entityId, file, uploadDto)
        : this.fileAttachmentService.uploadClientAttachment(this.entityId, file, uploadDto);

    upload$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          uploadState.progress = Math.round((100 * event.loaded) / event.total);
        } else if (event.type === HttpEventType.Response) {
          uploadState.uploading = false;
          uploadState.result = event.body || undefined;
          // Reload attachments after successful upload
          this.loadAttachments();
          // Remove upload state after a delay
          setTimeout(() => {
            this.uploadStates = this.uploadStates.filter((s) => s !== uploadState);
          }, 2000);
        }
      },
      error: (error) => {
        console.error('Error uploading file:', error);
        uploadState.uploading = false;
        uploadState.error = error.error?.message || 'Upload failed';
        // Remove upload state after a delay
        setTimeout(() => {
          this.uploadStates = this.uploadStates.filter((s) => s !== uploadState);
        }, 5000);
      }
    });
  }

  /**
   * Download attachment
   */
  downloadAttachment(attachment: FileAttachmentDto): void {
    if (!attachment.id) return;

    this.fileAttachmentService
      .downloadAttachment(attachment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.dataUrl) {
            this.fileAttachmentService.triggerDownload(result.dataUrl, result.originalFileName);
          }
        },
        error: (error) => {
          console.error('Error downloading file:', error);
          alert(this.translate.instant('attachments.errors.downloadFailed'));
        }
      });
  }

  /**
   * Delete attachment
   */
  deleteAttachment(attachment: FileAttachmentDto): void {
    if (!attachment.id) return;

    const confirmMessage = this.translate.instant('attachments.confirmDelete', {
      fileName: attachment.originalFileName
    });

    if (!confirm(confirmMessage)) return;

    this.fileAttachmentService
      .deleteAttachment(attachment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadAttachments();
        },
        error: (error) => {
          console.error('Error deleting file:', error);
          alert(this.translate.instant('attachments.errors.deleteFailed'));
        }
      });
  }

  /**
   * Get file icon for attachment
   */
  getFileIcon(attachment: FileAttachmentDto): string {
    return this.fileAttachmentService.getFileIcon(attachment);
  }

  /**
   * Get file color class for attachment
   */
  getFileColorClass(attachment: FileAttachmentDto): string {
    return this.fileAttachmentService.getFileColorClass(attachment);
  }

  /**
   * Get file type metadata
   */
  getFileTypeMetadata(fileType: FileAttachmentType) {
    return this.fileTypeMetadata[fileType];
  }

  /**
   * Check if there are active uploads
   */
  hasActiveUploads(): boolean {
    return this.uploadStates.some((s) => s.uploading);
  }

  /**
   * Detect file type based on file extension
   */
  detectFileType(fileName: string): FileAttachmentType {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    // Map extensions to file types
    if (extension === 'pdf') {
      return FileAttachmentType.CONTRACT;
    } else if (['doc', 'docx'].includes(extension)) {
      return FileAttachmentType.ID_DOCUMENT;
    } else if (['xls', 'xlsx'].includes(extension)) {
      return FileAttachmentType.FINANCIAL;
    } else if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
      return FileAttachmentType.FLOOR_PLAN;
    } else {
      return FileAttachmentType.OTHER;
    }
  }

  /**
   * Format date for display
   */
  formatDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Handle right-click context menu
   */
  onContextMenu(event: MouseEvent, attachment: FileAttachmentDto): void {
    event.preventDefault();
    event.stopPropagation();

    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.contextMenuAttachment = attachment;
    this.contextMenuVisible = true;
  }

  /**
   * Close context menu
   */
  closeContextMenu(): void {
    this.contextMenuVisible = false;
    this.contextMenuAttachment = null;
  }

  /**
   * Close context menu when clicking anywhere
   */
  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeContextMenu();
  }

  /**
   * Prevent context menu from closing when clicking inside it
   */
  @HostListener('contextmenu', ['$event'])
  onComponentContextMenu(event: MouseEvent): void {
    // Only prevent default if context menu is visible
    if (this.contextMenuVisible) {
      event.stopPropagation();
    }
  }
}
