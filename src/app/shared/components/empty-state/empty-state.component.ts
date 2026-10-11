import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.css'
})
export class EmptyStateComponent {
  icon = input<'transactions' | 'search' | 'dashboard' | 'form'>('transactions');
  title = input.required<string>();
  message = input.required<string>();
  actionLabel = input<string>('');
  actionRoute = input<string>('');
  actionClick = input<(() => void) | undefined>(undefined);
}