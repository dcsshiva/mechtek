-- Selvantra Technologies record store (phase 2).
-- Every ERP record (customer, lead, quotation, order, PO, GRN, stock movement, staff, role, ...)
-- is one row: the collection it belongs to, its id, and the record itself as JSON.
-- The app loads all rows at start-up, saves each change, and listens for changes made by
-- other users through Supabase Realtime.
--
-- Access: the app still uses its demo logins (staff and passwords are ERP records), so the
-- publishable (anon) key can read and write these rows. Do not store real customer data or
-- real passwords here until sign-in moves to Supabase Auth.

CREATE TABLE IF NOT EXISTS public.erp_records (
  collection text NOT NULL,
  id text NOT NULL,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS erp_records_collection_idx ON public.erp_records (collection);

CREATE OR REPLACE FUNCTION public.erp_records_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS erp_records_touch ON public.erp_records;
CREATE TRIGGER erp_records_touch BEFORE UPDATE ON public.erp_records
FOR EACH ROW EXECUTE FUNCTION public.erp_records_touch();

ALTER TABLE public.erp_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_records REPLICA IDENTITY FULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.erp_records TO anon, authenticated;
GRANT ALL ON public.erp_records TO service_role;

DROP POLICY IF EXISTS "ERP demo: read" ON public.erp_records;
DROP POLICY IF EXISTS "ERP demo: insert" ON public.erp_records;
DROP POLICY IF EXISTS "ERP demo: update" ON public.erp_records;
DROP POLICY IF EXISTS "ERP demo: delete" ON public.erp_records;
CREATE POLICY "ERP demo: read" ON public.erp_records FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ERP demo: insert" ON public.erp_records FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "ERP demo: update" ON public.erp_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "ERP demo: delete" ON public.erp_records FOR DELETE TO anon, authenticated USING (true);

-- Live updates to other users' screens.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'erp_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.erp_records;
  END IF;
END $$;
