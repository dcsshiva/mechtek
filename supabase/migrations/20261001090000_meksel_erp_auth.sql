-- MEK-SEL ERP: sign-in moves to Lovable Cloud (Supabase Auth).
-- Staff now sign in with Auth accounts (created by the app's server functions), so the record
-- store is closed to anonymous visitors: only signed-in staff can read or change ERP records.
-- A staff login carries app_metadata.staff_id, which only the service role can set, so an
-- account someone signs up for on their own cannot read the data.
-- Passwords are no longer kept in the staff records; the app removes them on its next save.

DROP POLICY IF EXISTS "ERP demo: read" ON public.erp_records;
DROP POLICY IF EXISTS "ERP demo: insert" ON public.erp_records;
DROP POLICY IF EXISTS "ERP demo: update" ON public.erp_records;
DROP POLICY IF EXISTS "ERP demo: delete" ON public.erp_records;

REVOKE ALL ON public.erp_records FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_records TO authenticated;

DROP POLICY IF EXISTS "ERP staff: read" ON public.erp_records;
DROP POLICY IF EXISTS "ERP staff: insert" ON public.erp_records;
DROP POLICY IF EXISTS "ERP staff: update" ON public.erp_records;
DROP POLICY IF EXISTS "ERP staff: delete" ON public.erp_records;
CREATE OR REPLACE FUNCTION public.erp_is_staff()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(auth.jwt() -> 'app_metadata' ->> 'staff_id', '') <> ''
$$;

CREATE POLICY "ERP staff: read" ON public.erp_records FOR SELECT TO authenticated USING (public.erp_is_staff());
CREATE POLICY "ERP staff: insert" ON public.erp_records FOR INSERT TO authenticated WITH CHECK (public.erp_is_staff());
CREATE POLICY "ERP staff: update" ON public.erp_records FOR UPDATE TO authenticated USING (public.erp_is_staff()) WITH CHECK (public.erp_is_staff());
CREATE POLICY "ERP staff: delete" ON public.erp_records FOR DELETE TO authenticated USING (public.erp_is_staff());

-- Remove passwords already stored by the phase 2 demo logins.
UPDATE public.erp_records SET data = data #- '{r,password}' WHERE collection = 'staff' AND data->'r' ? 'password';
