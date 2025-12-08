import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/login/login.component').then(c => c.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/main-layout/main-layout.component').then(c => c.MainLayoutComponent),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(c => c.DashboardComponent)
      },
      {
        path: 'clients',
        loadChildren: () => import('./features/client-management/client-management.routes').then(r => r.clientRoutes)
      },
      {
        path: 'properties',
        loadChildren: () => import('./features/property-management/property-management.routes').then(r => r.propertyRoutes)
      },
      {
        path: 'call-notes',
        loadChildren: () => import('./features/call-notes/call-notes.routes').then(r => r.callNotesRoutes)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];