# Personal Expense Tracker

A single-page Personal Expense Tracker built with Angular, TypeScript, Reactive Forms, and Angular Signals. Data is stored in the browser's `localStorage`, so it survives refreshes without a backend.

## Features

- **Dashboard** — total income, total expenses, balance, and transaction count.
- **Transactions** — add, edit, and delete income/expense entries.
- **Search & filter** — search descriptions (partial, case-insensitive) and filter by type and category, combined.
- **Reactive form** — validation with inline messages for every field.
- **Persistence** — everything is saved to `localStorage` under the key `expense-tracker-transactions-v1`.
- **Responsive** — the transaction table collapses into cards on small screens, keeping every action reachable.
- **Empty states** — distinct messages for "no transactions" and "no matches".

## Tech

- Angular 22.2 (standalone components, signals, new control flow)
- TypeScript (strict)
- Reactive Forms (`NonNullableFormBuilder`, typed form)
- Angular Router
- Browser `localStorage`

Built and tested with Node 24.21 and npm 11.19.

## Getting started

```bash
npm install
npm start          # dev server on http://localhost:4200
```

```bash
npm run build      # production build into dist/
npm test           # unit tests (Vitest)
```

## How it fits together

`TransactionService` (`src/app/core/services/transaction.service.ts`) is the single source of truth. It exposes the transaction list and summary values as signals, and every component reads from it. It loads `localStorage` synchronously in its constructor; on every add, update, or delete it writes to storage first and only updates the in-memory signal if the write succeeds, so the UI never shows data that was not actually saved.

The add/edit form is fully typed via `NonNullableFormBuilder`. The category list follows the selected type through a `valueChanges` subscription, and an invalid category is cleared when the type changes.

## Key decisions

- **Signals as the source of truth.** One service owns the data; the dashboard, list and form all derive from the same signals, so totals and counts can never drift from the list.
- **Validate on load.** Stored records are checked field by field (`isValidTransaction`) before use, including that each category belongs to its transaction type (so a corrupt record cannot pair `type: 'expense'` with `category: 'Salary'`). Corrupt JSON or invalid records are dropped and the log is reset. Before resetting, the raw stored value is copied to `expense-tracker-transactions-v1-backup`, so a bad payload stays recoverable instead of being lost.
- **Local dates, not UTC.** The default date uses local date parts, so it never shifts a day near midnight.
- **NPR currency.** Amounts are formatted with `Intl.NumberFormat('en-NP', { currency: 'NPR' })`.
- **Typed categories.** The category lists are `as const` tuples, and `Category` is derived from them, so a typo in a category is a compile error.
- **Filters are component state.** Navigating away and back resets the search and filters. That matches the "start fresh" behaviour most users expect; persisting them would mean moving that state into the service or query params.

## What I would improve with more time

- Move filters into query params so a filtered view is shareable and survives back/forward.
- Add an undo for delete instead of relying on `confirm()`.
- Include an end-to-end test that drives the real flows in a browser.
- Add budgeting or month-over-month breakdowns.

## Routes

| Route | Purpose |
|-------|---------|
| `/` | redirects to `/dashboard` |
| `/dashboard` | financial summary and recent transactions |
| `/transactions` | list with search and filters |
| `/transactions/new` | create a transaction |
| `/transactions/:id/edit` | edit a transaction |

## Project structure

```
src/app/
├── core/services/transaction.service.ts   # state, persistence, summary signals
├── models/transaction.model.ts            # types, categories, validation, formatting
├── shared/
│   ├── components/empty-state/            # reusable empty state
│   ├── components/nav-bar/                # top navigation shown on every page
│   └── validators/transaction.validators.ts
├── features/
│   ├── dashboard/dashboard.component.ts
│   └── transactions/
│       ├── transaction-list/transaction-list.component.ts
│       └── transaction-form/transaction-form.component.ts
├── app.routes.ts
└── app.config.ts
```

## Transaction shape

```ts
interface Transaction {
  id: string;                    // crypto.randomUUID()
  description: string;           // required, not whitespace-only
  amount: number;                // required, > 0
  type: 'income' | 'expense';
  category: string;              // from the predefined lists
  date: string;                  // YYYY-MM-DD
}
```

Income categories: Salary, Freelance, Business, Investment, Other.
Expense categories: Food, Transport, Shopping, Bills, Health, Entertainment, Education, Other.

Stored data is validated on load; malformed JSON or invalid records are discarded rather than crashing the app, and the raw value is backed up under `expense-tracker-transactions-v1-backup` first.

## Manual test checklist

- Add income and expense transactions; both appear on the dashboard.
- Edit a transaction, then refresh on the edit URL — the form still loads the record.
- Delete a transaction and confirm the prompt; totals update.
- Submit the form empty to see validation messages.
- Search by a partial, mixed-case description.
- Combine type + category filters, then clear them.
- Switch type in the form and confirm the category options change.
- Resize to 375px and confirm you can still edit and delete.
- Corrupt the `localStorage` JSON by hand and reload — the app starts empty instead of crashing, and the bad value is copied to the `...-backup` key.

## Limitations

- No backend; data lives only in the current browser profile.
- Clearing browser storage removes all data.
- Single user, no authentication.
