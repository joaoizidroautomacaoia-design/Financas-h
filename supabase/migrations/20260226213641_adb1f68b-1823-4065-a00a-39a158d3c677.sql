
CREATE TABLE public.bank_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  deposit_date DATE NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own deposits"
ON public.bank_deposits
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_bank_deposits_account ON public.bank_deposits(bank_account_id);
CREATE INDEX idx_bank_deposits_date ON public.bank_deposits(deposit_date);
