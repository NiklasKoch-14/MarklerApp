import { Routes } from '@angular/router';

export const clientRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/client-list/client-list.component').then(c => c.ClientListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./components/client-form/client-form.component').then(c => c.ClientFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./components/client-detail/client-detail.component').then(c => c.ClientDetailComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./components/client-form/client-form.component').then(c => c.ClientFormComponent)
  }
];