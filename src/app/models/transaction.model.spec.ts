import { isValidDateString, isValidTransaction } from './transaction.model';

describe('isValidDateString', () => {
  it('accepts real calendar dates', () => {
    expect(isValidDateString('2026-01-15')).toBe(true);
    expect(isValidDateString('2024-02-29')).toBe(true); // 2024 is a leap year
    expect(isValidDateString('2026-12-31')).toBe(true);
  });

  it('rejects malformed strings', () => {
    expect(isValidDateString('15-01-2026')).toBe(false);
    expect(isValidDateString('2026/01/15')).toBe(false);
    expect(isValidDateString('2026-1-5')).toBe(false);
    expect(isValidDateString('')).toBe(false);
  });

  it('rejects impossible calendar dates', () => {
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('2025-02-29')).toBe(false); // 2025 is not a leap year
    expect(isValidDateString('2026-04-31')).toBe(false);
    expect(isValidDateString('2026-13-01')).toBe(false);
    expect(isValidDateString('2026-00-10')).toBe(false);
    expect(isValidDateString('2026-01-00')).toBe(false);
  });
});

describe('isValidTransaction', () => {
  const validTransaction = {
    id: 'abc',
    description: 'Salary',
    amount: 5000,
    type: 'income',
    category: 'Salary',
    date: '2026-01-15'
  };

  it('accepts a well-formed transaction', () => {
    expect(isValidTransaction(validTransaction)).toBe(true);
  });

  it('rejects records with an impossible date', () => {
    expect(isValidTransaction({ ...validTransaction, date: '2026-02-30' })).toBe(false);
  });

  it('rejects records with a non-positive amount', () => {
    expect(isValidTransaction({ ...validTransaction, amount: 0 })).toBe(false);
    expect(isValidTransaction({ ...validTransaction, amount: -5 })).toBe(false);
  });

  it('rejects records with an invalid type or empty description/category', () => {
    expect(isValidTransaction({ ...validTransaction, type: 'transfer' })).toBe(false);
    expect(isValidTransaction({ ...validTransaction, description: '   ' })).toBe(false);
    expect(isValidTransaction({ ...validTransaction, category: '' })).toBe(false);
  });

  it('rejects a category that is not in the known lists', () => {
    expect(isValidTransaction({ ...validTransaction, category: 'Nonsense' })).toBe(false);
  });

  it('rejects non-object values', () => {
    expect(isValidTransaction(null)).toBe(false);
    expect(isValidTransaction(undefined)).toBe(false);
    expect(isValidTransaction('not-a-transaction')).toBe(false);
    expect(isValidTransaction(42)).toBe(false);
  });
});