
-- Create a SECURITY DEFINER function to get current user's email
-- This is needed because RLS policies run as 'authenticated' role which can't access auth.users
CREATE OR REPLACE FUNCTION public.auth_user_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email::text FROM auth.users WHERE id = auth.uid()
$$;

-- Drop existing dependents policies that use the broken auth.users subquery
DROP POLICY IF EXISTS "Users can view own dependents" ON public.dependents;
DROP POLICY IF EXISTS "Users can update own dependents" ON public.dependents;
DROP POLICY IF EXISTS "Users can delete own dependents" ON public.dependents;
DROP POLICY IF EXISTS "Users can insert own dependents" ON public.dependents;

-- Recreate policies using the security definer function
CREATE POLICY "Users can view own dependents" ON public.dependents
FOR SELECT USING (
  auth.uid() = owner_id 
  OR auth.uid() = dependent_user_id 
  OR (status = 'pending' AND dependent_email = public.auth_user_email())
);

CREATE POLICY "Users can insert own dependents" ON public.dependents
FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own dependents" ON public.dependents
FOR UPDATE USING (
  auth.uid() = owner_id 
  OR auth.uid() = dependent_user_id 
  OR (status = 'pending' AND dependent_email = public.auth_user_email())
);

CREATE POLICY "Users can delete own dependents" ON public.dependents
FOR DELETE USING (
  auth.uid() = owner_id 
  OR (status = 'pending' AND dependent_email = public.auth_user_email())
);

-- Fix handle_new_user to properly fallback to email when display_name is empty
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name', ''), NEW.email));
  RETURN NEW;
END;
$$;

-- Fix gabi's empty display_name
UPDATE public.profiles 
SET display_name = (SELECT email FROM auth.users WHERE id = profiles.user_id)
WHERE display_name IS NULL OR display_name = '';
