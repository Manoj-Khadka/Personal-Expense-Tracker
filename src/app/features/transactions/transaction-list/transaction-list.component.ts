import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../../../core/services/transaction.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { Category, formatCurrency, formatDate, TransactionType, getCategoriesForType, ALL_CATEGORIES } from '../../../models/transaction.model';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, EmptyStateComponent],
  template: `
    <div class="transaction-list-page">
      <header class="page-header">
        <div class="page-header__content">
          <h1 class="page-header__title">Transactions</h1>
          <a routerLink="/transactions/new" class="btn btn--primary">
            <span aria-hidden="true">➕</span> Add Transaction
          </a>
        </div>
      </header>

      <main class="page-main">
        @if (deleteError()) {
          <div class="delete-error" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{{ deleteError() }}</span>
            <button type="button" class="delete-error__dismiss" (click)="deleteError.set('')" aria-label="Dismiss error">✕</button>
          </div>
        }

        <section class="filters-section" aria-labelledby="filters-heading">
          <h2 id="filters-heading" class="visually-hidden">Search and Filter Transactions</h2>

          <div class="search-box">
            <label for="search" class="visually-hidden">Search by description</label>
            <input
              type="search"
              id="search"
              class="form-input"
              placeholder="Search by description..."
              [ngModel]="searchTerm()"
              (ngModelChange)="onSearchChange($event)"
              aria-describedby="search-help"
            />
            <span id="search-help" class="visually-hidden">Type to filter transactions by description</span>
          </div>

          <div class="filter-row">
            <div class="filter-group">
              <label for="type-filter" class="visually-hidden">Filter by type</label>
              <select
                id="type-filter"
                class="form-select"
                [ngModel]="selectedType()"
                (ngModelChange)="onTypeChange($event)"
              >
                <option value="all">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div class="filter-group">
              <label for="category-filter" class="visually-hidden">Filter by category</label>
              <select
                id="category-filter"
                class="form-select"
                [ngModel]="selectedCategory()"
                (ngModelChange)="onCategoryChange($event)"
              >
                <option value="all">All Categories</option>
                @for (cat of availableCategories(); track cat) {
                  <option [value]="cat">{{ cat }}</option>
                }
              </select>
            </div>

            @if (hasActiveFilters()) {
              <button type="button" class="btn btn--ghost btn--sm" (click)="clearFilters()">
                Clear Filters
              </button>
            }
          </div>
        </section>

        <section class="transactions-section" aria-labelledby="transactions-heading">
          <h2 id="transactions-heading" class="visually-hidden">Transaction List</h2>

          @if (filteredTransactions().length === 0) {
            @if (transactionService.transactions().length === 0) {
              <app-empty-state
                icon="transactions"
                title="No transactions yet"
                message="Get started by adding your first income or expense transaction."
                actionLabel="Add Transaction"
                actionRoute="/transactions/new"
              />
            } @else {
              <app-empty-state
                icon="search"
                title="No matching transactions"
                message="Try adjusting your search or filters to find what you're looking for."
                actionLabel="Clear Filters"
                [actionClick]="clearFilters"
              />
            }
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
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (transaction of filteredTransactions(); track transaction.id) {
                    <tr>
                      <td class="transactions-table__description" data-label="Description">{{ transaction.description }}</td>
                      <td class="transactions-table__amount" data-label="Amount">
                        <span [class]="'amount--' + transaction.type">
                          {{ formatAmount(transaction.amount, transaction.type) }}
                        </span>
                      </td>
                      <td data-label="Type">
                        <span class="badge" [class]="'badge--' + transaction.type">
                          {{ transaction.type | titlecase }}
                        </span>
                      </td>
                      <td data-label="Category">{{ transaction.category }}</td>
                      <td data-label="Date">{{ formatDate(transaction.date) }}</td>
                      <td class="transactions-table__actions" data-label="Actions">
                        <div class="actions-cell">
                          <a
                            [routerLink]="['/transactions', transaction.id, 'edit']"
                            class="btn btn--ghost btn--sm btn--icon"
                            aria-label="Edit {{ transaction.description }}"
                          >
                            ✏️
                          </a>
                          <button
                            type="button"
                            class="btn btn--ghost btn--sm btn--icon btn--danger"
                            (click)="confirmDelete(transaction)"
                            aria-label="Delete {{ transaction.description }}"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <p class="results-count" aria-live="polite">
              Showing {{ filteredTransactions().length }} of {{ transactionService.transactionCount() }} transaction(s)
            </p>
          }
        </section>
      </main>
    </div>
  `,
  styles: [`
    .transaction-list-page {
      min-height: 100vh;
      background: var(--color-background);
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      flex-wrap: wrap;
      gap: 1rem;
    }

    .page-header__content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      gap: 1rem;
    }

    .page-header__title {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--color-text-primary);
    }

    .page-main {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .filters-section {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .delete-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      margin-bottom: 1.5rem;
      border: 1px solid var(--color-error);
      border-radius: var(--radius-md);
      background: var(--color-error-light);
      color: var(--color-error-dark);
      font-size: 0.875rem;
    }

    .delete-error__dismiss {
      margin-left: auto;
      padding: 0;
      border: none;
      background: transparent;
      color: inherit;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
    }

    .search-box {
      margin-bottom: 1rem;
    }

    .form-input,
    .form-select {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 1rem;
      background: var(--color-background);
      color: var(--color-text-primary);
      transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
    }

    .form-input:focus,
    .form-select:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-light);
    }

    .filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: flex-end;
    }

    .filter-group {
      flex: 1;
      min-width: 180px;
    }

    .filter-group label {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-secondary);
    }

    .transactions-section {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    .table-container {
      overflow-x: auto;
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
      white-space: nowrap;
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
      max-width: 300px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .transactions-table__amount {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
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
      white-space: nowrap;
    }

    .badge--income {
      background: var(--color-success-light);
      color: var(--color-success);
    }

    .badge--expense {
      background: var(--color-error-light);
      color: var(--color-error);
    }

    .actions-cell {
      display: flex;
      gap: 0.5rem;
      white-space: nowrap;
    }

    .btn--icon {
      padding: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn--danger {
      color: var(--color-error);
    }

    .btn--danger:hover {
      background: var(--color-error-light);
    }

    .results-count {
      padding: 1rem;
      margin: 0;
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      border-top: 1px solid var(--color-border);
      background: var(--color-surface-variant);
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
      .page-header {
        padding: 1rem;
      }

      .page-main {
        padding: 1rem;
      }

      .filters-section {
        padding: 1rem;
      }

      .filter-row {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-group {
        min-width: 0;
      }

      /* Turn the table into stacked cards so every field — including the
         Actions column — stays visible and tappable on small screens. */
      .table-container {
        overflow-x: visible;
      }

      .transactions-table,
      .transactions-table tbody,
      .transactions-table tr,
      .transactions-table td {
        display: block;
        width: 100%;
      }

      .transactions-table thead {
        display: none;
      }

      .transactions-table tr {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid var(--color-border);
      }

      .transactions-table tbody tr:last-child {
        border-bottom: none;
      }

      .transactions-table td {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.375rem 0;
        border-bottom: none;
      }

      .transactions-table td::before {
        content: attr(data-label);
        flex: 0 0 auto;
        font-weight: 600;
        font-size: 0.6875rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-text-secondary);
      }

      .transactions-table__description {
        max-width: none;
        white-space: normal;
        overflow: visible;
        text-overflow: clip;
        font-size: 1rem;
      }

      .actions-cell {
        flex-direction: row;
        gap: 0.75rem;
      }
    }
  `]
})
export class TransactionListComponent {
  protected readonly transactionService = inject(TransactionService);

