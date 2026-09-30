# MEK-SEL ERP

Enquiry-to-dispatch ERP for **Mechtek, Bengaluru** (blister packing machines, de-foiling machines and change parts),
built by **Selvantra Technologies**. This repository replaces the earlier SalonBook app.

This project was built with [Lovable](https://lovable.dev) (TanStack Start + React + Lovable Cloud).

## Status

Phase 1 is the **front end**: every screen of the MEK-SEL ERP prototype, rebuilt as React pages, running on in-memory
sample data. Phase 2 moves the data into the Lovable Cloud (Supabase) database.

| Batch | Screens | Status |
| --- | --- | --- |
| 1 | Login, app shell, Dashboard, Leads, CRM desk, Customers, Quotations (with combo sets), Sales orders, Dispatch from order, Invoices | Done |
| 2 | Product master, Combo sets, Bill of materials, Raw materials, Demand forecast, Material planning, Work orders, Dispatch | Next |
| 3 | Purchase overview, Vendors, Indents, Purchase orders, Gate pass, GRN, Vendor bills, Stores desk, Inventory, Procurement planning, Material requisition | Planned |
| 4 | Receivables, Payables, Installed base & service, Staff master, Role master, Help, global search | Planned |

## Demo sign-in

Pick any demo account on the login screen. Administrator: `admin` / `mechtek@2026`.
Each role sees only the modules it is allowed (Role master), and approvals follow the role's approval rights.

## Code map

- `src/erp/engine.ts` — sample data and business rules (orders, GST invoices, MRP, stores, CRM). Each collection becomes a table in phase 2.
- `src/erp/session.ts` — signed-in user, role permissions (`canSee`, `canEdit`, `canApprove`), per-screen UI state.
- `src/erp/nav.ts` — sidebar menu and counters. `src/erp/help.ts` — "How to use this page" guides.
- `src/components/erp/` — app shell, shared UI (`ui.tsx`), and one file per screen under `pages/`.
- `src/routes/_erp/*.tsx` — one route per screen (`/dashboard`, `/quotes`, …). `src/routes/login.tsx` — sign-in.
- `src/styles.css` — Mechtek brand theme (orange `#FD9700`, charcoal `#333333`, Montserrat + Open Sans), light and dark.

## Database note

The Lovable Cloud database still contains the old SalonBook tables (`supabase/migrations`). They are not used by
MEK-SEL ERP and will be dropped when the MEK-SEL tables are created in phase 2.

## Development

```sh
npm i
npm run dev
```
