/**
 * File Attachment models and interfaces
 * Matching backend FileAttachmentDto and FileAttachmentType
 */

/**
 * File attachment types matching backend enum
 */
export enum FileAttachmentType {
  CONTRACT = 'CONTRACT',
  FLOOR_PLAN = 'FLOOR_PLAN',
  ID_DOCUMENT = 'ID_DOCUMENT',
  CERTIFICATE = 'CERTIFICATE',
  FINANCIAL = 'FINANCIAL',
  INSPECTION_REPORT = 'INSPECTION_REPORT',
  OTHER = 'OTHER'
}

/**
 * File attachment DTO matching backend
 */
export interface FileAttachmentDto {
  id?: string;
  propertyId?: string;
  clientId?: string;
  agentId?: string;
  fileName: string;
  originalFileName: string;
  fileSize: number;
  formattedFileSize?: string;
  mimeType: string;
  fileType: FileAttachmentType;
  description?: string;
  uploadDate?: string;
  fileExtension?: string;
  downloadUrl?: string;
  dataUrl?: string;
  isPdf?: boolean;
  isImage?: boolean;
  isDocument?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Upload DTO for file attachments
 */
export interface FileAttachmentUploadDto {
  fileType: FileAttachmentType;
  description?: string;
  customFileName?: string;
}

/**
 * Entity type for file attachments
 */
export type FileAttachmentEntityType = 'property' | 'client';

/**
 * File upload state for UI progress tracking
 */
export interface FileUploadState {
  file: File;
  progress: number;
  uploading: boolean;
  error?: string;
  result?: FileAttachmentDto;
}

/**
 * File type metadata for UI display
 */
export interface FileTypeMetadata {
  icon: string;
  color: string;
  acceptedExtensions: string[];
  description: string;
}

/**
 * File type metadata map
 */
export const FILE_TYPE_METADATA: Record<FileAttachmentType, FileTypeMetadata> = {
  [FileAttachmentType.CONTRACT]: {
    icon: 'description',
    color: 'text-blue-600',
    acceptedExtensions: ['.pdf', '.doc', '.docx'],
    description: 'Contract documents'
  },
  [FileAttachmentType.FLOOR_PLAN]: {
    icon: 'map',
    color: 'text-purple-600',
    acceptedExtensions: ['.pdf', '.jpg', '.png', '.dwg'],
    description: 'Floor plans and architectural drawings'
  },
  [FileAttachmentType.ID_DOCUMENT]: {
    icon: 'badge',
    color: 'text-orange-600',
    acceptedExtensions: ['.pdf', '.jpg', '.png'],
    description: 'Identity documents'
  },
  [FileAttachmentType.CERTIFICATE]: {
    icon: 'verified',
    color: 'text-green-600',
    acceptedExtensions: ['.pdf', '.jpg', '.png'],
    description: 'Certificates and official documents'
  },
  [FileAttachmentType.FINANCIAL]: {
    icon: 'attach_money',
    color: 'text-emerald-600',
    acceptedExtensions: ['.pdf', '.xls', '.xlsx'],
    description: 'Financial documents'
  },
  [FileAttachmentType.INSPECTION_REPORT]: {
    icon: 'assignment',
    color: 'text-indigo-600',
    acceptedExtensions: ['.pdf', '.doc', '.docx'],
    description: 'Property inspection reports'
  },
  [FileAttachmentType.OTHER]: {
    icon: 'insert_drive_file',
    color: 'text-gray-600',
    acceptedExtensions: ['.*'],
    description: 'Other miscellaneous documents'
  }
};
