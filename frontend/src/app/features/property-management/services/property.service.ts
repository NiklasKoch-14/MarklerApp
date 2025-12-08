import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// Property Enums matching backend Java enums
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

export enum ListingType {
  SALE = 'SALE',
  RENT = 'RENT',
  LEASE = 'LEASE'
}

export enum PropertyStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  RENTED = 'RENTED',
  WITHDRAWN = 'WITHDRAWN',
  UNDER_CONSTRUCTION = 'UNDER_CONSTRUCTION'
}

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

export interface PropertyImage {
  id?: string;
  propertyId?: string;
  imageType: PropertyImageType;
  imageUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  displayOrder?: number;
  isPrimary?: boolean;
  uploadedAt?: string;
}

export interface Property {
  id?: string;
  agentId?: string;
  title: string;
  description?: string;
  propertyType: PropertyType;
  listingType: ListingType;
  status?: PropertyStatus;

  // Location
  addressStreet: string;
  addressHouseNumber?: string;
  addressCity: string;
  addressPostalCode: string;
  addressState?: string;
  addressCountry?: string;
  addressDistrict?: string;

  // Specifications
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

  // Financial
  price?: number;
  pricePerSqm?: number;
  additionalCosts?: number;
  heatingCosts?: number;
  commission?: number;

  // Features
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

  // Energy
  energyEfficiencyClass?: string;
  energyConsumptionKwh?: number;
  heatingType?: HeatingType;

  // Additional
  availableFrom?: string;
  contactPhone?: string;
  contactEmail?: string;
  virtualTourUrl?: string;
  notes?: string;

  // Images
  images?: PropertyImage[];

  // Timestamps
  createdAt?: string;
  updatedAt?: string;

  // Computed fields
  formattedAddress?: string;
  calculatedPricePerSqm?: number;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface PropertySearchFilter {
  query?: string;
  propertyType?: PropertyType;
  listingType?: ListingType;
  status?: PropertyStatus;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minLivingArea?: number;
  maxLivingArea?: number;
  minRooms?: number;
  maxRooms?: number;
  hasElevator?: boolean;
  hasBalcony?: boolean;
  hasGarden?: boolean;
  hasParking?: boolean;
  petsAllowed?: boolean;
}

export interface PropertyStats {
  totalProperties: number;
  availableProperties: number;
  soldProperties: number;
  rentedProperties: number;
  averagePrice?: number;
  averagePricePerSqm?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PropertyService {
  private readonly apiUrl = `${environment.apiUrl}/properties`;

  constructor(private http: HttpClient) {}

  /**
   * Get all properties with pagination
   */
  getProperties(page: number = 0, size: number = 20, sortBy: string = 'createdAt', sortDir: string = 'desc'): Observable<PagedResponse<Property>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.get<PagedResponse<Property>>(this.apiUrl, { params });
  }

  /**
   * Search properties with filters
   */
  searchProperties(filter: PropertySearchFilter, page: number = 0, size: number = 20, sortBy: string = 'createdAt', sortDir: string = 'desc'): Observable<PagedResponse<Property>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    // Add filter parameters
    if (filter.query) params = params.set('q', filter.query);
    if (filter.propertyType) params = params.set('propertyType', filter.propertyType);
    if (filter.listingType) params = params.set('listingType', filter.listingType);
    if (filter.status) params = params.set('status', filter.status);
    if (filter.city) params = params.set('city', filter.city);
    if (filter.minPrice !== undefined) params = params.set('minPrice', filter.minPrice.toString());
    if (filter.maxPrice !== undefined) params = params.set('maxPrice', filter.maxPrice.toString());
    if (filter.minLivingArea !== undefined) params = params.set('minLivingArea', filter.minLivingArea.toString());
    if (filter.maxLivingArea !== undefined) params = params.set('maxLivingArea', filter.maxLivingArea.toString());
    if (filter.minRooms !== undefined) params = params.set('minRooms', filter.minRooms.toString());
    if (filter.maxRooms !== undefined) params = params.set('maxRooms', filter.maxRooms.toString());
    if (filter.hasElevator !== undefined) params = params.set('hasElevator', filter.hasElevator.toString());
    if (filter.hasBalcony !== undefined) params = params.set('hasBalcony', filter.hasBalcony.toString());
    if (filter.hasGarden !== undefined) params = params.set('hasGarden', filter.hasGarden.toString());
    if (filter.hasParking !== undefined) params = params.set('hasParking', filter.hasParking.toString());
    if (filter.petsAllowed !== undefined) params = params.set('petsAllowed', filter.petsAllowed.toString());

