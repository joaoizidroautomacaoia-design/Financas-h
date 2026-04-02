
CREATE TABLE public.monthly_budget (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

ALTER TABLE public.monthly_budget ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own or shared monthly_budget"
ON public.monthly_budget
FOR ALL
USING (can_access_user_data(user_id, auth.uid()))
WITH CHECK (can_access_user_data(user_id, auth.uid()));

CREATE TRIGGER update_monthly_budget_updated_at
BEFORE UPDATE ON public.monthly_budget
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
