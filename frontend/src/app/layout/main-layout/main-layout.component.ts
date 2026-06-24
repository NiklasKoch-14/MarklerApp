import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService, Agent } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/services/theme.service';

interface NavItem {
  route: string;
  icon: string;
  labelKey: string;
  exact?: boolean;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule],
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
        <nav class="sidebar-nav">
          @for (item of navItems; track item.route) {
            <a [routerLink]="item.route"
               routerLinkActive="active"
               [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
               class="sidebar-nav-item">
              <i [class]="item.icon" style="font-size:19px; width:22px; text-align:center;"></i>
              <span style="flex:1; text-align:left;">{{ item.labelKey | translate }}</span>
            </a>
          }
        </nav>

        <!-- User -->
        <div class="sidebar-user">
          <div class="sidebar-avatar">{{ userInitials }}</div>
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
          <button class="topbar-icon-btn">
            <i class="ph ph-bell" style="font-size:17px;"></i>
          </button>

          <!-- New Note CTA -->
          <button class="topbar-cta-btn" [routerLink]="['/call-notes/new']">
            <i class="ph-bold ph-plus" style="font-size:15px;"></i>
            <span>{{ 'navigation.newNote' | translate }}</span>
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
  navItems: NavItem[] = [
    { route: '/dashboard',   icon: 'ph-fill ph-squares-four',    labelKey: 'navigation.dashboard',  exact: true },
    { route: '/call-notes',  icon: 'ph-fill ph-chats-circle',    labelKey: 'navigation.callNotes'              },
    { route: '/clients',     icon: 'ph-fill ph-users',           labelKey: 'navigation.clients'                },
    { route: '/properties',  icon: 'ph-fill ph-buildings',       labelKey: 'navigation.properties'             },
  ];

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
