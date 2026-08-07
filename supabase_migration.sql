-- ==============================================================================
-- TRELVIX VIDEO STUDIO CREDIT WALLET & PAYPAL PAYMENT SYSTEM MIGRATION
-- ==============================================================================

-- 1. Video Credit Packages Table
CREATE TABLE IF NOT EXISTS public.video_credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  credits INT NOT NULL,
  price_usd NUMERIC(10, 2) NOT NULL,
  active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Credit Packages
INSERT INTO public.video_credit_packages (name, credits, price_usd, active, sort_order)
VALUES
  ('Starter', 40, 4.99, true, 1),
  ('Creator', 100, 9.99, true, 2),
  ('Studio', 220, 19.99, true, 3),
  ('Pro Studio', 500, 39.99, true, 4)
ON CONFLICT DO NOTHING;


-- 2. Video Credit Wallets Table
CREATE TABLE IF NOT EXISTS public.video_credit_wallets (
  user_id UUID PRIMARY KEY,
  balance INT NOT NULL DEFAULT 0,
  lifetime_credits_purchased INT NOT NULL DEFAULT 0,
  lifetime_credits_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Atomic Credit Deduction Function
CREATE OR REPLACE FUNCTION public.deduct_video_credits(
  p_user_id UUID,
  p_credits_to_deduct INT
)
RETURNS TABLE(success BOOLEAN, new_balance INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INT;
  v_current_balance INT;
BEGIN
  -- Create wallet with 0 credits if missing
  INSERT INTO public.video_credit_wallets (user_id, balance, lifetime_credits_purchased, lifetime_credits_used)
  VALUES (p_user_id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Atomic update with balance check
  UPDATE public.video_credit_wallets
  SET balance = balance - p_credits_to_deduct,
      lifetime_credits_used = lifetime_credits_used + p_credits_to_deduct,
      updated_at = NOW()
  WHERE user_id = p_user_id AND balance >= p_credits_to_deduct
  RETURNING balance INTO v_new_balance;

  IF FOUND THEN
    RETURN QUERY SELECT true, v_new_balance;
  ELSE
    SELECT balance INTO v_current_balance FROM public.video_credit_wallets WHERE user_id = p_user_id;
    RETURN QUERY SELECT false, COALESCE(v_current_balance, 0);
  END IF;
END;
$$;


-- 3. Video Credit Transactions Table
CREATE TABLE IF NOT EXISTS public.video_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'PURCHASE', 'USAGE', 'REFUND', 'ADJUSTMENT'
  credits INT NOT NULL,
  amount NUMERIC(10, 2) DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'USD',
  paypal_order_id VARCHAR(255),
  paypal_capture_id VARCHAR(255),
  package_id UUID REFERENCES public.video_credit_packages(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED', -- 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique indexes for Idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_paypal_order_id ON public.video_credit_transactions(paypal_order_id) WHERE paypal_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_paypal_capture_id ON public.video_credit_transactions(paypal_capture_id) WHERE paypal_capture_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_video_credit_tx_user_id ON public.video_credit_transactions(user_id);


-- 4. Video Generation Credit Cost Rates Table
CREATE TABLE IF NOT EXISTS public.video_generation_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quality_mode VARCHAR(50) NOT NULL, -- 'creative', 'super_creative'
  duration_seconds INT NOT NULL, -- 4, 6, 8, 12
  credits_cost INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_quality_duration UNIQUE (quality_mode, duration_seconds)
);

-- Seed Generation Rates
INSERT INTO public.video_generation_rates (quality_mode, duration_seconds, credits_cost)
VALUES
  ('creative', 4, 10),
  ('creative', 6, 15),
  ('creative', 8, 20),
  ('creative', 12, 30),
  ('super_creative', 4, 20),
  ('super_creative', 6, 30),
  ('super_creative', 8, 40),
  ('super_creative', 12, 60)
ON CONFLICT (quality_mode, duration_seconds) DO UPDATE SET credits_cost = EXCLUDED.credits_cost;


-- 5. Row Level Security (RLS) Policies
ALTER TABLE public.video_credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_generation_rates ENABLE ROW LEVEL SECURITY;

-- Public read access to active credit packages & generation rates
CREATE POLICY "Public read packages" ON public.video_credit_packages FOR SELECT USING (active = true);
CREATE POLICY "Public read generation rates" ON public.video_generation_rates FOR SELECT USING (true);

-- Authenticated users read own wallet & transactions
CREATE POLICY "Users read own wallet" ON public.video_credit_wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own transactions" ON public.video_credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- Note: INSERT / UPDATE on wallets & transactions are restricted to service role (backend API only).
