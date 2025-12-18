import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TranslateEnumPipe } from '../../../../shared/pipes/translate-enum.pipe';
import {
  PropertyService,
  Property,
  PropertyImage,
  PropertyStatus
} from '../../services/property.service';

@Component({
  selector: 'app-property-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, TranslateEnumPipe],
  templateUrl: './property-detail.component.html',
  styleUrls: ['./property-detail.component.scss']
})
export class PropertyDetailComponent implements OnInit {
  property: Property | null = null;
  isLoading = false;
  isDeleting = false;
  selectedImage: PropertyImage | null = null;
  selectedImageIndex = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public propertyService: PropertyService
  ) {}

  ngOnInit(): void {
    const propertyId = this.route.snapshot.paramMap.get('id');
    if (propertyId) {
      this.loadProperty(propertyId);
    }
  }

  private loadProperty(id: string): void {
    this.isLoading = true;
    this.propertyService.getProperty(id).subscribe({
      next: (property) => {
        this.property = property;
        if (property.images && property.images.length > 0) {
          const primaryImage = property.images.find(img => img.isPrimary);
          this.selectedImage = primaryImage || property.images[0];
          this.selectedImageIndex = property.images.indexOf(this.selectedImage);
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading property:', error);
        this.isLoading = false;
      }
    });
  }

  deleteProperty(): void {
    if (this.property && confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      this.isDeleting = true;
      this.propertyService.deleteProperty(this.property.id!).subscribe({
        next: () => {
          this.router.navigate(['/properties']);
        },
        error: (error) => {
          console.error('Error deleting property:', error);
          this.isDeleting = false;
          alert('Failed to delete property. Please try again.');
        }
      });
    }
  }

  selectImage(image: PropertyImage, index: number): void {
    this.selectedImage = image;
    this.selectedImageIndex = index;
  }

  nextImage(): void {
    if (this.property?.images && this.property.images.length > 0) {
      this.selectedImageIndex = (this.selectedImageIndex + 1) % this.property.images.length;
      this.selectedImage = this.property.images[this.selectedImageIndex];
    }
  }

  previousImage(): void {
    if (this.property?.images && this.property.images.length > 0) {
      this.selectedImageIndex = (this.selectedImageIndex - 1 + this.property.images.length) % this.property.images.length;
      this.selectedImage = this.property.images[this.selectedImageIndex];
    }
  }

  getStatusBadgeClass(status?: PropertyStatus): string {
    switch (status) {
      case PropertyStatus.AVAILABLE:
        return 'bg-green-100 text-green-800';
      case PropertyStatus.RESERVED:
        return 'bg-yellow-100 text-yellow-800';
      case PropertyStatus.SOLD:
        return 'bg-blue-100 text-blue-800';
      case PropertyStatus.RENTED:
        return 'bg-purple-100 text-purple-800';
      case PropertyStatus.WITHDRAWN:
        return 'bg-gray-100 text-gray-800';
      case PropertyStatus.UNDER_CONSTRUCTION:
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  hasFeatures(): boolean {
    return !!(
      this.property?.hasElevator ||
      this.property?.hasBalcony ||
      this.property?.hasTerrace ||
      this.property?.hasGarden ||
      this.property?.hasGarage ||
      this.property?.hasParking ||
      this.property?.hasBasement ||
      this.property?.hasAttic ||
      this.property?.isBarrierFree ||
      this.property?.petsAllowed ||
      this.property?.furnished
    );
  }

  hasEnergyInfo(): boolean {
    return !!(
      this.property?.energyEfficiencyClass ||
      this.property?.energyConsumptionKwh ||
      this.property?.heatingType
    );
  }

  printProperty(): void {
    window.print();
  }

  exportProperty(): void {
    if (this.property) {
      const dataStr = JSON.stringify(this.property, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `property-${this.property.id}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
  }
}
