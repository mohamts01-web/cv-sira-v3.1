CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  service_type TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'بدون عنوان',
  data JSONB NOT NULL DEFAULT '{}',
  thumbnail TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant projects"
  ON public.projects FOR SELECT
  USING (tenant_id = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own tenant projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND tenant_id = (SELECT raw_user_meta_data->>'tenant_id' FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own projects"
  ON public.projects FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own projects"
  ON public.projects FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_projects_tenant_id ON public.projects(tenant_id);
CREATE INDEX idx_projects_service_type ON public.projects(service_type);
CREATE INDEX idx_projects_created_at ON public.projects(created_at DESC);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
