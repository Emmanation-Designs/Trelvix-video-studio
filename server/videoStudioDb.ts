import { getSupabaseAdmin } from './db';

export interface VideoCreditPackage {
  id: string;
  name: string;
  credits: number;
  price_usd: number;
  active: boolean;
  sort_order: number;
  estimated_generations?: number;
}

export interface VideoCreditWallet {
  user_id: string;
  balance: number;
  lifetime_credits_purchased: number;
  lifetime_credits_used: number;
  created_at: string;
  updated_at: string;
}

export interface VideoCreditTransaction {
  id: string;
  user_id: string;
  type: 'PURCHASE' | 'USAGE' | 'REFUND' | 'ADJUSTMENT';
  credits: number;
  amount: number;
  currency: string;
  paypal_order_id?: string;
  paypal_capture_id?: string;
  package_id?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  metadata?: any;
  created_at: string;
}

export interface GenerationRate {
  quality_mode: string;
  duration_seconds: number;
  credits_cost: number;
}

// In-Memory Fallback Stores
const memoryPackages: VideoCreditPackage[] = [
  { id: 'pkg-starter', name: 'Starter', credits: 40, price_usd: 4.99, active: true, sort_order: 1 },
  { id: 'pkg-creator', name: 'Creator', credits: 100, price_usd: 9.99, active: true, sort_order: 2 },
  { id: 'pkg-studio', name: 'Studio', credits: 220, price_usd: 19.99, active: true, sort_order: 3 },
  { id: 'pkg-pro-studio', name: 'Pro Studio', credits: 500, price_usd: 39.99, active: true, sort_order: 4 },
];

const memoryGenerationRates: GenerationRate[] = [
  { quality_mode: 'creative', duration_seconds: 4, credits_cost: 10 },
  { quality_mode: 'creative', duration_seconds: 6, credits_cost: 15 },
  { quality_mode: 'creative', duration_seconds: 8, credits_cost: 20 },
  { quality_mode: 'creative', duration_seconds: 12, credits_cost: 30 },
  { quality_mode: 'super_creative', duration_seconds: 4, credits_cost: 20 },
  { quality_mode: 'super_creative', duration_seconds: 6, credits_cost: 30 },
  { quality_mode: 'super_creative', duration_seconds: 8, credits_cost: 40 },
  { quality_mode: 'super_creative', duration_seconds: 12, credits_cost: 60 },
];

const memoryWallets = new Map<string, VideoCreditWallet>();
const memoryTransactions: VideoCreditTransaction[] = [];

/**
 * Fetch all active Video Credit Packages with dynamic estimated generations
 */
export async function getCreditPackages(): Promise<VideoCreditPackage[]> {
  const client = getSupabaseAdmin();
  let packages: VideoCreditPackage[] = [];

  if (client) {
    try {
      const { data, error } = await client
        .from('video_credit_packages')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (!error && data && data.length > 0) {
        packages = data.map((item) => ({
          id: item.id,
          name: item.name,
          credits: item.credits,
          price_usd: parseFloat(item.price_usd),
          active: item.active,
          sort_order: item.sort_order,
        }));
      }
    } catch (err) {
      console.warn('Supabase packages fetch failed, using fallback packages:', err);
    }
  }

  if (packages.length === 0) {
    packages = [...memoryPackages];
  }

  // Calculate estimated generations based on standard creative 6s cost (15 credits)
  const baseGenCost = 15;
  return packages.map((pkg) => ({
    ...pkg,
    estimated_generations: Math.floor(pkg.credits / baseGenCost),
  }));
}

/**
 * Get package by ID safely from database or memory
 */
export async function getPackageById(packageId: string): Promise<VideoCreditPackage | null> {
  const pkgs = await getCreditPackages();
  return pkgs.find((p) => p.id === packageId) || null;
}

/**
 * Calculate generation cost dynamically based on quality and duration
 */
export async function getGenerationCreditCost(qualityMode: string, durationStr: string, batchCount: number = 1): Promise<number> {
  const durationSeconds = parseInt(durationStr.replace('s', ''), 10) || 6;
  const normalizedQuality = qualityMode.toLowerCase().includes('super') ? 'super_creative' : 'creative';

  const client = getSupabaseAdmin();
  let rateCost: number | null = null;

  if (client) {
    try {
      const { data } = await client
        .from('video_generation_rates')
        .select('credits_cost')
        .eq('quality_mode', normalizedQuality)
        .eq('duration_seconds', durationSeconds)
        .single();

      if (data) rateCost = data.credits_cost;
    } catch {
      // ignore
    }
  }

  if (rateCost === null) {
    const rate = memoryGenerationRates.find(
      (r) => r.quality_mode === normalizedQuality && r.duration_seconds === durationSeconds
    );
    rateCost = rate ? rate.credits_cost : (normalizedQuality === 'super_creative' ? 30 : 15);
  }

  return rateCost * Math.max(1, batchCount);
}

/**
 * Retrieve user's Video Credit Wallet balance and stats
 */
export async function getUserWallet(userId: string): Promise<VideoCreditWallet> {
  const client = getSupabaseAdmin();

  if (client) {
    try {
      const { data, error } = await client
        .from('video_credit_wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return {
          user_id: data.user_id,
          balance: data.balance,
          lifetime_credits_purchased: data.lifetime_credits_purchased,
          lifetime_credits_used: data.lifetime_credits_used,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }

      // Initialize default wallet with 0 credits if no row exists
      const defaultWallet: VideoCreditWallet = {
        user_id: userId,
        balance: 0,
        lifetime_credits_purchased: 0,
        lifetime_credits_used: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insertErr } = await client.from('video_credit_wallets').insert(defaultWallet);
      if (insertErr) {
        console.warn('Note: Default wallet creation in Supabase returned:', insertErr.message);
      }
      return defaultWallet;
    } catch (err) {
      console.warn('Error fetching Supabase wallet, falling back to memory:', err);
    }
  }

  let wallet = memoryWallets.get(userId);
  if (!wallet) {
    wallet = {
      user_id: userId,
      balance: 0,
      lifetime_credits_purchased: 0,
      lifetime_credits_used: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryWallets.set(userId, wallet);
  }

  return wallet;
}

/**
 * Deduct credits from user wallet for generation atomically
 */
export async function deductUserCredits(
  userId: string,
  creditsToDeduct: number,
  description: string
): Promise<{ success: boolean; balance: number; error?: string }> {
  const client = getSupabaseAdmin();

  if (client) {
    try {
      // 1. Try atomic PostgreSQL function call via RPC
      const { data: rpcData, error: rpcError } = await client.rpc('deduct_video_credits', {
        p_user_id: userId,
        p_credits_to_deduct: creditsToDeduct,
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        const result = rpcData[0];
        if (result.success) {
          // Record transaction
          await client.from('video_credit_transactions').insert({
            user_id: userId,
            type: 'USAGE',
            credits: -creditsToDeduct,
            amount: 0.00,
            currency: 'USD',
            status: 'COMPLETED',
            metadata: { description },
          });

          return { success: true, balance: result.new_balance };
        } else {
          return {
            success: false,
            balance: result.new_balance,
            error: `Insufficient Video Studio credits. Needed ${creditsToDeduct} credits, but your balance is ${result.new_balance}.`,
          };
        }
      }

      // 2. Fallback to atomic direct query if RPC is missing
      const wallet = await getUserWallet(userId);
      if (wallet.balance < creditsToDeduct) {
        return {
          success: false,
          balance: wallet.balance,
          error: `Insufficient Video Studio credits. Needed ${creditsToDeduct} credits, but your balance is ${wallet.balance}.`,
        };
      }

      const newBalance = wallet.balance - creditsToDeduct;
      const newUsed = wallet.lifetime_credits_used + creditsToDeduct;
      const now = new Date().toISOString();

      const { data: updatedRows, error: updateErr } = await client
        .from('video_credit_wallets')
        .update({ balance: newBalance, lifetime_credits_used: newUsed, updated_at: now })
        .eq('user_id', userId)
        .gte('balance', creditsToDeduct)
        .select();

      if (!updateErr && updatedRows && updatedRows.length > 0) {
        await client.from('video_credit_transactions').insert({
          user_id: userId,
          type: 'USAGE',
          credits: -creditsToDeduct,
          amount: 0.00,
          currency: 'USD',
          status: 'COMPLETED',
          metadata: { description },
        });

        return { success: true, balance: updatedRows[0].balance };
      } else {
        const freshWallet = await getUserWallet(userId);
        return {
          success: false,
          balance: freshWallet.balance,
          error: `Insufficient Video Studio credits. Needed ${creditsToDeduct} credits, but your balance is ${freshWallet.balance}.`,
        };
      }
    } catch (err: any) {
      console.error('Error deducting credits in Supabase:', err);
    }
  }

  // Fallback memory wallet update (synchronous check & update)
  let wallet = memoryWallets.get(userId);
  if (!wallet) {
    wallet = {
      user_id: userId,
      balance: 0,
      lifetime_credits_purchased: 0,
      lifetime_credits_used: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    memoryWallets.set(userId, wallet);
  }

  if (wallet.balance < creditsToDeduct) {
    return {
      success: false,
      balance: wallet.balance,
      error: `Insufficient Video Studio credits. Needed ${creditsToDeduct} credits, but your balance is ${wallet.balance}.`,
    };
  }

  const newBalance = wallet.balance - creditsToDeduct;
  const newUsed = wallet.lifetime_credits_used + creditsToDeduct;
  const now = new Date().toISOString();

  wallet.balance = newBalance;
  wallet.lifetime_credits_used = newUsed;
  wallet.updated_at = now;

  memoryTransactions.unshift({
    id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    user_id: userId,
    type: 'USAGE',
    credits: -creditsToDeduct,
    amount: 0.00,
    currency: 'USD',
    status: 'COMPLETED',
    metadata: { description },
    created_at: now,
  });

  return { success: true, balance: newBalance };
}

/**
 * Refund credits to user wallet for failed generation
 */
export async function refundUserCredits(
  userId: string,
  creditsToRefund: number,
  reason: string,
  extraMetadata: Record<string, any> = {}
): Promise<{ success: boolean; balance: number }> {
  const wallet = await getUserWallet(userId);
  const client = getSupabaseAdmin();

  const newBalance = wallet.balance + creditsToRefund;
  const newUsed = Math.max(0, wallet.lifetime_credits_used - creditsToRefund);
  const now = new Date().toISOString();

  if (client) {
    try {
      await client
        .from('video_credit_wallets')
        .update({ balance: newBalance, lifetime_credits_used: newUsed, updated_at: now })
        .eq('user_id', userId);

      await client.from('video_credit_transactions').insert({
        user_id: userId,
        type: 'REFUND',
        credits: creditsToRefund,
        amount: 0.00,
        currency: 'USD',
        status: 'COMPLETED',
        metadata: { reason, ...extraMetadata },
      });

      return { success: true, balance: newBalance };
    } catch (err) {
      console.error('Error refunding credits in Supabase:', err);
    }
  }

  wallet.balance = newBalance;
  wallet.lifetime_credits_used = newUsed;
  wallet.updated_at = now;
  memoryWallets.set(userId, wallet);

  memoryTransactions.unshift({
    id: `tx-ref-${Date.now()}`,
    user_id: userId,
    type: 'REFUND',
    credits: creditsToRefund,
    amount: 0.00,
    currency: 'USD',
    status: 'COMPLETED',
    metadata: { reason, ...extraMetadata },
    created_at: now,
  });

  return { success: true, balance: newBalance };
}

/**
 * Idempotently refund generation credits exactly once for a specific generation job
 */
export async function refundGenerationCreditsOnce(params: {
  userId: string;
  providerJobId: string;
  creditsToRefund: number;
  reason: string;
}): Promise<{ success: boolean; balance: number; alreadyRefunded?: boolean }> {
  const { userId, providerJobId, creditsToRefund, reason } = params;
  const client = getSupabaseAdmin();

  if (creditsToRefund <= 0) {
    const wallet = await getUserWallet(userId);
    return { success: true, balance: wallet.balance, alreadyRefunded: false };
  }

  if (client) {
    try {
      // Check existing refund transaction with this provider_job_id in metadata
      const { data: existingTx } = await client
        .from('video_credit_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'REFUND')
        .filter('metadata->>provider_job_id', 'eq', providerJobId)
        .maybeSingle();

      if (existingTx) {
        const wallet = await getUserWallet(userId);
        return { success: true, balance: wallet.balance, alreadyRefunded: true };
      }

      // Check if video generation record is already marked as refunded
      const { data: genRecord } = await client
        .from('video_generations')
        .select('refunded')
        .eq('provider_job_id', providerJobId)
        .maybeSingle();

      if (genRecord && genRecord.refunded) {
        const wallet = await getUserWallet(userId);
        return { success: true, balance: wallet.balance, alreadyRefunded: true };
      }

      const res = await refundUserCredits(userId, creditsToRefund, reason, { provider_job_id: providerJobId });

      await client
        .from('video_generations')
        .update({ refunded: true })
        .eq('provider_job_id', providerJobId);

      return { success: true, balance: res.balance, alreadyRefunded: false };
    } catch (err) {
      console.error('Error checking double refund in Supabase:', err);
    }
  }

  // Memory fallback idempotency check
  const existingMemRefund = memoryTransactions.find(
    (t) => t.user_id === userId && t.type === 'REFUND' && t.metadata?.provider_job_id === providerJobId
  );

  if (existingMemRefund) {
    const wallet = await getUserWallet(userId);
    return { success: true, balance: wallet.balance, alreadyRefunded: true };
  }

  const res = await refundUserCredits(userId, creditsToRefund, reason, { provider_job_id: providerJobId });
  return { success: true, balance: res.balance, alreadyRefunded: false };
}

/**
 * Record pending PayPal Order Transaction
 */
export async function recordPendingPayPalOrder(params: {
  userId: string;
  packageId: string;
  packageName: string;
  credits: number;
  amountUsd: number;
  paypalOrderId: string;
}): Promise<void> {
  const { userId, packageId, packageName, credits, amountUsd, paypalOrderId } = params;
  const client = getSupabaseAdmin();

  if (client) {
    try {
      await client.from('video_credit_transactions').insert({
        user_id: userId,
        type: 'PURCHASE',
        credits,
        amount: amountUsd,
        currency: 'USD',
        package_id: packageId,
        paypal_order_id: paypalOrderId,
        status: 'PENDING',
        metadata: { packageName },
      });
      return;
    } catch (err) {
      console.warn('Error recording pending order in Supabase:', err);
    }
  }

  memoryTransactions.unshift({
    id: `tx-ord-${Date.now()}`,
    user_id: userId,
    type: 'PURCHASE',
    credits,
    amount: amountUsd,
    currency: 'USD',
    package_id: packageId,
    paypal_order_id: paypalOrderId,
    status: 'PENDING',
    metadata: { packageName },
    created_at: new Date().toISOString(),
  });
}

/**
 * Idempotently Process Verified PayPal Payment Capture
 */
export async function processVerifiedPayPalPayment(params: {
  userId: string;
  paypalOrderId: string;
  paypalCaptureId: string;
  packageId: string;
  amountPaid: number;
}): Promise<{ success: boolean; creditsAdded: number; newBalance: number; alreadyProcessed?: boolean }> {
  const { userId, paypalOrderId, paypalCaptureId, packageId, amountPaid } = params;

  // Retrieve the authoritative package from database/memory
  const pkg = await getPackageById(packageId);
  const creditsToAdd = pkg ? pkg.credits : 100;
  const client = getSupabaseAdmin();

  if (client) {
    try {
      // Check if transaction with this PayPal capture or order is already COMPLETED (idempotency check)
      const { data: existingTx } = await client
        .from('video_credit_transactions')
        .select('*')
        .or(`paypal_order_id.eq.${paypalOrderId},paypal_capture_id.eq.${paypalCaptureId}`)
        .eq('status', 'COMPLETED')
        .single();

      if (existingTx) {
        const currentWallet = await getUserWallet(userId);
        return {
          success: true,
          creditsAdded: existingTx.credits,
          newBalance: currentWallet.balance,
          alreadyProcessed: true,
        };
      }

      // Update existing pending transaction or create completed transaction
      const { data: pendingTx } = await client
        .from('video_credit_transactions')
        .select('id')
        .eq('paypal_order_id', paypalOrderId)
        .single();

      if (pendingTx) {
        await client
          .from('video_credit_transactions')
          .update({
            paypal_capture_id: paypalCaptureId,
            status: 'COMPLETED',
            amount: amountPaid > 0 ? amountPaid : pkg?.price_usd || 0,
            credits: creditsToAdd,
          })
          .eq('id', pendingTx.id);
      } else {
        await client.from('video_credit_transactions').insert({
          user_id: userId,
          type: 'PURCHASE',
          credits: creditsToAdd,
          amount: amountPaid > 0 ? amountPaid : pkg?.price_usd || 0,
          currency: 'USD',
          paypal_order_id: paypalOrderId,
          paypal_capture_id: paypalCaptureId,
          package_id: packageId,
          status: 'COMPLETED',
          metadata: { packageName: pkg?.name || 'Credit Pack' },
        });
      }

      // Atomically update wallet
      const currentWallet = await getUserWallet(userId);
      const newBalance = currentWallet.balance + creditsToAdd;
      const newLifetime = currentWallet.lifetime_credits_purchased + creditsToAdd;
      const now = new Date().toISOString();

      await client
        .from('video_credit_wallets')
        .update({
          balance: newBalance,
          lifetime_credits_purchased: newLifetime,
          updated_at: now,
        })
        .eq('user_id', userId);

      return {
        success: true,
        creditsAdded: creditsToAdd,
        newBalance,
        alreadyProcessed: false,
      };
    } catch (err) {
      console.error('Error processing verified payment in Supabase:', err);
    }
  }

  // Memory fallback handling
  const existingMemTx = memoryTransactions.find(
    (t) =>
      (t.paypal_order_id === paypalOrderId || t.paypal_capture_id === paypalCaptureId) &&
      t.status === 'COMPLETED'
  );

  if (existingMemTx) {
    const memWallet = await getUserWallet(userId);
    return {
      success: true,
      creditsAdded: existingMemTx.credits,
      newBalance: memWallet.balance,
      alreadyProcessed: true,
    };
  }

  const pendingMemTx = memoryTransactions.find((t) => t.paypal_order_id === paypalOrderId);
  if (pendingMemTx) {
    pendingMemTx.status = 'COMPLETED';
    pendingMemTx.paypal_capture_id = paypalCaptureId;
    pendingMemTx.credits = creditsToAdd;
    pendingMemTx.amount = amountPaid > 0 ? amountPaid : pkg?.price_usd || 0;
  } else {
    memoryTransactions.unshift({
      id: `tx-pay-${Date.now()}`,
      user_id: userId,
      type: 'PURCHASE',
      credits: creditsToAdd,
      amount: amountPaid > 0 ? amountPaid : pkg?.price_usd || 0,
      currency: 'USD',
      paypal_order_id: paypalOrderId,
      paypal_capture_id: paypalCaptureId,
      package_id: packageId,
      status: 'COMPLETED',
      metadata: { packageName: pkg?.name || 'Credit Pack' },
      created_at: new Date().toISOString(),
    });
  }

  const wallet = await getUserWallet(userId);
  wallet.balance += creditsToAdd;
  wallet.lifetime_credits_purchased += creditsToAdd;
  wallet.updated_at = new Date().toISOString();
  memoryWallets.set(userId, wallet);

  return {
    success: true,
    creditsAdded: creditsToAdd,
    newBalance: wallet.balance,
    alreadyProcessed: false,
  };
}

/**
 * Get User's Credit Transaction History
 */
export async function getUserTransactionHistory(userId: string): Promise<VideoCreditTransaction[]> {
  const client = getSupabaseAdmin();

  if (client) {
    try {
      const { data, error } = await client
        .from('video_credit_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as VideoCreditTransaction[];
      }
    } catch (err) {
      console.warn('Error fetching transaction history from Supabase:', err);
    }
  }

  return memoryTransactions
    .filter((t) => t.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
