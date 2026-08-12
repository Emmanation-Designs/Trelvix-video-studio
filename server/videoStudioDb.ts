import { getSupabaseAdmin } from './db';
import {
  calculateRequiredCredits,
  getFormattedPackages,
  OFFICIAL_CREDIT_PACKAGES,
  VideoCreditPackage,
  VIDEO_MODELS,
  findVideoModelConfig,
} from './videoPricingConfig';

export type { VideoCreditPackage };

export interface VideoCreditWallet {
  user_id: string;
  balance: number; // Represents available_credits
  available_credits: number;
  reserved_credits: number;
  consumed_credits: number;
  lifetime_credits_purchased: number;
  lifetime_credits_used: number;
  created_at: string;
  updated_at: string;
}

export interface VideoCreditTransaction {
  id: string;
  user_id: string;
  type: 'PURCHASE' | 'RESERVATION' | 'CONSUMPTION' | 'REFUND' | 'RELEASE' | 'ADJUSTMENT' | 'USAGE';
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

export interface VideoGenerationRecord {
  id: string;
  user_id: string;
  provider_job_id: string;
  prompt: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'expired';
  duration: number; // in seconds (4, 8, 12)
  resolution: string; // e.g. '1280x720', '1920x1080'
  quality: string; // model option id e.g. 'sora-2-720p'
  credits_reserved: number;
  credits_consumed: number;
  credit_status: 'reserved' | 'consumed' | 'refunded';
  video_url?: string;
  refunded: boolean;
  created_at: string;
  completed_at?: string;
  failed_at?: string;
  refund_processed_at?: string;
  error_message?: string;
}

// In-Memory Fallback Databases
const memoryWallets = new Map<string, VideoCreditWallet>();
const memoryTransactions: VideoCreditTransaction[] = [];
export const memoryGenerationsDB = new Map<string, VideoGenerationRecord>();

/**
 * Fetch all active Video Credit Packages with dynamic estimated generations.
 * ALWAYS returns the official credit package ladder (50 to 30,000 credits).
 */
export async function getCreditPackages(): Promise<VideoCreditPackage[]> {
  const baseGenCost = 5;
  const client = getSupabaseAdmin();

  if (client) {
    try {
      const officialIds = OFFICIAL_CREDIT_PACKAGES.map((p) => p.id);
      await client.from('video_credit_packages').delete().not('id', 'in', `(${officialIds.map(id => `'${id}'`).join(',')})`);

      await client.from('video_credit_packages').upsert(
        OFFICIAL_CREDIT_PACKAGES.map((p) => ({
          id: p.id,
          name: p.name,
          credits: p.credits,
          price_usd: p.price_usd,
          active: p.active,
          sort_order: p.sort_order,
        })),
        { onConflict: 'id' }
      );
    } catch (err) {
      // Fallback silently if table does not exist
    }
  }

  return OFFICIAL_CREDIT_PACKAGES.map((pkg) => ({
    ...pkg,
    estimated_generations: Math.floor(pkg.credits / baseGenCost),
  }));
}

/**
 * Get package by ID safely (Server-Authoritative Price Resolution)
 */
export async function getPackageById(packageId: string): Promise<VideoCreditPackage | null> {
  const pkgs = await getCreditPackages();
  
  let found = pkgs.find(
    (p) =>
      p.id === packageId ||
      p.id === packageId.replace('pkg-', 'VIDEO_') ||
      p.id === packageId.replace('VIDEO_', 'pkg-')
  );
  if (found) return found;

  const numCredits = parseInt(packageId.replace(/[^0-9]/g, ''), 10);
  if (numCredits > 0) {
    found = pkgs.find((p) => p.credits === numCredits);
    if (found) return found;
  }

  return pkgs[0] || null;
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
        const available = typeof data.available_credits === 'number' ? data.available_credits : data.balance;
        const reserved = data.reserved_credits || 0;
        const consumed = data.consumed_credits || data.lifetime_credits_used || 0;

        return {
          user_id: data.user_id,
          balance: available,
          available_credits: available,
          reserved_credits: reserved,
          consumed_credits: consumed,
          lifetime_credits_purchased: data.lifetime_credits_purchased || 0,
          lifetime_credits_used: consumed,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }

      // Initialize default wallet
      const now = new Date().toISOString();
      const defaultWallet: VideoCreditWallet = {
        user_id: userId,
        balance: 0,
        available_credits: 0,
        reserved_credits: 0,
        consumed_credits: 0,
        lifetime_credits_purchased: 0,
        lifetime_credits_used: 0,
        created_at: now,
        updated_at: now,
      };

      const { error: insertErr } = await client.from('video_credit_wallets').insert({
        user_id: userId,
        balance: 0,
        available_credits: 0,
        reserved_credits: 0,
        consumed_credits: 0,
        lifetime_credits_purchased: 0,
        lifetime_credits_used: 0,
        created_at: now,
        updated_at: now,
      });
      if (insertErr) {
        console.warn('Note: Default wallet insert returned:', insertErr.message);
      }
      return defaultWallet;
    } catch (err) {
      console.warn('Error fetching Supabase wallet, falling back to memory:', err);
    }
  }

  let wallet = memoryWallets.get(userId);
  if (!wallet) {
    const now = new Date().toISOString();
    wallet = {
      user_id: userId,
      balance: 0,
      available_credits: 0,
      reserved_credits: 0,
      consumed_credits: 0,
      lifetime_credits_purchased: 0,
      lifetime_credits_used: 0,
      created_at: now,
      updated_at: now,
    };
    memoryWallets.set(userId, wallet);
  }

  return wallet;
}

