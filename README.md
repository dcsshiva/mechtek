# Selvantra Technologies

Enquiry-to-dispatch ERP for **Mechtek, Bengaluru** (blister packing machines, de-foiling machines and change parts),
built by **Selvantra Technologies**. This repository replaces the earlier SalonBook app.

This project was built with [Lovable](https://lovable.dev) (TanStack Start + React + Lovable Cloud).

## Status

Phase 1 is the **front end**: every screen of the Selvantra Technologies prototype, rebuilt as React pages.
Phase 2 stores the data in Lovable Cloud (Supabase), so it survives a reload and is shared by everyone using the app.

| Batch | Screens | Status |
| --- | --- | --- |
| 1 | Login, app shell, Dashboard, Leads, CRM desk, Customers, Quotations (with combo sets), Sales orders, Dispatch from order, Invoices | Done |
| 2 | Product master, Combo sets, Bill of materials, Raw materials, Demand forecast, Material planning, Work orders, Dispatch | Done |
| 3 | Purchase overview, Vendors, Indents, Purchase orders, Gate pass, GRN, Vendor bills, Stores desk, Inventory, Procurement planning, Material requisition | Done |
| 4 | Receivables, Payables, Installed base & service, Staff master, Role master, Help, search on every screen and "Search everything" (Ctrl+K) | Done |
| 5 | Real database tables (one per record type, with line tables), editable drop-down lists (Lists & settings) | Done |

## Demo sign-in

Pick any demo account on the login screen. Administrator: `admin` / `mechtek@2026`.
Each role sees only the modules it is allowed (Role master), and approvals follow the role's approval rights.

## Code map

- `src/erp/engine.ts` — sample data and business rules (orders, GST invoices, MRP, stores, CRM), and the editable lists (`LIST_DATA`, `rebuildLists`).
- `src/erp/schema.ts` — the database layout: every table, its columns, and how a record maps to a header row plus line rows.
- `src/erp/collections.ts` — which engine list each table is stored from; `src/erp/persist.ts` — loading, saving and Realtime.
- `scripts/gen-db.ts` — generates the table migration and the sample-data migration from `schema.ts` (`npx tsx scripts/gen-db.ts`).
- `src/erp/session.ts` — signed-in user, role permissions (`canSee`, `canEdit`, `canApprove`), per-screen UI state.
- `src/erp/nav.ts` — sidebar menu and counters. `src/erp/help.ts` — "How to use this page" guides; `src/erp/guides.ts` — Help screen guides.
- `src/erp/forecast.ts` — demand forecast methods, backtest and forecast-driven material requirement.
- `src/components/erp/` — app shell, shared UI (`ui.tsx`), smart search (`Search.tsx`), and the screens under `pages/`
  (sales pages, `Engineering`, `Operations`, `Forecast`, `Purchase`, `Stores`, `Finance`, `Admin`, `Lists`, `Help`; shared purchase/stores pieces in `proc.tsx`).
- `src/routes/_erp/*.tsx` — one route per screen (`/dashboard`, `/quotes`, …). `src/routes/login.tsx` — sign-in.
- `src/styles.css` — Mechtek brand theme (orange `#FD9700`, charcoal `#333333`, Montserrat + Open Sans), light and dark.

## Database (phase 5: real tables)

Every kind of record has its own table with real columns, and every list inside a document has its own line table
(migration `supabase/migrations/20261001150000_meksel_erp_tables.sql`, 72 tables). For example:

| Record | Header table | Line tables |
| --- | --- | --- |
| Quotation | `quotations` | `quotation_lines`, `quotation_history` |
| Sales order | `sales_orders` | `sales_order_lines`, `sales_order_payments` |
| Invoice | `invoices` | `invoice_lines`, `invoice_payments` |
| Purchase order | `purchase_orders` | `purchase_order_lines`, `purchase_order_history` |
| Product / BOM | `products`, `boms` | `product_specs`, `bom_lines`, `bom_versions` |
| Role | `roles` | `role_permissions`, `role_approvals` |

- Line tables point at their document with a foreign key (`quotation_id`, `product_code`, …, `ON DELETE CASCADE`);
  documents point at `customers`, `vendors` and `roles` with foreign keys.
- Drop-down lists are tables too, edited on **Administration › Lists & settings**: `material_categories`, `uoms`,
  `lead_sources`, `lead_stages`, `activity_types`, `contact_roles`, `departments`, `designations`, `states`, `company`,
  `product_families`, `bom_groups`, `item_kinds`. Who may change a list depends on the role (see `public.erp_write_access`).
- Each row also has `extra` (jsonb, for anything without a column yet; normally empty), `sort_order`, `updated_at` and
  `updated_by`. Next document numbers are in `doc_counters`.
- Sample data for every table is in `supabase/migrations/20261001150100_meksel_erp_sample_data.sql`. It only loads into
  an empty database. The Administrator can start again from it with **Staff master › Reset demo data**
  (function `public.erp_load_sample`).
- `src/erp/persist.ts` loads every table into the engine at start-up, saves only the rows that changed after each action,
  and applies changes made by other users live through Supabase Realtime (enabled on every table).
- If the database is not reachable, the app keeps working on sample data in the browser; the top bar then shows
  "Offline: changes stay in this browser".
- Document numbers come from shared counters that only move forward. If two people still create the same number at
  the same moment, nothing is overwritten. A new document is inserted, never upserted, so the second save finds the
  number taken. The second person's document then takes the next free number, references to it in their unsaved changes
  are updated, and they get a message. New staff IDs are reserved through the login server function instead, because
  logins point at them.
- To change the layout, edit `src/erp/schema.ts`, run `npx tsx scripts/gen-db.ts`, and commit the regenerated migrations.

## Sign-in (phase 3)

Staff sign in with Lovable Cloud accounts (Supabase Auth). Migration `supabase/migrations/20261001090000_meksel_erp_auth.sql`
closed the record store to anonymous visitors and removes the passwords phase 2 stored there.

- Each staff member's login uses an email derived from their user ID (`<user id>@staff.meksel-erp.local`; no mail is sent)
  and carries `app_metadata.staff_id`, which links it to the Staff master. Only accounts with that link can read or write
  ERP records, and only the service role can set it, so self sign-ups see nothing.
- The first sign-in on an empty database creates logins for every staff member with the demo passwords
  (`setupDemoLogins` in `src/erp/accounts.functions.ts`). After that it does nothing.
- Adding staff, changing a user ID or password, and activating or deactivating someone go through the `saveLogin` server
  function. It checks that the caller's role has full Staff master access. Deactivated staff cannot sign in.
- Passwords are never stored in the staff records.
- If Lovable Cloud cannot be reached, the demo logins are checked in the browser and the app works offline on sample data.
- Last sign-in times come from Lovable Cloud (`loginActivity`) and are shown in the Staff master; they are not stored in
  the staff records.

## Module rules (phase 4)

Migration `supabase/migrations/20261001120000_meksel_erp_module_rules.sql` makes the database enforce the Role master,
not just the app:

- **Reading:** any active staff member can read every record. Screens such as the dashboard and material planning need
  data from all modules.
- **Changing** a collection (insert, update or delete) needs one of these:
  - "full" access to one of the modules that work on that collection, or
  - one of the approval rights listed for it.

  The lists are in the table `public.erp_write_access`; to give a role more reach, edit a row there.
  Because a single action touches several collections (a GRN changes stock, the PO and the gate pass), each list
  names every module whose screens write that collection.
- **Deleting:** documents and transactions (orders, invoices, POs, stock movements and so on) are never deleted by the
  app. Only an administrator (full Staff master and Role master) may delete them, for example through
  **Reset demo data**. Masters the app does delete from (roles, and engineering items whose code changes) follow the
  change rule (column `can_delete`).
- **Staff and roles** can only be changed by roles with full Staff master or Role master access, so nobody can raise
  their own access.
- **Empty store:** while the store is empty (first run, or after **Reset demo data**), signed-in staff may load the
  sample data.
- **Refusals:** the app already hides actions a role may not take. If a change is still refused, only that collection's
  part is undone, the screen reloads it from the database, and the user is told what was not saved.

The old SalonBook tables from earlier migrations are not used by Selvantra Technologies.

## Development

```sh
npm i
npm run dev
```
