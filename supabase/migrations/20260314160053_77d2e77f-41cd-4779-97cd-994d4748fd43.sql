-- Allow invited users to delete/reject pending invites by email
DROP POLICY IF EXISTS "Users can delete own dependents" ON public.dependents;

CREATE POLICY "Users can delete own dependents"
  ON public.dependents FOR DELETE
  USING (
    auth.uid() = owner_id
    OR (
      status = 'pending'
      AND dependent_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );