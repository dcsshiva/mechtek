-- MEK-SEL ERP: module rules in the database.
-- Until now any signed-in staff member could change any ERP record through the API; only the app
-- checked the Role master. From here the database checks it too:
--
--   * Reading: any active staff member (screens such as the dashboard and material planning need
--     data from every module).
--   * Changing a collection (insert, update, delete): the caller's role must have "full" access to
--     one of the modules that work on that collection, or one of the approval rights listed for it.
--     The lists are in public.erp_write_access; edit them there if a role needs more.
--   * Deleting: documents and transactions (orders, invoices, POs, stock movements, ...) are never
--     deleted by the app, so only an administrator (full Staff master and Role master) may delete
--     them, e.g. for "Reset demo data". Masters the app does delete from (roles, and engineering
--     items whose code changes) follow the change rule above.
--   * Staff and roles can only be changed by roles with full Staff master / Role master access,
--     so nobody can raise their own access.
--   * While the store is empty (first run, or after "Reset demo data"), signed-in staff may load
--     the sample data.

CREATE TABLE IF NOT EXISTS public.erp_write_access (
  collection text PRIMARY KEY,
  modules text[] NOT NULL DEFAULT '{}',
  approvals text[] NOT NULL DEFAULT '{}',
  any_staff boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false
);
ALTER TABLE public.erp_write_access ADD COLUMN IF NOT EXISTS can_delete boolean NOT NULL DEFAULT false;
ALTER TABLE public.erp_write_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.erp_write_access FROM anon, authenticated;
GRANT ALL ON public.erp_write_access TO service_role;

-- collection, modules with full access that may change it, approval rights that may change it,
-- any staff member may change it, those who may change it may also delete
INSERT INTO public.erp_write_access (collection, modules, approvals, any_staff, can_delete) VALUES
  ('roles',             '{roles}', '{}', false, true),
  ('staff',             '{staff}', '{}', false, false),
  ('meta',              '{}', '{}', true, false),
  ('customers',         '{customers,leads,crm,quotes,orders,invoices,receivables}', '{}', false, false),
  ('contacts',          '{customers,crm,leads}', '{}', false, false),
  ('leads',             '{leads,crm,quotes,orders,service}', '{quotes}', false, false),
  ('activities',        '{leads,crm,customers,quotes,orders,invoices,receivables,service}', '{quotes}', false, false),
  ('quotations',        '{quotes,leads,crm}', '{quotes}', false, false),
  ('sales_orders',      '{quotes,orders,invoices,receivables,dispatch,workorders,mrp}', '{quotes}', false, false),
  ('work_orders',       '{orders,workorders,mrp,mr,stores,dispatch}', '{mr}', false, false),
  ('purchase_requests', '{mrp,orders,workorders,planning,indent,po}', '{}', false, false),
  ('delivery_challans', '{dispatch,orders,invoices}', '{}', false, false),
  ('invoices',          '{invoices,dispatch,orders,receivables}', '{}', false, false),
  ('installed_base',    '{dispatch,orders,service}', '{}', false, false),
  ('service_tickets',   '{service}', '{}', false, false),
  ('products',          '{products,bom,combos}', '{}', false, true),
  ('child_items',       '{products,bom,combos}', '{}', false, true),
  ('bom',               '{bom,products}', '{}', false, true),
  ('bom_versions',      '{bom,products}', '{}', false, true),
  ('combos',            '{combos,products}', '{}', false, true),
  ('materials',         '{materials,bom,grn,gate,stores,mr,inventory,planning,workorders,dispatch,po}', '{grn,mr,adj}', false, true),
  ('stock_ledger',      '{materials,grn,gate,stores,mr,inventory,workorders,dispatch}', '{grn,mr,adj}', false, false),
  ('stock_adjustments', '{inventory,stores}', '{adj}', false, false),
  ('vendors',           '{vendors,po,bills,payables}', '{}', false, false),
  ('indents',           '{indent,po,planning,mrp,mr,stores}', '{indent}', false, false),
  ('purchase_orders',   '{po,indent,gate,grn,bills,payables}', '{po,grn,bills}', false, false),
  ('gate_passes',       '{gate,grn,po,dispatch}', '{gate,grn}', false, false),
  ('grns',              '{grn,gate,po,bills}', '{grn,bills}', false, false),
  ('requisitions',      '{mr,stores,workorders}', '{mr}', false, false),
  ('vendor_bills',      '{bills,payables,grn}', '{bills}', false, false),
  ('debit_notes',       '{bills,payables}', '{bills}', false, false)
