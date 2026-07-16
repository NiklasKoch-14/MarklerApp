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
    title: 'pageTitles.properties'
  },
  {
    path: 'new',
    loadComponent: () => import('./components/property-form/property-form.component')
      .then(c => c.PropertyFormComponent),
    title: 'pageTitles.propertyNew'
  },
  {
    path: 'search',
    loadComponent: () => import('./components/property-search/property-search.component')
      .then(c => c.PropertySearchComponent),
    title: 'pageTitles.propertySearch'
  },
  {
    path: ':id',
    loadComponent: () => import('./components/property-detail/property-detail.component')
      .then(c => c.PropertyDetailComponent),
    title: 'pageTitles.propertyDetail'
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./components/property-form/property-form.component')
      .then(c => c.PropertyFormComponent),
    title: 'pageTitles.propertyEdit'
  }
];
