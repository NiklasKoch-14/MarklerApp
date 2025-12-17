import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { PropertyImageService } from '../../services/property-image.service';
import { PropertyImageDto, PropertyImageType, getImageTypeName } from '../../models/property-image.model';

@Component({
  selector: 'app-property-image-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="property-image-upload">
      <!-- Image Gallery -->
      <div class="mb-6" *ngIf="images && images.length > 0">
        <h3 class="text-lg font-semibold mb-4">Property Images ({{ images.length }})</h3>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div
            *ngFor="let image of images"
            class="relative group border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            [class.ring-2]="image.isPrimary"
            [class.ring-primary]="image.isPrimary"
          >
            <!-- Image -->
            <div class="aspect-square bg-gray-200 dark:bg-gray-700">
              <img
                [src]="image.thumbnailUrl || image.imageUrl"
                [alt]="image.altText || image.title || 'Property image'"
                class="w-full h-full object-cover"
              />
            </div>

            <!-- Image Info -->
            <div class="p-2 bg-white dark:bg-gray-800">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-medium truncate">{{ image.title || 'Untitled' }}</span>
                <span *ngIf="image.isPrimary" class="badge badge-xs badge-primary">Primary</span>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ getImageTypeName(image.imageType || 'GENERAL') }}
              </div>
            </div>

            <!-- Overlay Actions -->
            <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                *ngIf="!image.isPrimary"
                (click)="onSetPrimary(image)"
                class="btn btn-sm btn-circle btn-primary"
                title="Set as primary"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </button>
              <button
                (click)="onEditImage(image)"
                class="btn btn-sm btn-circle btn-info"
                title="Edit metadata"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button
                (click)="onDeleteImage(image)"
                class="btn btn-sm btn-circle btn-error"
                title="Delete image"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Upload Area -->
      <div class="mb-6">
        <h3 class="text-lg font-semibold mb-4">Upload Images</h3>

        <div
          class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
          [class.border-primary]="isDragging"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()"
        >
          <input
            #fileInput
            type="file"
            multiple
            accept="image/*"
            (change)="onFileSelected($event)"
            class="hidden"
          />

          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>

          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Click to upload or drag and drop
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-500">
            PNG, JPG, GIF, WebP up to 50MB
          </p>
        </div>

        <!-- Selected Files Preview -->
        <div *ngIf="selectedFiles.length > 0" class="mt-4">
          <h4 class="text-sm font-medium mb-2">Selected Files ({{ selectedFiles.length }})</h4>
          <div class="space-y-2">
            <div
              *ngFor="let file of selectedFiles; let i = index"
              class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded"
            >
              <div class="flex items-center gap-2 flex-1">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <span class="text-sm truncate">{{ file.name }}</span>
                <span class="text-xs text-gray-500">{{ formatFileSize(file.size) }}</span>
              </div>
              <button
                (click)="removeSelectedFile(i)"
                class="btn btn-xs btn-ghost btn-circle"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Upload Progress -->
        <div *ngIf="uploadProgress > 0 && uploadProgress < 100" class="mt-4">
          <div class="flex justify-between mb-1">
            <span class="text-sm font-medium">Uploading...</span>
            <span class="text-sm font-medium">{{ uploadProgress }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-primary h-2 rounded-full transition-all"
              [style.width.%]="uploadProgress"
            ></div>
          </div>
        </div>

        <!-- Upload Button -->
        <div class="mt-4 flex gap-2">
          <button
            *ngIf="selectedFiles.length > 0"
            (click)="onUpload()"
            [disabled]="isUploading"
            class="btn btn-primary"
          >
            <span *ngIf="isUploading" class="loading loading-spinner"></span>
            Upload {{ selectedFiles.length }} Image{{ selectedFiles.length > 1 ? 's' : '' }}
          </button>
          <button
            *ngIf="selectedFiles.length > 0"
            (click)="clearSelection()"
            [disabled]="isUploading"
            class="btn btn-ghost"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Error Messages -->
      <div *ngIf="errorMessage" class="alert alert-error mb-4">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        <span>{{ errorMessage }}</span>
      </div>
    </div>
  `,
  styles: [`
    .aspect-square {
      aspect-ratio: 1 / 1;
    }
  `]
})
export class PropertyImageUploadComponent implements OnInit {
  @Input() propertyId!: string;
  @Input() images: PropertyImageDto[] = [];
  @Output() imagesChanged = new EventEmitter<PropertyImageDto[]>();

  selectedFiles: File[] = [];
  isDragging = false;
  isUploading = false;
  uploadProgress = 0;
  errorMessage = '';
  currentLanguage = 'en';

  constructor(private imageService: PropertyImageService) {}

  ngOnInit(): void {
    if (!this.propertyId) {
      console.warn('Property ID is required for image upload component');
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(Array.from(files));
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
    }
  }

  private handleFiles(files: File[]): void {
    this.errorMessage = '';
    const validation = this.imageService.validateMultipleImageFiles(files);

    if (!validation.valid) {
      this.errorMessage = validation.errors.join('\n');
      return;
    }

    this.selectedFiles = [...this.selectedFiles, ...files];
  }

  removeSelectedFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  clearSelection(): void {
    this.selectedFiles = [];
    this.errorMessage = '';
  }

  onUpload(): void {
    if (this.selectedFiles.length === 0 || !this.propertyId) {
      return;
    }

    this.isUploading = true;
    this.uploadProgress = 0;
    this.errorMessage = '';

    this.imageService.uploadMultipleImages(this.propertyId, this.selectedFiles).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.uploadProgress = event.total ? Math.round((100 * event.loaded) / event.total) : 0;
        } else if (event.type === HttpEventType.Response) {
          this.uploadProgress = 100;
          this.isUploading = false;
          this.selectedFiles = [];
          // Refresh images list
          this.loadImages();
        }
      },
      error: (error) => {
        console.error('Error uploading images:', error);
        this.errorMessage = 'Error uploading images. Please try again.';
        this.isUploading = false;
        this.uploadProgress = 0;
      }
    });
  }

  private loadImages(): void {
    if (!this.propertyId) return;

    this.imageService.getPropertyImages(this.propertyId).subscribe({
      next: (images) => {
        this.images = images;
        this.imagesChanged.emit(this.images);
      },
      error: (error) => {
        console.error('Error loading images:', error);
      }
    });
  }

  onSetPrimary(image: PropertyImageDto): void {
    if (!image.id || !this.propertyId) return;

    this.imageService.setPrimaryImage(this.propertyId, image.id).subscribe({
      next: () => {
        this.loadImages();
      },
      error: (error) => {
        console.error('Error setting primary image:', error);
        this.errorMessage = 'Error setting primary image.';
      }
    });
  }

  onEditImage(image: PropertyImageDto): void {
    // This would open a modal or form to edit image metadata
    console.log('Edit image:', image);
    // TODO: Implement edit functionality
  }

  onDeleteImage(image: PropertyImageDto): void {
    if (!image.id || !this.propertyId) return;

    if (confirm('Are you sure you want to delete this image?')) {
      this.imageService.deleteImage(this.propertyId, image.id).subscribe({
        next: () => {
          this.loadImages();
        },
        error: (error) => {
          console.error('Error deleting image:', error);
          this.errorMessage = 'Error deleting image.';
        }
      });
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  getImageTypeName(type: string): string {
    return getImageTypeName(type as PropertyImageType, this.currentLanguage as 'de' | 'en');
  }
}