  protected searchTerm = signal('');
  protected selectedType = signal<'all' | TransactionType>('all');
  protected selectedCategory = signal<'all' | Category>('all');

  protected readonly availableCategories = computed(() => {
    const type = this.selectedType();
    if (type === 'all') {
      return ALL_CATEGORIES;
    }
    return getCategoriesForType(type);
  });

  protected readonly filteredTransactions = computed(() => {
    const transactions = this.transactionService.transactions();
    const search = this.searchTerm().trim().toLowerCase();
    const type = this.selectedType();
    const category = this.selectedCategory();

    const filtered = transactions.filter(t => {
      const matchesSearch = !search || t.description.toLowerCase().includes(search);
      const matchesType = type === 'all' || t.type === type;
      const matchesCategory = category === 'all' || t.category === category;
      return matchesSearch && matchesType && matchesCategory;
    });

    // Newest first. `filter` already returns a fresh array, so sorting it is safe.
    // The id comparison is only a tie-breaker, keeping equal dates deterministic.
    return filtered.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  });

  protected readonly hasActiveFilters = computed(() =>
    this.searchTerm().trim().length > 0 ||
    this.selectedType() !== 'all' ||
    this.selectedCategory() !== 'all'
  );

  protected onSearchChange(value: string): void {
    this.searchTerm.set(value);
  }

  protected onTypeChange(value: 'all' | TransactionType): void {
    this.selectedType.set(value);

    // Keep the category filter valid for the newly selected type.
    const category = this.selectedCategory();
    if (category !== 'all' && value !== 'all' && !getCategoriesForType(value).includes(category)) {
      this.selectedCategory.set('all');
    }
  }

  protected onCategoryChange(value: 'all' | Category): void {
    this.selectedCategory.set(value);
  }

  protected clearFilters(): void {
    this.searchTerm.set('');
    this.selectedType.set('all');
    this.selectedCategory.set('all');
  }

  protected deleteError = signal('');

  protected confirmDelete(transaction: { id: string; description: string }): void {
    if (!confirm(`Are you sure you want to delete "${transaction.description}"?`)) {
      return;
    }

    const deleted = this.transactionService.deleteTransaction(transaction.id);
    if (!deleted) {
      this.deleteError.set('Could not delete the transaction. It may have already been removed, or browser storage is unavailable.');
      return;
    }

    this.deleteError.set('');
  }

  protected formatAmount(amount: number, type: 'income' | 'expense'): string {
    const prefix = type === 'income' ? '+' : '-';
    return `${prefix}${formatCurrency(amount)}`;
  }

  protected formatDate = formatDate;
}