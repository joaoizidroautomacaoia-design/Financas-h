-- Fix: Allow invited users to see their pending invites by email
DROP POLICY IF EXISTS "Users can view own dependents" ON public.dependents;

CREATE POLICY "Users can view own dependents"
  ON public.dependents FOR SELECT
  USING (
    auth.uid() = owner_id
    OR auth.uid() = dependent_user_id
    OR (
      status = 'pending'
      AND dependent_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own dependents" ON public.dependents;

CREATE POLICY "Users can update own dependents"
  ON public.dependents FOR UPDATE
  USING (
    auth.uid() = owner_id
    OR auth.uid() = dependent_user_id
    OR (
      status = 'pending'
      AND dependent_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );