
-- Add group_id to bills to link recurring/installment bills together
ALTER TABLE public.bills ADD COLUMN group_id uuid DEFAULT NULL;

-- Create index for group lookups
CREATE INDEX idx_bills_group_id ON public.bills (group_id);
