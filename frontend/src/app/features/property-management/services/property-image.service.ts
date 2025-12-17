import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PropertyImageDto } from '../models/property-image.model';

/**
 * Service for managing property images
 */
@Injectable({
  providedIn: 'root'
})
export class PropertyImageService {
  private readonly apiUrl = `${environment.apiUrl}/properties`;

  constructor(private http: HttpClient) {}

  /**
   * Get all images for a property
   */
  getPropertyImages(propertyId: string): Observable<PropertyImageDto[]> {
    return this.http.get<PropertyImageDto[]>(`${this.apiUrl}/${propertyId}/images`);
  }

  /**
   * Get single image by ID
   */
  getImage(propertyId: string, imageId: string): Observable<PropertyImageDto> {
    return this.http.get<PropertyImageDto>(`${this.apiUrl}/${propertyId}/images/${imageId}`);
  }

  /**
   * Upload single image
   */
  uploadImage(propertyId: string, file: File, metadata?: Partial<PropertyImageDto>): Observable<HttpEvent<PropertyImageDto>> {
    const formData = new FormData();
    formData.append('file', file);

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    const request = new HttpRequest(
      'POST',
      `${this.apiUrl}/${propertyId}/images`,
      formData,
      {
        reportProgress: true
      }
    );

    return this.http.request<PropertyImageDto>(request);
  }

  /**
   * Upload multiple images
   */
  uploadMultipleImages(propertyId: string, files: File[]): Observable<HttpEvent<PropertyImageDto[]>> {
    const formData = new FormData();

    files.forEach((file, index) => {
      formData.append('files', file);
    });

    const request = new HttpRequest(
      'POST',
      `${this.apiUrl}/${propertyId}/images/bulk`,
      formData,
      {
        reportProgress: true
      }
    );

    return this.http.request<PropertyImageDto[]>(request);
  }

  /**
   * Update image metadata
   */
  updateImageMetadata(propertyId: string, imageId: string, metadata: Partial<PropertyImageDto>): Observable<PropertyImageDto> {
    return this.http.put<PropertyImageDto>(`${this.apiUrl}/${propertyId}/images/${imageId}`, metadata);
  }

  /**
   * Set image as primary
   */
  setPrimaryImage(propertyId: string, imageId: string): Observable<PropertyImageDto> {
    return this.http.patch<PropertyImageDto>(`${this.apiUrl}/${propertyId}/images/${imageId}/primary`, {});
  }

  /**
   * Reorder images
   */
  reorderImages(propertyId: string, imageIds: string[]): Observable<PropertyImageDto[]> {
    return this.http.put<PropertyImageDto[]>(`${this.apiUrl}/${propertyId}/images/reorder`, { imageIds });
  }

  /**
   * Delete image
   */
  deleteImage(propertyId: string, imageId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${propertyId}/images/${imageId}`);
  }

  /**
   * Delete multiple images
   */
  deleteMultipleImages(propertyId: string, imageIds: string[]): Observable<void> {
    return this.http.request<void>('DELETE', `${this.apiUrl}/${propertyId}/images/bulk`, {
      body: { imageIds }
    });
  }

  /**
   * Get image URL
   */
  getImageUrl(propertyId: string, imageId: string): string {
    return `${this.apiUrl}/${propertyId}/images/${imageId}/file`;
  }

  /**
   * Get thumbnail URL
   */
  getThumbnailUrl(propertyId: string, imageId: string): string {
    return `${this.apiUrl}/${propertyId}/images/${imageId}/thumbnail`;
  }

  /**
   * Download image
   */
  downloadImage(propertyId: string, imageId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${propertyId}/images/${imageId}/download`, {
      responseType: 'blob'
    });
  }

  /**
   * Validate image file
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds the maximum limit of 50MB.'
      };
    }

    return { valid: true };
  }

  /**
   * Validate multiple image files
   */
  validateMultipleImageFiles(files: File[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    files.forEach((file, index) => {
      const validation = this.validateImageFile(file);
      if (!validation.valid) {
        errors.push(`File ${index + 1} (${file.name}): ${validation.error}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
