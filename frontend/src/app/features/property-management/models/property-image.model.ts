/**
 * Enumeration for property image types
 */
export enum PropertyImageType {
  GENERAL = 'GENERAL',
  EXTERIOR = 'EXTERIOR',
  INTERIOR = 'INTERIOR',
  KITCHEN = 'KITCHEN',
  BATHROOM = 'BATHROOM',
  BEDROOM = 'BEDROOM',
  LIVING_ROOM = 'LIVING_ROOM',
  BALCONY_TERRACE = 'BALCONY_TERRACE',
  GARDEN = 'GARDEN',
  GARAGE_PARKING = 'GARAGE_PARKING',
  BASEMENT = 'BASEMENT',
  ATTIC = 'ATTIC',
  FLOOR_PLAN = 'FLOOR_PLAN',
  ENERGY_CERTIFICATE = 'ENERGY_CERTIFICATE',
  LOCATION_MAP = 'LOCATION_MAP'
}

/**
 * Property Image DTO interface matching backend PropertyImageDto
 */
export interface PropertyImageDto {
  // Identity
  id?: string;
  propertyId?: string;

  // File Information
  filename: string;
  originalFilename?: string;
  filePath?: string;
  contentType: string;
  fileSize: number;

  // Image Metadata
  title?: string;
  description?: string;
  altText?: string;
  width?: number;
  height?: number;

  // Image Organization
  isPrimary?: boolean;
  sortOrder?: number;
  imageType?: PropertyImageType;

  // Audit Fields (Read-Only)
  createdAt?: string;
  updatedAt?: string;

  // Computed Fields (Read-Only)
  imageUrl?: string;
  thumbnailUrl?: string;
  formattedFileSize?: string;
  fileExtension?: string;
  aspectRatio?: string;
}

/**
 * Helper function to get localized image type name
 */
export function getImageTypeName(type: PropertyImageType, language: 'de' | 'en' = 'en'): string {
  const names: Record<PropertyImageType, { de: string; en: string }> = {
    [PropertyImageType.GENERAL]: { de: 'Allgemein', en: 'General' },
    [PropertyImageType.EXTERIOR]: { de: 'Außenansicht', en: 'Exterior' },
    [PropertyImageType.INTERIOR]: { de: 'Innenansicht', en: 'Interior' },
    [PropertyImageType.KITCHEN]: { de: 'Küche', en: 'Kitchen' },
    [PropertyImageType.BATHROOM]: { de: 'Badezimmer', en: 'Bathroom' },
    [PropertyImageType.BEDROOM]: { de: 'Schlafzimmer', en: 'Bedroom' },
    [PropertyImageType.LIVING_ROOM]: { de: 'Wohnzimmer', en: 'Living Room' },
    [PropertyImageType.BALCONY_TERRACE]: { de: 'Balkon/Terrasse', en: 'Balcony/Terrace' },
    [PropertyImageType.GARDEN]: { de: 'Garten', en: 'Garden' },
    [PropertyImageType.GARAGE_PARKING]: { de: 'Garage/Stellplatz', en: 'Garage/Parking' },
    [PropertyImageType.BASEMENT]: { de: 'Keller', en: 'Basement' },
    [PropertyImageType.ATTIC]: { de: 'Dachboden', en: 'Attic' },
    [PropertyImageType.FLOOR_PLAN]: { de: 'Grundriss', en: 'Floor Plan' },
    [PropertyImageType.ENERGY_CERTIFICATE]: { de: 'Energieausweis', en: 'Energy Certificate' },
    [PropertyImageType.LOCATION_MAP]: { de: 'Lageplan', en: 'Location Map' }
  };
  return names[type][language];
}

/**
 * Helper function to format file size
 */
export function formatFileSize(bytes: number): string {
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

/**
 * Helper function to calculate aspect ratio
 */
export function calculateAspectRatio(width: number, height: number): string {
  if (!width || !height || height === 0) return 'Unknown';

  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);

  return `${width / divisor}:${height / divisor}`;
}
