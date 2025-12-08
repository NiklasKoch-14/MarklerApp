import { Routes } from '@angular/router';

export const callNotesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/call-notes-list/call-notes-list.component').then(c => c.CallNotesListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./components/call-note-form/call-note-form.component').then(c => c.CallNoteFormComponent)
  },
  {
    path: 'client/:clientId',
    loadComponent: () => import('./components/call-notes-list/call-notes-list.component').then(c => c.CallNotesListComponent)
  },
  {
    path: 'client/:clientId/new',
    loadComponent: () => import('./components/call-note-form/call-note-form.component').then(c => c.CallNoteFormComponent)
  },
  {
    path: 'client/:clientId/summary',
    loadComponent: () => import('./components/call-summary/call-summary.component').then(c => c.CallSummaryComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./components/call-note-form/call-note-form.component').then(c => c.CallNoteFormComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./components/call-note-form/call-note-form.component').then(c => c.CallNoteFormComponent)
  }
];