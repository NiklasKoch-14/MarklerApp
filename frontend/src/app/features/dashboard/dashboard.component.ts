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
            <h3 class="text-lg font-medium text-gray-900 mb-2">Welcome to Real Estate CRM</h3>
            <p class="text-gray-600">Manage your clients, properties, and communications efficiently.</p>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h3 class="text-lg font-medium text-gray-900 mb-2">Quick Actions</h3>
            <div class="space-y-2">
              <a routerLink="/clients/new" class="btn btn-primary block text-center">Add New Client</a>
              <a routerLink="/clients" class="btn btn-outline block text-center">View All Clients</a>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h3 class="text-lg font-medium text-gray-900 mb-2">Statistics</h3>
            <p class="text-gray-600">Client management statistics will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent {}