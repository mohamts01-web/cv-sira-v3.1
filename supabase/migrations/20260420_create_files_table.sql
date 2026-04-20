CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view files in their own tenant"
  ON public.files
  FOR SELECT
  USING (tenant_id = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert files in their own tenant"
  ON public.files
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete their own files in their tenant"
  ON public.files
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND tenant_id = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())
  );

CREATE INDEX idx_files_user_id ON public.files(user_id);
CREATE INDEX idx_files_tenant_id ON public.files(tenant_id);
CREATE INDEX idx_files_created_at ON public.files(created_at DESC);
