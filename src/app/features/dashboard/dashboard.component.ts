import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TransactionService } from '../../core/services/transaction.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { formatCurrency, formatDate } from '../../models/transaction.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, EmptyStateComponent],
  template: `
    <div class="dashboard">
      <main class="dashboard__main">
        <section class="dashboard__summary" aria-labelledby="summary-heading">
          <h1 id="summary-heading" class="dashboard__heading">Financial Overview</h1>
          <div class="summary-grid">
            <article class="summary-card summary-card--income">
              <div class="summary-card__icon" aria-hidden="true">💰</div>
              <div class="summary-card__content">
                <span class="summary-card__label">Total Income</span>
                <span class="summary-card__value summary-card__value--positive">{{ formattedTotalIncome() }}</span>
              </div>
            </article>

            <article class="summary-card summary-card--expense">
              <div class="summary-card__icon" aria-hidden="true">💸</div>
              <div class="summary-card__content">
                <span class="summary-card__label">Total Expenses</span>
                <span class="summary-card__value summary-card__value--negative">{{ formattedTotalExpenses() }}</span>
              </div>
            </article>

            <article class="summary-card summary-card--balance" [class.summary-card--negative]="balance() < 0">
              <div class="summary-card__icon" aria-hidden="true">⚖️</div>
              <div class="summary-card__content">
                <span class="summary-card__label">Balance</span>
                <span class="summary-card__value" [class.summary-card__value--positive]="balance() >= 0" [class.summary-card__value--negative]="balance() < 0">
                  {{ formattedBalance() }}
                </span>
              </div>
            </article>

            <article class="summary-card summary-card--count">
              <div class="summary-card__icon" aria-hidden="true">📋</div>
              <div class="summary-card__content">
                <span class="summary-card__label">Transactions</span>
                <span class="summary-card__value">{{ transactionService.transactionCount() }}</span>
              </div>
            </article>
          </div>
        </section>

        <section class="dashboard__recent" aria-labelledby="recent-heading">
          <div class="dashboard__section-header">
            <h2 id="recent-heading" class="dashboard__section-title">Recent Transactions</h2>
            <a routerLink="/transactions" class="btn btn--secondary btn--sm">View All</a>
          </div>

          @if (recentTransactions().length === 0) {
            <app-empty-state
              icon="dashboard"
              title="No transactions yet"
              message="Start tracking your income and expenses to see your financial overview."
              actionLabel="Add Transaction"
              actionRoute="/transactions/new"
            />
          } @else {
            <div class="table-container">
              <table class="transactions-table" role="table">
                <thead>
                  <tr>
                    <th scope="col">Description</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Type</th>
                    <th scope="col">Category</th>
                    <th scope="col">Date</th>
                  </tr>
                </thead>
                <tbody>
                  @for (transaction of recentTransactions(); track transaction.id) {
                    <tr>
                      <td class="transactions-table__description">{{ transaction.description }}</td>
                      <td class="transactions-table__amount">
                        <span [class]="'amount--' + transaction.type">
                          {{ formatAmount(transaction.amount, transaction.type) }}
                        </span>
                      </td>
                      <td>
                        <span class="badge" [class]="'badge--' + transaction.type">
                          {{ transaction.type | titlecase }}
                        </span>
                      </td>
                      <td>{{ transaction.category }}</td>
                      <td>{{ formatDate(transaction.date) }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      </main>
    </div>
  `,
  styles: [`
    .dashboard {
      min-height: 100vh;
      background: var(--color-background);
    }

    .dashboard__heading {
      margin: 0 0 1.25rem;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .dashboard__main {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .dashboard__summary {
      margin-bottom: 2rem;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
    }

    .summary-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: box-shadow var(--transition-normal), transform var(--transition-normal);
    }

    .summary-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }

    .summary-card__icon {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      background: var(--color-surface-variant);
    }

    .summary-card--income .summary-card__icon {
      background: var(--color-success-light);
    }

    .summary-card--expense .summary-card__icon {
      background: var(--color-error-light);
    }

    .summary-card--balance .summary-card__icon {
      background: var(--color-primary-light);
    }

    .summary-card--count .summary-card__icon {
      background: var(--color-info-light);
    }

    .summary-card__content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .summary-card__label {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      font-weight: 500;
    }

    .summary-card__value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .summary-card__value--positive {
      color: var(--color-success);
    }

    .summary-card__value--negative {
      color: var(--color-error);
    }

    .summary-card--negative .summary-card__value {
      color: var(--color-error);
    }

    .dashboard__section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .dashboard__section-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .table-container {
      overflow-x: auto;
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    .transactions-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    .transactions-table th,
    .transactions-table td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
    }

    .transactions-table th {
      background: var(--color-surface-variant);
      font-weight: 600;
      color: var(--color-text-secondary);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .transactions-table tbody tr:last-child td {
      border-bottom: none;
    }

    .transactions-table tbody tr:hover {
      background: var(--color-surface-variant);
    }

    .transactions-table__description {
      font-weight: 500;
      color: var(--color-text-primary);
    }

    .transactions-table__amount {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }

    .amount--income {
      color: var(--color-success);
    }

    .amount--expense {
      color: var(--color-error);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge--income {
      background: var(--color-success-light);
      color: var(--color-success);
    }

    .badge--expense {
      background: var(--color-error-light);
      color: var(--color-error);
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    @media (max-width: 768px) {
      .dashboard__main {
        padding: 1rem;
      }

      .summary-grid {
        grid-template-columns: 1fr 1fr;
      }

      .summary-card {
        padding: 1rem;
      }

      .summary-card__value {
        font-size: 1.25rem;
      }
    }

    @media (max-width: 480px) {
      .summary-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent {
  protected readonly transactionService = inject(TransactionService);

  protected readonly formatDate = formatDate;

  protected readonly formattedTotalIncome = computed(() => formatCurrency(this.transactionService.totalIncome()));
  protected readonly formattedTotalExpenses = computed(() => formatCurrency(this.transactionService.totalExpenses()));
  protected readonly formattedBalance = computed(() => formatCurrency(this.transactionService.balance()));
  protected readonly balance = computed(() => this.transactionService.balance());

  protected readonly recentTransactions = computed(() =>
    [...this.transactionService.transactions()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)
  );

  protected formatAmount(amount: number, type: 'income' | 'expense'): string {
    const prefix = type === 'income' ? '+' : '-';
    return `${prefix}${formatCurrency(amount)}`;
  }
}