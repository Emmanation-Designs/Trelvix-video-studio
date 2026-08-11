import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { getSupabaseAdmin, verifyUserToken } from './server/db';
import { requestOpenAiVideoGeneration, checkOpenAiVideoStatus, generateOpenAiImage } from './server/openai';
import {
  getUserWallet,
  getCreditPackages,
  getPackageById,
  getGenerationCreditCost,
  deductUserCredits,
  refundUserCredits,
  refundGenerationCreditsOnce,
  recordPendingPayPalOrder,
  processVerifiedPayPalPayment,
  getUserTransactionHistory,
} from './server/videoStudioDb';
import {
  createPayPalOrder,
  capturePayPalOrder,
  verifyPayPalWebhookSignature,
} from './server/paypal';

dotenv.config();

export interface VideoGenerationRecord {
  id: string; // UUID
  user_id: string; // UUID
  provider_job_id: string; // TEXT
  prompt: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  duration: number; // INTEGER (seconds: 4, 6, 8, 12)
  resolution: string; // TEXT ('1080p', '720p', etc.)
  quality: string; // TEXT ('creative', 'super_creative')
  refunded: boolean;
  created_at: string;
  error_message?: string;
}

const memoryGenerationsDB = new Map<string, VideoGenerationRecord>();

function handleAuthOrServerError(res: Response, err: any, default500Message: string) {
  const message = err?.message || default500Message;
  const isAuth =
    message === 'Invalid or expired authentication token' ||
    message === 'Database/Auth service not configured' ||
    message.toLowerCase().includes('unauthorized') ||
    message.toLowerCase().includes('jwt') ||
    message.toLowerCase().includes('bearer token');

  if (isAuth) {
    res.status(401).json({ success: false, error: `Unauthorized: ${message}` });
    return;
  }
  res.status(500).json({ success: false, error: message });
}

