
CREATE TABLE public.loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  person_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  loan_date DATE NOT NULL,
  notes TEXT DEFAULT '',
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own or shared loans"
  ON public.loans
  FOR ALL
  USING (can_access_user_data(user_id, auth.uid()))
  WITH CHECK (can_access_user_data(user_id, auth.uid()));
