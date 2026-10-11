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
  templateUrl: './transaction-list.component.html',
  styleUrl: './transaction-list.component.css'
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