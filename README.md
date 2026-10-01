# MEK-SEL ERP

Enquiry-to-dispatch ERP for **Mechtek, Bengaluru** (blister packing machines, de-foiling machines and change parts),
built by **Selvantra Technologies**. This repository replaces the earlier SalonBook app.

This project was built with [Lovable](https://lovable.dev) (TanStack Start + React + Lovable Cloud).

## Status

Phase 1 is the **front end**: every screen of the MEK-SEL ERP prototype, rebuilt as React pages.
Phase 2 stores the data in Lovable Cloud (Supabase), so it survives a reload and is shared by everyone using the app.

| Batch | Screens | Status |
| --- | --- | --- |
| 1 | Login, app shell, Dashboard, Leads, CRM desk, Customers, Quotations (with combo sets), Sales orders, Dispatch from order, Invoices | Done |
| 2 | Product master, Combo sets, Bill of materials, Raw materials, Demand forecast, Material planning, Work orders, Dispatch | Done |
| 3 | Purchase overview, Vendors, Indents, Purchase orders, Gate pass, GRN, Vendor bills, Stores desk, Inventory, Procurement planning, Material requisition | Done |
| 4 | Receivables, Payables, Installed base & service, Staff master, Role master, Help, search on every screen and "Search everything" (Ctrl+K) | Done |

## Demo sign-in

Pick any demo account on the login screen. Administrator: `admin` / `mechtek@2026`.
Each role sees only the modules it is allowed (Role master), and approvals follow the role's approval rights.

## Code map

- `src/erp/engine.ts` — sample data and business rules (orders, GST invoices, MRP, stores, CRM). Each collection becomes a table in phase 2.
- `src/erp/session.ts` — signed-in user, role permissions (`canSee`, `canEdit`, `canApprove`), per-screen UI state.
- `src/erp/nav.ts` — sidebar menu and counters. `src/erp/help.ts` — "How to use this page" guides; `src/erp/guides.ts` — Help screen guides.
- `src/erp/forecast.ts` — demand forecast methods, backtest and forecast-driven material requirement.
- `src/components/erp/` — app shell, shared UI (`ui.tsx`), smart search (`Search.tsx`), and the screens under `pages/`
  (sales pages, `Engineering`, `Operations`, `Forecast`, `Purchase`, `Stores`, `Finance`, `Admin`, `Help`; shared purchase/stores pieces in `proc.tsx`).
- `src/routes/_erp/*.tsx` — one route per screen (`/dashboard`, `/quotes`, …). `src/routes/login.tsx` — sign-in.
- `src/styles.css` — Mechtek brand theme (orange `#FD9700`, charcoal `#333333`, Montserrat + Open Sans), light and dark.

## Database (phase 2)

All ERP data lives in one table, `public.erp_records` (migration `supabase/migrations/20260930150000_meksel_erp_records.sql`):
one row per record, keyed by `collection` (customers, sales_orders, purchase_orders, stock_ledger, staff, roles, …) and `id`,
with the record itself in `data` (JSON).

- `src/erp/persist.ts` loads every row into the engine at start-up, saves only the records that changed after each action,
  and applies changes made by other users live through Supabase Realtime.
- On the very first start (empty table) the built-in sample data is uploaded as the starting point.
  The Administrator can start again from the sample data with **Staff master › Reset demo data**.
- If the table is not reachable (for example, the migration has not been applied yet), the app keeps working on sample
  data in the browser; the top bar then shows "Offline: changes stay in this browser".
- Document numbers come from shared counters that only move forward. If two people still create the same number at
  the same moment, nothing is overwritten. A new document is inserted, never upserted, so the second save finds the
  number taken. The second person's document then takes the next free number, references to it in their unsaved changes
  are updated, and they get a message. New staff IDs are reserved through the login server function instead, because
  logins point at them.

## Sign-in (phase 3)

Staff sign in with Lovable Cloud accounts (Supabase Auth). Migration `supabase/migrations/20261001090000_meksel_erp_auth.sql`
closes `erp_records` to anonymous visitors and removes the passwords phase 2 stored there.

- Each staff member's login uses an email derived from their user ID (`<user id>@staff.meksel-erp.local`; no mail is sent)
  and carries `app_metadata.staff_id`, which links it to the Staff master. Only accounts with that link can read or write
  ERP records, and only the service role can set it, so self sign-ups see nothing.
- The first sign-in on an empty database creates logins for every staff member with the demo passwords
  (`setupDemoLogins` in `src/erp/accounts.functions.ts`). After that it does nothing.
- Adding staff, changing a user ID or password, and activating or deactivating someone go through the `saveLogin` server
  function. It checks that the caller's role has full Staff master access. Deactivated staff cannot sign in.
- Passwords are never stored in the staff records.
- If Lovable Cloud cannot be reached, the demo logins are checked in the browser and the app works offline on sample data.
- Module access is enforced by the app, not the database: any signed-in staff member can technically read or change any
  ERP record through the API. Per-module database rules would be a later step.

The old SalonBook tables from earlier migrations are not used by MEK-SEL ERP.

## Development

```sh
npm i
npm run dev
```
