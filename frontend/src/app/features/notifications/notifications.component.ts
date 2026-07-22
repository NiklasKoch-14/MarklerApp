import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { CallNotesService, FollowUpReminder } from '../call-notes/services/call-notes.service';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

interface Notification {
  id: string;
  type: 'followup';
  clientId: string;
  subject: string;
  title: string;
  text: string;
  time: string;
  unread: boolean;
  icon: string;
  iconColor: string;
  isOverdue: boolean;
  followUpDate: string;
  _hover?: boolean;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, TranslateModule, LoadingSpinnerComponent],
  template: `
    <div>
      <div class="page-header">
        <div>
          <div class="page-subtitle">MarklerApp</div>
          <h1 class="page-title">{{ 'notifications.title' | translate }}</h1>
        </div>
        <button class="btn-secondary" (click)="markAllRead()">
          <i class="ri-check-line" style="font-size:16px;"></i>
          {{ 'notifications.markAllRead' | translate }}
        </button>
      </div>

      <!-- Filter tabs -->
      <div class="view-tabs" style="margin-bottom:24px; display:inline-flex;">
        <button class="view-tab" [class.active]="activeFilter === 'all'" (click)="setFilter('all')">
          <i class="ri-notification-line" style="font-size:15px;"></i>
          {{ 'notifications.all' | translate }}
          <span *ngIf="unreadCount > 0"
            style="background:var(--primary); color:#fff; font-size:11px; font-weight:700; padding:1px 7px; border-radius:10px; margin-left:4px;">{{ unreadCount }}</span>
        </button>
        <button class="view-tab" [class.active]="activeFilter === 'followup'" (click)="setFilter('followup')">
          <i class="ri-calendar-line" style="font-size:15px;"></i>
          {{ 'notifications.followUps' | translate }}
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="isLoading" class="widget-card" style="text-align:center; padding:48px 24px;">
        <app-loading-spinner></app-loading-spinner>
      </div>

      <ng-container *ngIf="!isLoading">

        <!-- Heute & Überfällig -->
        <div *ngIf="todayItems.length > 0" style="margin-bottom:24px;">
          <p style="font-size:12px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:0.06em; margin:0 0 10px;">{{ 'notifications.today' | translate }}</p>
          <div class="widget-card" style="overflow:hidden;">
            <div *ngFor="let item of todayItems; let last = last">
              <div style="display:flex; align-items:flex-start; gap:14px; padding:16px 18px; cursor:pointer; transition:background 0.15s;"
                   [style.background]="item['_hover'] ? 'rgba(0,0,0,0.05)' : (item.unread ? 'var(--surface, #fff)' : 'rgba(0,0,0,0.04)')"
                   [style.border-left]="item.unread ? '3px solid ' + item.iconColor : '3px solid transparent'"
                   [style.border-bottom]="last ? 'none' : '1px solid var(--border)'"
                   (click)="onNotificationClick(item)"
                   (mouseenter)="item['_hover'] = true" (mouseleave)="item['_hover'] = false">
                <div style="width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0;"
                     [style.background]="item.unread ? (item.iconColor + '1a') : 'rgba(0,0,0,0.06)'"
                     [style.opacity]="item.unread ? '1' : '0.7'">
                  <i [class]="item.icon" [style.color]="item.unread ? item.iconColor : 'var(--text-3)'" style="font-size:19px;"></i>
                </div>
                <div style="flex:1; min-width:0;">
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px;">
                    <p style="margin:0; font-size:14px; font-weight:600;"
                       [style.color]="item.unread ? 'var(--text)' : 'var(--text-2)'">{{ item.title }}</p>
                    <span *ngIf="item.unread"
                      style="width:7px; height:7px; border-radius:50%; background:var(--primary); flex-shrink:0;"></span>
                  </div>
                  <p style="margin:0; font-size:13px; line-height:1.4;"
                     [style.color]="item.unread ? 'var(--text-2)' : 'var(--text-3)'">{{ item.text }}</p>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;">
                  <span style="font-size:12px; color:var(--text-3); white-space:nowrap; margin-top:2px;">{{ item.time }}</span>
                  <i class="ri-arrow-right-line" style="font-size:14px;"
                     [style.color]="item.unread ? 'var(--primary)' : 'var(--text-3)'"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Diese Woche -->
        <div *ngIf="weekItems.length > 0" style="margin-bottom:24px;">
          <p style="font-size:12px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:0.06em; margin:0 0 10px;">{{ 'notifications.thisWeek' | translate }}</p>
          <div class="widget-card" style="overflow:hidden;">
            <div *ngFor="let item of weekItems; let last = last">
              <div style="display:flex; align-items:flex-start; gap:14px; padding:16px 18px; cursor:pointer; transition:background 0.15s;"
                   [style.background]="item['_hover'] ? 'rgba(0,0,0,0.05)' : (item.unread ? 'var(--surface, #fff)' : 'rgba(0,0,0,0.04)')"
                   [style.border-left]="item.unread ? '3px solid ' + item.iconColor : '3px solid transparent'"
                   [style.border-bottom]="last ? 'none' : '1px solid var(--border)'"
                   (click)="onNotificationClick(item)"
                   (mouseenter)="item['_hover'] = true" (mouseleave)="item['_hover'] = false">
                <div style="width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0;"
                     [style.background]="item.unread ? (item.iconColor + '1a') : 'rgba(0,0,0,0.06)'"
                     [style.opacity]="item.unread ? '1' : '0.7'">
                  <i [class]="item.icon" [style.color]="item.unread ? item.iconColor : 'var(--text-3)'" style="font-size:19px;"></i>
                </div>
                <div style="flex:1; min-width:0;">
                  <p style="margin:0 0 3px; font-size:14px; font-weight:600;"
                     [style.color]="item.unread ? 'var(--text)' : 'var(--text-2)'">{{ item.title }}</p>
                  <p style="margin:0; font-size:13px; line-height:1.4;"
                     [style.color]="item.unread ? 'var(--text-2)' : 'var(--text-3)'">{{ item.text }}</p>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;">
                  <span style="font-size:12px; color:var(--text-3); white-space:nowrap; margin-top:2px;">{{ item.time }}</span>
                  <i class="ri-arrow-right-line" style="font-size:14px;"
                     [style.color]="item.unread ? 'var(--primary)' : 'var(--text-3)'"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div *ngIf="filteredItems.length === 0" class="widget-card" style="text-align:center; padding:48px 24px;">
          <i class="ri-notification-off-line" style="font-size:40px; color:var(--text-3);"></i>
          <p style="margin:12px 0 0; font-size:15px; font-weight:600; color:var(--text);">{{ 'notifications.empty' | translate }}</p>
        </div>

      </ng-container>
    </div>
  `
})
export class NotificationsComponent implements OnInit {
  activeFilter: 'all' | 'followup' = 'all';
  isLoading = true;

