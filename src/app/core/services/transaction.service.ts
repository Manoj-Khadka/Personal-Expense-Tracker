import { Injectable, signal, computed, WritableSignal } from '@angular/core';
import { Transaction, TransactionType, isValidTransaction, generateId, formatCurrency } from '../../models/transaction.model';

const STORAGE_KEY = 'expense-tracker-transactions-v1';
const STORAGE_BACKUP_KEY = 'expense-tracker-transactions-v1-backup';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private readonly _transactions: WritableSignal<Transaction[]> = signal([]);

  readonly transactions = this._transactions.asReadonly();

  readonly totalIncome = computed(() =>
    this._transactions()
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  readonly totalExpenses = computed(() =>
    this._transactions()
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  readonly balance = computed(() => this.totalIncome() - this.totalExpenses());

  readonly transactionCount = computed(() => this._transactions().length);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to read transactions from localStorage:', error);
      this._transactions.set([]);
      return;
    }

    if (!stored) {
      this._transactions.set([]);
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse transactions from localStorage:', error);
      this.backupCorruptedData(stored);
      this._transactions.set([]);
      return;
    }

    if (!Array.isArray(parsed)) {
      console.warn('Invalid transaction data in localStorage, resetting');
      this.backupCorruptedData(stored);
      this._transactions.set([]);
      return;
    }

    const validTransactions = parsed.filter(isValidTransaction);
    if (validTransactions.length !== parsed.length) {
      console.warn('Some transactions were invalid and have been discarded');
      this.backupCorruptedData(stored);
    }

    this._transactions.set(validTransactions);
  }

  /**
   * Copies the raw (unreadable or partially invalid) stored value to a backup
   * key before it can be overwritten, so a corrupted payload stays recoverable
   * instead of being lost. Best effort: if storage is full or unavailable the
   * failure is logged and ignored so loading can continue.
   */
  private backupCorruptedData(raw: string): void {
    try {
      localStorage.setItem(STORAGE_BACKUP_KEY, raw);
    } catch (error) {
      console.warn('Could not back up corrupt transaction data:', error);
    }
  }

  /**
   * Persists the given collection. Returns `true` on success and `false`
   * when the write fails, so callers can avoid reporting success to the user
   * when nothing was actually saved.
   */
  private saveToStorage(transactions: Transaction[]): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
      return true;
    } catch (error) {
      console.error('Failed to save transactions to localStorage:', error);
      return false;
    }
  }

  /**
   * Adds a transaction and returns it, or `null` if it could not be persisted.
   * The in-memory state is only updated when the write succeeds, so the UI
   * never shows data that was not actually saved.
   */
  addTransaction(transaction: Omit<Transaction, 'id'>): Transaction | null {
    const newTransaction: Transaction = {
      ...transaction,
      id: generateId()
    };

    const next = [...this._transactions(), newTransaction];
    if (!this.saveToStorage(next)) {
      return null;
    }

    this._transactions.set(next);
    return newTransaction;
  }

  /**
   * Replaces the transaction with a matching ID (preserving the ID).
   * Returns `false` when the transaction is missing or the write fails.
   */
  updateTransaction(updated: Transaction): boolean {
    const current = this._transactions();
    const index = current.findIndex(t => t.id === updated.id);
    if (index === -1) {
      return false;
    }

    const next = [...current];
    next[index] = updated;

    if (!this.saveToStorage(next)) {
      return false;
    }

    this._transactions.set(next);
    return true;
  }

  /**
   * Removes the transaction with a matching ID.
   * Returns `false` when the transaction is missing or the write fails.
   */
  deleteTransaction(id: string): boolean {
    const current = this._transactions();
    if (!current.some(t => t.id === id)) {
      return false;
    }

    const next = current.filter(t => t.id !== id);
    if (!this.saveToStorage(next)) {
      return false;
    }

    this._transactions.set(next);
    return true;
  }

  getTransactionById(id: string): Transaction | undefined {
    return this._transactions().find(t => t.id === id);
  }

  getTransactionsByType(type: TransactionType): Transaction[] {
    return this._transactions().filter(t => t.type === type);
  }

  getFormattedTotalIncome(): string {
    return formatCurrency(this.totalIncome());
  }

  getFormattedTotalExpenses(): string {
    return formatCurrency(this.totalExpenses());
  }

  getFormattedBalance(): string {
    return formatCurrency(this.balance());
  }
}