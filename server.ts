import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { getSupabaseAdmin, verifyUserToken } from './server/db.js';
import { requestOpenAiVideoGeneration, checkOpenAiVideoStatus, generateOpenAiImage } from './server/openai.js';
import {
  getUserWallet,
  getCreditPackages,
  getPackageById,
  reserveUserCredits,
  convertReservationToConsumed,
  releaseOrRefundReservation,
  refundUserCredits,
  recordPendingPayPalOrder,
  processVerifiedPayPalPayment,
  getUserTransactionHistory,
  VideoGenerationRecord,
  memoryGenerationsDB,
} from './server/videoStudioDb.js';
import {
  findVideoModelConfig,
  resolveOpenAiSize,
  calculateRequiredCredits,
  calculateCostAnalysis,
  VIDEO_MODELS,
} from './server/videoPricingConfig.js';
import {
  createPayPalOrder,
  capturePayPalOrder,
  verifyPayPalWebhookSignature,
} from './server/paypal.js';

dotenv.config();

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
          badge: pkg.badge,
          pricePerCreditFormatted: pkg.price_usd ? `$${(pkg.price_usd / pkg.credits).toFixed(4)}` : undefined,
        })),
      });
    } catch (err: any) {
      console.error('Error fetching credit packages:', err);
      res.status(500).json({ success: false, error: 'Failed fetching credit packages' });
    }
  });

  // GET /api/video-studio/models - Fetch central OpenAI video models configuration
  app.get('/api/video-studio/models', async (_req: Request, res: Response) => {
    res.json({
      success: true,
      models: VIDEO_MODELS,
    });
  });

  // GET /api/video-studio/admin/cost-analysis - Internal cost calculation view/endpoint
  app.get('/api/video-studio/admin/cost-analysis', async (req: Request, res: Response) => {
    try {
      const model = (req.query.model as string) || 'sora-2-720p';
      const seconds = parseInt((req.query.seconds as string) || '4', 10);
      const batchCount = parseInt((req.query.batchCount as string) || '1', 10);

      const metrics = calculateCostAnalysis(model, seconds, batchCount);
      res.json({
        success: true,
        models: VIDEO_MODELS,
        metrics,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Error generating cost analysis' });
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

      const captureResult = await capturePayPalOrder(orderId, packageId);

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
        model,
        quality,
        duration,
        seconds,
        resolution,
        size,
        aspectRatio,
        batchCount = 'x1',
        imageInput,
        inputReferenceImage,
      } = req.body;

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ success: false, error: 'Prompt string is required' });
        return;
      }

      const count = parseInt((batchCount || 1).toString().replace('x', ''), 10) || 1;
      const rawSec = seconds || duration;
      const durationNum = typeof rawSec === 'number'
        ? rawSec
        : parseInt((rawSec || '4s').toString().replace('s', ''), 10) || 4;
      const validSeconds = [4, 8, 12].includes(durationNum) ? durationNum : 4;

      const modelOption = findVideoModelConfig(model || quality || '', resolution);
      const openAiSize = size || resolveOpenAiSize(modelOption.id, aspectRatio || '16:9');

      // 1. Calculate credit cost authoritatively on backend
      const creditCost = calculateRequiredCredits(modelOption.id, validSeconds, count);

      // 2. Check wallet balance
      const wallet = await getUserWallet(user.id);
      if (wallet.available_credits < creditCost) {
        res.status(402).json({
          success: false,
          error: `INSUFFICIENT_CREDITS: Required ${creditCost} credits, but available balance is ${wallet.available_credits}.`,
          remainingCredits: wallet.available_credits,
          creditCostRequired: creditCost,
        });
        return;
      }

      // 3. Atomically RESERVE credits
      const reservation = await reserveUserCredits(
        user.id,
        creditCost,
        `Video Generation (${modelOption.displayName}, ${validSeconds}s, ${openAiSize}, x${count})`
      );

      if (!reservation.success) {
        res.status(402).json({
          success: false,
          error: reservation.error || 'INSUFFICIENT_CREDITS: Failed reserving credits',
          remainingCredits: wallet.available_credits,
        });
        return;
      }

      // 4. Dispatch job creation to OpenAI for each batch count item
      const createdGenerations: VideoGenerationRecord[] = [];
      const client = getSupabaseAdmin();

      for (let i = 0; i < count; i++) {
        const generationUuid = crypto.randomUUID();
        const costPerVideo = Math.round(creditCost / count);

        const initialRecord: VideoGenerationRecord = {
          id: generationUuid,
          user_id: user.id,
          provider_job_id: `pending_${generationUuid}`,
          prompt: prompt.trim(),
          status: 'queued',
          duration: validSeconds,
          resolution: openAiSize,
          quality: modelOption.id,
          credits_reserved: costPerVideo,
          credits_consumed: 0,
          credit_status: 'reserved',
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
            model: modelOption.model,
            seconds: validSeconds,
            size: openAiSize,
            imageInput: imageInput || inputReferenceImage,
          });

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
          // Provider job creation failure: release/refund the reservation immediately
          console.error(`OpenAI Video dispatch failed for item ${i + 1}/${count}:`, openAiError);
          
          const releaseRes = await releaseOrRefundReservation({
            userId: user.id,
            providerJobId: `pending_${generationUuid}`,
            creditsToRefund: costPerVideo,
            reason: `PROVIDER_REQUEST_FAILED: ${openAiError.message}`,
          });

          const failedRecord: VideoGenerationRecord = {
            ...initialRecord,
            status: 'failed',
            credit_status: 'refunded',
            refunded: true,
            error_message: openAiError.message || 'Failed to dispatch generation job to OpenAI',
          };

          if (client) {
            await client
              .from('video_generations')
              .update({
                status: 'failed',
                credit_status: 'refunded',
                refunded: true,
                error_message: failedRecord.error_message,
              })
              .eq('id', generationUuid);
          } else {
            memoryGenerationsDB.set(generationUuid, failedRecord);
          }

          res.status(500).json({
            success: false,
            error: `PROVIDER_REQUEST_FAILED: ${openAiError.message}. Reserved credits released.`,
            remainingCredits: releaseRes.balance,
          });
          return;
        }
      }

      const freshWallet = await getUserWallet(user.id);
      res.json({
        success: true,
        remainingCredits: freshWallet.available_credits,
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
        const costToConsume = record?.credits_reserved || calculateRequiredCredits(record?.quality || 'sora-2-720p', record?.duration || 4, 1);

        // Convert reservation to consumed idempotently
        await convertReservationToConsumed({
          userId: user.id,
          providerJobId,
          credits: costToConsume,
          description: `Generation completed for job ${providerJobId}`,
        });

        if (client && record) {
          await client
            .from('video_generations')
            .update({
              status: 'completed',
              credit_status: 'consumed',
              credits_consumed: costToConsume,
              video_url: statusResult.videoUrl,
            })
            .eq('id', record.id);
        } else if (record) {
          record.status = 'completed';
          record.credit_status = 'consumed';
          record.credits_consumed = costToConsume;
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
      } else if (statusResult.status === 'failed' || (statusResult.status as string) === 'expired') {
        const costToRefund = record?.credits_reserved || calculateRequiredCredits(record?.quality || 'sora-2-720p', record?.duration || 4, 1);

        // Release reservation exact-once
        await releaseOrRefundReservation({
          userId: user.id,
          providerJobId,
          creditsToRefund: costToRefund,
          reason: `PROVIDER_GENERATION_FAILED: ${statusResult.errorMessage || 'Generation failed on provider server'}`,
        });

        if (client && record) {
          await client
            .from('video_generations')
            .update({
              status: 'failed',
              credit_status: 'refunded',
              error_message: statusResult.errorMessage,
              refunded: true,
            })
            .eq('id', record.id);
        } else if (record) {
          record.status = 'failed';
          record.credit_status = 'refunded';
          record.error_message = statusResult.errorMessage;
          record.refunded = true;
          memoryGenerationsDB.set(record.id, record);
          memoryGenerationsDB.set(providerJobId, record);
        }

        res.json({
          success: true,
          status: 'failed',
          error: statusResult.errorMessage || 'PROVIDER_GENERATION_FAILED',
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

      // Status is queued or processing - NO CREDIT MUTATION
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
                rec.credit_status = 'consumed';
                const costToConsume = rec.credits_reserved || calculateRequiredCredits(rec.quality, rec.duration, 1);
                rec.credits_consumed = costToConsume;

                await convertReservationToConsumed({
                  userId: user.id,
                  providerJobId: rec.provider_job_id,
                  credits: costToConsume,
                  description: `Generation completed for job ${rec.provider_job_id}`,
                });

                if (client) {
                  await client.from('video_generations').update({ status: 'completed', credit_status: 'consumed', credits_consumed: costToConsume, video_url: statusCheck.videoUrl }).eq('id', rec.id);
                }
              } else if (statusCheck.status === 'failed' || (statusCheck.status as string) === 'expired') {
                rec.status = 'failed';
                rec.error_message = statusCheck.errorMessage;
                rec.credit_status = 'refunded';
                rec.refunded = true;
                const costToRefund = rec.credits_reserved || calculateRequiredCredits(rec.quality, rec.duration, 1);

                await releaseOrRefundReservation({
                  userId: user.id,
                  providerJobId: rec.provider_job_id,
                  creditsToRefund: costToRefund,
                  reason: `PROVIDER_GENERATION_FAILED: ${statusCheck.errorMessage || 'Generation failed on provider server'}`,
                });

                if (client) {
                  await client.from('video_generations').update({ status: 'failed', credit_status: 'refunded', refunded: true, error_message: statusCheck.errorMessage }).eq('id', rec.id);
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

