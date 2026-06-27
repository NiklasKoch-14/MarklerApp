import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AuthService, Agent } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/services/theme.service';

interface NavItem {
  route: string;
  icon: string;
  labelKey: string;
  exact?: boolean;
  _hover?: boolean;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule, DragDropModule],
  template: `
    <div class="app-shell">

      <!-- ── Sidebar ─────────────────────────────────── -->
      <aside class="sidebar">

        <!-- Brand -->
        <div class="sidebar-brand">
          <div class="sidebar-logo">
            <i class="ph-bold ph-house-line" style="font-size:20px; color:#fff;"></i>
          </div>
          <div>
            <div class="sidebar-brand-name">MarklerApp</div>
            <div class="sidebar-brand-tagline">{{ 'navigation.tagline' | translate }}</div>
          </div>
        </div>

        <!-- Nav -->
        <nav class="sidebar-nav"
             cdkDropList
             (cdkDropListDropped)="onNavDrop($event)"
             style="padding:0;">
          <div *ngFor="let item of navItems; trackBy: trackByRoute"
               cdkDrag
               [cdkDragLockAxis]="'y'"
               class="sidebar-nav-drag-item"
               (mouseenter)="item['_hover'] = true"
               (mouseleave)="item['_hover'] = false">
            <!-- Drag placeholder -->
            <div *cdkDragPlaceholder
                 style="height:44px; margin:2px 8px; border-radius:8px; background:rgba(255,255,255,0.08); border:1px dashed rgba(255,255,255,0.2);"></div>
            <!-- Drag preview (clone while dragging) -->
            <div *cdkDragPreview
                 style="display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:8px;
                        background:#22333a; color:#fff; font-size:14px; font-weight:500;
                        box-shadow:0 8px 24px rgba(0,0,0,0.3); width:200px;">
              <i [class]="item.icon" style="font-size:18px; width:20px; text-align:center;"></i>
              <span>{{ item.labelKey | translate }}</span>
            </div>
            <a [routerLink]="item.route"
               routerLinkActive="active"
               [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
               class="sidebar-nav-item"
               style="position:relative;">
              <i [class]="item.icon" style="font-size:19px; width:22px; text-align:center;"></i>
              <span style="flex:1; text-align:left;">{{ item.labelKey | translate }}</span>
              <!-- Drag handle — visible on hover -->
              <i cdkDragHandle
                 class="ph ph-dots-six-vertical"
                 *ngIf="item['_hover']"
                 style="font-size:16px; color:rgba(255,255,255,0.35); cursor:grab; margin-left:4px;"
                 (mousedown)="$event.preventDefault()"></i>
            </a>
          </div>
        </nav>

        <!-- User -->
        <div class="sidebar-user">
          <div style="min-width:0; flex:1;">
            <div class="sidebar-user-name">{{ userName }}</div>
            <div class="sidebar-user-role">{{ 'navigation.role' | translate }}</div>
          </div>
          <button class="sidebar-icon-btn" (click)="logout()" [title]="'auth.logout' | translate">
            <i class="ph ph-sign-out" style="font-size:17px;"></i>
          </button>
        </div>

      </aside>

      <!-- ── Content area ────────────────────────────── -->
      <div class="content-area">

        <!-- Topbar -->
        <header class="topbar">
          <div class="topbar-search-wrap">
            <i class="ph ph-magnifying-glass topbar-search-icon"></i>
            <input class="topbar-search-input"
                   type="text"
                   [placeholder]="'navigation.search' | translate" />
          </div>

          <div class="topbar-spacer"></div>

          <!-- Language toggle -->
          <div class="lang-toggle">
            <button class="lang-btn" [class.active]="currentLang === 'de'" (click)="setLang('de')">DE</button>
            <button class="lang-btn" [class.active]="currentLang === 'en'" (click)="setLang('en')">EN</button>
          </div>

          <!-- Theme toggle -->
          <button class="topbar-icon-btn" (click)="toggleTheme()" [title]="'navigation.toggleTheme' | translate">
            <i [class]="isDark ? 'ph ph-sun' : 'ph ph-moon'" style="font-size:17px;"></i>
          </button>

          <!-- Notifications -->
          <button class="topbar-icon-btn" [routerLink]="['/notifications']">
            <i class="ph ph-bell" style="font-size:17px;"></i>
            <span class="notification-dot"></span>
          </button>

        </header>

        <!-- Page content -->
        <main class="page-content">
          <router-outlet></router-outlet>
        </main>

      </div>
    </div>
  `
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private readonly defaultNavItems: NavItem[] = [
    { route: '/dashboard',      icon: 'ph-fill ph-squares-four',  labelKey: 'navigation.dashboard',      exact: true },
    { route: '/clients',        icon: 'ph-fill ph-users',         labelKey: 'navigation.clients'                     },
    { route: '/properties',     icon: 'ph-fill ph-buildings',     labelKey: 'navigation.properties'                  },
    { route: '/matching',       icon: 'ph-fill ph-shuffle',       labelKey: 'navigation.matching'                    },
    { route: '/notifications',  icon: 'ph-fill ph-bell',          labelKey: 'navigation.notifications'               },
  ];

  navItems: NavItem[] = [...this.defaultNavItems];

  userInitials = '?';
  userName = '';
  currentLang = 'de';
  isDark = false;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => this.updateUser(user));

    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => this.isDark = theme === 'dark');

    this.currentLang = this.translate.currentLang || this.translate.defaultLang || 'de';
    this.loadNavOrder();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateUser(user: Agent | null): void {
    if (user) {
      this.userInitials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
      this.userName = `${user.firstName} ${user.lastName}`;
    } else {
      this.userInitials = '?';
      this.userName = '';
    }
  }

  private loadNavOrder(): void {
    try {
      const saved = localStorage.getItem('nav-order');
      if (!saved) return;
      const order: string[] = JSON.parse(saved);
      const ordered = order
        .map(route => this.defaultNavItems.find(n => n.route === route))
        .filter((n): n is NavItem => !!n);
      const newItems = this.defaultNavItems.filter(n => !order.includes(n.route));
      this.navItems = [...ordered, ...newItems];
    } catch {
      // corrupted localStorage — use default
    }
  }

  onNavDrop(event: CdkDragDrop<NavItem[]>): void {
    moveItemInArray(this.navItems, event.previousIndex, event.currentIndex);
    localStorage.setItem('nav-order', JSON.stringify(this.navItems.map(n => n.route)));
  }

  trackByRoute(_: number, item: NavItem): string {
    return item.route;
  }

  logout(): void {
    this.authService.logout();
  }

  setLang(lang: string): void {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
