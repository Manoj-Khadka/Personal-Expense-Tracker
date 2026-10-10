export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: Category;
  date: string;
}

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Other'
] as const;

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Entertainment',
  'Education',
  'Other'
] as const;

export const ALL_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Entertainment',
  'Education',
  'Other'
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type Category = IncomeCategory | ExpenseCategory;

export function getCategoriesForType(type: TransactionType): readonly Category[] {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && (ALL_CATEGORIES as readonly string[]).includes(value);
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function formatCurrency(amount: number, currency: string = 'NPR'): string {
  return new Intl.NumberFormat('en-NP', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Returns the current local calendar date as a `YYYY-MM-DD` string.
 * Uses local date parts (not `toISOString()`, which is UTC) so the value
 * never shifts to the previous/next day near midnight.
 */
export function getTodayLocalISODate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Strictly validates a `YYYY-MM-DD` string, rejecting impossible calendar
 * dates such as `2026-02-30` in addition to malformed input.
 */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  // Date.UTC normalizes overflowing values (e.g. Feb 30 -> Mar 2),
  // so comparing the parts back catches impossible dates.
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isValidTransaction(obj: unknown): obj is Transaction {
  if (!obj || typeof obj !== 'object') return false;
  const t = obj as Record<string, unknown>;

  const description = t['description'];
  const amount = t['amount'];
  const type = t['type'];
  const date = t['date'];

  return (
    typeof t['id'] === 'string' &&
    typeof description === 'string' &&
    description.trim().length > 0 &&
    typeof amount === 'number' &&
    amount > 0 &&
    (type === 'income' || type === 'expense') &&
    isCategory(t['category']) &&
    typeof date === 'string' &&
    isValidDateString(date)
  );
}