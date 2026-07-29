import { Routes } from '@angular/router';

export const viewingRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/viewing-list/viewing-list.component').then(c => c.ViewingListComponent),
    title: 'pageTitles.viewings'
  }
];
