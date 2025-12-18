import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ClientService, Client, PagedResponse } from '../../services/client.service';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="p-6">
      <div class="sm:flex sm:items-center">
        <div class="sm:flex-auto">
          <h1 class="text-xl font-semibold text-gray-900 dark:text-white">{{ 'clients.title' | translate }}</h1>
          <p class="mt-2 text-sm text-gray-700 dark:text-gray-300">{{ 'clients.listDescription' | translate }}</p>
        </div>
        <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <a routerLink="/clients/new"
             class="btn btn-primary">
            {{ 'clients.addClient' | translate }}
          </a>
        </div>
      </div>

      <div class="mt-8 flow-root">
        <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table class="min-w-full divide-y divide-gray-300">
                <thead class="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">{{ 'clients.name' | translate }}</th>
                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">{{ 'clients.email' | translate }}</th>
                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">{{ 'clients.phone' | translate }}</th>
                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">{{ 'clients.city' | translate }}</th>
                    <th scope="col" class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">{{ 'clients.gdpr' | translate }}</th>
                    <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span class="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 bg-white dark:bg-gray-800">
                  <tr *ngFor="let client of clients" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                      {{ client.firstName }} {{ client.lastName }}
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{{ client.email || '-' }}</td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{{ client.phone || '-' }}</td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{{ client.addressCity || '-' }}</td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                      <span *ngIf="client.gdprConsentGiven" class="badge badge-success">✓ {{ 'clients.consent' | translate }}</span>
                      <span *ngIf="!client.gdprConsentGiven" class="badge badge-error">✗ {{ 'common.no' | translate }} {{ 'clients.consent' | translate }}</span>
                    </td>
                    <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <a [routerLink]="['/clients', client.id]" class="text-primary-600 hover:text-primary-900">{{ 'common.view' | translate }}</a>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div *ngIf="isLoading" class="p-4 text-center">
                <div class="spinner h-8 w-8 mx-auto"></div>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ 'common.loading' | translate }}</p>
              </div>

              <div *ngIf="!isLoading && clients.length === 0" class="p-4 text-center">
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ 'clients.noClientsFound' | translate }}</p>
                <a routerLink="/clients/new" class="text-primary-600 hover:text-primary-900 text-sm font-medium">{{ 'clients.addFirstClient' | translate }}</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ClientListComponent implements OnInit {
  clients: Client[] = [];
  isLoading = false;

  constructor(private clientService: ClientService) {}

  ngOnInit(): void {
    this.loadClients();
  }

  private loadClients(): void {
    this.isLoading = true;
    this.clientService.getClients().subscribe({
      next: (response: PagedResponse<Client>) => {
        this.clients = response.content;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading clients:', error);
        this.isLoading = false;
      }
    });
  }
}