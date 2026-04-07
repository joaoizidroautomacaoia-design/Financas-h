
-- Table for expected receiving dates per bank account
CREATE TABLE public.receive_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
  expected_amount NUMERIC NOT NULL DEFAULT 0,
  label TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.receive_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own or shared receive_dates"
  ON public.receive_dates
  FOR ALL
  USING (can_access_user_data(user_id, auth.uid()))
  WITH CHECK (can_access_user_data(user_id, auth.uid()));

-- Add receive_date_id to bills so bills can be linked to a specific receiving date
ALTER TABLE public.bills ADD COLUMN receive_date_id UUID REFERENCES public.receive_dates(id) ON DELETE SET NULL;
