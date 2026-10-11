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
  templateUrl: './transaction-form.component.html',
  styleUrl: './transaction-form.component.css'
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