# MoneyMap

A standalone, web-native rebuild of the Finance module from [Pulse](../pulse-app) —
same domain logic (budgets, splits, recurring bills, financial-year income
totals, investment gain/loss), an entirely new UI built for the browser
instead of a ported mobile screen.

**Stack:** React + TypeScript + Vite, Tailwind CSS v4, Framer Motion, Recharts,
Zustand, lucide-react icons.

**Data:** client-side only for now — everything lives in the browser's
`localStorage` (keys prefixed `moneymap.finance.*`), matching Pulse's current
"offline-first, no backend yet" model. The persistence layer
(`src/lib/storage.ts`, `src/store/useFinanceStore.ts`) is deliberately the one
place that knows about localStorage, so swapping it for calls to a real API
later (once there's a backend on the Pi) shouldn't touch anything else.

## Structure

- `src/lib/` — domain types and pure logic, ported 1:1 from
  `pulse-app/lib/features/finance/**/*.dart` (budget periods, subscription
  due-date projection, financial-year math, currency formatting).
- `src/store/useFinanceStore.ts` — single Zustand store: all seven
  collections (transactions, categories, payment methods, savings goals,
  investments, subscriptions, income) plus CRUD actions and localStorage
  persistence.
- `src/components/` — shared UI: layout shell/sidebar, form drawer, fields,
  the amber "trail" progress bar, toasts.
- `src/features/<name>/` — one folder per section (overview, transactions,
  budgets, savings, investments, subscriptions, income), each with its own
  page, cards, and forms.

## Running it

```bash
npm install
npm run dev      # dev server with HMR
npm run build    # type-checks, then production build to dist/
```

## Design

Dark "chart room" palette (deep navy ink, one warm parchment panel for the
hero figure, amber/emerald/coral accents for spend/growth/alerts) with a
light wayfinding motif — a marker travels along budget and savings progress
bars — since this is, literally, a map of where your money goes. See
`src/index.css` for the token system.
