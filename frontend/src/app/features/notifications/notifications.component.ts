import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

interface Notification {
  id: string;
  type: 'followup' | 'match' | 'note';
  title: string;
  text: string;
  time: string;
  unread: boolean;
  icon: string;
  iconColor: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div>
      <div class="page-header">
        <div>
          <div class="page-subtitle">MarklerApp</div>
          <h1 class="page-title">{{ 'notifications.title' | translate }}</h1>
        </div>
        <button class="btn-secondary" (click)="markAllRead()">
          <i class="ph ph-checks" style="font-size:16px;"></i>
          {{ 'notifications.markAllRead' | translate }}
        </button>
      </div>

      <!-- Filter tabs -->
      <div class="view-tabs" style="margin-bottom:24px; display:inline-flex;">
        <button class="view-tab" [class.active]="activeFilter === 'all'" (click)="setFilter('all')">
          <i class="ph ph-bell" style="font-size:15px;"></i>
          {{ 'notifications.all' | translate }}
          <span *ngIf="unreadCount > 0"
            style="background:var(--primary); color:#fff; font-size:11px; font-weight:700; padding:1px 7px; border-radius:10px; margin-left:4px;">{{ unreadCount }}</span>
        </button>
        <button class="view-tab" [class.active]="activeFilter === 'followup'" (click)="setFilter('followup')">
          <i class="ph ph-calendar" style="font-size:15px;"></i>
          {{ 'notifications.followUps' | translate }}
        </button>
        <button class="view-tab" [class.active]="activeFilter === 'match'" (click)="setFilter('match')">
          <i class="ph ph-shuffle" style="font-size:15px;"></i>
          {{ 'notifications.matches' | translate }}
        </button>
        <button class="view-tab" [class.active]="activeFilter === 'note'" (click)="setFilter('note')">
          <i class="ph ph-chats-circle" style="font-size:15px;"></i>
          {{ 'notifications.notes' | translate }}
        </button>
      </div>

      <!-- Today -->
      <div *ngIf="todayItems.length > 0" style="margin-bottom:24px;">
        <p style="font-size:12px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:0.06em; margin:0 0 10px;">{{ 'notifications.today' | translate }}</p>
        <div class="widget-card">
          <div *ngFor="let item of todayItems; let last = last">
            <div [style.background]="item.unread ? 'var(--accent-soft)' : 'transparent'"
                 style="display:flex; align-items:flex-start; gap:14px; padding:16px 18px; cursor:default;"
                 [style.border-bottom]="last ? 'none' : '1px solid var(--border)'">
              <div style="width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0;"
                   [style.background]="item.iconColor + '1a'">
                <i [class]="item.icon" [style.color]="item.iconColor" style="font-size:19px;"></i>
              </div>
              <div style="flex:1; min-width:0;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:3px;">
                  <p style="margin:0; font-size:14px; font-weight:600; color:var(--text);">{{ item.title }}</p>
                  <span *ngIf="item.unread"
                    style="width:7px; height:7px; border-radius:50%; background:var(--primary); flex-shrink:0;"></span>
                </div>
                <p style="margin:0; font-size:13px; color:var(--text-2); line-height:1.4;">{{ item.text }}</p>
              </div>
              <span style="font-size:12px; color:var(--text-3); white-space:nowrap; flex-shrink:0; margin-top:2px;">{{ item.time }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- This week -->
      <div *ngIf="weekItems.length > 0" style="margin-bottom:24px;">
        <p style="font-size:12px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:0.06em; margin:0 0 10px;">{{ 'notifications.thisWeek' | translate }}</p>
        <div class="widget-card">
          <div *ngFor="let item of weekItems; let last = last">
            <div style="display:flex; align-items:flex-start; gap:14px; padding:16px 18px; cursor:default;"
                 [style.border-bottom]="last ? 'none' : '1px solid var(--border)'">
              <div style="width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0;"
                   [style.background]="item.iconColor + '1a'">
                <i [class]="item.icon" [style.color]="item.iconColor" style="font-size:19px;"></i>
              </div>
              <div style="flex:1; min-width:0;">
                <p style="margin:0 0 3px; font-size:14px; font-weight:600; color:var(--text);">{{ item.title }}</p>
                <p style="margin:0; font-size:13px; color:var(--text-2); line-height:1.4;">{{ item.text }}</p>
              </div>
              <span style="font-size:12px; color:var(--text-3); white-space:nowrap; flex-shrink:0; margin-top:2px;">{{ item.time }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div *ngIf="filteredItems.length === 0" class="widget-card" style="text-align:center; padding:48px 24px;">
        <i class="ph ph-bell-slash" style="font-size:40px; color:var(--text-3);"></i>
        <p style="margin:12px 0 0; font-size:15px; font-weight:600; color:var(--text);">{{ 'notifications.empty' | translate }}</p>
      </div>
    </div>
  `
})
export class NotificationsComponent {
  activeFilter: 'all' | 'followup' | 'match' | 'note' = 'all';

  private allNotifications: Notification[] = [
    {
      id: '1', type: 'followup',
      title: 'Follow-up fällig — Müller, Thomas',
      text: 'Rückruf geplant für heute 14:00 Uhr — Besichtigung Schillerstraße 12',
      time: 'vor 18 Min.', unread: true,
      icon: 'ph-fill ph-calendar-check', iconColor: '#c07a1e'
    },
    {
      id: '2', type: 'match',
      title: '3 neue Matches — Weber, Anna',
      text: 'Neue Immobilien entsprechen den Suchkriterien (80–100 m², bis 350.000 €)',
      time: 'vor 1 Std.', unread: true,
      icon: 'ph-fill ph-shuffle', iconColor: '#2f6b7a'
    },
    {
      id: '3', type: 'note',
      title: 'Gesprächsnotiz erstellt',
      text: 'Neue Notiz zu Schmidt, Klaus — Telefonat vom Vormittag protokolliert',
      time: 'vor 3 Std.', unread: false,
      icon: 'ph-fill ph-chats-circle', iconColor: '#9f5aaa'
    },
    {
      id: '4', type: 'followup',
      title: 'Follow-up fällig — Bauer, Maria',
      text: 'Nachfrage zu Besichtigung Hauptstraße 7 — keine Rückmeldung seit 3 Tagen',
      time: 'Mo, 09:00', unread: false,
      icon: 'ph-fill ph-calendar-check', iconColor: '#c07a1e'
    },
    {
      id: '5', type: 'match',
      title: '1 neues Match — Hofmann, Peter',
      text: 'Neubau in Schwabing entspricht Suchprofil (4 Zimmer, Garten)',
      time: 'So, 14:23', unread: false,
      icon: 'ph-fill ph-shuffle', iconColor: '#2f6b7a'
    },
  ];

  get filteredItems(): Notification[] {
    if (this.activeFilter === 'all') return this.allNotifications;
    return this.allNotifications.filter(n => n.type === this.activeFilter);
  }

  get todayItems(): Notification[] {
    return this.filteredItems.slice(0, 3);
  }

  get weekItems(): Notification[] {
    return this.filteredItems.slice(3);
  }

  get unreadCount(): number {
    return this.allNotifications.filter(n => n.unread).length;
  }

  setFilter(filter: 'all' | 'followup' | 'match' | 'note'): void {
    this.activeFilter = filter;
  }

  markAllRead(): void {
    this.allNotifications.forEach(n => n.unread = false);
  }
}
