
-- Create currencies table for multi-currency support
CREATE TABLE public.currencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  exchange_rate NUMERIC NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- Anyone can view active currencies
CREATE POLICY "Anyone can view active currencies"
ON public.currencies
FOR SELECT
USING (is_active = true);

-- Admins can manage currencies
CREATE POLICY "Admins can manage currencies"
ON public.currencies
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default currencies
INSERT INTO public.currencies (code, name, symbol, exchange_rate, is_default, display_order) VALUES
('BDT', 'Bangladeshi Taka', '৳', 1, true, 0),
('USD', 'US Dollar', '$', 0.0084, false, 1),
('EUR', 'Euro', '€', 0.0077, false, 2),
('GBP', 'British Pound', '£', 0.0066, false, 3),
('AED', 'UAE Dirham', 'د.إ', 0.031, false, 4);

-- Trigger for updated_at
CREATE TRIGGER update_currencies_updated_at
BEFORE UPDATE ON public.currencies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
