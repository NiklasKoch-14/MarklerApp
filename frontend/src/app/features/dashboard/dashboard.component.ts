import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="card">
          <div class="card-body">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Welcome to Real Estate CRM</h3>
            <p class="text-gray-600 dark:text-gray-400">Manage your clients, properties, and communications efficiently.</p>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Client Management</h3>
            <div class="space-y-2">
              <a routerLink="/clients/new" class="btn btn-primary block text-center">Add New Client</a>
              <a routerLink="/clients" class="btn btn-outline block text-center">View All Clients</a>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Property Management</h3>
            <div class="space-y-2">
              <a routerLink="/properties/new" class="btn btn-primary block text-center">Add New Property</a>
              <a routerLink="/properties" class="btn btn-outline block text-center">View All Properties</a>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Communication</h3>
            <div class="space-y-2">
              <a routerLink="/call-notes" class="btn btn-outline block text-center">View Call Notes</a>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Property Matching</h3>
            <div class="space-y-2">
              <a routerLink="/properties/match" class="btn btn-outline block text-center">Match Properties</a>
              <a routerLink="/properties/search" class="btn btn-outline block text-center">Search Properties</a>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Statistics</h3>
            <p class="text-gray-600 dark:text-gray-400">View comprehensive CRM statistics and reports.</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent {}