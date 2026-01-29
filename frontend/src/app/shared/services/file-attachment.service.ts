import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  FileAttachmentDto,
  FileAttachmentUploadDto,
  FileAttachmentEntityType
} from '../models/file-attachment.model';
import { ErrorHandlerService } from '../../core/services/error-handler.service';

/**
 * Service for managing file attachments for properties and clients
 */
@Injectable({
  providedIn: 'root'
})
export class FileAttachmentService {
  private readonly apiUrl = `${environment.apiUrl}/attachments`;

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService
  ) {}

  // ========================================
  // Property Attachments
  // ========================================

  /**
   * Upload file attachment for property
   */
  uploadPropertyAttachment(
    propertyId: string,
    file: File,
    uploadDto: FileAttachmentUploadDto
  ): Observable<HttpEvent<FileAttachmentDto>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', uploadDto.fileType);

    if (uploadDto.description) {
      formData.append('description', uploadDto.description);
    }

    if (uploadDto.customFileName) {
      formData.append('customFileName', uploadDto.customFileName);
    }

    const request = new HttpRequest(
      'POST',
      `${this.apiUrl}/properties/${propertyId}`,
      formData,
      {
        reportProgress: true
      }
    );

    return this.http.request<FileAttachmentDto>(request);
  }

  /**
   * Get all attachments for property
   */
  getPropertyAttachments(propertyId: string): Observable<FileAttachmentDto[]> {
    return this.http.get<FileAttachmentDto[]>(`${this.apiUrl}/properties/${propertyId}`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  // ========================================
  // Client Attachments
  // ========================================

  /**
   * Upload file attachment for client
   */
  uploadClientAttachment(
    clientId: string,
    file: File,
    uploadDto: FileAttachmentUploadDto
  ): Observable<HttpEvent<FileAttachmentDto>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', uploadDto.fileType);

    if (uploadDto.description) {
      formData.append('description', uploadDto.description);
    }

    if (uploadDto.customFileName) {
      formData.append('customFileName', uploadDto.customFileName);
    }

    const request = new HttpRequest(
      'POST',
      `${this.apiUrl}/clients/${clientId}`,
      formData,
      {
        reportProgress: true
      }
    );

    return this.http.request<FileAttachmentDto>(request);
  }

  /**
   * Get all attachments for client
   */
  getClientAttachments(clientId: string): Observable<FileAttachmentDto[]> {
    return this.http.get<FileAttachmentDto[]>(`${this.apiUrl}/clients/${clientId}`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  // ========================================
  // General Attachment Operations
  // ========================================

  /**
   * Download file attachment
   * Returns the attachment with Base64 data in dataUrl field
   */
  downloadAttachment(attachmentId: string): Observable<FileAttachmentDto> {
    return this.http.get<FileAttachmentDto>(`${this.apiUrl}/${attachmentId}/download`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Delete file attachment
   */
  deleteAttachment(attachmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${attachmentId}`).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  /**
   * Update attachment metadata
   */
  updateAttachmentMetadata(
    attachmentId: string,
    uploadDto: FileAttachmentUploadDto
  ): Observable<FileAttachmentDto> {
    return this.http.put<FileAttachmentDto>(
      `${this.apiUrl}/${attachmentId}/metadata`,
      uploadDto
    ).pipe(
      catchError(err => this.errorHandler.handleError(err))
    );
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, and GIF are allowed.'
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds the maximum limit of 10MB.'
      };
    }

    return { valid: true };
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Check if file is an image
   */
  isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Check if file is a PDF
   */
  isPdfFile(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  /**
   * Check if file is a document
   */
  isDocumentFile(mimeType: string): boolean {
    return (
      mimeType.includes('word') ||
      mimeType.includes('excel') ||
      mimeType.includes('spreadsheet') ||
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.ms-excel'
    );
  }

  /**
   * Trigger browser download from Base64 data
   */
  triggerDownload(dataUrl: string, filename: string): void {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  }

  /**
   * Get icon name for file type
   */
  getFileIcon(attachment: FileAttachmentDto): string {
    if (attachment.isPdf) {
      return 'picture_as_pdf';
    }
    if (attachment.isImage) {
      return 'image';
    }
    if (attachment.isDocument) {
      const ext = attachment.fileExtension?.toLowerCase();
      if (ext === 'doc' || ext === 'docx') {
        return 'description';
      }
      if (ext === 'xls' || ext === 'xlsx') {
        return 'table_chart';
      }
    }
    return 'insert_drive_file';
  }

  /**
   * Get color class for file type
   */
  getFileColorClass(attachment: FileAttachmentDto): string {
    if (attachment.isPdf) {
      return 'text-red-600';
    }
    if (attachment.isImage) {
      return 'text-blue-600';
    }
    if (attachment.isDocument) {
      const ext = attachment.fileExtension?.toLowerCase();
      if (ext === 'doc' || ext === 'docx') {
        return 'text-indigo-600';
      }
      if (ext === 'xls' || ext === 'xlsx') {
        return 'text-green-600';
      }
    }
    return 'text-gray-600';
  }
}
