import { PropertyImageDto } from './property-image.model';

/**
 * Enumeration for property types
 */
export enum PropertyType {
  APARTMENT = 'APARTMENT',
  HOUSE = 'HOUSE',
  TOWNHOUSE = 'TOWNHOUSE',
  VILLA = 'VILLA',
  PENTHOUSE = 'PENTHOUSE',
  LOFT = 'LOFT',
  DUPLEX = 'DUPLEX',
  STUDIO = 'STUDIO',
  OFFICE = 'OFFICE',
  RETAIL = 'RETAIL',
  WAREHOUSE = 'WAREHOUSE',
  INDUSTRIAL = 'INDUSTRIAL',
  RESTAURANT = 'RESTAURANT',
  HOTEL = 'HOTEL',
  PARKING_SPACE = 'PARKING_SPACE',
  GARAGE = 'GARAGE',
  LAND = 'LAND',
  FARM = 'FARM',
  CASTLE = 'CASTLE',
  OTHER = 'OTHER'
}

/**
 * Enumeration for property status
 */
export enum PropertyStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  RENTED = 'RENTED',
  WITHDRAWN = 'WITHDRAWN',
  UNDER_CONSTRUCTION = 'UNDER_CONSTRUCTION'
}

/**
 * Enumeration for listing types
 */
export enum ListingType {
  SALE = 'SALE',
  RENT = 'RENT',
  LEASE = 'LEASE'
}

/**
 * Enumeration for heating types
 */
export enum HeatingType {
  GAS = 'GAS',
  OIL = 'OIL',
  ELECTRIC = 'ELECTRIC',
  DISTRICT_HEATING = 'DISTRICT_HEATING',
  HEAT_PUMP = 'HEAT_PUMP',
  SOLAR = 'SOLAR',
  WOOD_PELLETS = 'WOOD_PELLETS',
  GEOTHERMAL = 'GEOTHERMAL',
  COAL = 'COAL',
  OTHER = 'OTHER'
}

/**
 * Property interface matching backend PropertyDto
 */
export interface Property {
  // Identity
  id?: string;
  agentId?: string;

  // Basic Information
  title: string;
  description?: string;
  propertyType: PropertyType;
  listingType: ListingType;
  status?: PropertyStatus;

  // Location Information
  addressStreet: string;
  addressHouseNumber?: string;
  addressCity: string;
  addressPostalCode: string;
  addressState?: string;
  addressCountry?: string;
  addressDistrict?: string;

  // Property Specifications
  livingAreaSqm?: number;
  totalAreaSqm?: number;
  plotAreaSqm?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  floors?: number;
  floorNumber?: number;
  constructionYear?: number;
  lastRenovationYear?: number;

  // Financial Information
  price?: number;
  pricePerSqm?: number;
  additionalCosts?: number;
  heatingCosts?: number;
  commission?: number;

  // Features and Amenities
  hasElevator?: boolean;
  hasBalcony?: boolean;
  hasTerrace?: boolean;
  hasGarden?: boolean;
  hasGarage?: boolean;
  hasParking?: boolean;
  hasBasement?: boolean;
  hasAttic?: boolean;
  isBarrierFree?: boolean;
  petsAllowed?: boolean;
  furnished?: boolean;

  // Energy Efficiency
  energyEfficiencyClass?: string;
  energyConsumptionKwh?: number;
  heatingType?: HeatingType;

  // Additional Fields
  availableFrom?: string;
  contactPhone?: string;
  contactEmail?: string;
  virtualTourUrl?: string;
  notes?: string;

  // GDPR Compliance
  dataProcessingConsent?: boolean;
  consentDate?: string;

  // Property Images
  images?: PropertyImageDto[];

  // Audit Fields (Read-Only)
  createdAt?: string;
  updatedAt?: string;

  // Computed Fields (Read-Only)
  formattedAddress?: string;
  calculatedPricePerSqm?: number;
  mainImageUrl?: string;
  imageCount?: number;
}

/**
 * Helper function to get localized property type name
 */
