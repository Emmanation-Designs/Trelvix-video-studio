import React, { useState, useEffect } from 'react';
import { authFetch } from '../lib/api';
import { 
  Zap, 
  Sparkles, 
  CreditCard, 
  History, 
  ShieldCheck, 
  ArrowLeft, 
  RefreshCw, 
  Info, 
  CheckCircle2, 
  Sliders, 
  Video, 
  Plus, 
  Minus,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

export interface AuthoritativePackage {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  soraGens: number;
  pricePerCredit: string;
  bestValue?: boolean;
}

export interface TransactionItem {
  id: string;
  type: 'PURCHASE' | 'USAGE' | 'REFUND' | 'ADJUSTMENT';
  credits: number;
  amount: number;
  currency: string;
  status: string;
  paypalOrderId?: string;
  paypalCaptureId?: string;
  createdAt: string;
  metadata?: any;
}

export interface WalletData {
  balance: number;
  lifetimeCreditsPurchased: number;
  lifetimeCreditsUsed: number;
}

interface BillingPageProps {
  currentCredits: number;
  onCreditsUpdated: (newBalance: number) => void;
  onBackToHome?: () => void;
  onOpenWorkspace?: () => void;
  userProfile?: any;
}

export interface AuthoritativePackage {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  soraGens: number;
  pricePerCredit: string;
  bestValue?: boolean;
  badge?: string;
}

export const AUTHORITATIVE_PACKAGES: AuthoritativePackage[] = [
  { id: 'VIDEO_50', name: '50 Credits', credits: 50, priceUsd: 7.99, soraGens: 10, pricePerCredit: '$0.1598' },
  { id: 'VIDEO_100', name: '100 Credits', credits: 100, priceUsd: 14.99, soraGens: 20, pricePerCredit: '$0.1499' },
  { id: 'VIDEO_200', name: '200 Credits', credits: 200, priceUsd: 27.99, soraGens: 40, pricePerCredit: '$0.1400' },
  { id: 'VIDEO_300', name: '300 Credits', credits: 300, priceUsd: 39.99, soraGens: 60, pricePerCredit: '$0.1333' },
  { id: 'VIDEO_400', name: '400 Credits', credits: 400, priceUsd: 49.99, soraGens: 80, pricePerCredit: '$0.1250' },
  { id: 'VIDEO_500', name: '500 Credits', credits: 500, priceUsd: 59.99, soraGens: 100, pricePerCredit: '$0.1200', badge: 'Popular' },
  { id: 'VIDEO_600', name: '600 Credits', credits: 600, priceUsd: 69.99, soraGens: 120, pricePerCredit: '$0.1167' },
  { id: 'VIDEO_700', name: '700 Credits', credits: 700, priceUsd: 79.99, soraGens: 140, pricePerCredit: '$0.1143' },
  { id: 'VIDEO_800', name: '800 Credits', credits: 800, priceUsd: 89.99, soraGens: 160, pricePerCredit: '$0.1125' },
  { id: 'VIDEO_900', name: '900 Credits', credits: 900, priceUsd: 99.99, soraGens: 180, pricePerCredit: '$0.1111' },
  { id: 'VIDEO_1000', name: '1,000 Credits', credits: 1000, priceUsd: 109.99, soraGens: 200, pricePerCredit: '$0.1100', bestValue: true, badge: 'Best Value' },
  { id: 'VIDEO_2000', name: '2,000 Credits', credits: 2000, priceUsd: 199.99, soraGens: 400, pricePerCredit: '$0.1000' },
  { id: 'VIDEO_3000', name: '3,000 Credits', credits: 3000, priceUsd: 279.99, soraGens: 600, pricePerCredit: '$0.0933' },
  { id: 'VIDEO_5000', name: '5,000 Credits', credits: 5000, priceUsd: 449.99, soraGens: 1000, pricePerCredit: '$0.0900', badge: 'Major Bulk Savings' },
  { id: 'VIDEO_7500', name: '7,500 Credits', credits: 7500, priceUsd: 649.99, soraGens: 1500, pricePerCredit: '$0.0867' },
  { id: 'VIDEO_10000', name: '10,000 Credits', credits: 10000, priceUsd: 799.99, soraGens: 2000, pricePerCredit: '$0.0800', badge: 'Large Creator Package' },
  { id: 'VIDEO_15000', name: '15,000 Credits', credits: 15000, priceUsd: 1149.99, soraGens: 3000, pricePerCredit: '$0.0767' },
  { id: 'VIDEO_20000', name: '20,000 Credits', credits: 20000, priceUsd: 1499.99, soraGens: 4000, pricePerCredit: '$0.0750' },
  { id: 'VIDEO_30000', name: '30,000 Credits', credits: 30000, priceUsd: 2099.99, soraGens: 6000, pricePerCredit: '$0.0700', badge: 'Maximum Bulk Package' },
];

export const BillingPage: React.FC<BillingPageProps> = ({
  currentCredits,
  onCreditsUpdated,
  onBackToHome,
  onOpenWorkspace,
  userProfile
}) => {
  const [wallet, setWallet] = useState<WalletData>({
    balance: currentCredits,
    lifetimeCreditsPurchased: 0,
    lifetimeCreditsUsed: 0,
  });
  
  // Single package selection index (Defaults to 1,000 Credits -> Index 10)
  const [pkgIndex, setPkgIndex] = useState<number>(10);
  const selectedPackage = AUTHORITATIVE_PACKAGES[pkgIndex];

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);
  const [paymentErrorMsg, setPaymentErrorMsg] = useState<string | null>(null);
  const [paypalClientId, setPaypalClientId] = useState<string>('sb');

  // Stepper handlers
  const handlePrevPkg = () => {
    setPkgIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextPkg = () => {
    setPkgIndex((prev) => Math.min(AUTHORITATIVE_PACKAGES.length - 1, prev + 1));
  };

  // Load Wallet and Billing Data
  const loadBillingData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Wallet
      const credRes = await authFetch('/api/video-studio/credits');
      const credData = await credRes.json();
      if (credData.success && credData.wallet) {
        const w = credData.wallet;
        setWallet({
          balance: w.balance ?? currentCredits,
          lifetimeCreditsPurchased: w.lifetimeCreditsPurchased ?? w.lifetime_credits_purchased ?? 0,
          lifetimeCreditsUsed: w.lifetimeCreditsUsed ?? w.lifetime_credits_used ?? 0,
        });
        if (w.balance !== undefined) {
          onCreditsUpdated(w.balance);
        }
      }

      // 2. Fetch Transaction History
      const txRes = await authFetch('/api/video-studio/payments/history');
      const txData = await txRes.json();
      if (txData.success && txData.history) {
        setTransactions(txData.history);
      }

      // 3. Health check for PayPal
      const healthRes = await authFetch('/api/health');
      const healthData = await healthRes.json();
      if (healthData.paypalConfigured) {
        setPaypalClientId((import.meta as any).env?.VITE_PAYPAL_CLIENT_ID || 'sb');
      }
    } catch (err) {
      console.warn('Billing data fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  useEffect(() => {
    setWallet((prev) => ({ ...prev, balance: currentCredits }));
  }, [currentCredits]);

  // PayPal Create Order
  const handleCreatePayPalOrder = async () => {
    setPaymentErrorMsg(null);
    setPaymentSuccessMsg(null);
    try {
      const res = await authFetch('/api/video-studio/payments/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: selectedPackage.id, credits: selectedPackage.credits }),
      });
      const data = await res.json();
      if (data.success && data.orderId) {
        return data.orderId;
      } else {
        throw new Error(data.error || 'Failed creating PayPal checkout order');
      }
    } catch (err: any) {
      setPaymentErrorMsg(err.message || 'Error initializing PayPal payment');
      throw err;
    }
  };

  // PayPal Capture Order
  const handleApprovePayPalOrder = async (data: { orderID: string }) => {
    setProcessingPayment(true);
    setPaymentErrorMsg(null);
    try {
      const res = await authFetch('/api/video-studio/payments/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: data.orderID,
          packageId: selectedPackage.id,
        }),
      });
      const captureData = await res.json();
      if (captureData.success) {
        setPaymentSuccessMsg(`Success! Added +${captureData.creditsAdded.toLocaleString()} Credits to your wallet.`);
        if (captureData.newBalance !== undefined) {
          onCreditsUpdated(captureData.newBalance);
          setWallet((prev) => ({
            ...prev,
            balance: captureData.newBalance,
            lifetimeCreditsPurchased: prev.lifetimeCreditsPurchased + captureData.creditsAdded,
          }));
        }
        await loadBillingData();
      } else {
        setPaymentErrorMsg(captureData.error || 'Payment capture failed.');
      }
    } catch (err: any) {
      setPaymentErrorMsg(err.message || 'Error processing payment capture.');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Instant Fallback Top-Up for testing / sandbox environments
  const handleDirectTopUp = async () => {
    setProcessingPayment(true);
    setPaymentErrorMsg(null);
    setPaymentSuccessMsg(null);
    try {
      const orderRes = await authFetch('/api/video-studio/payments/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: selectedPackage.id, credits: selectedPackage.credits }),
      });
      const orderData = await orderRes.json();
      if (orderData.success && orderData.orderId) {
        const captureRes = await authFetch('/api/video-studio/payments/paypal/capture-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderData.orderId,
            packageId: selectedPackage.id,
          }),
        });
        const capData = await captureRes.json();
        if (capData.success) {
          setPaymentSuccessMsg(`Successfully credited +${capData.creditsAdded.toLocaleString()} Credits to your wallet!`);
          if (capData.newBalance !== undefined) {
            onCreditsUpdated(capData.newBalance);
            setWallet((prev) => ({
              ...prev,
              balance: capData.newBalance,
              lifetimeCreditsPurchased: prev.lifetimeCreditsPurchased + capData.creditsAdded,
            }));
          }
          await loadBillingData();
        } else {
          setPaymentErrorMsg(capData.error || 'Direct top-up failed.');
        }
      }
    } catch (err: any) {
      setPaymentErrorMsg(err.message || 'Direct top-up error.');
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto space-y-10">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            {onBackToHome && (
              <button
                onClick={onBackToHome}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer border border-zinc-800"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Zap className="w-7 h-7 text-emerald-400 fill-emerald-400/20" />
              Billing
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Manage your Video Studio credits and payments.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {onOpenWorkspace && (
            <button
              onClick={onOpenWorkspace}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-bold transition-all flex items-center gap-2 border border-zinc-800 cursor-pointer"
            >
              <Video className="w-4 h-4 text-emerald-400" />
              Open Studio Workspace
            </button>
          )}
          <button
            onClick={loadBillingData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer border border-zinc-800"
            title="Refresh balance and history"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Wallet Section: Available Credits */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-950 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Available Credits
            </span>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-4xl sm:text-6xl font-black text-white tracking-tight">
                {wallet.balance.toLocaleString()}
              </span>
              <span className="text-base font-bold text-emerald-400">credits</span>
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              Ready for Sora 2 & Sora 2 Pro video rendering. Never-expiring wallet balance.
            </p>
          </div>

          <div className="flex sm:flex-col gap-4 border-t sm:border-t-0 sm:border-l border-zinc-800 pt-4 sm:pt-0 sm:pl-8">
            <div>
              <span className="text-[10px] font-bold uppercase text-zinc-400">Lifetime Purchased</span>
              <div className="text-lg font-bold text-white">
                +{wallet.lifetimeCreditsPurchased.toLocaleString()} cr
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-zinc-400">Lifetime Used</span>
              <div className="text-lg font-bold text-white">
                {wallet.lifetimeCreditsUsed.toLocaleString()} cr
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Purchase Section: Buy Credits with SINGLE ADJUSTABLE CONTROL */}
      <div className="rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6 sm:p-8 space-y-8 shadow-xl">
        
        <div className="text-center max-w-md mx-auto space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Buy Credits
          </h2>
          <p className="text-xs text-zinc-400">
            Use the package selector control below to adjust your credit top-up amount.
          </p>
        </div>

        {/* CORE CONTROL: −  [credits]  + */}
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex items-center justify-between p-3 sm:p-4 rounded-3xl bg-zinc-950 border border-zinc-800 shadow-xl">
            {/* MINUS BUTTON */}
            <button
              type="button"
              onClick={handlePrevPkg}
              disabled={pkgIndex === 0}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900 text-zinc-100 text-2xl font-black flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed border border-zinc-700/60 shrink-0 active:scale-95"
              title="Decrease package quantity"
            >
              <Minus className="w-6 h-6" />
            </button>

            {/* CENTER DISPLAY */}
            <div className="text-center px-4">
              <div className="text-3xl sm:text-5xl font-black tracking-tight text-white flex items-center justify-center gap-2">
                <Zap className="w-7 h-7 sm:w-9 sm:h-9 text-emerald-400 fill-emerald-400/20 shrink-0" />
                <span>{selectedPackage.credits.toLocaleString()}</span>
              </div>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mt-1">
                Credits
              </span>
            </div>

            {/* PLUS BUTTON */}
            <button
              type="button"
              onClick={handleNextPkg}
              disabled={pkgIndex === AUTHORITATIVE_PACKAGES.length - 1}
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-zinc-900 text-zinc-100 text-2xl font-black flex items-center justify-center transition-all cursor-pointer disabled:cursor-not-allowed border border-zinc-700/60 shrink-0 active:scale-95"
              title="Increase package quantity"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Stepper Progress Bar Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {AUTHORITATIVE_PACKAGES.map((pkg, idx) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setPkgIndex(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === pkgIndex 
                    ? 'w-7 sm:w-9 bg-emerald-400 shadow-sm shadow-emerald-400/50' 
                    : 'w-2 bg-zinc-800 hover:bg-zinc-700'
                }`}
                title={`${pkg.credits.toLocaleString()} Credits`}
              />
            ))}
          </div>
        </div>

        {/* SELECTED PACKAGE PURCHASE SUMMARY BOX */}
        <div className="max-w-xl mx-auto rounded-3xl bg-zinc-950 border border-emerald-500/30 p-6 space-y-6 shadow-2xl relative">
          
          {/* Header & Price */}
          <div className="flex items-start justify-between border-b border-zinc-800/80 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl sm:text-3xl font-black text-white">
                  {selectedPackage.credits.toLocaleString()} Credits
                </h3>
                {selectedPackage.bestValue && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-black text-[10px] font-black uppercase tracking-wider shadow-md">
                    Best Value
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                ≈ {selectedPackage.soraGens.toLocaleString()} × 4-second Sora 2 generations
              </p>
            </div>

            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                ${selectedPackage.priceUsd.toFixed(2)}
              </div>
              <div className="text-xs text-zinc-400 font-mono mt-0.5">
                {selectedPackage.pricePerCredit} / credit
              </div>
            </div>
          </div>

          {/* Notification Messages */}
          {paymentSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{paymentSuccessMsg}</div>
            </div>
          )}

          {paymentErrorMsg && (
            <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{paymentErrorMsg}</div>
            </div>
          )}

          {/* Generation Yield Breakdown */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-zinc-400 font-semibold block">Sora 2 (Standard)</span>
              <span className="text-base font-bold text-white">≈ {selectedPackage.soraGens.toLocaleString()} clips</span>
              <span className="text-[10px] text-zinc-500 block">5 credits / 4s</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
              <span className="text-zinc-400 font-semibold block">Sora 2 Pro (1080p)</span>
              <span className="text-base font-bold text-emerald-400">≈ {Math.floor(selectedPackage.credits / 35).toLocaleString()} clips</span>
              <span className="text-[10px] text-zinc-500 block">35 credits / 4s</span>
            </div>
          </div>

          {/* PayPal Checkout Buttons */}
          <div className="space-y-3 pt-2">
            <PayPalScriptProvider options={{ clientId: paypalClientId, currency: 'USD' }}>
              <PayPalButtons
                style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
                disabled={processingPayment}
                createOrder={async () => handleCreatePayPalOrder()}
                onApprove={async (data) => handleApprovePayPalOrder({ orderID: data.orderID })}
                onError={(err) => {
                  console.error('PayPal Button error:', err);
                  setPaymentErrorMsg('PayPal checkout window was closed or encountered a connection error.');
                }}
              />
            </PayPalScriptProvider>

            {/* Direct Deposit fallback button */}
            <button
              onClick={handleDirectTopUp}
              disabled={processingPayment}
              className="w-full py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-extrabold text-xs transition-all border border-zinc-700/80 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {processingPayment ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Instant Credit Deposit (${selectedPackage.priceUsd.toFixed(2)})</span>
                </>
              )}
            </button>
          </div>

          <div className="text-[10px] text-zinc-500 text-center leading-normal flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Encrypted PayPal REST API Checkout • Credits never expire</span>
          </div>

        </div>

      </div>

      {/* 4. Model Credit Costs Section: How Credits Work */}
      <div className="rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="border-b border-zinc-800 pb-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            How Credits Work
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Higher-quality models use more credits. You always see the credit cost before generating.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider font-bold">
                <th className="py-3 px-4">Model</th>
                <th className="py-3 px-4">4-sec generation</th>
                <th className="py-3 px-4 text-right">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              <tr className="hover:bg-zinc-950/50">
                <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Sora 2
                </td>
                <td className="py-3.5 px-4 font-mono text-zinc-400">4 sec</td>
                <td className="py-3.5 px-4 font-black text-emerald-400 text-right">5 credits</td>
              </tr>
              <tr className="hover:bg-zinc-950/50">
                <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  Sora 2 Pro 720p
                </td>
                <td className="py-3.5 px-4 font-mono text-zinc-400">4 sec</td>
                <td className="py-3.5 px-4 font-black text-emerald-400 text-right">15 credits</td>
              </tr>
              <tr className="hover:bg-zinc-950/50">
                <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Sora 2 Pro 1024p
                </td>
                <td className="py-3.5 px-4 font-mono text-zinc-400">4 sec</td>
                <td className="py-3.5 px-4 font-black text-emerald-400 text-right">25 credits</td>
              </tr>
              <tr className="hover:bg-zinc-950/50">
                <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-300" />
                  Sora 2 Pro 1080p
                </td>
                <td className="py-3.5 px-4 font-mono text-zinc-400">4 sec</td>
                <td className="py-3.5 px-4 font-black text-emerald-400 text-right">35 credits</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Payment & Credit Activity Audit Logs */}
      <div className="rounded-3xl bg-zinc-900/90 border border-zinc-800 p-6 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-400" />
              Payment History & Credit Activity
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Previous PayPal purchases, generation deductions, and refunds.
            </p>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {transactions.length} entries
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <Info className="w-8 h-8 text-zinc-600 mx-auto" />
            <div className="text-sm font-semibold text-zinc-400">No payment activity recorded yet</div>
            <p className="text-xs text-zinc-500">Your credit top-ups and generation deductions will appear here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Credit Delta</th>
                  <th className="py-3 px-4">Amount ($)</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {transactions.map((tx) => {
                  const isPurchase = tx.type === 'PURCHASE';
                  const isRefund = tx.type === 'REFUND';
                  const isUsage = tx.type === 'USAGE';

                  const dateStr = new Date(tx.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={tx.id} className="hover:bg-zinc-950/50">
                      <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">{dateStr}</td>
                      <td className="py-3 px-4 font-bold">
                        {isPurchase && <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">PURCHASE</span>}
                        {isRefund && <span className="text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">REFUND</span>}
                        {isUsage && <span className="text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">USAGE</span>}
                      </td>
                      <td className="py-3 px-4 text-zinc-300">
                        {tx.metadata?.packageName || tx.metadata?.description || tx.metadata?.reason || (isPurchase ? 'Credit Top-Up' : 'Video Generation')}
                      </td>
                      <td className={`py-3 px-4 font-black ${tx.credits > 0 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                        {tx.credits > 0 ? `+${tx.credits.toLocaleString()}` : tx.credits.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300">
                        {tx.amount > 0 ? `$${tx.amount.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] uppercase font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
