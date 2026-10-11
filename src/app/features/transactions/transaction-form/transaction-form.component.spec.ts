import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TransactionFormComponent } from './transaction-form.component';
import { TransactionService } from '../../../core/services/transaction.service';

const STORAGE_KEY = 'expense-tracker-transactions-v1';

function fillInput(host: HTMLElement, selector: string, value: string): void {
  const input = host.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function createComponent(id?: string): ComponentFixture<TransactionFormComponent> {
  TestBed.resetTestingModule();

  const routeStub = {
    paramMap: of(convertToParamMap(id ? { id } : {})),
    snapshot: { paramMap: convertToParamMap(id ? { id } : {}) }
  };

  TestBed.configureTestingModule({
    imports: [TransactionFormComponent],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: routeStub }
    ]
  });

  const fixture = TestBed.createComponent(TransactionFormComponent);
  fixture.detectChanges();
  return fixture;
}

describe('TransactionFormComponent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('loads an existing transaction when the edit route is opened directly', () => {
    // Pre-seed storage to mimic landing on /transactions/abc/edit after a refresh.
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: 'abc', description: 'Rent', amount: 15000, type: 'expense', category: 'Bills', date: '2026-02-01' }
    ]));

    const fixture = createComponent('abc');
    const host = fixture.nativeElement as HTMLElement;

    const description = host.querySelector<HTMLInputElement>('#description');
    const amount = host.querySelector<HTMLInputElement>('#amount');
    const date = host.querySelector<HTMLInputElement>('#date');

    expect(description?.value).toBe('Rent');
    expect(amount?.value).toBe('15000');
    expect(date?.value).toBe('2026-02-01');
  });

  it('swaps the category options when Income is selected', () => {
    const fixture = createComponent();
    const host = fixture.nativeElement as HTMLElement;

    const incomeRadio = host.querySelector<HTMLInputElement>('input[type="radio"][value="income"]');
    incomeRadio!.click();
    fixture.detectChanges();

    const options = Array.from(host.querySelectorAll<HTMLOptionElement>('#category option'))
      .map(option => option.textContent?.trim());

    expect(options).toContain('Salary');
    expect(options).not.toContain('Food');
  });

  it('keeps the stored category in edit mode, then clears it if the type changes', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: 'inc', description: 'Bonus', amount: 1000, type: 'income', category: 'Freelance', date: '2026-03-01' }
    ]));

    const fixture = createComponent('inc');
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector<HTMLSelectElement>('#category')?.value).toBe('Freelance');

    // 'Freelance' is not an expense category, so switching type should clear it.
    host.querySelector<HTMLInputElement>('input[type="radio"][value="expense"]')!.click();
    fixture.detectChanges();

    expect(host.querySelector<HTMLSelectElement>('#category')?.value).toBe('');
  });

  it('only marks the touched field invalid, not every empty field', () => {
    const fixture = createComponent();
    const host = fixture.nativeElement as HTMLElement;

    const description = host.querySelector<HTMLInputElement>('#description')!;
    description.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    // The blurred description is empty, so it shows its error...
    expect(host.querySelector('#description-error')).not.toBeNull();
    // ...but the other untouched empty fields must not be flagged.
    expect(host.querySelector('#amount-error')).toBeNull();
    expect(host.querySelector('#category-error')).toBeNull();
  });

  it('reveals every field error after a submit attempt', () => {
    const fixture = createComponent();
    const host = fixture.nativeElement as HTMLElement;

    host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(host.querySelector('#description-error')).not.toBeNull();
    expect(host.querySelector('#amount-error')).not.toBeNull();
    expect(host.querySelector('#category-error')).not.toBeNull();
  });

  it('shows an inline error instead of an alert when saving fails', () => {
    const fixture = createComponent();
    const host = fixture.nativeElement as HTMLElement;
    const service = TestBed.inject(TransactionService);
    const addSpy = vi.spyOn(service, 'addTransaction').mockReturnValue(null);

    fillInput(host, '#description', 'Coffee');
    fillInput(host, '#amount', '5');
    const dateInput = host.querySelector<HTMLInputElement>('#date')!;
    const dateChange = new Event('change.bs.datepicker', { bubbles: true });
    Object.assign(dateChange, { dates: ['2026-04-01'] });
    dateInput.dispatchEvent(dateChange);
    const category = host.querySelector<HTMLSelectElement>('#category')!;
    category.value = 'Food';
    category.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();

    expect(addSpy).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-04-01' }));
    expect(host.querySelector('.save-error')?.textContent).toContain('Could not save');
  });
});
