import { TestBed } from '@angular/core/testing';
import { TransactionService } from './transaction.service';
import { Transaction } from '../../models/transaction.model';

const STORAGE_KEY = 'expense-tracker-transactions-v1';
const STORAGE_BACKUP_KEY = 'expense-tracker-transactions-v1-backup';

describe('TransactionService', () => {
  let service: TransactionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with no transactions', () => {
    expect(service.transactions()).toEqual([]);
    expect(service.transactionCount()).toBe(0);
    expect(service.totalIncome()).toBe(0);
    expect(service.totalExpenses()).toBe(0);
    expect(service.balance()).toBe(0);
  });

  it('should add a transaction, assign a unique id, and persist it', () => {
    const created = service.addTransaction({
      description: 'Salary',
      amount: 5000,
      type: 'income',
      category: 'Salary',
      date: '2026-01-15'
    });

    expect(created).not.toBeNull();
    expect(created!.id).toBeTruthy();
    expect(service.transactionCount()).toBe(1);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Transaction[];
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(created!.id);
    expect(stored[0].description).toBe('Salary');
  });

  it('should compute totals and balance from the shared data source', () => {
    service.addTransaction({ description: 'Salary', amount: 5000, type: 'income', category: 'Salary', date: '2026-01-15' });
    service.addTransaction({ description: 'Food', amount: 1200, type: 'expense', category: 'Food', date: '2026-01-16' });

    expect(service.totalIncome()).toBe(5000);
    expect(service.totalExpenses()).toBe(1200);
    expect(service.balance()).toBe(3800);
    expect(service.transactionCount()).toBe(2);
  });

  it('should update an existing transaction and preserve its id (no duplicate)', () => {
    const created = service.addTransaction({
      description: 'Food',
      amount: 100,
      type: 'expense',
      category: 'Food',
      date: '2026-01-16'
    })!;

    const success = service.updateTransaction({ ...created, amount: 250, description: 'Groceries' });

    expect(success).toBe(true);
    expect(service.transactionCount()).toBe(1);
    expect(service.getTransactionById(created.id)?.amount).toBe(250);
    expect(service.getTransactionById(created.id)?.description).toBe('Groceries');
  });

  it('should return false when updating a transaction that does not exist', () => {
    const success = service.updateTransaction({
      id: 'missing',
      description: 'x',
      amount: 1,
      type: 'expense',
      category: 'Food',
      date: '2026-01-01'
    });

    expect(success).toBe(false);
    expect(service.transactionCount()).toBe(0);
  });

  it('should delete a transaction and remove it from storage', () => {
    const created = service.addTransaction({
      description: 'Food',
      amount: 100,
      type: 'expense',
      category: 'Food',
      date: '2026-01-16'
    })!;

    expect(service.deleteTransaction(created.id)).toBe(true);
    expect(service.transactionCount()).toBe(0);
    expect(service.getTransactionById(created.id)).toBeUndefined();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Transaction[];
    expect(stored).toHaveLength(0);
  });

  it('should return false when deleting a transaction that does not exist', () => {
    expect(service.deleteTransaction('missing')).toBe(false);
  });

  it('should find transactions by type', () => {
    service.addTransaction({ description: 'Salary', amount: 5000, type: 'income', category: 'Salary', date: '2026-01-15' });
    service.addTransaction({ description: 'Food', amount: 200, type: 'expense', category: 'Food', date: '2026-01-16' });

    expect(service.getTransactionsByType('income')).toHaveLength(1);
    expect(service.getTransactionsByType('expense')).toHaveLength(1);
  });

  // The service has no injected dependencies, so a fresh instance can be built
  // directly to simulate what happens right after a page refresh on an edit URL.
  it('hydrates stored transactions synchronously on construction', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: 'abc', description: 'Salary', amount: 5000, type: 'income', category: 'Salary', date: '2026-01-15' }
    ]));

    const fresh = new TransactionService();

    // Available immediately, before any rendering has happened.
    expect(fresh.transactionCount()).toBe(1);
    expect(fresh.getTransactionById('abc')?.description).toBe('Salary');
  });

  it('starts empty instead of throwing when stored JSON is corrupt', () => {
    localStorage.setItem(STORAGE_KEY, '{ this is not valid json');

    const fresh = new TransactionService();

    expect(fresh.transactionCount()).toBe(0);
  });

  it('discards invalid stored records and keeps the valid ones', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: 'ok', description: 'Salary', amount: 5000, type: 'income', category: 'Salary', date: '2026-01-15' },
      { id: 'bad', description: '', amount: -3, type: 'wrong', category: '', date: 'not-a-date' }
    ]));

    const fresh = new TransactionService();

    expect(fresh.transactionCount()).toBe(1);
    expect(fresh.getTransactionById('ok')).toBeDefined();
  });

  it('backs up corrupt JSON before resetting', () => {
    const corrupt = '{ this is not valid json';
    localStorage.setItem(STORAGE_KEY, corrupt);

    const fresh = new TransactionService();

    expect(fresh.transactionCount()).toBe(0);
    expect(localStorage.getItem(STORAGE_BACKUP_KEY)).toBe(corrupt);
  });

  it('backs up the stored value when a non-array payload is reset', () => {
    const stored = JSON.stringify({ not: 'an array' });
    localStorage.setItem(STORAGE_KEY, stored);

    const fresh = new TransactionService();

    expect(fresh.transactionCount()).toBe(0);
    expect(localStorage.getItem(STORAGE_BACKUP_KEY)).toBe(stored);
  });

  it('backs up the stored value when some records are discarded', () => {
    const stored = JSON.stringify([
      { id: 'ok', description: 'Salary', amount: 5000, type: 'income', category: 'Salary', date: '2026-01-15' },
      { id: 'mismatch', description: 'Food', amount: 100, type: 'expense', category: 'Salary', date: '2026-01-16' }
    ]);
    localStorage.setItem(STORAGE_KEY, stored);

    const fresh = new TransactionService();

    expect(fresh.transactionCount()).toBe(1);
    expect(fresh.getTransactionById('ok')).toBeDefined();
    expect(fresh.getTransactionById('mismatch')).toBeUndefined();
    expect(localStorage.getItem(STORAGE_BACKUP_KEY)).toBe(stored);
  });
});