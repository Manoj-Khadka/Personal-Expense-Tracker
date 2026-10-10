import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="app-bar">
      <a routerLink="/dashboard" class="app-bar__brand">Personal Expense Tracker</a>
      <nav class="app-bar__nav" aria-label="Main navigation">
        <a
          routerLink="/dashboard"
          routerLinkActive="app-bar__link--active"
          [routerLinkActiveOptions]="{ exact: true }"
          class="app-bar__link"
        >
          Dashboard
        </a>
        <a
          routerLink="/transactions"
          routerLinkActive="app-bar__link--active"
          class="app-bar__link"
        >
          Transactions
        </a>
      </nav>
    </header>
  `,
  styles: [`
    .app-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.875rem 2rem;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      position: sticky;
      top: 0;
      z-index: 100;
      flex-wrap: wrap;
    }

    .app-bar__brand {
      font-size: 1rem;
      font-weight: 700;
      color: var(--color-text-primary);
      text-decoration: none;
    }

    .app-bar__brand:hover {
      color: var(--color-primary);
    }

    .app-bar__nav {
      display: flex;
      gap: 0.5rem;
    }

    .app-bar__link {
      padding: 0.5rem 1rem;
      border-radius: var(--radius-md);
      color: var(--color-text-secondary);
      font-weight: 500;
      font-size: 0.9375rem;
      text-decoration: none;
      transition: background var(--transition-fast), color var(--transition-fast);
    }

    .app-bar__link:hover {
      background: var(--color-surface-variant);
      color: var(--color-text-primary);
    }

    .app-bar__link--active {
      background: var(--color-primary);
      color: var(--color-text-inverse);
    }

    .app-bar__link--active:hover {
      background: var(--color-primary-dark);
      color: var(--color-text-inverse);
    }

    @media (max-width: 600px) {
      .app-bar {
        padding: 0.75rem 1rem;
      }

      .app-bar__brand {
        font-size: 0.9375rem;
      }

      .app-bar__link {
        padding: 0.4rem 0.75rem;
        font-size: 0.875rem;
      }
    }
  `]
})
export class NavBarComponent {}