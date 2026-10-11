import { Component, DestroyRef, ElementRef, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, NonNullableFormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TransactionService } from '../../../core/services/transaction.service';
import { Category, Transaction, TransactionType, getCategoriesForType, getTodayLocalISODate } from '../../../models/transaction.model';
import { noWhitespaceValidator, validDateValidator } from '../../../shared/validators/transaction.validators';
import { DatePickerComponent } from '../../../shared/components/date-picker/date-picker.component';

type TransactionForm = FormGroup<{
  description: FormControl<string>;
  amount: FormControl<number | null>;
  type: FormControl<TransactionType>;
  category: FormControl<Category | ''>;
  date: FormControl<string>;
}>;

@Component({
  selector: 'app-transaction-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DatePickerComponent],
  template: `
    <div class="transaction-form-page">
      <header class="page-header">
        <div class="page-header__content">
          <h1 class="page-header__title">{{ isEditMode() ? 'Edit Transaction' : 'Add Transaction' }}</h1>
          <a routerLink="/transactions" class="btn btn--secondary">Cancel</a>
        </div>
      </header>

      <main class="page-main">
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="transaction-form" novalidate>
          <div class="form-grid">
            <div class="form-field">
              <label for="description" class="form-label">Description <span class="required" aria-hidden="true">*</span></label>
              <input
                type="text"
                id="description"
                class="form-input"
                formControlName="description"
                placeholder="Enter description"
                [class.form-input--invalid]="isFieldInvalid('description')"
                aria-describedby="description-error"
                aria-invalid="{{ isFieldInvalid('description') }}"
              />
              @if (isFieldInvalid('description')) {
                <div id="description-error" class="form-error" role="alert">
                  @if (form.get('description')?.errors?.['required']) {
                    <span>Description is required</span>
                  }
                  @else if (form.get('description')?.errors?.['whitespace']) {
                    <span>Description cannot be only whitespace</span>
                  }
                </div>
              }
            </div>

            <div class="form-field">
              <label for="amount" class="form-label">Amount <span class="required" aria-hidden="true">*</span></label>
              <input
                type="number"
                id="amount"
                class="form-input"
                formControlName="amount"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                [class.form-input--invalid]="isFieldInvalid('amount')"
                aria-describedby="amount-error"
                aria-invalid="{{ isFieldInvalid('amount') }}"
              />
              @if (isFieldInvalid('amount')) {
                <div id="amount-error" class="form-error" role="alert">
                  @if (form.get('amount')?.errors?.['required']) {
                    <span>Amount is required</span>
                  }
                  @else if (form.get('amount')?.errors?.['min']) {
                    <span>Amount must be greater than zero</span>
                  }
                  @else if (form.get('amount')?.errors?.['pattern']) {
                    <span>Amount must be a valid number</span>
                  }
                </div>
              }
            </div>

            <fieldset class="form-field form-fieldset">
              <legend class="form-label">Type <span class="required" aria-hidden="true">*</span></legend>
              <div class="radio-group">
                <label class="radio-option">
                  <input
                    type="radio"
                    value="income"
                    formControlName="type"
                    [class.form-input--invalid]="isFieldInvalid('type')"
                  />
                  <span class="radio-option__content">
                    <span class="radio-option__icon" aria-hidden="true">💰</span>
                    <span>Income</span>
                  </span>
                </label>
                <label class="radio-option">
                  <input
                    type="radio"
                    value="expense"
                    formControlName="type"
                  />
                  <span class="radio-option__content">
                    <span class="radio-option__icon" aria-hidden="true">💸</span>
                    <span>Expense</span>
                  </span>
                </label>
              </div>
              @if (isFieldInvalid('type')) {
                <div class="form-error" role="alert">
                  <span>Please select a transaction type</span>
                </div>
              }
            </fieldset>

            <div class="form-field">
              <label for="category" class="form-label">Category <span class="required" aria-hidden="true">*</span></label>
              <select
                id="category"
                class="form-select"
                formControlName="category"
                [class.form-input--invalid]="isFieldInvalid('category')"
                aria-describedby="category-error"
                aria-invalid="{{ isFieldInvalid('category') }}"
              >
                <option value="">Select category</option>
                @for (cat of availableCategories(); track cat) {
                  <option [value]="cat">{{ cat }}</option>
                }
              </select>
              @if (isFieldInvalid('category')) {
                <div id="category-error" class="form-error" role="alert">
                  <span>Please select a category</span>
                </div>
              }
            </div>

            <div class="form-field">
              <label for="date" class="form-label">Date <span class="required" aria-hidden="true">*</span></label>
              <app-date-picker
                inputId="date"
                formControlName="date"
                [invalid]="isFieldInvalid('date')"
                describedBy="date-error"
              ></app-date-picker>
              @if (isFieldInvalid('date')) {
                <div id="date-error" class="form-error" role="alert">
                  @if (form.get('date')?.errors?.['required']) {
                    <span>Date is required</span>
                  }
                  @else if (form.get('date')?.errors?.['invalidDate']) {
                    <span>Please enter a valid calendar date</span>
                  }
                  @else {
                    <span>Please enter a valid date</span>
                  }
                </div>
              }
            </div>
          </div>

          @if (saveError()) {
            <div class="save-error" role="alert">
              <span aria-hidden="true">⚠️</span>
              <span>{{ saveError() }}</span>
            </div>
          }

          <div class="form-actions">
            <a routerLink="/transactions" class="btn btn--secondary">Cancel</a>
            <button
              type="submit"
              class="btn btn--primary"
              [disabled]="isSubmitting()"
            >
              @if (isSubmitting()) {
                <span class="btn__spinner" aria-hidden="true"></span>
                Saving...
              } @else {
                {{ isEditMode() ? 'Update' : 'Save' }} Transaction
              }
            </button>
          </div>
        </form>
      </main>
    </div>
  `,
  styles: [`
    .transaction-form-page {
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
      max-width: 700px;
      margin: 0 auto;
    }

    .transaction-form {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 2rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    /* Reset the default fieldset chrome; the legend already provides the label. */
    .form-fieldset {
      border: none;
      padding: 0;
      margin: 0;
      min-width: 0;
    }

    .form-fieldset legend {
      padding: 0;
      display: inline-block;
    }

    .form-field:nth-child(3),
    .form-field:nth-child(4),
    .form-field:nth-child(5) {
      grid-column: span 2;
    }

    .form-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-text-primary);
    }

    .required {
      color: var(--color-error);
    }

    .form-input,
    .form-select {
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

    /* Replace the native select arrow (which renders flush against the right
       border) with a controlled, inset chevron. */
    .form-select {
      appearance: none;
      -webkit-appearance: none;
      cursor: pointer;
      padding-right: 2.5rem;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.875rem center;
      background-size: 1rem;
    }

    .form-input--invalid,
    .form-select--invalid {
      border-color: var(--color-error);
    }

    .form-input--invalid:focus,
    .form-select--invalid:focus {
      box-shadow: 0 0 0 3px var(--color-error-light);
    }

    .form-error {
      font-size: 0.8125rem;
      color: var(--color-error);
    }

    .save-error {
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

    .radio-group {
      display: flex;
      gap: 2rem;
    }

    .radio-option {
      display: flex;
      align-items: center;
      cursor: pointer;
    }

    .radio-option input[type="radio"] {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .radio-option__content {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border: 2px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: 1rem;
      font-weight: 500;
      color: var(--color-text-primary);
      background: var(--color-background);
      transition: all var(--transition-fast);
    }

    .radio-option:hover .radio-option__content {
      border-color: var(--color-primary);
    }

    .radio-option input[type="radio"]:checked + .radio-option__content {
      border-color: var(--color-primary);
      background: var(--color-primary-light);
      color: var(--color-primary);
    }

    .radio-option input[type="radio"]:focus-visible + .radio-option__content {
      outline: none;
      box-shadow: 0 0 0 3px var(--color-primary-light);
    }

    .form-field:has(.radio-option input[type="radio"].form-input--invalid) .radio-option__content {
      border-color: var(--color-error);
    }

    .form-field:has(.radio-option input[type="radio"].form-input--invalid) .radio-option input[type="radio"]:focus-visible + .radio-option__content {
      box-shadow: 0 0 0 3px var(--color-error-light);
    }

    .radio-option__icon {
      font-size: 1.125rem;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--color-border);
    }

    .btn__spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
      margin-right: 0.5rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
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

      .transaction-form {
        padding: 1.5rem;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .form-field:nth-child(3),
      .form-field:nth-child(4),
      .form-field:nth-child(5) {
        grid-column: span 1;
      }

      .radio-group {
        flex-direction: column;
        gap: 0.75rem;
      }
    }
  `]
})
export class TransactionFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transactionService = inject(TransactionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected isSubmitting = signal(false);
  protected saveError = signal('');
  protected transactionId = signal<string | null>(null);
  protected isEditMode = computed(() => this.transactionId() !== null);
  protected selectedType = signal<TransactionType>('expense');

  protected availableCategories = computed(() => getCategoriesForType(this.selectedType()));

  protected readonly form: TransactionForm = this.fb.group({
    description: this.fb.control('', [Validators.required, noWhitespaceValidator]),
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01), Validators.pattern(/^\d+(\.\d{1,2})?$/)]),
    type: this.fb.control<TransactionType>('expense', Validators.required),
    category: this.fb.control<Category | ''>('', Validators.required),
    date: this.fb.control('', [Validators.required, validDateValidator])
  });

  constructor() {
    // `type` is a plain form control, so its value is not a signal. Subscribe
    // to valueChanges to keep the category list in sync with the selection and
    // to clear a category that is not valid for the newly selected type.
    this.form.controls.type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type: TransactionType) => {
        this.selectedType.set(type);

        const currentCategory = this.form.controls.category.value;
        if (currentCategory && !getCategoriesForType(type).includes(currentCategory)) {
          this.form.controls.category.setValue('');
        }
      });
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = params.get('id');
        if (id) {
          this.transactionId.set(id);
          this.loadTransaction(id);
        } else {
          this.setDefaultDate();
        }
      });
  }

  private loadTransaction(id: string): void {
    const transaction = this.transactionService.getTransactionById(id);
    if (!transaction) {
      this.router.navigate(['/transactions']);
      return;
    }

    this.form.patchValue({
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      date: transaction.date
    });

    this.selectedType.set(transaction.type);
  }

  private setDefaultDate(): void {
    if (!this.form.get('date')?.value) {
      this.form.patchValue({ date: getTodayLocalISODate() });
    }
  }

  protected isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    // Only react to this control's own state. Checking `this.form.touched`
    // here would turn every invalid field red as soon as a single field is
    // touched, because touching a child marks the parent group touched too.
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  /**
   * Moves focus to the first control that failed validation. Runs on the next
   * tick so Angular has applied the invalid styling before we look for it.
   */
  private focusFirstInvalidField(): void {
    setTimeout(() => {
      const invalidControl = this.host.nativeElement.querySelector<HTMLElement>(
        '.form-input--invalid, [aria-invalid="true"]'
      );
      invalidControl?.focus();
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalidField();
      return;
    }

    const formValue = this.form.getRawValue();
    const { amount, category } = formValue;
    if (amount === null || category === '') {
      // Both are guarded by the validators above; this narrows the types without casts.
      return;
    }

    this.saveError.set('');
    this.isSubmitting.set(true);

    const transactionData: Omit<Transaction, 'id'> = {
      description: formValue.description.trim(),
      amount,
      type: formValue.type,
      category,
      date: formValue.date
    };

    try {
      if (this.isEditMode()) {
        const id = this.transactionId()!;
        const success = this.transactionService.updateTransaction({ ...transactionData, id });
        if (!success) {
          this.saveError.set('Could not save the transaction. It may no longer exist, or browser storage is unavailable.');
          return;
        }
      } else {
        const created = this.transactionService.addTransaction(transactionData);
        if (!created) {
          this.saveError.set('Could not save the transaction. Browser storage may be unavailable or full.');
          return;
        }
      }

      this.router.navigate(['/transactions']);
    } catch (error) {
      console.error('Failed to save transaction:', error);
      this.saveError.set('An error occurred while saving. Please try again.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}