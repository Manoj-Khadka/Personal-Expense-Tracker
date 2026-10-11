# Expense Tracker — Technical Reference

An in-depth walkthrough of the codebase: what every file does, how the pieces fit
together, why the key decisions were made, and where the sharp edges are.

> This document is a developer reference. It is intentionally excluded from
> `Archive.zip` and is not part of the submission.

---

## 1. Overview

A single-page Personal Expense Tracker. Users add income and expense entries, see
a financial summary on a dashboard, and search/filter a transaction list. There
is no backend: state lives in Angular signals and is persisted to the browser's
`localStorage`.

Core requirements the code satisfies:

- Angular (standalone components), TypeScript in strict mode, minimal `any`.
- Feature-based folder structure.
- One `TransactionService` as the single source of truth.
- NPR currency formatting.
- Versioned storage key `expense-tracker-transactions-v1`.
- Full CRUD, description search (partial, case-insensitive), combined
  type + category filters.
- Dashboard summary: income, expenses, balance, count.
- Add/edit reactive form with validation, empty states, delete confirmation,
  responsive layout.

---

## 2. Stack and versions

| Item | Version |
|------|---------|
| Angular | 22.2.2 |
| TypeScript | ~6.0.2 |
| Node (build/test) | 24.21.0 |
| npm | 11.19.0 |
| Test runner | Vitest 5 (via `@angular/build:unit-test`, jsdom) |

Build tooling is the modern `@angular/build:application` builder. There is **no
SSR** and no server entry point (see section 15).

Type checking is fully strict. `tsconfig.json` enables `"strict": true` in
`compilerOptions` (which turns on `strictNullChecks`, `noImplicitAny`,
`strictFunctionTypes`, etc.) and `"strictTemplates": true` in
`angularCompilerOptions`, so template bindings are type-checked too. Both the
app and the test files pass `tsc --noEmit` under these settings.

Useful scripts:

```bash
npm start          # dev server on http://localhost:4200
npm run build      # production build into dist/
npm test           # unit tests
```

---

## 3. Architecture at a glance

```text
                        ┌──────────────────────────────┐
                        │      TransactionService       │
                        │  (providedIn: 'root')         │
                        │                               │
   localStorage  ◄────► │  _transactions: signal        │
   key:                 │  transactions (readonly)      │
   expense-tracker-     │  totalIncome  ┐               │
   transactions-v1      │  totalExpenses ├─ computed    │
                        │  balance       │              │
                        │  transactionCount ┘           │
                        └───────────────┬───────────────┘
                                        │ inject()
              ┌─────────────────────────┼─────────────────────────┐
              ▼                         ▼                         ▼
      DashboardComponent      TransactionListComponent   TransactionFormComponent
        (read-only)             (read + delete)            (read + create/update)
```

Rules that keep this coherent:

- Components never touch `localStorage`; only the service does.
- Mutations write to storage first, and only update the signal if the write
  succeeded. The UI can therefore never display data that was not saved.
- Derived values (`totalIncome`, `balance`, `filteredTransactions`, `recentTransactions`)
  are `computed` signals, so they recompute automatically when the base signal changes.
- Navigation triggers no page reloads; the router swaps components and the shared
  signal keeps everything in sync.

---

## 4. Project structure

```
src/
├── index.html                              # host page, <app-root>
├── main.ts                                 # bootstrapApplication(App, appConfig)
├── styles.css                              # design tokens + global element styles
└── app/
    ├── app.ts                              # root component (nav + router outlet)
    ├── app.html                            # <app-nav-bar /> + <router-outlet />
    ├── app.css                             # (empty; styles live in tokens/components)
    ├── app.config.ts                       # application providers
    ├── app.routes.ts                       # route table (lazy loaded)
    ├── app.spec.ts                         # root component tests
    ├── core/
    │   └── services/
    │       ├── transaction.service.ts      # single source of truth
    │       └── transaction.service.spec.ts
    ├── models/
    │   ├── transaction.model.ts            # types, categories, validation, formatting
    │   └── transaction.model.spec.ts
    ├── shared/
    │   ├── components/
    │   │   ├── nav-bar/nav-bar.component.ts      # top navigation
    │   │   └── empty-state/empty-state.component.ts
    │   └── validators/
    │       └── transaction.validators.ts   # reusable form validators
    └── features/
        ├── dashboard/dashboard.component.ts
        └── transactions/
            ├── transaction-list/transaction-list.component.ts
            │   └── transaction-list.component.spec.ts
            └── transaction-form/transaction-form.component.ts
                └── transaction-form.component.spec.ts
```

