import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="empty-state">
      <div class="empty-state__icon" [attr.data-icon]="icon()"></div>
      <h3 class="empty-state__title">{{ title() }}</h3>
      <p class="empty-state__message">{{ message() }}</p>
      @if (actionLabel() && actionRoute()) {
        <a [routerLink]="actionRoute()" class="btn btn--primary empty-state__action">
          {{ actionLabel() }}
        </a>
      } @else if (actionLabel() && actionClick()) {
        <button type="button" class="btn btn--primary empty-state__action" (click)="actionClick()!()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1.5rem;
      text-align: center;
      color: var(--color-text-secondary);
    }

    .empty-state__icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--color-surface-variant);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      font-size: 1.5rem;
    }

    .empty-state__icon[data-icon="transactions"]::before {
      content: "📋";
    }

    .empty-state__icon[data-icon="search"]::before {
      content: "🔍";
    }

    .empty-state__icon[data-icon="dashboard"]::before {
      content: "📊";
    }

    .empty-state__icon[data-icon="form"]::before {
      content: "📝";
    }

    .empty-state__title {
      margin: 0 0 0.5rem;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .empty-state__message {
      margin: 0 0 1.5rem;
      max-width: 300px;
      line-height: 1.5;
    }

    .empty-state__action {
      margin-top: 0.5rem;
    }
  `]
})
export class EmptyStateComponent {
  icon = input<'transactions' | 'search' | 'dashboard' | 'form'>('transactions');
  title = input.required<string>();
  message = input.required<string>();
  actionLabel = input<string>('');
  actionRoute = input<string>('');
  actionClick = input<(() => void) | undefined>(undefined);
}