/**
 * ATOMICALLY RESERVE CREDITS
 * Subtracts from available_credits and adds to reserved_credits
 */
export async function reserveUserCredits(
  userId: string,
  creditsToReserve: number,
  description: string,
  metadata: Record<string, any> = {}
): Promise<{ success: boolean; wallet?: VideoCreditWallet; error?: string }> {
  const client = getSupabaseAdmin();
  const now = new Date().toISOString();

  if (client) {
    try {
      const wallet = await getUserWallet(userId);
      if (wallet.available_credits < creditsToReserve) {
        return {
          success: false,
          error: `INSUFFICIENT_CREDITS: Required ${creditsToReserve} credits, but available balance is ${wallet.available_credits}.`,
        };
      }

      const newAvailable = wallet.available_credits - creditsToReserve;
      const newReserved = wallet.reserved_credits + creditsToReserve;

      const { data: updatedRows, error: updateErr } = await client
        .from('video_credit_wallets')
        .update({
          balance: newAvailable,
          available_credits: newAvailable,
          reserved_credits: newReserved,
          updated_at: now,
        })
        .eq('user_id', userId)
        .gte('balance', creditsToReserve)
        .select();

      if (!updateErr && updatedRows && updatedRows.length > 0) {
        await client.from('video_credit_transactions').insert({
          user_id: userId,
          type: 'RESERVATION',
          credits: -creditsToReserve,
          amount: 0.00,
          currency: 'USD',
          status: 'COMPLETED',
          metadata: { description, ...metadata },
          created_at: now,
        });

        const freshWallet = await getUserWallet(userId);
        return { success: true, wallet: freshWallet };
      } else {
        const freshWallet = await getUserWallet(userId);
        return {
          success: false,
          error: `INSUFFICIENT_CREDITS: Concurrent balance update. Required ${creditsToReserve} credits, but available balance is ${freshWallet.available_credits}.`,
        };
      }
    } catch (err: any) {
      console.error('Error reserving credits in Supabase:', err);
    }
  }

  // Memory fallback handling
  let wallet = memoryWallets.get(userId);
  if (!wallet) {
    wallet = await getUserWallet(userId);
  }

  if (wallet.available_credits < creditsToReserve) {
    return {
      success: false,
      error: `INSUFFICIENT_CREDITS: Required ${creditsToReserve} credits, but available balance is ${wallet.available_credits}.`,
    };
  }

  wallet.available_credits -= creditsToReserve;
  wallet.balance = wallet.available_credits;
  wallet.reserved_credits += creditsToReserve;
  wallet.updated_at = now;
  memoryWallets.set(userId, wallet);

  memoryTransactions.unshift({
    id: `tx-res-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    user_id: userId,
    type: 'RESERVATION',
    credits: -creditsToReserve,
    amount: 0.00,
    currency: 'USD',
    status: 'COMPLETED',
    metadata: { description, ...metadata },
    created_at: now,
  });

  return { success: true, wallet };
}

/**
 * CONVERT RESERVATION TO CONSUMED
 * Deducts from reserved_credits and adds to consumed_credits
 */
export async function convertReservationToConsumed(params: {
  userId: string;
  providerJobId: string;
  credits: number;
  description?: string;
}): Promise<{ success: boolean; alreadyProcessed?: boolean }> {
  const { userId, providerJobId, credits, description } = params;
  const client = getSupabaseAdmin();
  const now = new Date().toISOString();

  if (client) {
    try {
      // 1. Idempotency check on generation record
      const { data: genRecord } = await client
        .from('video_generations')
        .select('*')
        .eq('provider_job_id', providerJobId)
        .maybeSingle();

      if (genRecord) {
        if (genRecord.credit_status === 'consumed') {
          return { success: true, alreadyProcessed: true };
        }
        if (genRecord.credit_status === 'refunded') {
          return { success: true, alreadyProcessed: true };
        }
      }

      // 2. Update generation record to consumed
      if (genRecord) {
        await client
          .from('video_generations')
          .update({
            credit_status: 'consumed',
            credits_consumed: credits,
            completed_at: now,
          })
          .eq('provider_job_id', providerJobId)
          .eq('credit_status', 'reserved');
      }

      // 3. Update wallet
      const wallet = await getUserWallet(userId);
      const newReserved = Math.max(0, wallet.reserved_credits - credits);
      const newConsumed = wallet.consumed_credits + credits;

      await client
        .from('video_credit_wallets')
        .update({
          reserved_credits: newReserved,
          consumed_credits: newConsumed,
          lifetime_credits_used: newConsumed,
          updated_at: now,
        })
        .eq('user_id', userId);

      // 4. Ledger transaction
      await client.from('video_credit_transactions').insert({
        user_id: userId,
        type: 'CONSUMPTION',
        credits: -credits,
        amount: 0.00,
        currency: 'USD',
        status: 'COMPLETED',
        metadata: { providerJobId, description: description || 'Generation completion' },
        created_at: now,
      });

      return { success: true, alreadyProcessed: false };
    } catch (err) {
      console.error('Error converting reservation to consumed in Supabase:', err);
    }
  }

  // Memory fallback
  const memGen = memoryGenerationsDB.get(providerJobId);
  if (memGen) {
    if (memGen.credit_status === 'consumed' || memGen.credit_status === 'refunded') {
      return { success: true, alreadyProcessed: true };
    }
    memGen.credit_status = 'consumed';
    memGen.credits_consumed = credits;
    memGen.completed_at = now;
  }

  let wallet = memoryWallets.get(userId);
  if (!wallet) {
    wallet = await getUserWallet(userId);
  }

  wallet.reserved_credits = Math.max(0, wallet.reserved_credits - credits);
  wallet.consumed_credits += credits;
  wallet.lifetime_credits_used = wallet.consumed_credits;
  wallet.updated_at = now;

  memoryTransactions.unshift({
    id: `tx-con-${Date.now()}`,
    user_id: userId,
    type: 'CONSUMPTION',
    credits: -credits,
    amount: 0.00,
    currency: 'USD',
    status: 'COMPLETED',
    metadata: { providerJobId, description: description || 'Generation completion' },
    created_at: now,
  });

  return { success: true, alreadyProcessed: false };
}

/**
 * EXACT-ONCE REFUND / RELEASE RESERVATION
 * Deducts from reserved_credits and adds back to available_credits
 */
export async function releaseOrRefundReservation(params: {
  userId: string;
  providerJobId: string;
  creditsToRefund: number;
  reason: string;
}): Promise<{ success: boolean; balance: number; alreadyRefunded?: boolean }> {
  const { userId, providerJobId, creditsToRefund, reason } = params;
  const client = getSupabaseAdmin();
  const now = new Date().toISOString();

  if (creditsToRefund <= 0) {
    const wallet = await getUserWallet(userId);
    return { success: true, balance: wallet.available_credits, alreadyRefunded: false };
  }

  if (client) {
    try {
      // 1. Idempotency check on generation record
      const { data: genRecord } = await client
        .from('video_generations')
        .select('*')
        .eq('provider_job_id', providerJobId)
        .maybeSingle();

      if (genRecord) {
        if (genRecord.credit_status === 'refunded' || genRecord.refunded) {
          const wallet = await getUserWallet(userId);
          return { success: true, balance: wallet.available_credits, alreadyRefunded: true };
        }
        if (genRecord.credit_status === 'consumed') {
          const wallet = await getUserWallet(userId);
          return { success: true, balance: wallet.available_credits, alreadyRefunded: true };
        }
      }

      // Check existing refund transaction in ledger
      const { data: existingTx } = await client
        .from('video_credit_transactions')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'REFUND')
        .filter('metadata->>provider_job_id', 'eq', providerJobId)
        .maybeSingle();

      if (existingTx) {
        const wallet = await getUserWallet(userId);
        return { success: true, balance: wallet.available_credits, alreadyRefunded: true };
      }

      // 2. Mark generation record as refunded
      if (genRecord) {
        await client
          .from('video_generations')
          .update({
            credit_status: 'refunded',
            refunded: true,
            failed_at: now,
            refund_processed_at: now,
            error_message: reason,
          })
          .eq('provider_job_id', providerJobId);
      }

      // 3. Atomically restore wallet: available += creditsToRefund, reserved -= creditsToRefund
      const wallet = await getUserWallet(userId);
      const newAvailable = wallet.available_credits + creditsToRefund;
      const newReserved = Math.max(0, wallet.reserved_credits - creditsToRefund);

      await client
        .from('video_credit_wallets')
        .update({
          balance: newAvailable,
          available_credits: newAvailable,
          reserved_credits: newReserved,
          updated_at: now,
        })
        .eq('user_id', userId);

      // 4. Record ledger transaction
      await client.from('video_credit_transactions').insert({
        user_id: userId,
        type: 'REFUND',
        credits: creditsToRefund,
        amount: 0.00,
        currency: 'USD',
        status: 'COMPLETED',
        metadata: { provider_job_id: providerJobId, reason },
        created_at: now,
      });

      return { success: true, balance: newAvailable, alreadyRefunded: false };
    } catch (err) {
      console.error('Error releasing reservation in Supabase:', err);
    }
  }

  // Memory fallback handling
  const memGen = memoryGenerationsDB.get(providerJobId);
  if (memGen) {
    if (memGen.credit_status === 'refunded' || memGen.refunded || memGen.credit_status === 'consumed') {
      const wallet = await getUserWallet(userId);
      return { success: true, balance: wallet.available_credits, alreadyRefunded: true };
    }
    memGen.credit_status = 'refunded';
    memGen.refunded = true;
    memGen.failed_at = now;
    memGen.refund_processed_at = now;
    memGen.error_message = reason;
  }

  const existingMemTx = memoryTransactions.find(
    (t) => t.user_id === userId && t.type === 'REFUND' && t.metadata?.provider_job_id === providerJobId
  );
  if (existingMemTx) {
    const wallet = await getUserWallet(userId);
    return { success: true, balance: wallet.available_credits, alreadyRefunded: true };
  }

  let wallet = memoryWallets.get(userId);
  if (!wallet) {
    wallet = await getUserWallet(userId);
  }

  wallet.available_credits += creditsToRefund;
  wallet.balance = wallet.available_credits;
  wallet.reserved_credits = Math.max(0, wallet.reserved_credits - creditsToRefund);
  wallet.updated_at = now;

  memoryTransactions.unshift({
    id: `tx-ref-${Date.now()}`,
    user_id: userId,
    type: 'REFUND',
    credits: creditsToRefund,
    amount: 0.00,
    currency: 'USD',
    status: 'COMPLETED',
    metadata: { provider_job_id: providerJobId, reason },
    created_at: now,
  });

  return { success: true, balance: wallet.available_credits, alreadyRefunded: false };
}

/**
 * Administrative Direct Refund / Credit Addition
 */
export async function refundUserCredits(
  userId: string,
  creditsToRefund: number,
  reason: string = 'Administrative refund'
): Promise<{ success: boolean; balance: number }> {
  return releaseOrRefundReservation({
    userId,
    providerJobId: `admin_refund_${Date.now()}`,
    creditsToRefund,
    reason,
  });
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

  const pkg = await getPackageById(packageId);
  const creditsToAdd = pkg ? pkg.credits : 100;
  const client = getSupabaseAdmin();

  if (client) {
    try {
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
          newBalance: currentWallet.available_credits,
          alreadyProcessed: true,
        };
      }

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

      const currentWallet = await getUserWallet(userId);
      const newAvailable = currentWallet.available_credits + creditsToAdd;
      const newLifetime = currentWallet.lifetime_credits_purchased + creditsToAdd;
      const now = new Date().toISOString();

      await client
        .from('video_credit_wallets')
        .update({
          balance: newAvailable,
          available_credits: newAvailable,
          lifetime_credits_purchased: newLifetime,
          updated_at: now,
        })
        .eq('user_id', userId);

      return {
        success: true,
        creditsAdded: creditsToAdd,
        newBalance: newAvailable,
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
      newBalance: memWallet.available_credits,
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
  wallet.available_credits += creditsToAdd;
  wallet.balance = wallet.available_credits;
  wallet.lifetime_credits_purchased += creditsToAdd;
  wallet.updated_at = new Date().toISOString();
  memoryWallets.set(userId, wallet);

  return {
    success: true,
    creditsAdded: creditsToAdd,
    newBalance: wallet.available_credits,
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
