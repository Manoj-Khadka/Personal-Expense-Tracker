import { AbstractControl, ValidationErrors } from '@angular/forms';
import { isValidDateString } from '../../models/transaction.model';

/**
 * Rejects values that consist only of whitespace.
 * `Validators.required` treats `'   '` as valid, so this validator closes that gap.
 * Empty values are ignored here and left to `Validators.required`.
 */
export function noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (typeof value !== 'string') {
    return null;
  }
  return value.trim().length === 0 ? { whitespace: true } : null;
}

/**
 * Requires a real calendar date in `YYYY-MM-DD` form.
 * Empty values are ignored here and left to `Validators.required`.
 */
export function validDateValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return isValidDateString(String(value)) ? null : { invalidDate: true };
}