Components use **inline templates and styles** rather than separate `.html`/`.css`
files. This is a stylistic choice; it keeps each component's template, styles, and
logic together and avoids a second file per component.

---

## 5. Data model — `src/app/models/transaction.model.ts`

### 5.1 Types

```ts
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: Category;   // narrow union, not string
  date: string;         // YYYY-MM-DD
}
```

### 5.2 Categories

The category lists are `as const` tuples. Every category is derived from them, so
a typo becomes a compile error instead of a silent `string`.

```ts
export const INCOME_CATEGORIES = ['Salary','Freelance','Business','Investment','Other'] as const;
export const EXPENSE_CATEGORIES = ['Food','Transport','Shopping','Bills','Health','Entertainment','Education','Other'] as const;
export const ALL_CATEGORIES = [ ...unique union... ] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type Category = IncomeCategory | ExpenseCategory;
```

Note: the earlier bug where `ALL_CATEGORIES` contained a duplicate `'Other'`
(triggering Angular's `NG0955` duplicate-key error in `@for` tracks) is fixed; the
list is now de-duplicated.

Helpers:

```ts
getCategoriesForType(type): readonly Category[]   // income or expense list
isCategory(value: unknown): value is Category      // runtime narrowing guard
```

`getCategoriesForType` returns the **narrow** `Category` type (not `string`), which
is what makes the form's category control meaningful. `Transaction.category` is
`Category`, and `isCategory` accepts `unknown` so it doubles as the storage
validation check.

### 5.3 Utilities

| Function | Purpose |
|----------|---------|
| `generateId()` | `crypto.randomUUID()` with a `Date.now()`-based fallback. |
| `formatCurrency(amount, currency = 'NPR')` | `Intl.NumberFormat('en-NP', { style: 'currency', currency })`, 2 decimals. |
| `formatDate(dateString)` | Parses `YYYY-MM-DD` as a **local** date (`new Date(s + 'T00:00:00')`) and formats `en-GB` (`15 Jan 2026`). |
| `getTodayLocalISODate()` | Today's date from local parts, **not** `toISOString()` (which is UTC and shifts a day near midnight in Kathmandu). |
| `isValidDateString(value)` | Strict `YYYY-MM-DD` check that rejects impossible dates. |
| `isValidTransaction(obj)` | Type guard used when loading storage. |

### 5.4 Strict date validation

`isValidDateString` first checks the shape with a regex, then range-checks the
parts, then rebuilds the date with `Date.UTC` and confirms the parts round-trip.
Because `new Date(Date.UTC(2026, 1, 30))` silently normalizes to March 2, comparing
the resulting year/month/day back is what catches `2026-02-30`, `2025-02-29`, etc.

```ts
if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
// ...parse year/month/day, reject month<1|>12, day<1|>31...
const date = new Date(Date.UTC(year, month - 1, day));
return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
```

### 5.5 Storage validation

`isValidTransaction` checks types, the `type` enum, non-empty `description`,
`amount > 0`, a valid calendar date, and that `category` is a real `Category` (via
`isCategory`). Anything failing is dropped on load (see section 6.2).

---

## 6. State and persistence — `transaction.service.ts`

`@Injectable({ providedIn: 'root' })`. Instantiated once, before any component's
`ngOnInit` runs, because each feature injects it in a field initializer.

### 6.1 Signals

```ts
private readonly _transactions = signal<Transaction[]>([]);
readonly transactions = this._transactions.asReadonly();

readonly totalIncome      = computed(() => ... filter income  ... reduce sum);
readonly totalExpenses    = computed(() => ... filter expense ... reduce sum);
readonly balance          = computed(() => this.totalIncome() - this.totalExpenses());
readonly transactionCount = computed(() => this._transactions().length);
```

`transactions` is exposed read-only so components cannot mutate state directly.

### 6.2 Loading (synchronous)

```ts
constructor() { this.loadFromStorage(); }
```

`loadFromStorage()`:

1. Reads the key. Missing → empty list.
2. Parses JSON. Parse error → logged, empty list.
3. Non-array → logged, empty list.
4. Filters through `isValidTransaction`, warning if any records were dropped.
5. Sets the signal.

Because this happens in the constructor, a hard refresh on `/transactions/:id/edit`
finds the record immediately. (Under the old SSR + `afterNextRender` design, the
read was deferred until after the first render, so `ngOnInit` saw an empty list and
redirected away — that is the bug this design removes.)

### 6.3 Writing

```ts
private saveToStorage(next: Transaction[]): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(next)); return true; }
  catch (e) { console.error(...); return false; }
}
```

Every mutation follows the same pattern: build the next array, attempt the write,
and **only** `_transactions.set(next)` on success.

### 6.4 Public API

| Method | Returns | Notes |
|--------|---------|-------|
| `addTransaction(tx: Omit<Transaction,'id'>)` | `Transaction \| null` | Generates the id; `null` means the write failed. |
| `updateTransaction(tx: Transaction)` | `boolean` | Preserves the id; `false` if missing or write failed. |
| `deleteTransaction(id: string)` | `boolean` | `false` if missing or write failed. |
| `getTransactionById(id)` | `Transaction \| undefined` | |
| `getTransactionsByType(type)` | `Transaction[]` | |
| `getFormattedTotalIncome/Expenses/Balance()` | `string` | Pre-formatted for convenience. |

The `null`/`false` return values are what let the form tell the user "could not
save" instead of silently navigating away as if it worked.

---

## 7. Validators — `shared/validators/transaction.validators.ts`

Both validators deliberately ignore empty values and leave that to
`Validators.required`, so a field shows the "required" message when empty and the
specific message when filled incorrectly.

| Validator | Rejects | Error key |
|-----------|---------|-----------|
| `noWhitespaceValidator` | strings that trim to empty (`'   '`) | `whitespace` |
| `validDateValidator` | anything `isValidDateString` rejects | `invalidDate` |

`noWhitespaceValidator` exists because Angular's `required` treats `'   '` as
present.

---

## 8. Shared components

### 8.1 `NavBarComponent`

Sticky top bar with a brand link and Dashboard / Transactions links.
`RouterLinkActive` highlights the current route; the Dashboard link uses
`[routerLinkActiveOptions]="{ exact: true }"` so it is not highlighted while on a
child route. It is rendered once, from the root component (section 12), so every
page has a way back without the browser button.

### 8.2 `EmptyStateComponent`

Reusable empty state driven by signal `input()`s:

```ts
icon        = input<'transactions'|'search'|'dashboard'|'form'>('transactions');
title       = input.required<string>();
message     = input.required<string>();
actionLabel = input<string>('');
actionRoute = input<string>('');
actionClick = input<(() => void) | undefined>(undefined);
```

If both `actionLabel` and `actionRoute` are set it renders a router link; if
`actionLabel` and `actionClick` are set it renders a button. The icon is selected
purely in CSS via `[data-icon]`.

---

## 9. Dashboard — `features/dashboard/dashboard.component.ts`

Read-only view over the service.

```ts
formattedTotalIncome   = computed(() => formatCurrency(service.totalIncome()));
formattedTotalExpenses = computed(() => formatCurrency(service.totalExpenses()));
formattedBalance       = computed(() => formatCurrency(service.balance()));
balance                = computed(() => service.balance());   // for the negative style

recentTransactions = computed(() =>
  [...service.transactions()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
);
```

- Four summary cards: Total Income, Total Expenses, Balance (styled negative when
  `< 0`), and Transaction Count.
- "Recent Transactions" table shows the five most recent by date, or the empty
  state with an "Add Transaction" link.
- The count card reads `transactionCount()`, i.e. the **total**, never a filtered
  number.

---

## 10. Transaction list — `features/transactions/transaction-list/transaction-list.component.ts`

### 10.1 Filter state and derived data

```ts
searchTerm       = signal('');
selectedType     = signal<'all' | TransactionType>('all');
selectedCategory = signal<'all' | Category>('all');

availableCategories = computed(() => type === 'all' ? ALL_CATEGORIES : getCategoriesForType(type));

filteredTransactions = computed(() => {
  const filtered = transactions.filter(t =>
    (!search || t.description.toLowerCase().includes(search)) &&
    (type === 'all' || t.type === type) &&
    (category === 'all' || t.category === category)
  );
  // Newest first; id only breaks ties so equal dates stay deterministic.
  return filtered.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
});

hasActiveFilters = computed(() => /* any filter set */);
```

The three filters are ANDed, so they combine. `filter()` returns a fresh array, so
sorting it in place cannot affect the service's list. The ordering matches the
dashboard's "newest first" convention.

### 10.2 Bindings

The controls use one-way binding plus an explicit handler — **not**
`[(ngModel)]="signal"`:

```html
<input [ngModel]="searchTerm()" (ngModelChange)="onSearchChange($event)">
<select [ngModel]="selectedType()" (ngModelChange)="onTypeChange($event)">
<select [ngModel]="selectedCategory()" (ngModelChange)="onCategoryChange($event)">
```

This matters: `[(ngModel)]="someSignal"` binds to the signal *object*, not its
value, which silently breaks filtering. The explicit form is the correct pattern.

`onTypeChange` also resets the category filter if it is not valid for the new type.

### 10.3 CRUD and display

- Add: a router link to `/transactions/new`.
- Edit: a router link to `/transactions/:id/edit`.
- Delete: `confirmDelete()` shows a `confirm()` dialog, then calls
  `deleteTransaction()`. If the service returns `false`, a dismissible inline
  banner (`deleteError` signal) explains that nothing was removed, instead of
  failing silently.
- Amounts render with a `+`/`-` prefix via `formatAmount`.
- Empty states: "no transactions" vs. "no matches" depending on whether filters
  are active.

### 10.4 Responsive table

At ≤768px the table becomes stacked cards. Each `<td>` carries a `data-label`
attribute, and CSS renders it via `::before { content: attr(data-label) }`. The
Actions cell stays visible and tappable. The old approach (hiding columns with
`nth-child` `display: none`) hid the Actions column and is gone.

---

## 11. Transaction form — `features/transactions/transaction-form/transaction-form.component.ts`

### 11.1 Typed form

```ts
type TransactionForm = FormGroup<{
  description: FormControl<string>;
  amount: FormControl<number | null>;
  type: FormControl<TransactionType>;
  category: FormControl<Category | ''>;
  date: FormControl<string>;
}>;

protected readonly form: TransactionForm = this.fb.group({
  description: this.fb.control('', [Validators.required, noWhitespaceValidator]),
  amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01), Validators.pattern(/^\d+(\.\d{1,2})?$/)]),
  type: this.fb.control<TransactionType>('expense', Validators.required),
  category: this.fb.control<Category | ''>('', Validators.required),
  date: this.fb.control('', [Validators.required, validDateValidator]),
});
```

`NonNullableFormBuilder` gives a typed `getRawValue()`. `amount` is explicitly
`number | null` because it starts empty; `category` allows `''` for "no selection".

### 11.2 Category list follows the type

`type` is a plain `FormControl`, not a signal, so an `effect()` would never react
to it. Instead the component subscribes:

```ts
this.form.controls.type.valueChanges
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe((type) => {
    this.selectedType.set(type);
    const current = this.form.controls.category.value;
    if (current && !getCategoriesForType(type).includes(current)) {
      this.form.controls.category.setValue('');
    }
  });
```

`selectedType` is a signal, and `availableCategories` is a `computed` from it, so
the `<select>` options update automatically. When the type changes, a category that
no longer belongs is cleared.

### 11.3 Reading the route

```ts
ngOnInit() {
  this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
    const id = params.get('id');
    if (id) { this.transactionId.set(id); this.loadTransaction(id); }
    else { this.setDefaultDate(); }
  });
}
```

`loadTransaction` looks the record up in the service, redirects to `/transactions`
if it is gone, and otherwise patches the form (using `isCategory()` to narrow the
stored category). The synchronous service load is what makes this work on refresh.

### 11.4 Submit

```ts
onSubmit() {
  if (this.form.invalid) { this.form.markAllAsTouched(); this.focusFirstInvalidField(); return; }

  const value = this.form.getRawValue();
  if (value.amount === null) return;   // narrows the type; required already guards this

  this.isSubmitting.set(true);
  try {
    if (this.isEditMode()) { /* updateTransaction → alert on false */ }
    else                   { /* addTransaction    → alert on null  */ }
    this.router.navigate(['/transactions']);
  } finally { this.isSubmitting.set(false); }
}
```

- The Save button is disabled **only** while submitting — never while invalid.
  That is deliberate: disabling it would prevent `markAllAsTouched()` from running
  and the user would never see the validation messages.
- Failed writes set the `saveError` signal, which renders as an inline banner
  above the Cancel/Save buttons (`role="alert"`) instead of an `alert()`. It is
  cleared at the start of the next submit attempt.

### 11.5 Accessibility

The Type radios are wrapped in a `<fieldset>` with a `<legend>` (the previous
`<label for="type">` pointed at a non-existent id). Each field has an inline error
with `role="alert"`. `focusFirstInvalidField()` moves focus to the first control
with `.form-input--invalid` after errors render.

---

## 12. Routing and bootstrap

### `app.routes.ts`

| Route | Component | Notes |
|-------|-----------|-------|
| `''` | — | redirect to `dashboard`, `pathMatch: 'full'` |
| `dashboard` | `DashboardComponent` | lazy `loadComponent` |
| `transactions` | `TransactionListComponent` | lazy |
| `transactions/new` | `TransactionFormComponent` | must precede `:id/edit` |
| `transactions/:id/edit` | `TransactionFormComponent` | lazy |
| `**` | — | redirect to `dashboard` |

### `app.config.ts`

```ts
providers: [ provideBrowserGlobalErrorListeners(), provideRouter(routes) ]
```

### `app.ts` / `app.html`

```ts
@Component({ imports: [RouterOutlet, NavBarComponent], ... })
```

```html
<app-nav-bar />
<router-outlet />
```

Putting the nav in the root means it renders on every route; the feature pages no
longer each embed their own nav/header.

### `main.ts`

`bootstrapApplication(App, appConfig).catch(err => console.error(err))`.

---

## 13. Styling and design system — `styles.css`

Single global stylesheet plus per-component styles.

- CSS custom properties in `:root`: colour scales (primary/success/error/info/warning),
  surfaces, borders, text, radii, shadows, transitions, fonts, spacing.
- Global element resets and base typography.
- Button system: `.btn` with `.btn--primary`, `.btn--secondary`, `.btn--ghost`,
  `.btn--danger`, `.btn--sm`, `.btn--lg`, `.btn--icon`.
- Accessibility: `:focus-visible` outlines, `prefers-reduced-motion` handling, and a
  `prefers-contrast: high` override.
- Responsive base font size at ≤768px.

Components rely on the tokens (e.g. `var(--color-primary)`, `var(--radius-md)`), so
the palette and spacing can change in one place.

---

## 14. Tests

Run with `npm test` (Vitest + jsdom). **5 files, 34 tests.**

| File | Covers |
|------|--------|
| `app.spec.ts` | Root component creates and renders `<router-outlet>`. |
| `transaction.model.spec.ts` | `isValidDateString` (real, malformed, impossible dates incl. leap years); `isValidTransaction` (good record, bad date, non-positive amount, bad type/description, empty **or unknown** category, non-objects). |
| `transaction.service.spec.ts` | Creation, start-empty, add + persist + unique id, totals/balance, update preserves id, update/delete missing → `false`, delete removes from storage, find by type. Plus hydration: synchronous load on construction, corrupt JSON → empty, invalid records dropped. |
| `transaction-list.component.spec.ts` | Default render, **combined** search + type + category filter, category reset when type changes, dashboard **total** is independent of active filters, **newest-first** ordering, deterministic tie-break by id, and **delete-fails** path shows the inline error. |
| `transaction-form.component.spec.ts` | Edit route loads a pre-seeded record (simulated refresh), category options swap with type, edit mode keeps then clears the stored category on type change, and **save-fails** path shows the inline error instead of an alert. |

The last three service tests and the form/list component tests were added
specifically to pin the behaviours that previously regressed.

---

## 15. Why there is no SSR

The app is browser-only. `localStorage` does not exist on the server, and the brief
never asked for SSR.

The previous SSR setup caused a real bug: the storage read was deferred with
`afterNextRender()` (to avoid a hydration mismatch), so components initialized with
an empty list. A refresh on an edit URL redirected away, and the dashboard flashed
zeroes before the data appeared.

Removed: `src/server.ts`, `src/main.server.ts`, `src/app/app.config.server.ts`,
`src/app/app.routes.server.ts`, `provideClientHydration()`, the `ssr`/`server`
build options, and the `@angular/ssr`, `@angular/platform-server`, `express`, and
`@types/express` dependencies. The service now reads storage synchronously in its
constructor, and all `PLATFORM_ID` / `isPlatformBrowser` / `afterNextRender` guards
are gone.

---

## 16. Key decisions and trade-offs

| Decision | Why | Trade-off |
|----------|-----|-----------|
| Signals in one service as the source of truth | Dashboard, list, and form can't drift apart; no manual subscription bookkeeping | A single global store; fine at this scale |
| Write-then-set on mutations | UI never shows unsaved data | Slightly more code per mutation |
| Validate on load, reset on corruption | App keeps working instead of crashing | Destructive: a corrupt payload is discarded. A backup-first strategy would be safer |
| Local dates, not `toISOString()` | Avoids the Kathmandu midnight off-by-one | None meaningful |
| Typed, `as const` categories | Typos become compile errors; `Category` is a real union | Adding a category means editing the tuple |
| No SSR | Removes the empty-first-render bug and a lot of complexity | No server rendering / SEO (not needed here) |
| Filters are component state | Simple; matches "start fresh" expectations | Filters reset on navigation; query params would persist them |
| Table → cards on mobile | Every field and action stays reachable | Two visual modes to style/maintain |

---

## 17. Known limitations and future work

- No backend; data is per browser profile and lost if storage is cleared.
- Corrupt storage is reset rather than backed up.
- Delete uses `confirm()` rather than a custom dialog with undo.
- Filters are not reflected in the URL.
- No budget/month-over-month features.
- Tests are unit/component level (jsdom); no real-browser end-to-end suite.

---

## 18. Manual test checklist

1. Add income and expense transactions; both show on the dashboard.
2. Edit a transaction, then hard-refresh on the edit URL — the form stays populated.
3. Delete a transaction; confirm the prompt and check the totals update.
4. Submit the form empty — all validation messages appear at once.
5. Search by a partial, mixed-case description.
6. Combine type + category filters, then clear them.
7. Switch type in the form; the category options change and an invalid selection clears.
8. Resize to 375px; every field plus Edit and Delete are reachable.
9. Corrupt the `localStorage` JSON by hand and reload — the app starts empty, no crash.
10. Run `npm run build` and `npm test` and read the output.