ON CONFLICT (collection) DO UPDATE SET modules = EXCLUDED.modules, approvals = EXCLUDED.approvals, any_staff = EXCLUDED.any_staff, can_delete = EXCLUDED.can_delete;

-- The caller's staff record and role: {active, perms, approvals}, or null.
CREATE OR REPLACE FUNCTION public.erp_me()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'active', coalesce((s.data -> 'r' ->> 'active')::boolean, false),
    'perms', coalesce(r.data -> 'r' -> 'perms', '{}'::jsonb),
    'approvals', coalesce(r.data -> 'r' -> 'approvals', '{}'::jsonb))
  FROM public.erp_records s
  LEFT JOIN public.erp_records r ON r.collection = 'roles' AND r.id = s.data -> 'r' ->> 'role'
  WHERE s.collection = 'staff' AND s.id = auth.jwt() -> 'app_metadata' ->> 'staff_id'
$$;

-- True while there are no staff records yet (first run, or right after a reset).
CREATE OR REPLACE FUNCTION public.erp_store_empty()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.erp_records WHERE collection = 'staff')
$$;

CREATE OR REPLACE FUNCTION public.erp_can_read()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.erp_is_staff() AND (public.erp_store_empty() OR coalesce((public.erp_me() ->> 'active')::boolean, false))
$$;

CREATE OR REPLACE FUNCTION public.erp_can_write(coll text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN NOT public.erp_is_staff() THEN false
    WHEN public.erp_store_empty() THEN true
    ELSE coalesce((
      SELECT (me ->> 'active')::boolean AND (
        a.any_staff
        OR EXISTS (SELECT 1 FROM unnest(a.modules) m WHERE me -> 'perms' ->> m = 'full')
        OR EXISTS (SELECT 1 FROM unnest(a.approvals) k WHERE coalesce((me -> 'approvals' ->> k)::boolean, false)))
      FROM public.erp_write_access a, public.erp_me() me
      WHERE a.collection = coll), false)
  END
$$;

CREATE OR REPLACE FUNCTION public.erp_can_delete(coll text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.erp_can_write(coll) AND (
    public.erp_store_empty()
    OR coalesce((SELECT a.can_delete FROM public.erp_write_access a WHERE a.collection = coll), false)
    OR coalesce((SELECT (me ->> 'active')::boolean AND me -> 'perms' ->> 'staff' = 'full' AND me -> 'perms' ->> 'roles' = 'full'
                 FROM public.erp_me() me), false))
$$;

REVOKE ALL ON FUNCTION public.erp_me() FROM anon;
REVOKE ALL ON FUNCTION public.erp_can_delete(text) FROM anon;
REVOKE ALL ON FUNCTION public.erp_store_empty() FROM anon;
REVOKE ALL ON FUNCTION public.erp_can_read() FROM anon;
REVOKE ALL ON FUNCTION public.erp_can_write(text) FROM anon;

DROP POLICY IF EXISTS "ERP staff: read" ON public.erp_records;
DROP POLICY IF EXISTS "ERP staff: insert" ON public.erp_records;
DROP POLICY IF EXISTS "ERP staff: update" ON public.erp_records;
DROP POLICY IF EXISTS "ERP staff: delete" ON public.erp_records;
CREATE POLICY "ERP staff: read" ON public.erp_records FOR SELECT TO authenticated
  USING ((SELECT public.erp_can_read()));
CREATE POLICY "ERP staff: insert" ON public.erp_records FOR INSERT TO authenticated
  WITH CHECK (public.erp_can_write(collection));
CREATE POLICY "ERP staff: update" ON public.erp_records FOR UPDATE TO authenticated
  USING (public.erp_can_write(collection)) WITH CHECK (public.erp_can_write(collection));
CREATE POLICY "ERP staff: delete" ON public.erp_records FOR DELETE TO authenticated
  USING (public.erp_can_delete(collection));

-- Last sign-in now comes from Lovable Cloud (Auth), so staff records no longer carry it.
UPDATE public.erp_records SET data = data #- '{r,lastLogin}' WHERE collection = 'staff' AND data -> 'r' ? 'lastLogin';
