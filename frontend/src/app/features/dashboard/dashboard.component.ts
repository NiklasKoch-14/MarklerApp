import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">{{ 'dashboard.title' | translate }}</h1>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="card">
          <div class="card-body">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{{ 'dashboard.welcomeTitle' | translate }}</h3>
            <p class="text-gray-600 dark:text-gray-400">{{ 'dashboard.welcomeDescription' | translate }}</p>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{{ 'dashboard.clientManagement' | translate }}</h3>
            <div class="space-y-2">
              <a routerLink="/clients/new" class="btn btn-primary block text-center">{{ 'dashboard.addNewClient' | translate }}</a>
              <a routerLink="/clients" class="btn btn-outline block text-center">{{ 'dashboard.viewAllClients' | translate }}</a>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{{ 'dashboard.propertyManagement' | translate }}</h3>
            <div class="space-y-2">
              <a routerLink="/properties/new" class="btn btn-primary block text-center">{{ 'dashboard.addNewProperty' | translate }}</a>
              <a routerLink="/properties" class="btn btn-outline block text-center">{{ 'dashboard.viewAllProperties' | translate }}</a>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{{ 'dashboard.communication' | translate }}</h3>
            <div class="space-y-2">
              <a routerLink="/call-notes" class="btn btn-outline block text-center">{{ 'dashboard.viewCallNotes' | translate }}</a>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{{ 'dashboard.propertyMatching' | translate }}</h3>
            <div class="space-y-2">
              <a routerLink="/properties/match" class="btn btn-outline block text-center">{{ 'dashboard.matchProperties' | translate }}</a>
              <a routerLink="/properties/search" class="btn btn-outline block text-center">{{ 'dashboard.searchProperties' | translate }}</a>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">{{ 'dashboard.statistics' | translate }}</h3>
            <p class="text-gray-600 dark:text-gray-400">{{ 'dashboard.statisticsDescription' | translate }}</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent {}