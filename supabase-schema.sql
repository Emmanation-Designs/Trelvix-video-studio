-- Video Studio Dedicated Database Schemas & Row Level Security (RLS)

-- 1. Video Generations Table
CREATE TABLE IF NOT EXISTS public.video_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_job_id TEXT,
    prompt TEXT NOT NULL,
    negative_prompt TEXT,
    selected_model TEXT DEFAULT 'sora-2',
    quality TEXT DEFAULT 'creative',
    duration TEXT DEFAULT '6s',
    resolution TEXT DEFAULT '1080p',
    aspect_ratio TEXT DEFAULT '16:9',
    video_url TEXT,
    thumbnail_url TEXT,
    status TEXT NOT NULL DEFAULT 'queued',
    generation_status TEXT NOT NULL DEFAULT 'queued',
    error_message TEXT,
    cost_estimate NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_video_generations_user_id ON public.video_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_provider_job_id ON public.video_generations(provider_job_id);

-- Enable RLS on video_generations
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own video generations" ON public.video_generations;
CREATE POLICY "Users can select own video generations"
ON public.video_generations FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own video generations" ON public.video_generations;
CREATE POLICY "Users can insert own video generations"
ON public.video_generations FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own video generations" ON public.video_generations;
CREATE POLICY "Users can update own video generations"
ON public.video_generations FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own video generations" ON public.video_generations;
CREATE POLICY "Users can delete own video generations"
ON public.video_generations FOR DELETE
USING (auth.uid() = user_id);


-- 2. Video Studio Subscriptions Table
CREATE TABLE IF NOT EXISTS public.video_studio_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_tier TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    provider TEXT DEFAULT 'stripe',
    subscription_id TEXT,
    monthly_video_credits INTEGER DEFAULT 500,
    remaining_credits INTEGER DEFAULT 500,
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_studio_subscriptions_user_id ON public.video_studio_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_video_studio_subscriptions_sub_id ON public.video_studio_subscriptions(subscription_id);

-- Enable RLS on video_studio_subscriptions
ALTER TABLE public.video_studio_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own video studio subscription" ON public.video_studio_subscriptions;
CREATE POLICY "Users can read own video studio subscription"
ON public.video_studio_subscriptions FOR SELECT
USING (auth.uid() = user_id);


-- 3. Video Studio Transactions Table
CREATE TABLE IF NOT EXISTS public.video_studio_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount_usd NUMERIC(10, 2) NOT NULL,
    payment_provider TEXT NOT NULL DEFAULT 'stripe',
    transaction_type TEXT NOT NULL,
    credits_added INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_studio_transactions_user_id ON public.video_studio_transactions(user_id);

-- Enable RLS on video_studio_transactions
ALTER TABLE public.video_studio_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own transactions" ON public.video_studio_transactions;
CREATE POLICY "Users can select own transactions"
ON public.video_studio_transactions FOR SELECT
USING (auth.uid() = user_id);

-- Storage bucket setup comment:
-- Note: Ensure a public storage bucket named 'videos' exists in Supabase Storage with public access enabled for video/mp4 & image/png.
