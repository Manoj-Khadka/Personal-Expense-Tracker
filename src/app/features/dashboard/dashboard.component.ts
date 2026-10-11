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
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
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