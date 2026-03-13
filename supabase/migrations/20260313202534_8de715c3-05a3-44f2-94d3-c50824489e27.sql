-- Create dependents table
CREATE TABLE public.dependents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  dependent_email text NOT NULL,
  dependent_user_id uuid,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, dependent_email)
);

ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;

-- Security definer function: check if user can access owner's data
CREATE OR REPLACE FUNCTION public.can_access_user_data(_user_id uuid, _accessor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = _accessor_id
  OR EXISTS (
    SELECT 1 FROM public.dependents
    WHERE owner_id = _user_id
      AND dependent_user_id = _accessor_id
      AND status = 'accepted'
  )
  OR EXISTS (
    SELECT 1 FROM public.dependents
    WHERE owner_id = _accessor_id
      AND dependent_user_id = _user_id
      AND status = 'accepted'
  )
$$;

-- RLS for dependents table
CREATE POLICY "Users can view own dependents" ON public.dependents
FOR SELECT USING (
  auth.uid() = owner_id OR auth.uid() = dependent_user_id
);

CREATE POLICY "Users can insert own dependents" ON public.dependents
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own dependents" ON public.dependents
FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users can update own dependents" ON public.dependents
FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = dependent_user_id);

-- Update RLS on bills
DROP POLICY IF EXISTS "Users can CRUD own bills" ON public.bills;
CREATE POLICY "Users can access own or shared bills" ON public.bills
FOR ALL USING (public.can_access_user_data(user_id, auth.uid()))
WITH CHECK (public.can_access_user_data(user_id, auth.uid()));

-- Update RLS on bank_accounts
DROP POLICY IF EXISTS "Users can CRUD own bank_accounts" ON public.bank_accounts;
CREATE POLICY "Users can access own or shared bank_accounts" ON public.bank_accounts
FOR ALL USING (public.can_access_user_data(user_id, auth.uid()))
WITH CHECK (public.can_access_user_data(user_id, auth.uid()));

-- Update RLS on bank_deposits
DROP POLICY IF EXISTS "Users can CRUD own deposits" ON public.bank_deposits;
CREATE POLICY "Users can access own or shared deposits" ON public.bank_deposits
FOR ALL USING (public.can_access_user_data(user_id, auth.uid()))
WITH CHECK (public.can_access_user_data(user_id, auth.uid()));

-- Update RLS on categories
DROP POLICY IF EXISTS "Users can CRUD own categories" ON public.categories;
CREATE POLICY "Users can access own or shared categories" ON public.categories
FOR ALL USING (public.can_access_user_data(user_id, auth.uid()))
WITH CHECK (public.can_access_user_data(user_id, auth.uid()));

-- Update RLS on transactions
DROP POLICY IF EXISTS "Users can CRUD own transactions" ON public.transactions;
CREATE POLICY "Users can access own or shared transactions" ON public.transactions
FOR ALL USING (public.can_access_user_data(user_id, auth.uid()))
WITH CHECK (public.can_access_user_data(user_id, auth.uid()));

-- Update RLS on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own or shared profile" ON public.profiles
FOR SELECT USING (public.can_access_user_data(user_id, auth.uid()));

-- Function to auto-accept pending invites when user signs up
CREATE OR REPLACE FUNCTION public.accept_pending_invites()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.dependents
  SET dependent_user_id = NEW.id, status = 'accepted'
  WHERE dependent_email = NEW.email AND status = 'pending';
  RETURN NEW;
END;
$$;