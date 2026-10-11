import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  forwardRef,
  input
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import Datepicker from 'bootstrap/js/dist/datepicker.js';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true
    }
  ],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.css'
})
export class DatePickerComponent implements ControlValueAccessor, AfterViewInit, OnDestroy {
  readonly inputId = input('date-picker');
  readonly invalid = input(false);
  readonly describedBy = input('');

  @ViewChild('input') private inputRef?: ElementRef<HTMLInputElement>;

  private pendingValue = '';
  private disabled = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    const input = this.inputRef?.nativeElement;
    if (!input) {
      return;
    }
    input.value = this.pendingValue;
    input.disabled = this.disabled;
  }

  writeValue(value: string | null): void {
    this.pendingValue = value ?? '';

    const input = this.inputRef?.nativeElement;
    if (!input) {
      return;
    }

    const instance = Datepicker.getInstance(input);
    if (instance) {
      instance.setSelectedDates(this.pendingValue ? [this.pendingValue] : []);
    } else {
      input.value = this.pendingValue;
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    const input = this.inputRef?.nativeElement;
    if (input) {
      input.disabled = isDisabled;
    }
  }

  handleDateChange(event: Event): void {
    const dates = (event as Event & { dates?: string[] }).dates ?? [];
    this.onChange(dates[0] ?? '');
  }

  handleBlur(): void {
    this.onTouched();
  }

  ngOnDestroy(): void {
    const input = this.inputRef?.nativeElement;
    if (input) {
      Datepicker.getInstance(input)?.dispose();
    }
  }
}
