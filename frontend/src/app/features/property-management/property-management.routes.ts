import { Routes } from '@angular/router';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-property-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold text-gray-900">Properties</h1>
      <p class="mt-2 text-gray-600">Property management will be available in Phase 5.</p>
    </div>
  `
})
export class PropertyListComponent {}

export const propertyRoutes: Routes = [
  {
    path: '',
    component: PropertyListComponent
  }
];