  private allNotifications: Notification[] = [];

  constructor(
    private callNotesService: CallNotesService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.callNotesService.getFollowUpReminders().subscribe({
      next: (reminders) => {
        this.allNotifications = reminders.map(r => this.toNotification(r));
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  private toNotification(r: FollowUpReminder): Notification {
    return {
      id: r.id,
      type: 'followup',
      clientId: r.clientId,
      subject: r.subject,
      title: `Follow-up — ${r.clientName}`,
      text: r.subject + this.formatDueText(r),
      time: this.formatTime(r.followUpDate, r.isOverdue),
      unread: r.isOverdue || this.isDueToday(r.followUpDate),
      icon: r.isOverdue ? 'ri-alert-fill' : 'ri-calendar-check-fill',
      iconColor: r.isOverdue ? 'var(--color-error)' : 'var(--color-warning)',
      isOverdue: r.isOverdue,
      followUpDate: r.followUpDate
    };
  }

  private isDueToday(dateStr: string): boolean {
    const d = new Date(dateStr);
    const today = new Date();
    return d.getFullYear() === today.getFullYear()
      && d.getMonth() === today.getMonth()
      && d.getDate() === today.getDate();
  }

  private formatDueText(r: FollowUpReminder): string {
    if (r.isOverdue) return ` · ${Math.abs(r.daysUntilDue)} Tag${Math.abs(r.daysUntilDue) === 1 ? '' : 'e'} überfällig`;
    if (r.daysUntilDue === 0) return ' · Heute fällig';
    if (r.daysUntilDue === 1) return ' · Morgen fällig';
    return ` · Fällig in ${r.daysUntilDue} Tagen`;
  }

  private formatTime(dateStr: string, isOverdue: boolean): string {
    if (isOverdue) return 'Überfällig';
    const d = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.round(
      (new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
       - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime())
      / 86400000
    );
    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Morgen';
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
  }

  get filteredItems(): Notification[] {
    return this.allNotifications;
  }

  get todayItems(): Notification[] {
    return this.filteredItems.filter(n => n.isOverdue || this.isDueToday(n.followUpDate));
  }

  get weekItems(): Notification[] {
    return this.filteredItems.filter(n => !n.isOverdue && !this.isDueToday(n.followUpDate));
  }

  get unreadCount(): number {
    return this.allNotifications.filter(n => n.unread).length;
  }

  setFilter(filter: 'all' | 'followup'): void {
    this.activeFilter = filter;
  }

  markAllRead(): void {
    this.allNotifications.forEach(n => n.unread = false);
  }

  onNotificationClick(item: Notification): void {
    this.router.navigate(['/clients', item.clientId], {
      queryParams: { action: 'contact', subject: item.subject }
    });
  }
}
