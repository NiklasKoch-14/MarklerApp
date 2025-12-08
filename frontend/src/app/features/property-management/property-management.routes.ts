import { Routes } from '@angular/router';

export const propertyRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/property-list/property-list.component').then(c => c.PropertyListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./components/property-form/property-form.component').then(c => c.PropertyFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./components/property-detail/property-detail.component').then(c => c.PropertyDetailComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./components/property-form/property-form.component').then(c => c.PropertyFormComponent)
  }
];