export async function createExpressApp() {
  const app = express();

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Trelvix AI Video Studio Backend',
      paypalConfigured: Boolean(process.env.PAYPAL_CLIENT_ID),
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
      supabaseConfigured: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)),
      timestamp: new Date().toISOString(),
    });
  });

  // =============================================================
  // 1. VIDEO STUDIO CREDIT WALLET & PACKAGES ROUTES
  // =============================================================

  // Auth Verification endpoint for client-side account sync
  app.get('/api/video-studio/auth/me', async (req: Request, res: Response) => {
    try {
      const user = await verifyUserToken(req);
      const wallet = await getUserWallet(user.id);
      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
        },
        wallet: {
          balance: wallet.balance,
          lifetimeCreditsPurchased: wallet.lifetime_credits_purchased,
          lifetimeCreditsUsed: wallet.lifetime_credits_used,
        },
      });
    } catch (err: any) {
      console.error('[auth/me] Exception:', err);
      handleAuthOrServerError(res, err, 'Auth check failed');
    }
  });

  // GET /api/video-studio/credits - Fetch user's current wallet & credits
  app.get('/api/video-studio/credits', async (req: Request, res: Response) => {
    try {
      const user = await verifyUserToken(req);
      const wallet = await getUserWallet(user.id);
      res.json({
        success: true,
        wallet: {
          balance: wallet.balance,
          lifetimeCreditsPurchased: wallet.lifetime_credits_purchased,
          lifetimeCreditsUsed: wallet.lifetime_credits_used,
        },
      });
    } catch (err: any) {
      console.error('[credits] Exception:', err);
      handleAuthOrServerError(res, err, 'Failed fetching credit balance');
    }
  });

  // GET /api/video-studio/credit-packages - Fetch dynamic database credit packages
  app.get('/api/video-studio/credit-packages', async (_req: Request, res: Response) => {
    try {
      const packages = await getCreditPackages();
      res.json({
        success: true,
        packages: packages.map((pkg) => ({
          id: pkg.id,
          name: pkg.name,
          credits: pkg.credits,
          priceUsd: pkg.price_usd,
          estimatedGenerations: pkg.estimated_generations,
          active: pkg.active,
        })),
      });
    } catch (err: any) {
      console.error('Error fetching credit packages:', err);
      res.status(500).json({ success: false, error: 'Failed fetching credit packages' });
    }
  });

  // GET /api/video-studio/payments/history - Fetch transaction history
  app.get('/api/video-studio/payments/history', async (req: Request, res: Response) => {
    try {
      const user = await verifyUserToken(req);
      const history = await getUserTransactionHistory(user.id);
      res.json({
        success: true,
        history: history.map((item) => ({
          id: item.id,
          type: item.type,
          credits: item.credits,
          amount: item.amount,
          currency: item.currency,
          status: item.status,
          paypalOrderId: item.paypal_order_id,
          paypalCaptureId: item.paypal_capture_id,
          createdAt: item.created_at,
          metadata: item.metadata,
        })),
      });
    } catch (err: any) {
      console.error('[payments/history] Exception:', err);
      handleAuthOrServerError(res, err, 'Failed fetching transaction history');
    }
  });

  // =============================================================
  // 2. PAYPAL LIVE PAYMENT FLOW ROUTES
  // =============================================================

  // POST /api/video-studio/payments/paypal/create-order
  app.post('/api/video-studio/payments/paypal/create-order', async (req: Request, res: Response) => {
    try {
      const user = await verifyUserToken(req);
      const { packageId } = req.body;

      if (!packageId) {
        res.status(400).json({ success: false, error: 'packageId is required' });
        return;
      }

      const pkg = await getPackageById(packageId);
      if (!pkg || !pkg.active) {
        res.status(400).json({ success: false, error: 'Invalid or inactive credit package selected' });
        return;
      }

      const order = await createPayPalOrder({
        packageId: pkg.id,
        packageName: pkg.name,
        credits: pkg.credits,
        amountUsd: pkg.price_usd,
      });

      await recordPendingPayPalOrder({
        userId: user.id,
        packageId: pkg.id,
        packageName: pkg.name,
        credits: pkg.credits,
        amountUsd: pkg.price_usd,
        paypalOrderId: order.id,
      });

      res.json({
        success: true,
        orderId: order.id,
        isMock: order.isMock,
        package: {
          id: pkg.id,
          name: pkg.name,
          credits: pkg.credits,
          priceUsd: pkg.price_usd,
        },
      });
    } catch (err: any) {
      console.error('Error creating PayPal order:', err);
      if (err.message === 'Invalid or expired authentication token') {
        res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired authentication token' });
        return;
      }
      res.status(500).json({ success: false, error: err.message || 'Failed creating PayPal order' });
    }
  });

  // POST /api/video-studio/payments/paypal/capture-order
  app.post('/api/video-studio/payments/paypal/capture-order', async (req: Request, res: Response) => {
    try {
      const user = await verifyUserToken(req);
      const { orderId, packageId } = req.body;

      if (!orderId || !packageId) {
        res.status(400).json({ success: false, error: 'orderId and packageId are required' });
        return;
      }

      const captureResult = await capturePayPalOrder(orderId);

      if (captureResult.status !== 'COMPLETED') {
        res.status(400).json({
          success: false,
          error: `Payment capture failed with status: ${captureResult.status}`,
        });
        return;
      }

      const paymentProcess = await processVerifiedPayPalPayment({
        userId: user.id,
        paypalOrderId: orderId,
        paypalCaptureId: captureResult.captureId,
        packageId,
        amountPaid: parseFloat(captureResult.amount),
      });

      res.json({
        success: true,
        message: paymentProcess.alreadyProcessed
          ? 'Payment was already processed and credits added.'
          : `Payment successful! +${paymentProcess.creditsAdded} Video Studio credits added.`,
        creditsAdded: paymentProcess.creditsAdded,
        newBalance: paymentProcess.newBalance,
        captureId: captureResult.captureId,
      });
    } catch (err: any) {
      console.error('Error capturing PayPal order:', err);
      if (err.message === 'Invalid or expired authentication token') {
        res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired authentication token' });
        return;
      }
      res.status(500).json({ success: false, error: err.message || 'Failed capturing PayPal order' });
    }
  });

  // POST /api/video-studio/payments/paypal/webhook
  app.post('/api/video-studio/payments/paypal/webhook', async (req: Request, res: Response) => {
    try {
      const body = req.body;
      const headers = req.headers as Record<string, string>;

      const isValidSignature = await verifyPayPalWebhookSignature(headers, body);
      if (!isValidSignature) {
        console.warn('PayPal Webhook Signature verification failed');
      }

      const eventType = body.event_type;
      const resource = body.resource;

      if (eventType === 'PAYMENT.CAPTURE.COMPLETED' || eventType === 'CHECKOUT.ORDER.APPROVED') {
        const paypalOrderId = resource.supplementary_data?.related_ids?.order_id || resource.id;
        const paypalCaptureId = resource.id;
        const amountPaid = parseFloat(resource.amount?.value || '0');
        const customPackageId = resource.custom_id || resource.purchase_units?.[0]?.custom_id;
        const userId = resource.custom_user_id || resource.purchase_units?.[0]?.custom_user_id;

        if (paypalOrderId && customPackageId && userId) {
          await processVerifiedPayPalPayment({
            userId,
            paypalOrderId,
            paypalCaptureId,
            packageId: customPackageId,
            amountPaid,
          });
        }
      }

      res.status(200).json({ received: true });
    } catch (err: any) {
      console.error('Error handling PayPal webhook:', err);
      res.status(400).json({ error: `Webhook error: ${err.message}` });
    }
  });

  // POST /api/video-studio/credits/refund
  app.post('/api/video-studio/credits/refund', async (req: Request, res: Response) => {
    try {
      const user = await verifyUserToken(req);
      const { creditsToRefund, reason = 'Administrative refund' } = req.body;

      if (!creditsToRefund || creditsToRefund <= 0) {
        res.status(400).json({ success: false, error: 'Valid positive creditsToRefund required' });
        return;
      }

      const refundResult = await refundUserCredits(user.id, creditsToRefund, reason);
      res.json({
        success: true,
        message: `Successfully refunded ${creditsToRefund} credits.`,
        newBalance: refundResult.balance,
      });
    } catch (err: any) {
      if (err.message === 'Invalid or expired authentication token') {
        res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired authentication token' });
        return;
      }
      res.status(500).json({ success: false, error: err.message || 'Refund processing failed' });
    }
  });

  // =============================================================
  // 3. REAL VIDEO GENERATION PIPELINE
  // POST /api/video-studio/generations AND POST /api/tools/video-studio
  // =============================================================
  const handleVideoGenerationRequest = async (req: Request, res: Response) => {
    try {
      const user = await verifyUserToken(req);
      const {
        prompt,
        negativePrompt,
        model,
        quality = 'creative',
        duration = '6s',
        resolution = '1080p',
        aspectRatio = '16:9',
        batchCount = 'x1',
        imageInput,
        inputReferenceImage,
      } = req.body;

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ success: false, error: 'Prompt string is required' });
        return;
      }

      const count = parseInt((batchCount || 1).toString().replace('x', ''), 10) || 1;
      const durationNum = typeof duration === 'number'
        ? duration
        : parseInt((duration || '6s').toString().replace('s', ''), 10) || 6;
      const qualityMode = quality.toLowerCase().includes('super') ? 'super_creative' : 'creative';

      // 1. Calculate credit cost
      const creditCost = await getGenerationCreditCost(qualityMode, `${durationNum}s`, count);

      // 2. Check wallet balance
      const wallet = await getUserWallet(user.id);
      if (wallet.balance < creditCost) {
        res.status(402).json({
          success: false,
          error: `Insufficient Video Studio credits. Generation costs ${creditCost} credits, but your balance is ${wallet.balance}.`,
          remainingCredits: wallet.balance,
          creditCostRequired: creditCost,
        });
        return;
      }

      // 3. Atomically deduct credits
      const deduction = await deductUserCredits(
        user.id,
        creditCost,
        `Video Generation (${qualityMode}, ${durationNum}s, x${count})`
      );

      if (!deduction.success) {
        res.status(402).json({
          success: false,
          error: deduction.error || 'Failed deducting generation credits',
          remainingCredits: wallet.balance,
        });
        return;
      }

      // 4. Dispatch job creation to OpenAI for each batch count item
      const createdGenerations: VideoGenerationRecord[] = [];
      const client = getSupabaseAdmin();

      for (let i = 0; i < count; i++) {
        const generationUuid = crypto.randomUUID();
        const costPerVideo = Math.round(creditCost / count);

        // First insert row into video_generations with status = 'queued'
        const initialRecord: VideoGenerationRecord = {
          id: generationUuid,
          user_id: user.id,
          provider_job_id: `pending_${generationUuid}`,
          prompt: prompt.trim(),
          status: 'queued',
          duration: durationNum,
          resolution,
          quality: qualityMode,
          refunded: false,
          created_at: new Date().toISOString(),
        };

        if (client) {
          await client.from('video_generations').insert(initialRecord);
        } else {
          memoryGenerationsDB.set(initialRecord.id, initialRecord);
        }

        try {
          const genResult = await requestOpenAiVideoGeneration({
            prompt: prompt.trim(),
            negativePrompt,
            model,
            quality: qualityMode,
            duration: durationNum,
            resolution,
            aspectRatio,
            imageInput: imageInput || inputReferenceImage,
          });

          // Update record with provider_job_id and status = 'processing'
          const providerJobId = genResult.providerJobId;
          const updatedRecord: VideoGenerationRecord = {
            ...initialRecord,
            provider_job_id: providerJobId,
            status: 'processing',
          };

          if (client) {
            await client
              .from('video_generations')
              .update({
                provider_job_id: providerJobId,
                status: 'processing',
              })
              .eq('id', generationUuid);
          } else {
            memoryGenerationsDB.delete(initialRecord.id);
            memoryGenerationsDB.set(providerJobId, updatedRecord);
            memoryGenerationsDB.set(generationUuid, updatedRecord);
          }

          createdGenerations.push(updatedRecord);
        } catch (openAiError: any) {
          // On OpenAI error: refund credits for this video item immediately and mark status = 'failed'
          console.error(`OpenAI Video dispatch failed for item ${i + 1}/${count}:`, openAiError);
          const refundRes = await refundUserCredits(user.id, costPerVideo, `OpenAI dispatch error: ${openAiError.message}`);

          const failedRecord: VideoGenerationRecord = {
            ...initialRecord,
            status: 'failed',
            refunded: true,
            error_message: openAiError.message || 'Failed to dispatch generation job to OpenAI',
          };

          if (client) {
            await client
              .from('video_generations')
              .update({
                status: 'failed',
                refunded: true,
                error_message: failedRecord.error_message,
              })
              .eq('id', generationUuid);
          } else {
            memoryGenerationsDB.set(generationUuid, failedRecord);
          }

          res.status(500).json({
            success: false,
            error: `Generation request failed: ${openAiError.message}. Your ${costPerVideo} credits have been refunded.`,
            remainingCredits: refundRes.balance,
          });
          return;
        }
      }

      res.json({
        success: true,
        remainingCredits: deduction.balance,
        creditCost,
        videos: createdGenerations.map((g) => ({
          id: g.id,
          providerJobId: g.provider_job_id,
          prompt: g.prompt,
          status: g.status,
          quality: g.quality,
          duration: `${g.duration}s`,
          resolution: g.resolution,
        })),
      });
    } catch (err: any) {
      console.error('[generations] Exception:', err);
      handleAuthOrServerError(res, err, 'Internal server error');
    }
  };

  app.post('/api/video-studio/generations', handleVideoGenerationRequest);
  app.post('/api/tools/video-studio', handleVideoGenerationRequest);
  app.post('/api/video/generate', handleVideoGenerationRequest);

  // =============================================================
  // 4. POLLING & STATUS VERIFICATION
  // GET /api/video-studio/generations/:id/status AND GET /api/tools/video-studio/status/:id
  // =============================================================
  const handleStatusCheckRequest = async (req: Request, res: Response) => {
    try {
      const user = await verifyUserToken(req);
      const idParam = req.params.id || req.params.providerJobId;

      const client = getSupabaseAdmin();
      let record: VideoGenerationRecord | null = null;

      if (client) {
        const { data } = await client
          .from('video_generations')
          .select('*')
          .or(`id.eq.${idParam},provider_job_id.eq.${idParam}`)
          .maybeSingle();
        if (data) record = data as VideoGenerationRecord;
      } else {
        record = memoryGenerationsDB.get(idParam) || null;
      }

      // Enforce strict user ownership verification
      if (record && record.user_id !== user.id) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: You do not have permission to view this video generation.',
        });
        return;
      }

      if (record && record.status === 'completed' && record.video_url) {
        res.json({
          success: true,
          status: 'completed',
          video: {
            id: record.id,
            providerJobId: record.provider_job_id,
            prompt: record.prompt,
            status: 'completed',
            videoUrl: record.video_url,
            progress: 100,
          },
        });
        return;
      }

      const providerJobId = record?.provider_job_id || idParam;
      const statusResult = await checkOpenAiVideoStatus(providerJobId, user.id);

      if (statusResult.status === 'completed') {
        if (client && record) {
          await client
            .from('video_generations')
            .update({
              status: 'completed',
              video_url: statusResult.videoUrl,
            })
            .eq('id', record.id);
        } else if (record) {
          record.status = 'completed';
          record.video_url = statusResult.videoUrl;
          memoryGenerationsDB.set(record.id, record);
          memoryGenerationsDB.set(providerJobId, record);
        }

        res.json({
          success: true,
          status: 'completed',
          video: {
            id: record?.id || providerJobId,
            providerJobId,
            prompt: record?.prompt || '',
            status: 'completed',
            videoUrl: statusResult.videoUrl,
            progress: 100,
          },
        });
        return;
      } else if (statusResult.status === 'failed') {
        const costToRefund = record ? await getGenerationCreditCost(record.quality, `${record.duration}s`, 1) : 15;

        await refundGenerationCreditsOnce({
          userId: user.id,
          providerJobId,
          creditsToRefund: costToRefund,
          reason: `Asynchronous generation failed: ${statusResult.errorMessage || 'Unknown AI error'}`,
        });

        if (client && record) {
          await client
            .from('video_generations')
            .update({
              status: 'failed',
              error_message: statusResult.errorMessage,
              refunded: true,
            })
            .eq('id', record.id);
        } else if (record) {
          record.status = 'failed';
          record.error_message = statusResult.errorMessage;
          record.refunded = true;
          memoryGenerationsDB.set(record.id, record);
          memoryGenerationsDB.set(providerJobId, record);
        }

        res.json({
          success: true,
          status: 'failed',
          error: statusResult.errorMessage || 'Generation failed on OpenAI server',
          video: {
            id: record?.id || providerJobId,
            providerJobId,
            prompt: record?.prompt || '',
            status: 'failed',
            errorMessage: statusResult.errorMessage,
            progress: 0,
          },
        });
        return;
      }

      // Status is queued or processing
      res.json({
        success: true,
        status: 'processing',
        video: {
          id: record?.id || providerJobId,
          providerJobId,
          prompt: record?.prompt || '',
          status: 'processing',
          progress: statusResult.progress || 50,
        },
      });
    } catch (err: any) {
      console.error('[status] Exception:', err);
      handleAuthOrServerError(res, err, 'Failed checking status');
    }
  };

  app.get('/api/video-studio/generations/:id/status', handleStatusCheckRequest);
  app.get('/api/tools/video-studio/status/:providerJobId', handleStatusCheckRequest);

  // =============================================================
  // 5. REAL VIDEO ASSET SERVING & PROXY
  // GET /api/video-studio/generations/:id/video AND GET /api/tools/video-studio/content/:id
  // =============================================================
  const handleVideoServingRequest = async (req: Request, res: Response) => {
    try {
      const user = await verifyUserToken(req);
      const idParam = req.params.id || req.params.providerJobId;
      const client = getSupabaseAdmin();
      let record: VideoGenerationRecord | null = null;

      if (client) {
        const { data } = await client
          .from('video_generations')
          .select('*')
          .or(`id.eq.${idParam},provider_job_id.eq.${idParam}`)
          .maybeSingle();
        if (data) record = data as VideoGenerationRecord;
      } else {
        record = memoryGenerationsDB.get(idParam) || null;
      }

      if (record && record.user_id !== user.id) {
        res.status(403).json({ success: false, error: 'Forbidden: Access to this video asset is denied.' });
        return;
      }

      if (!record || !record.video_url || record.status !== 'completed') {
        res.status(404).json({ success: false, error: 'Video asset not found or generation not yet completed.' });
        return;
      }

      res.redirect(record.video_url);
    } catch (err: any) {
      console.error('[serving] Exception:', err);
      handleAuthOrServerError(res, err, 'Failed accessing video asset');
    }
  };

  app.get('/api/video-studio/generations/:id/video', handleVideoServingRequest);
  app.get('/api/tools/video-studio/content/:providerJobId', handleVideoServingRequest);

  // =============================================================
  // 6. REAL IMAGE GENERATION FOR CHARACTERS AND SCENES
  // POST /api/video-studio/images/generations AND POST /api/tools/video-studio/image
  // =============================================================
  const handleImageGenerationRequest = async (req: Request, res: Response) => {
    try {
      await verifyUserToken(req);
      const { prompt, model = 'gpt-image-2', size = '1024x1024', quality = 'standard' } = req.body;

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ success: false, error: 'Prompt string is required for image generation' });
        return;
      }

      const result = await generateOpenAiImage(prompt.trim(), { model, size, quality });

      res.json({
        success: true,
        imageUrl: result.imageUrl,
      });
    } catch (err: any) {
      console.error('[image/generation] Exception:', err);
      handleAuthOrServerError(res, err, 'Image generation failed');
    }
  };

  app.post('/api/video-studio/images/generations', handleImageGenerationRequest);
  app.post('/api/tools/video-studio/image', handleImageGenerationRequest);

  // =============================================================
  // 7. VIDEO HISTORY & DELETION
  // =============================================================
  const handleHistoryRequest = async (req: Request, res: Response) => {
    try {
      const user = await verifyUserToken(req);
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

      const updatedRecords = await Promise.all(
        records.map(async (rec) => {
          try {
            if (rec.status === 'processing' || rec.status === 'queued') {
              const statusCheck = await checkOpenAiVideoStatus(rec.provider_job_id, user.id);
              if (statusCheck.status === 'completed' && statusCheck.videoUrl) {
                rec.status = 'completed';
                rec.video_url = statusCheck.videoUrl;
                if (client) {
                  await client.from('video_generations').update({ status: 'completed', video_url: statusCheck.videoUrl }).eq('id', rec.id);
                }
              } else if (statusCheck.status === 'failed') {
                rec.status = 'failed';
                rec.error_message = statusCheck.errorMessage;
                const costToRefund = await getGenerationCreditCost(rec.quality, `${rec.duration}s`, 1);
                await refundGenerationCreditsOnce({
                  userId: user.id,
                  providerJobId: rec.provider_job_id,
                  creditsToRefund: costToRefund,
                  reason: `Asynchronous generation failed: ${statusCheck.errorMessage || 'Unknown AI error'}`,
                });
                rec.refunded = true;
                if (client) {
                  await client.from('video_generations').update({ status: 'failed', refunded: true, error_message: statusCheck.errorMessage }).eq('id', rec.id);
                }
              }
            }
          } catch (itemErr) {
            console.warn(`[handleHistoryRequest] Warning checking status for generation ${rec.id}:`, itemErr);
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
          duration: `${r.duration}s`,
          resolution: r.resolution,
          videoUrl: r.video_url || null,
          status: r.status,
          createdAt: r.created_at,
          errorMessage: r.error_message,
        })),
      });
    } catch (err: any) {
      console.error('[history] Exception:', err);
      handleAuthOrServerError(res, err, 'Failed fetching video history');
    }
  };

  app.get('/api/video-studio/generations/history', handleHistoryRequest);
  app.get('/api/tools/video-studio/history', handleHistoryRequest);

  // DELETE /api/tools/video-studio/:id AND /api/video-studio/generations/:id
  const handleDeleteRequest = async (req: Request, res: Response) => {
    try {
      const user = await verifyUserToken(req);
      const idParam = req.params.id || req.params.providerJobId;
      const client = getSupabaseAdmin();

      if (client) {
        const { data: record } = await client
          .from('video_generations')
          .select('user_id')
          .or(`id.eq.${idParam},provider_job_id.eq.${idParam}`)
          .maybeSingle();

        if (!record) {
          res.status(404).json({ success: false, error: 'Video generation record not found.' });
          return;
        }
        if (record.user_id !== user.id) {
          res.status(403).json({ success: false, error: 'Forbidden: Cannot delete video owned by another user.' });
          return;
        }

        await client.from('video_generations').delete().or(`id.eq.${idParam},provider_job_id.eq.${idParam}`);
      } else {
        const record = memoryGenerationsDB.get(idParam);
        if (!record) {
          res.status(404).json({ success: false, error: 'Video generation record not found.' });
          return;
        }
        if (record.user_id !== user.id) {
          res.status(403).json({ success: false, error: 'Forbidden: Cannot delete video owned by another user.' });
          return;
        }
        memoryGenerationsDB.delete(idParam);
      }

      res.json({ success: true, message: 'Video generation record deleted successfully.' });
    } catch (err: any) {
      console.error('[delete] Exception:', err);
      handleAuthOrServerError(res, err, 'Failed deleting video generation');
    }
  };

  app.delete('/api/video-studio/generations/:id', handleDeleteRequest);
  app.delete('/api/tools/video-studio/:providerJobId', handleDeleteRequest);

  // Catch-all 404 handler for API routes to guarantee JSON response and prevent HTML SPA fallback
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Vite Middleware Setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

async function startServer() {
  const app = await createExpressApp();
  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Video Studio Server listening on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  startServer();
}