    return this.http.get<PagedResponse<Property>>(`${this.apiUrl}/search`, { params });
  }

  /**
   * Get property by ID
   */
  getProperty(id: string): Observable<Property> {
    return this.http.get<Property>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new property
   */
  createProperty(property: Property): Observable<Property> {
    return this.http.post<Property>(this.apiUrl, property);
  }

  /**
   * Update property
   */
  updateProperty(id: string, property: Property): Observable<Property> {
    return this.http.put<Property>(`${this.apiUrl}/${id}`, property);
  }

  /**
   * Delete property
   */
  deleteProperty(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get recent properties
   */
  getRecentProperties(days: number = 30): Observable<Property[]> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<Property[]>(`${this.apiUrl}/recent`, { params });
  }

  /**
   * Get property statistics
   */
  getPropertyStats(): Observable<PropertyStats> {
    return this.http.get<PropertyStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Get properties by status
   */
  getPropertiesByStatus(status: PropertyStatus, page: number = 0, size: number = 20): Observable<PagedResponse<Property>> {
    const params = new HttpParams()
      .set('status', status)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PagedResponse<Property>>(`${this.apiUrl}/by-status`, { params });
  }

  /**
   * Helper method to format property type for display
   */
  formatPropertyType(type: PropertyType, language: string = 'en'): string {
    const translations: Record<PropertyType, { de: string; en: string }> = {
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

    return language === 'de' ? translations[type].de : translations[type].en;
  }

  /**
   * Helper method to format listing type for display
   */
  formatListingType(type: ListingType, language: string = 'en'): string {
    const translations: Record<ListingType, { de: string; en: string }> = {
      [ListingType.SALE]: { de: 'Kauf', en: 'For Sale' },
      [ListingType.RENT]: { de: 'Miete', en: 'For Rent' },
      [ListingType.LEASE]: { de: 'Pacht', en: 'For Lease' }
    };

    return language === 'de' ? translations[type].de : translations[type].en;
  }

  /**
   * Helper method to format property status for display
   */
  formatPropertyStatus(status: PropertyStatus, language: string = 'en'): string {
    const translations: Record<PropertyStatus, { de: string; en: string }> = {
      [PropertyStatus.AVAILABLE]: { de: 'Verfügbar', en: 'Available' },
      [PropertyStatus.RESERVED]: { de: 'Reserviert', en: 'Reserved' },
      [PropertyStatus.SOLD]: { de: 'Verkauft', en: 'Sold' },
      [PropertyStatus.RENTED]: { de: 'Vermietet', en: 'Rented' },
      [PropertyStatus.WITHDRAWN]: { de: 'Zurückgezogen', en: 'Withdrawn' },
      [PropertyStatus.UNDER_CONSTRUCTION]: { de: 'Im Bau', en: 'Under Construction' }
    };

    return language === 'de' ? translations[status].de : translations[status].en;
  }

  /**
   * Helper method to format heating type for display
   */
  formatHeatingType(type: HeatingType, language: string = 'en'): string {
    const translations: Record<HeatingType, { de: string; en: string }> = {
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

    return language === 'de' ? translations[type].de : translations[type].en;
  }

  /**
   * Format price for display
   */
  formatPrice(price: number | undefined, listingType: ListingType): string {
    if (!price) return 'N/A';

    const formatted = new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);

    return listingType === ListingType.RENT ? `${formatted}/mo` : formatted;
  }
}
