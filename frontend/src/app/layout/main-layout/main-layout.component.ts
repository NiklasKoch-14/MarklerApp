import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { AuthService, Agent } from '../../core/auth/auth.service';
import { CommandPaletteComponent } from '../../shared/components/command-palette/command-palette.component';

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
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule, DragDropModule, CommandPaletteComponent],
  template: `
    <div class="app-shell">

      <!-- ── Sidebar ─────────────────────────────────── -->
      <aside class="sidebar">

        <!-- Brand -->
        <div class="sidebar-brand">
          <div class="sidebar-logo">
            <i class="ri-home-fill" style="font-size:20px; color:#fff;"></i>
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
               [cdkDragDisabled]="isMobile"
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
                 class="ri-draggable"
                 *ngIf="item['_hover'] && !isMobile"
                 style="font-size:16px; color:rgba(255,255,255,0.35); cursor:grab; margin-left:4px;"
                 (mousedown)="$event.preventDefault()"></i>
            </a>
          </div>
          <a routerLink="/settings" routerLinkActive="active"
             class="sidebar-nav-item sidebar-settings-link">
            <i class="ri-settings-fill" style="font-size:19px; width:22px; text-align:center;"></i>
            <span style="flex:1; text-align:left;">{{ 'navigation.settings' | translate }}</span>
          </a>
        </nav>

        <!-- User -->
        <div class="sidebar-user" style="cursor:pointer;" [routerLink]="['/settings']">
          <div style="min-width:0; flex:1;">
            <div class="sidebar-user-name">{{ userName }}</div>
            <div class="sidebar-user-role">{{ 'navigation.role' | translate }}</div>
          </div>
          <button class="sidebar-icon-btn"
                  (click)="$event.stopPropagation(); logout()"
                  [title]="'auth.logout' | translate">
            <i class="ri-logout-box-line" style="font-size:17px;"></i>
          </button>
        </div>

      </aside>

      <!-- ── Content area ────────────────────────────── -->
      <div class="content-area">

        <!-- Top-Bar: auf Mobile die einzige Kopfzeile (die Tab-Bar unten ist voll),
             auf Desktop der sichtbare Einstieg in die globale Suche. -->
        <header class="topbar">
          <div class="topbar-brand" aria-hidden="true">
            <div class="topbar-logo"><i class="ri-home-fill"></i></div>
            <span class="topbar-brand-name">MarklerApp</span>
          </div>
          <button type="button"
                  class="topbar-search"
                  (click)="openSearch()"
                  aria-haspopup="dialog"
                  [attr.aria-expanded]="searchOpen"
                  [attr.aria-label]="'globalSearch.open' | translate">
            <i class="ri-search-line" aria-hidden="true"></i>
            <span class="topbar-search-label">{{ 'globalSearch.trigger' | translate }}</span>
            <kbd class="topbar-search-kbd" aria-hidden="true">{{ shortcutKey | translate }}</kbd>
          </button>
        </header>

        <!-- Page content -->
        <main class="page-content">
          <router-outlet></router-outlet>
        </main>

      </div>
    </div>

    <app-command-palette [open]="searchOpen" (closed)="searchOpen = false"></app-command-palette>
  `
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private readonly defaultNavItems: NavItem[] = [
    { route: '/dashboard',      icon: 'ri-grid-fill',  labelKey: 'navigation.dashboard',      exact: true },
    { route: '/clients',        icon: 'ri-group-fill',         labelKey: 'navigation.clients'                     },
    { route: '/properties',     icon: 'ri-building-2-fill',     labelKey: 'navigation.properties'                  },
    { route: '/viewings',       icon: 'ri-calendar-check-fill', labelKey: 'navigation.viewings'                    },
    { route: '/analytics',      icon: 'ri-line-chart-fill', labelKey: 'navigation.analytics'                   },
  ];

  navItems: NavItem[] = [...this.defaultNavItems];

  userName = '';

  /* Kommandopalette (Issue #42): Zustand liegt hier, damit Tastenkuerzel und
     Lupen-Button dieselbe Instanz oeffnen. */
  searchOpen = false;
  readonly shortcutKey = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
    ? 'globalSearch.shortcutMac'
    : 'globalSearch.shortcutCtrl';

  /* Nav reordering is a desktop feature — on touch/mobile the drag handle
     steals space in the bottom tab bar and long-press dragging fights scrolling. */
  isMobile = false;
  private mobileQuery = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)') : null;
  private mobileQueryListener = (e: MediaQueryListEvent) => { this.isMobile = e.matches; };

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => this.updateUser(user));

    this.loadNavOrder();

    if (this.mobileQuery) {
      this.isMobile = this.mobileQuery.matches;
      this.mobileQuery.addEventListener('change', this.mobileQueryListener);
    }
  }

  ngOnDestroy(): void {
    this.mobileQuery?.removeEventListener('change', this.mobileQueryListener);
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateUser(user: Agent | null): void {
    this.userName = user ? `${user.firstName} ${user.lastName}` : '';
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

  openSearch(): void {
    this.searchOpen = true;
  }

  /**
   * Strg/Cmd + K oeffnet die Suche von ueberall — auch aus einem Formularfeld heraus,
   * denn genau dann (Telefonat laeuft, Kunde wartet) wird sie gebraucht. Der Browser-
   * Default (Adressleiste) wird bewusst unterdrueckt.
   */
  @HostListener('document:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.searchOpen = true;
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
