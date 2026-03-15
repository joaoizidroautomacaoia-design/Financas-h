
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text NOT NULL DEFAULT '',
  user_display_name text NOT NULL DEFAULT '',
  workspace_id uuid NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text NOT NULL DEFAULT '',
  details text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert activity logs" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view activity logs for accessible workspaces" ON public.activity_log
  FOR SELECT TO authenticated
  USING (can_access_user_data(workspace_id, auth.uid()));

CREATE INDEX idx_activity_log_workspace ON public.activity_log (workspace_id, created_at DESC);
CREATE INDEX idx_activity_log_entity ON public.activity_log (entity_type, entity_id);
