import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TransactionListComponent } from './transaction-list.component';
import { TransactionService } from '../../../core/services/transaction.service';

const STORAGE_KEY = 'expense-tracker-transactions-v1';

describe('TransactionListComponent', () => {
  let fixture: ComponentFixture<TransactionListComponent>;
  let service: TransactionService;
  let host: HTMLElement;

  const rows = () => host.querySelectorAll('tbody tr').length;

  function setControl<T extends HTMLInputElement | HTMLSelectElement>(
    selector: string,
    value: string,
    eventName: 'input' | 'change'
  ): void {
    const control = host.querySelector<T>(selector)!;
    control.value = value;
    control.dispatchEvent(new Event(eventName));
    fixture.detectChanges();
  }

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: '1', description: 'Salary', amount: 5000, type: 'income', category: 'Salary', date: '2026-01-15' },
      { id: '2', description: 'Groceries', amount: 1200, type: 'expense', category: 'Food', date: '2026-01-16' },
      { id: '3', description: 'Bus pass', amount: 300, type: 'expense', category: 'Transport', date: '2026-01-17' }
    ]));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [TransactionListComponent],
      providers: [provideRouter([])]
    });

    fixture = TestBed.createComponent(TransactionListComponent);
    service = TestBed.inject(TransactionService);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => localStorage.clear());

  it('renders every stored transaction by default', () => {
    expect(rows()).toBe(3);
  });

  it('lists transactions newest first', () => {
    const descriptions = Array.from(host.querySelectorAll('tbody tr .transactions-table__description'))
      .map(td => td.textContent?.trim());

    expect(descriptions).toEqual(['Bus pass', 'Groceries', 'Salary']);
  });

  it('breaks equal dates deterministically by id', () => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: 'b', description: 'Second', amount: 10, type: 'expense', category: 'Food', date: '2026-05-01' },
      { id: 'a', description: 'First', amount: 10, type: 'expense', category: 'Food', date: '2026-05-01' }
    ]));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [TransactionListComponent], providers: [provideRouter([])] });
    const tied = TestBed.createComponent(TransactionListComponent);
    tied.detectChanges();
    const tiedHost = tied.nativeElement as HTMLElement;

    const descriptions = Array.from(tiedHost.querySelectorAll('tbody tr .transactions-table__description'))
      .map(td => td.textContent?.trim());

    expect(descriptions).toEqual(['First', 'Second']);
  });

  it('applies the search, type and category filters together', () => {
    // 'a' matches Salary and Transport but not Groceries.
    setControl<HTMLInputElement>('#search', 'a', 'input');
    // expense keeps Transport only.
    setControl<HTMLSelectElement>('#type-filter', 'expense', 'change');
    // Transport narrows it to a single row.
    setControl<HTMLSelectElement>('#category-filter', 'Transport', 'change');

    expect(rows()).toBe(1);
    expect(host.querySelector('tbody tr td')?.textContent?.trim()).toBe('Bus pass');
  });

  it('clears a category filter that is not valid for the newly selected type', () => {
    setControl<HTMLSelectElement>('#category-filter', 'Salary', 'change');
    expect(rows()).toBe(1);

    setControl<HTMLSelectElement>('#type-filter', 'expense', 'change');

    // 'Salary' is not an expense category, so the filter resets and all expenses show.
    expect(rows()).toBe(2);
  });

  it('keeps the dashboard total independent of the active filters', () => {
    setControl<HTMLSelectElement>('#type-filter', 'income', 'change');

    expect(rows()).toBe(1);                      // only the income row is listed
    expect(service.transactionCount()).toBe(3);  // the total is unaffected by filtering
  });

  it('shows a message when a delete fails instead of failing silently', () => {
    vi.spyOn(service, 'deleteTransaction').mockReturnValue(false);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    host.querySelector<HTMLButtonElement>('.btn--danger')!.click();
    fixture.detectChanges();

    expect(host.querySelector('.delete-error')?.textContent).toContain('Could not delete');
  });
});
