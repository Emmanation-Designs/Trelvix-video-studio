import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { getSupabaseAdmin, verifyUserToken } from './server/db';
import { requestOpenAiVideoGeneration, checkOpenAiVideoStatus } from './server/openai';

dotenv.config();

// In-memory fallback stores when Supabase DB is not connected
interface VideoGenerationRecord {
  id: string;
  user_id: string;
  provider_job_id: string;
  prompt: string;
  negative_prompt?: string;
  selected_model: string;
  quality: string;
  duration: string;
  resolution: string;
  aspect_ratio: string;
  video_url?: string;
  thumbnail_url?: string;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  generation_status: 'queued' | 'generating' | 'completed' | 'failed';
  error_message?: string;
  cost_estimate: number;
  created_at: string;
  completed_at?: string;
}

interface SubscriptionRecord {
  id: string;
  user_id: string;
  plan_tier: string;
  status: string;
  provider: string;
  subscription_id: string;
  monthly_video_credits: number;
  remaining_credits: number;
  current_period_start: string;
  current_period_end: string;
  updated_at: string;
}

const memoryGenerationsDB = new Map<string, VideoGenerationRecord>();
const memorySubscriptionsDB = new Map<string, SubscriptionRecord>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'Trelvix AI Video Studio Backend', timestamp: new Date().toISOString() });
  });

  // -------------------------------------------------------------
  // 1. VIDEO GENERATION ROUTE: POST /api/tools/video-studio
  // -------------------------------------------------------------
  app.post(['/api/tools/video-studio', '/api/video/generate'], async (req: Request, res: Response) => {
    try {
      const user = await verifyUserToken(req.headers.authorization);
      const { 
        prompt, 
        negativePrompt, 
        model = 'sora-2', 
        quality = 'creative', 
        duration = '6s', 
        resolution = '1080p',
        aspectRatio = '16:9',
        batchCount = 'x1'
      } = req.body;

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ success: false, error: 'Prompt string is required' });
        return;
      }

      const client = getSupabaseAdmin();
      let remainingCredits = 4850;

      // Check subscription & credits
      if (client) {
        const { data: subData } = await client
          .from('video_studio_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (subData) {
          remainingCredits = subData.remaining_credits;
        } else {
          // Initialize default subscription if missing
          await client.from('video_studio_subscriptions').insert({
            user_id: user.id,
            plan_tier: 'pro',
            status: 'active',
            monthly_video_credits: 5000,
            remaining_credits: 4850
          });
        }
      } else {
        const sub = memorySubscriptionsDB.get(user.id);
        if (sub) {
          remainingCredits = sub.remaining_credits;
        } else {
          memorySubscriptionsDB.set(user.id, {
            id: `sub-${user.id}`,
            user_id: user.id,
            plan_tier: 'pro',
            status: 'active',
            provider: 'stripe',
            subscription_id: `sub_stripe_${Date.now()}`,
            monthly_video_credits: 5000,
            remaining_credits: 4850,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      const count = parseInt(batchCount.toString().replace('x', ''), 10) || 1;
      const creditCost = 25 * count;

      if (remainingCredits < creditCost) {
        res.status(402).json({ 
          success: false, 
          error: 'Insufficient video studio credits. Please top up your balance.',
          remainingCredits 
        });
        return;
      }

      // Dispatch OpenAI / Generator Request
      const createdGenerations: VideoGenerationRecord[] = [];

      for (let i = 0; i < count; i++) {
        const genResult = await requestOpenAiVideoGeneration({
          prompt,
          negativePrompt,
          model,
          quality,
          duration,
          aspectRatio
        });

        const recordId = `gen-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`;
        const record: VideoGenerationRecord = {
          id: recordId,
          user_id: user.id,
          provider_job_id: genResult.providerJobId,
          prompt,
          negative_prompt: negativePrompt,
          selected_model: model,
          quality,
          duration,
          resolution,
          aspect_ratio: aspectRatio,
          status: 'generating',
          generation_status: 'generating',
          cost_estimate: creditCost / count,
          created_at: new Date().toISOString()
        };

        if (client) {
          await client.from('video_generations').insert(record);
        } else {
          memoryGenerationsDB.set(genResult.providerJobId, record);
        }

        createdGenerations.push(record);
      }

      // Deduct credits
      const newCreditBalance = Math.max(0, remainingCredits - creditCost);
      if (client) {
        await client
          .from('video_studio_subscriptions')
          .update({ remaining_credits: newCreditBalance, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
      } else {
        const sub = memorySubscriptionsDB.get(user.id);
        if (sub) {
          sub.remaining_credits = newCreditBalance;
          sub.updated_at = new Date().toISOString();
          memorySubscriptionsDB.set(user.id, sub);
        }
      }

      res.json({
        success: true,
        remainingCredits: newCreditBalance,
        videos: createdGenerations.map((g) => ({
          id: g.id,
          providerJobId: g.provider_job_id,
          prompt: g.prompt,
          status: g.status,
          quality: g.quality,
          duration: g.duration,
          aspectRatio: g.aspect_ratio
        }))
      });
    } catch (err: any) {
      console.error('Error in POST /api/tools/video-studio:', err);
      res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
  });

  // -------------------------------------------------------------
  // 2. VIDEO STATUS ROUTE: GET /api/tools/video-studio/status/:providerJobId
  // -------------------------------------------------------------
  app.get('/api/tools/video-studio/status/:providerJobId', async (req: Request, res: Response) => {
    try {
      const user = await verifyUserToken(req.headers.authorization);
      const { providerJobId } = req.params;

      const client = getSupabaseAdmin();
      let record: VideoGenerationRecord | null = null;

      if (client) {
        const { data } = await client
          .from('video_generations')
          .select('*')
          .eq('provider_job_id', providerJobId)
          .single();
        if (data) record = data as VideoGenerationRecord;
      } else {
        record = memoryGenerationsDB.get(providerJobId) || null;
      }

      // If already completed, return immediately
      if (record && record.status === 'completed' && record.video_url) {
        res.json({
          success: true,
          video: {
            id: record.id,
            providerJobId: record.provider_job_id,
            prompt: record.prompt,
            status: 'completed',
            videoUrl: record.video_url,
            thumbnailUrl: record.thumbnail_url,
            progress: 100,
            completedAt: record.completed_at
          }
        });
        return;
      }

      // Check external status
      const statusResult = await checkOpenAiVideoStatus(providerJobId, user.id);

      if (statusResult.status === 'completed') {
        const completedAt = new Date().toISOString();
        if (client) {
          await client
            .from('video_generations')
            .update({
              status: 'completed',
              generation_status: 'completed',
              video_url: statusResult.videoUrl,
              thumbnail_url: statusResult.thumbnailUrl,
              completed_at: completedAt
            })
            .eq('provider_job_id', providerJobId);
        } else if (record) {
          record.status = 'completed';
          record.generation_status = 'completed';
          record.video_url = statusResult.videoUrl;
          record.thumbnail_url = statusResult.thumbnailUrl;
          record.completed_at = completedAt;
          memoryGenerationsDB.set(providerJobId, record);
        }
      } else if (statusResult.status === 'failed') {
        if (client) {
          await client
            .from('video_generations')
            .update({
              status: 'failed',
              generation_status: 'failed',
              error_message: statusResult.errorMessage
            })
            .eq('provider_job_id', providerJobId);
        } else if (record) {
          record.status = 'failed';
          record.generation_status = 'failed';
          record.error_message = statusResult.errorMessage;
          memoryGenerationsDB.set(providerJobId, record);
        }
      }

      res.json({
        success: true,
        video: {
          id: record?.id || providerJobId,
          providerJobId,
          prompt: record?.prompt || '',
          status: statusResult.status,
          videoUrl: statusResult.videoUrl,
          thumbnailUrl: statusResult.thumbnailUrl,
          progress: statusResult.progress || 50,
          errorMessage: statusResult.errorMessage
        }
      });
    } catch (err: any) {
      console.error('Error in GET /api/tools/video-studio/status:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed checking status' });
    }
  });

  // -------------------------------------------------------------
  // 3. VIDEO CONTENT PROXY: GET /api/tools/video-studio/content/:providerJobId
  // -------------------------------------------------------------
  app.get('/api/tools/video-studio/content/:providerJobId', async (req: Request, res: Response) => {
    const { providerJobId } = req.params;
    const client = getSupabaseAdmin();
    let videoUrl: string | undefined;

    if (client) {
      const { data } = await client
        .from('video_generations')
        .select('video_url')
        .eq('provider_job_id', providerJobId)
        .single();
      videoUrl = data?.video_url;
    } else {
      videoUrl = memoryGenerationsDB.get(providerJobId)?.video_url;
    }

    if (!videoUrl) {
      videoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-wild-horse-in-a-field-43285-large.mp4';
    }

    res.redirect(videoUrl);
  });

  // -------------------------------------------------------------
  // 4. HISTORY ROUTE: GET /api/tools/video-studio/history
  // -------------------------------------------------------------
  app.get('/api/tools/video-studio/history', async (req: Request, res: Response) => {
    try {
      const user = await verifyUserToken(req.headers.authorization);
      const client = getSupabaseAdmin();
      let records: VideoGenerationRecord[] = [];

      if (client) {
        const { data } = await client
          .from('video_generations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (data) records = data as VideoGenerationRecord[];
      } else {
        records = Array.from(memoryGenerationsDB.values())
          .filter((g) => g.user_id === user.id)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      // Check background updates for any pending items
      const updatedRecords = await Promise.all(
        records.map(async (rec) => {
          if (rec.status === 'generating' || rec.status === 'queued') {
            const statusCheck = await checkOpenAiVideoStatus(rec.provider_job_id, user.id);
            if (statusCheck.status === 'completed' && statusCheck.videoUrl) {
              rec.status = 'completed';
              rec.generation_status = 'completed';
              rec.video_url = statusCheck.videoUrl;
              rec.thumbnail_url = statusCheck.thumbnailUrl;
            }
          }
          return rec;
        })
      );

      res.json({
        success: true,
        history: updatedRecords.map((r) => ({
          id: r.id,
          providerJobId: r.provider_job_id,
          prompt: r.prompt,
          quality: r.quality,
          duration: r.duration,
          aspectRatio: r.aspect_ratio,
          videoUrl: r.video_url || 'https://assets.mixkit.co/videos/preview/mixkit-wild-horse-in-a-field-43285-large.mp4',
          posterUrl: r.thumbnail_url || 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&q=80&w=800',
          status: r.status,
          createdAt: r.created_at
        }))
      });
    } catch (err: any) {
      console.error('Error in GET /api/tools/video-studio/history:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed fetching video history' });
    }
  });

  // -------------------------------------------------------------
  // 5. BILLING PLAN ROUTE: GET /api/video-studio/billing/plan
  // -------------------------------------------------------------
  app.get('/api/video-studio/billing/plan', async (req: Request, res: Response) => {
    try {
      const user = await verifyUserToken(req.headers.authorization);
      const client = getSupabaseAdmin();

      if (client) {
        const { data } = await client
          .from('video_studio_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data) {
          res.json({
            success: true,
            plan: {
              tier: data.plan_tier,
              status: data.status,
              provider: data.provider,
              monthlyCredits: data.monthly_video_credits,
              remainingCredits: data.remaining_credits,
              periodEnd: data.current_period_end
            }
          });
          return;
        }
      }

      const memSub = memorySubscriptionsDB.get(user.id);
      res.json({
        success: true,
        plan: {
          tier: memSub?.plan_tier || 'pro',
          status: memSub?.status || 'active',
          provider: memSub?.provider || 'stripe',
          monthlyCredits: memSub?.monthly_video_credits || 5000,
          remainingCredits: memSub?.remaining_credits || 4850,
          periodEnd: memSub?.current_period_end || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed fetching billing plan' });
    }
  });

  // -------------------------------------------------------------
  // 6. BILLING CHECKOUT ROUTE: POST /api/video-studio/billing/checkout
  // -------------------------------------------------------------
  app.post('/api/video-studio/billing/checkout', async (req: Request, res: Response) => {
    try {
      const user = await verifyUserToken(req.headers.authorization);
      const { planTier = 'pro', creditsToAdd = 1000, provider = 'stripe', amountUsd = 9.00 } = req.body;

      const client = getSupabaseAdmin();

      if (client) {
        // Record purchase transaction
        await client.from('video_studio_transactions').insert({
          user_id: user.id,
          amount_usd: amountUsd,
          payment_provider: provider,
          transaction_type: 'credit_pack',
          credits_added: creditsToAdd
        });

        // Top up credits
        const { data: subData } = await client
          .from('video_studio_subscriptions')
          .select('remaining_credits')
          .eq('user_id', user.id)
          .single();

        const currentCreds = subData?.remaining_credits || 0;
        const newTotal = currentCreds + creditsToAdd;

        await client
          .from('video_studio_subscriptions')
          .upsert({
            user_id: user.id,
            plan_tier: planTier,
            status: 'active',
            provider,
            remaining_credits: newTotal,
            updated_at: new Date().toISOString()
          });

        res.json({
          success: true,
          message: `Successfully topped up ${creditsToAdd} Video Studio credits!`,
          remainingCredits: newTotal
        });
      } else {
        const memSub = memorySubscriptionsDB.get(user.id) || {
          id: `sub-${user.id}`,
          user_id: user.id,
          plan_tier: planTier,
          status: 'active',
          provider,
          subscription_id: `sub_${Date.now()}`,
          monthly_video_credits: 5000,
          remaining_credits: 4850,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        };

        memSub.remaining_credits += creditsToAdd;
        memSub.updated_at = new Date().toISOString();
        memorySubscriptionsDB.set(user.id, memSub);

        res.json({
          success: true,
          message: `Successfully topped up ${creditsToAdd} Video Studio credits!`,
          remainingCredits: memSub.remaining_credits
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Checkout failed' });
    }
  });

  // -------------------------------------------------------------
  // 7. BILLING WEBHOOK ROUTE: POST /api/video-studio/billing/webhook
  // -------------------------------------------------------------
  app.post('/api/video-studio/billing/webhook', async (req: Request, res: Response) => {
    try {
      const event = req.body;
      const client = getSupabaseAdmin();

      if (event.type === 'invoice.payment_succeeded' || event.event_type === 'PAYMENT.SALE.COMPLETED') {
        const userId = event.data?.object?.metadata?.user_id || event.user_id;
        const credits = event.data?.object?.metadata?.credits || 5000;

        if (userId && client) {
          const { data: subData } = await client
            .from('video_studio_subscriptions')
            .select('remaining_credits')
            .eq('user_id', userId)
            .single();

          const updatedCredits = (subData?.remaining_credits || 0) + credits;

          await client
            .from('video_studio_subscriptions')
            .update({
              status: 'active',
              remaining_credits: updatedCredits,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);
        }
      } else if (event.type === 'customer.subscription.deleted') {
        const userId = event.data?.object?.metadata?.user_id;
        if (userId && client) {
          await client
            .from('video_studio_subscriptions')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('user_id', userId);
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      res.status(400).json({ error: `Webhook Handler Error: ${err.message}` });
    }
  });

  // -------------------------------------------------------------
  // Vite Middleware Setup
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Video Studio Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
