import { AbstractControl, ValidationErrors } from '@angular/forms';
import { isValidDateString } from '../../models/transaction.model';


export function noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (typeof value !== 'string') {
    return null;
  }
  return value.trim().length === 0 ? { whitespace: true } : null;
}


export function validDateValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return isValidDateString(String(value)) ? null : { invalidDate: true };
}