export function getPropertyTypeName(type: PropertyType, language: 'de' | 'en' = 'en'): string {
  const names: Record<PropertyType, { de: string; en: string }> = {
    [PropertyType.APARTMENT]: { de: 'Wohnung', en: 'Apartment' },
    [PropertyType.HOUSE]: { de: 'Haus', en: 'House' },
    [PropertyType.TOWNHOUSE]: { de: 'Reihenhaus', en: 'Townhouse' },
    [PropertyType.VILLA]: { de: 'Villa', en: 'Villa' },
    [PropertyType.PENTHOUSE]: { de: 'Penthouse', en: 'Penthouse' },
    [PropertyType.LOFT]: { de: 'Loft', en: 'Loft' },
    [PropertyType.DUPLEX]: { de: 'Maisonette', en: 'Duplex' },
    [PropertyType.STUDIO]: { de: 'Apartment', en: 'Studio' },
    [PropertyType.OFFICE]: { de: 'Büro', en: 'Office' },
    [PropertyType.RETAIL]: { de: 'Einzelhandel', en: 'Retail' },
    [PropertyType.WAREHOUSE]: { de: 'Lager', en: 'Warehouse' },
    [PropertyType.INDUSTRIAL]: { de: 'Industrie', en: 'Industrial' },
    [PropertyType.RESTAURANT]: { de: 'Restaurant', en: 'Restaurant' },
    [PropertyType.HOTEL]: { de: 'Hotel', en: 'Hotel' },
    [PropertyType.PARKING_SPACE]: { de: 'Stellplatz', en: 'Parking Space' },
    [PropertyType.GARAGE]: { de: 'Garage', en: 'Garage' },
    [PropertyType.LAND]: { de: 'Grundstück', en: 'Land' },
    [PropertyType.FARM]: { de: 'Bauernhof', en: 'Farm' },
    [PropertyType.CASTLE]: { de: 'Schloss', en: 'Castle' },
    [PropertyType.OTHER]: { de: 'Sonstiges', en: 'Other' }
  };
  return names[type][language];
}

/**
 * Helper function to get localized property status name
 */
export function getPropertyStatusName(status: PropertyStatus, language: 'de' | 'en' = 'en'): string {
  const names: Record<PropertyStatus, { de: string; en: string }> = {
    [PropertyStatus.AVAILABLE]: { de: 'Verfügbar', en: 'Available' },
    [PropertyStatus.RESERVED]: { de: 'Reserviert', en: 'Reserved' },
    [PropertyStatus.SOLD]: { de: 'Verkauft', en: 'Sold' },
    [PropertyStatus.RENTED]: { de: 'Vermietet', en: 'Rented' },
    [PropertyStatus.WITHDRAWN]: { de: 'Zurückgezogen', en: 'Withdrawn' },
    [PropertyStatus.UNDER_CONSTRUCTION]: { de: 'Im Bau', en: 'Under Construction' }
  };
  return names[status][language];
}

/**
 * Helper function to get localized listing type name
 */
export function getListingTypeName(type: ListingType, language: 'de' | 'en' = 'en'): string {
  const names: Record<ListingType, { de: string; en: string }> = {
    [ListingType.SALE]: { de: 'Kauf', en: 'For Sale' },
    [ListingType.RENT]: { de: 'Miete', en: 'For Rent' },
    [ListingType.LEASE]: { de: 'Pacht', en: 'For Lease' }
  };
  return names[type][language];
}

/**
 * Helper function to get localized heating type name
 */
export function getHeatingTypeName(type: HeatingType, language: 'de' | 'en' = 'en'): string {
  const names: Record<HeatingType, { de: string; en: string }> = {
    [HeatingType.GAS]: { de: 'Gas', en: 'Gas Heating' },
    [HeatingType.OIL]: { de: 'Öl', en: 'Oil Heating' },
    [HeatingType.ELECTRIC]: { de: 'Elektro', en: 'Electric Heating' },
    [HeatingType.DISTRICT_HEATING]: { de: 'Fernwärme', en: 'District Heating' },
    [HeatingType.HEAT_PUMP]: { de: 'Wärmepumpe', en: 'Heat Pump' },
    [HeatingType.SOLAR]: { de: 'Solar', en: 'Solar Heating' },
    [HeatingType.WOOD_PELLETS]: { de: 'Holzpellets', en: 'Wood Pellets' },
    [HeatingType.GEOTHERMAL]: { de: 'Erdwärme', en: 'Geothermal' },
    [HeatingType.COAL]: { de: 'Kohle', en: 'Coal Heating' },
    [HeatingType.OTHER]: { de: 'Sonstiges', en: 'Other' }
  };
  return names[type][language];
}
