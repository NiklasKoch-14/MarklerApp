import { Routes } from '@angular/router';

/**
 * Property Management feature routes
 * Follows Angular 17+ standalone component routing pattern
 */
export const propertyRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/property-list/property-list.component')
      .then(c => c.PropertyListComponent),
    title: 'Properties'
  },
  {
    path: 'new',
    loadComponent: () => import('./components/property-form/property-form.component')
      .then(c => c.PropertyFormComponent),
    title: 'Create Property'
  },
  {
    path: 'search',
    loadComponent: () => import('./components/property-search/property-search.component')
      .then(c => c.PropertySearchComponent),
    title: 'Search Properties'
  },
  {
    path: 'match',
    loadComponent: () => import('./components/property-matching/property-matching.component')
      .then(c => c.PropertyMatchingComponent),
    title: 'Property Matching'
  },
  {
    path: ':id',
    loadComponent: () => import('./components/property-detail/property-detail.component')
      .then(c => c.PropertyDetailComponent),
    title: 'Property Details'
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./components/property-form/property-form.component')
      .then(c => c.PropertyFormComponent),
    title: 'Edit Property'
  }
];
