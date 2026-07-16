import { Routes } from '@angular/router';

export const clientRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/client-list/client-list.component').then(c => c.ClientListComponent),
    title: 'pageTitles.clients'
  },
  {
    path: 'new',
    loadComponent: () => import('./components/client-form/client-form.component').then(c => c.ClientFormComponent),
    title: 'pageTitles.clientNew'
  },
  {
    path: ':id',
    loadComponent: () => import('./components/client-detail/client-detail.component').then(c => c.ClientDetailComponent),
    title: 'pageTitles.clientDetail'
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./components/client-form/client-form.component').then(c => c.ClientFormComponent),
    title: 'pageTitles.clientEdit'
  }
];
